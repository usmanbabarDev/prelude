// Builds public/famous.json: the 10 most famous living adults of every country.
// "Famous" = number of Wikipedia language editions with an article about them (Wikidata sitelinks).
// Usage: node scripts/build-famous.js
const fs = require("fs");
const path = require("path");
if (typeof fetch !== "function") globalThis.fetch = require("undici").fetch;

const ENDPOINT = "https://query.wikidata.org/sparql";
const UA = "PreludeFamousBuilder/1.0 (https://github.com/usmanbabarDev/prelude)";
const OUT = path.join(__dirname, "..", "public", "famous.json");
const PER_COUNTRY = 10;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function sparql(query, tries = 4) {
  for (let i = 1; i <= tries; i++) {
    try {
      const res = await fetch(`${ENDPOINT}?format=json&query=${encodeURIComponent(query)}`, { headers: { "user-agent": UA, accept: "application/sparql-results+json" } });
      if (res.status === 429) { await sleep(15000 * i); continue; }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()).results.bindings;
    } catch (err) {
      if (i === tries) throw err;
      await sleep(4000 * i);
    }
  }
}

const flag = (iso) => iso.toUpperCase().replace(/./g, (ch) => String.fromCodePoint(127397 + ch.charCodeAt(0)));
const { directThumb } = require("./thumbs");
const thumb = (fileUrl) => fileUrl ? directThumb(decodeURIComponent(fileUrl.split("/").pop())) : null;

async function countries() {
  const rows = await sparql(`
    SELECT ?c ?cLabel ?iso WHERE {
      ?c wdt:P31 wd:Q3624078; wdt:P297 ?iso.
      FILTER NOT EXISTS { ?c wdt:P31 wd:Q3024240 }
      FILTER NOT EXISTS { ?c wdt:P576 ?end }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }`);
  const seen = new Set();
  return rows
    .map((r) => ({ qid: r.c.value.split("/").pop(), name: r.cLabel.value, iso: r.iso.value }))
    .filter((c) => !seen.has(c.qid) && seen.add(c.qid))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// Nationality words per country ("Pakistani", "American"...) plus country names, for the check below.
let NATIONALITY = new Map();
async function loadNationalities(list) {
  const rows = await sparql(`
    SELECT ?c ?dem WHERE { ?c wdt:P31 wd:Q3624078; wdt:P1549 ?dem. FILTER(LANG(?dem) = "en") }`);
  const words = new Map(list.map((c) => [c.qid, new Set([c.name])]));
  for (const r of rows) {
    const qid = r.c.value.split("/").pop();
    if (words.has(qid)) words.get(qid).add(r.dem.value);
  }
  NATIONALITY = words;
}
const mentions = (text, word) => new RegExp(`(^|[^\\p{L}])${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^\\p{L}]|$)`, "iu").test(text);
// Wikidata keeps old citizenships (e.g. Bangladeshis born before 1971 are also "Pakistani"). If the
// English description names another country's nationality and not this one's, skip the person.
function belongsTo(country, desc) {
  if (!desc) return true;
  const own = NATIONALITY.get(country.qid) || new Set([country.name]);
  if ([...own].some((w) => mentions(desc, w))) return true;
  for (const [qid, words] of NATIONALITY) {
    if (qid !== country.qid && [...words].some((w) => mentions(desc, w))) return false;
  }
  return true;
}

// A "famous people" showcase shouldn't feature people known for terrorism or serious crimes.
const NOTORIOUS = /terroris|mass murder|murderer|serial killer|war criminal|convicted|drug trafficker|drug lord|assassin|al-qaeda|militant|genocide|gangster|mobster|fugitive/i;
// People already placed under another country (each person is listed under one country only).
let CLAIMED = new Map();

// Living (no date of death), adult (born before the cutoff), humans with this citizenship.
async function topPeople(country, minLinks) {
  const cutoff = `${new Date().getFullYear() - 18}-01-01T00:00:00Z`;
  const rows = await sparql(`
    SELECT ?p ?pLabel ?desc ?img ?links WHERE {
      ?p wdt:P27 wd:${country.qid}; wdt:P31 wd:Q5; wikibase:sitelinks ?links.
      FILTER(?links >= ${minLinks})
      FILTER NOT EXISTS { ?p wdt:P570 [] }
      ?p wdt:P569 ?dob. FILTER(?dob < "${cutoff}"^^xsd:dateTime)
      OPTIONAL { ?p wdt:P18 ?img }
      OPTIONAL { ?p schema:description ?desc. FILTER(LANG(?desc) = "en") }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    } ORDER BY DESC(?links) LIMIT 40`);
  const seen = new Set();
  return rows
    .filter((r) => !/^Q\d+$/.test(r.pLabel.value)) // no English name
    .filter((r) => !seen.has(r.p.value) && seen.add(r.p.value))
    .filter((r) => belongsTo(country, r.desc && r.desc.value))
    .filter((r) => !(r.desc && NOTORIOUS.test(r.desc.value)))
    .filter((r) => !CLAIMED.has(r.pLabel.value) || CLAIMED.get(r.pLabel.value) === country.iso)
    .slice(0, PER_COUNTRY)
    .map((r) => ({
      name: r.pLabel.value,
      desc: r.desc ? r.desc.value.replace(/\s*\((born|b\.)[^)]*\)/i, "") : "",
      img: thumb(r.img && r.img.value),
      links: Number(r.links.value),
    }));
}

