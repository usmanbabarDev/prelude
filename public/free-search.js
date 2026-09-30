// Free mode: real people search with no API keys, run entirely in the browser.
// Finds notable people via Wikipedia + Wikidata, and web mentions via Hacker News.
// Only professional/public-role properties are read from Wikidata — never
// spouse, children, relatives, date of birth or residence.
(() => {
  const WP = "https://en.wikipedia.org";
  const WD = "https://www.wikidata.org";
  const getJson = async (url) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Lookup failed (${res.status})`);
    return res.json();
  };
  const qs = (o) => Object.entries(o).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
  const WEALTH = /\b(net worth|wealthiest|richest|fortune of)\b/i;
  const PERSONAL = /\b(son|daughter|wife|husband|children|child|kids?|family|divorc\w*|married|marriage|wedding|dies|died|death|funeral|pregnan\w*|baby|girlfriend|boyfriend|his home|her home|address)\b/i;

  // ---------- candidates ----------
  async function candidates(name, hint) {
    const data = await getJson(`${WP}/w/api.php?${qs({
      action: "query", format: "json", origin: "*", redirects: 1,
      generator: "search", gsrsearch: [name, hint].filter(Boolean).join(" "), gsrlimit: 10,
      prop: "pageprops|description|pageimages|extracts", ppprop: "wikibase_item",
      exintro: 1, explaintext: 1, exsentences: 2, exlimit: "max", piprop: "thumbnail", pithumbsize: 200,
    })}`);
    const pages = Object.values(data.query?.pages || {}).filter((p) => p.pageprops?.wikibase_item).sort((a, b) => a.index - b.index);
    if (!pages.length) return [];
    const humans = await adultHumans(pages.map((p) => p.pageprops.wikibase_item));
    const people = pages.filter((p) => (humans ? humans.has(p.pageprops.wikibase_item) : true));
    // Prefer people whose name contains the searched surname; fall back to all if none do.
    const surname = name.trim().split(/\s+/).pop().toLowerCase();
    const named = people.filter((p) => p.title.toLowerCase().includes(surname));
    const wikiCards = (named.length ? named : people).slice(0, 6).map((p) => ({
      platform: "wikipedia",
      id: p.pageprops.wikibase_item,
      name: p.title.replace(/\s*\(.*\)$/, ""),
      wiki: p.title,
      headline: stripBirth(cap(p.description || "")),
      snippet: stripBirth(p.extract || ""),
      url: `${WP}/wiki/${encodeURIComponent(p.title.replace(/ /g, "_"))}`,
      image: p.thumbnail?.source || null,
    }));
    // Each person's own accounts (as listed on Wikidata) become profile cards too.
    const accounts = await socialAccounts(wikiCards.map((c) => c.id));
    const out = [];
    for (const c of wikiCards) {
      out.push(c);
      for (const [platform, url, handle] of accounts[c.id] || []) {
        out.push({ ...c, platform, url, headline: `${handle} · ${c.headline}`, snippet: `Official ${platform === "website" ? "website" : "account"} listed on ${c.name}'s Wikidata entry.` });
      }
    }
    return out;
  }

  async function socialAccounts(qids) {
    if (!qids.length) return {};
    const props = SOCIAL.map(([p]) => p);
    const q = `SELECT ?item ?prop ?value WHERE { VALUES ?item { ${qids.map((id) => "wd:" + id).join(" ")} } VALUES ?prop { ${props.map((p) => "wdt:" + p).join(" ")} } ?item ?prop ?value . }`;
    try {
      const data = await getJson(`https://query.wikidata.org/sparql?${qs({ format: "json", query: q })}`);
      const out = {};
      for (const b of data.results.bindings) {
        const id = b.item.value.split("/").pop();
        const def = SOCIAL.find(([p]) => b.prop.value.endsWith("/" + p));
        if (!def) continue;
        const list = (out[id] = out[id] || []);
        if (list.some(([pl]) => pl === def[1])) continue; // one per platform
        list.push([def[1], def[2](b.value.value), def[3](b.value.value)]);
      }
      return out;
    } catch { return {}; }
  }

  // Photos for a name from Wikimedia Commons (freely licensed images), each linked to its file page.
  async function images(name) {
    const data = await getJson(`https://commons.wikimedia.org/w/api.php?${qs({
      action: "query", format: "json", origin: "*",
      generator: "search", gsrnamespace: 6, gsrsearch: `filetype:bitmap "${name}"`, gsrlimit: 50,
      prop: "imageinfo", iiprop: "url", iiurlwidth: 360,
    })}`).catch(() => ({}));
    // Commons also matches descriptions, so keep only files whose name contains the surname.
    const fold = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    const surname = fold(name.trim().split(/\s+/).pop());
    return Object.values(data.query?.pages || {})
      .sort((a, b) => a.index - b.index)
      .filter((p) => p.imageinfo?.[0]?.thumburl && fold(p.title).includes(surname))
      .map((p) => ({
        thumb: p.imageinfo[0].thumburl,
        full: p.imageinfo[0].url,
        link: p.imageinfo[0].descriptionurl,
        title: p.title.replace(/^File:/, "").replace(/\.\w+$/, "").replace(/_/g, " "),
        site: "commons.wikimedia.org",
      }));
  }

  // Keep only items that are humans (Q5) and not minors. Returns null if the check itself fails.
  async function adultHumans(qids) {
    const q = `SELECT ?item ?dob WHERE { VALUES ?item { ${qids.map((id) => "wd:" + id).join(" ")} } ?item wdt:P31 wd:Q5 . OPTIONAL { ?item wdt:P569 ?dob } }`;
    try {
      const data = await getJson(`https://query.wikidata.org/sparql?${qs({ format: "json", query: q })}`);
      const cutoff = Date.now() - 18 * 365.25 * 864e5;
      const ok = new Set(); const minors = new Set();
      for (const b of data.results.bindings) {
        const id = b.item.value.split("/").pop();
        if (b.dob && Date.parse(b.dob.value) > cutoff) minors.add(id); else ok.add(id);
      }
      minors.forEach((id) => ok.delete(id));
      return ok;
    } catch { return null; }
  }

  // ---------- profile ----------
  const SOCIAL = [
    ["P2002", "x", (v) => `https://x.com/${v}`, (v) => "@" + v],
    ["P6634", "linkedin", (v) => `https://www.linkedin.com/in/${v}`, (v) => "in/" + v],
    ["P2037", "github", (v) => `https://github.com/${v}`, (v) => v],
    ["P2003", "instagram", (v) => `https://www.instagram.com/${v}`, (v) => "@" + v],
    ["P7085", "tiktok", (v) => `https://www.tiktok.com/@${v}`, (v) => "@" + v],
    ["P2397", "youtube", (v) => `https://www.youtube.com/channel/${v}`, () => "YouTube channel"],
    ["P2013", "facebook", (v) => `https://www.facebook.com/${v}`, (v) => v],
    ["P856", "website", (v) => v, (v) => v.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")],
  ];

  async function profile(candidate) {
    const qid = candidate.id;
    const [entityData, summary] = await Promise.all([
      getJson(`${WD}/wiki/Special:EntityData/${qid}.json`),
      getJson(`${WP}/api/rest_v1/page/summary/${encodeURIComponent(candidate.wiki.replace(/ /g, "_"))}`).catch(() => ({})),
    ]);
    const entity = Object.values(entityData.entities)[0];
    const claims = entity.claims || {};
    const vals = (p) => (claims[p] || []).filter((c) => c.rank !== "deprecated" && c.mainsnak.datavalue).map((c) => ({ v: c.mainsnak.datavalue.value, q: c.qualifiers || {} }));
    const qItem = (q, p) => q[p]?.[0]?.datavalue?.value?.id;
    const qYear = (q, p) => { const t = q[p]?.[0]?.datavalue?.value?.time; return t ? t.slice(1, 5).replace(/^0+/, "") : ""; };

    // Resolve labels for every item we display.
    const ITEM_PROPS = ["P106", "P101", "P108", "P39", "P69", "P54", "P264", "P27", "P166", "P800", "P463"];
    const ids = new Set();
    for (const p of ITEM_PROPS) vals(p).forEach(({ v, q }) => { if (v.id) ids.add(v.id); ["P642", "P2389", "P512"].forEach((k) => qItem(q, k) && ids.add(qItem(q, k))); });
    const labels = await fetchLabels([...ids]);
    const L = (id) => labels[id] || "";

    const sources = [];
    const addSource = (s) => { const found = sources.find((x) => x.url === s.url); if (found) return found.id; sources.push({ id: sources.length + 1, ...s }); return sources.length; };
    const wikiUrl = summary.content_urls?.desktop?.page || candidate.url;
    const wikiId = addSource({ url: wikiUrl, title: `${candidate.name} — Wikipedia`, site: "en.wikipedia.org", date: summary.timestamp ? summary.timestamp.slice(0, 10) : null });
    const wdId = addSource({ url: `${WD}/wiki/${qid}`, title: `${candidate.name} — Wikidata`, site: "wikidata.org", date: entity.modified ? entity.modified.slice(0, 10) : null });

    // Social profiles listed on the Wikidata item.
    const social = [];
    for (const [p, platform, toUrl, toHandle] of SOCIAL) {
      const v = vals(p)[0]?.v; if (typeof v !== "string") continue;
      const url = toUrl(v);
      social.push({ platform, handle: toHandle(v), url, source_id: addSource({ url, title: `${candidate.name} on ${platform}`, site: new URL(url).hostname.replace(/^www\./, ""), date: null }) });
    }

    // Work history: positions held, employers, sports teams.
    const period = (q) => { const s = qYear(q, "P580"), e = qYear(q, "P582"); return s || e ? `${s || "?"} – ${e || "present"}` : ""; };
    const current = (q) => !q.P582;
    const exp = [];
    vals("P39").forEach(({ v, q }) => exp.push({ title: cap(L(v.id)), org: L(qItem(q, "P642") || qItem(q, "P2389")), period: period(q), start: qYear(q, "P580"), now: current(q) && !!qYear(q, "P580") }));
    vals("P54").forEach(({ v, q }) => exp.push({ title: L(v.id), org: "Team", period: period(q), start: qYear(q, "P580"), now: current(q) && !!qYear(q, "P580") }));
    vals("P108").forEach(({ v, q }) => { if (!exp.some((e) => e.org === L(v.id) || e.title === L(v.id))) exp.push({ title: L(v.id), org: "Employer", period: period(q), start: qYear(q, "P580"), now: current(q) && !!qYear(q, "P580") }); });
    vals("P264").forEach(({ v, q }) => exp.push({ title: L(v.id), org: "Record label", period: period(q), start: qYear(q, "P580"), now: current(q) && !!qYear(q, "P580") }));
    const experience = exp.filter((e) => e.title)
      .sort((a, b) => (b.now - a.now) || (Number(b.start) || 0) - (Number(a.start) || 0))
      .slice(0, 12)
      .map(({ title, org, period }) => ({ title, org, period, source_ids: [wdId] }));

    const education = vals("P69").map(({ v, q }) => ({ school: L(v.id), degree: cap(L(qItem(q, "P512"))), period: period(q), source_ids: [wdId] })).filter((e) => e.school);

    const topics = [...new Set([...vals("P106"), ...vals("P101")].map(({ v }) => cap(L(v.id))).filter(Boolean))].slice(0, 10);
    const region = [...new Set(vals("P27").map(({ v }) => L(v.id)).filter(Boolean))].join(" · ");

    // Mentions: notable works, awards, and Hacker News stories.
    const mentions = [];
    vals("P800").slice(0, 5).forEach(({ v }) => L(v.id) && mentions.push({ type: "publication", title: `Notable work: ${L(v.id)}`, date: "", source_id: wdId }));
    vals("P166").slice(0, 6).forEach(({ v, q }) => L(v.id) && mentions.push({ type: "award", title: L(v.id), date: qYear(q, "P585"), source_id: wdId }));
    const hn = await getJson(`https://hn.algolia.com/api/v1/search?${qs({ query: `"${candidate.name}"`, tags: "story", hitsPerPage: 20 })}`).catch(() => ({ hits: [] }));
    hn.hits.filter((h) => h.title && !PERSONAL.test(h.title)).slice(0, 8).forEach((h) => {
      const url = h.url || `https://news.ycombinator.com/item?id=${h.objectID}`;
      let site = "news.ycombinator.com"; try { site = new URL(url).hostname.replace(/^www\./, ""); } catch {}
      mentions.push({ type: "article", title: h.title, date: (h.created_at || "").slice(0, 7), source_id: addSource({ url, title: h.title, site, date: (h.created_at || "").slice(0, 10) }) });
    });

    const summaryText = stripBirth(summary.extract || candidate.snippet || "")
      .split(/(?<=\.)\s+/).filter((s) => !PERSONAL.test(s) && !WEALTH.test(s)).join(" ");
    const now = experience[0];
    const headline = now && now.org && !["Employer", "Team", "Record label"].includes(now.org) ? `${now.title} · ${now.org}` : candidate.headline || stripBirth(cap(summary.description || ""));

    const gaps = [];
    if (!social.length) gaps.push("No social accounts are listed on Wikidata for this person.");
    if (!education.length) gaps.push("No education records on Wikidata.");
    gaps.push("Free mode only reads Wikipedia, Wikidata and Hacker News. Deploy with API keys for a full web search.");

    return {
      mode: "free",
      generatedAt: new Date().toISOString(),
      image: summary.thumbnail?.source || candidate.image || null,
      identity: { name: candidate.name, headline, match_confidence: 97, match_reason: "Everything comes from one Wikipedia article and its linked Wikidata item, so it all refers to the same person. News mentions are matched by exact name and may include other people with the same name." },
      summary: summaryText ? `${summaryText} [${wikiId}]` : "",
      location: { region, source_ids: region ? [wdId] : [] },
      social, experience, education, mentions, topics, gaps, sources,
    };
  }

  async function fetchLabels(ids) {
    const out = {};
    for (let i = 0; i < ids.length; i += 50) {
      const data = await getJson(`${WD}/w/api.php?${qs({ action: "wbgetentities", ids: ids.slice(i, i + 50).join("|"), props: "labels", languages: "en", format: "json", origin: "*" })}`).catch(() => ({ entities: {} }));
      for (const [id, e] of Object.entries(data.entities || {})) out[id] = e.labels?.en?.value || "";
    }
    return out;
  }

  // ---------- follow-up questions (no LLM in free mode) ----------
  function answer(p, question) {
    const q = question.toLowerCase();
    if (/address|where .*live|phone|number|email|married|wife|husband|kids|children|son|daughter|relative|family|age|born|birthday|religio|politic|health/.test(q)) {
      return "Profiles don't include home addresses, phone numbers, personal emails, birth dates or family details. Try asking about their work, education or public appearances.";
    }
    if (/social|twitter|linkedin|github|instagram|online|x\b|youtube|website/.test(q)) {
      return p.social.length ? `Public accounts: ${p.social.map((s) => `${s.platform} ${s.handle} [${s.source_id}]`).join(", ")}.` : "No social accounts are listed for this person in free mode's sources.";
    }
    if (/study|school|college|universit|educat|degree/.test(q)) {
      return p.education.length ? `Education: ${p.education.map((e) => `${e.school}${e.degree ? ` (${e.degree})` : ""}`).join("; ")} [${p.education[0].source_ids[0]}].` : "No education records were found.";
    }
    if (/award|prize|honou?r/.test(q)) {
      const a = p.mentions.filter((m) => m.type === "award");
      return a.length ? `Awards include ${a.map((m) => m.title + (m.date ? ` (${m.date})` : "")).join(", ")} [${a[0].source_id}].` : "No awards were found.";
    }
    if (/news|article|recent|mention|written|talk/.test(q)) {
      const a = p.mentions.filter((m) => m.type === "article").slice(0, 3);
      return a.length ? `Recent coverage: ${a.map((m) => `“${m.title}” (${m.date}) [${m.source_id}]`).join("; ")}.` : "No recent articles were found in free mode's sources.";
    }
    if (/work|job|role|company|career|doing|position/.test(q)) {
      return p.experience.length ? `Roles on record: ${p.experience.slice(0, 4).map((e) => `${e.title}${e.org && e.org !== "Employer" ? ` (${e.org})` : ""}${e.period ? ` ${e.period}` : ""}`).join("; ")} [${p.experience[0].source_ids[0]}].` : "No work history was found.";
    }
    return `${p.summary.split(/(?<=\.)\s+/).slice(0, 2).join(" ")} Free mode answers from the profile only — deploy with API keys for full AI answers.`;
  }

  function stripBirth(s) { return s.replace(/\s*\((?:[^()]*\d{4}[^()]*)\)/, "").replace(/\s{2,}/g, " ").trim(); }
  function cap(s) { return s ? s[0].toUpperCase() + s.slice(1) : s; }

  window.FreeSearch = { candidates, images, profile, answer };
})();