(async () => {
  const list = await countries();
  console.log(`${list.length} countries`);
  await loadNationalities(list);
  // Resume: keep countries already built in a previous (interrupted) run. FRESH=1 rebuilds everything.
  let prev = [];
  try { if (!process.env.FRESH) prev = JSON.parse(fs.readFileSync(OUT, "utf8")).countries || []; } catch {}
  const done = new Map(prev.filter((c) => c.people.length).map((c) => [c.iso, c]));
  const out = new Map(done);
  const save = () => fs.writeFileSync(OUT, JSON.stringify({
    generated: new Date().toISOString().slice(0, 10), source: "Wikidata (sitelinks)",
    countries: list.map((c) => out.get(c.iso)).filter(Boolean),
  }));
  // Build (or rebuild) a set of countries, 3 at a time (Wikidata allows a few parallel queries per client).
  async function build(todo) {
    let next = 0, finished = 0;
    async function worker() {
      while (next < todo.length) {
        const c = todo[next++];
        let people = [];
        // Big countries have millions of people in Wikidata: start with a high threshold to keep queries fast.
        for (const min of [80, 40, 15, 5]) {
          try { people = await topPeople(c, min); } catch (err) { console.warn(`  ${c.name} @${min}: ${err.message}`); }
          if (people.length >= PER_COUNTRY) break;
        }
        out.set(c.iso, { country: c.name, iso: c.iso, flag: flag(c.iso), people });
        save();
        console.log(`${String(++finished).padStart(3)}/${todo.length} ${c.name}: ${people.length}`);
        await sleep(500);
      }
    }
    await Promise.all([worker(), worker(), worker()]);
  }

  const todo = list.filter((c) => !done.has(c.iso));
  console.log(`${done.size} already built, ${todo.length} to go`);
  await build(todo);

  // Clean-up passes: each person under one country only, no notorious people; refill short countries.
  const byIso = new Map(list.map((c) => [c.iso, c]));
  for (let round = 1; round <= 4; round++) {
    const entries = new Map(); // name -> [{ iso, idx, desc }]
    for (const c of out.values()) c.people.forEach((p, idx) => {
      if (!entries.has(p.name)) entries.set(p.name, []);
      entries.get(p.name).push({ iso: c.iso, idx, desc: p.desc });
    });
    CLAIMED = new Map();
    const drop = new Set(); // "ISO|name"
    for (const [name, list_] of entries) {
      if (list_.some((e) => NOTORIOUS.test(e.desc || ""))) { list_.forEach((e) => drop.add(`${e.iso}|${name}`)); continue; }
      // Keep them under the country their description names; otherwise where they rank highest.
      const named = list_.filter((e) => [...(NATIONALITY.get(byIso.get(e.iso).qid) || [])].some((w) => mentions(e.desc || "", w)));
      const keep = (named.length ? named : list_).slice().sort((a, b) => a.idx - b.idx)[0];
      CLAIMED.set(name, keep.iso);
      list_.filter((e) => e !== keep).forEach((e) => drop.add(`${e.iso}|${name}`));
    }
    const short = [];
    for (const c of out.values()) {
      const before = c.people.length;
      c.people = c.people.filter((p) => !drop.has(`${c.iso}|${p.name}`));
      if (c.people.length < before) short.push(byIso.get(c.iso));
    }
    save();
    console.log(`clean-up round ${round}: removed ${drop.size}, refilling ${short.length} countries`);
    if (!short.length) break;
    await build(short);
  }

  const total = [...out.values()].reduce((n, c) => n + c.people.length, 0);
  console.log(`done: ${total} people across ${out.size} countries -> ${OUT}`);
})();
