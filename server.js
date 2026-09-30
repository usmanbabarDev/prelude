// Prelude — find anyone by name, get an AI profile built from public web data.
// Zero-framework Node server. SERPER_API_KEY and/or EXA_API_KEY turn on real web search (LIVE);
// ANTHROPIC_API_KEY adds full AI profiles and chat (AI). With no keys the browser runs free mode (public/free-search.js).

const http = require("http");
const fs = require("fs");
const path = require("path");

// Node < 18 has no global fetch; the Anthropic SDK needs one.
if (typeof globalThis.fetch !== "function") {
  const u = require("undici");
  Object.assign(globalThis, { fetch: u.fetch, Headers: u.Headers, Request: u.Request, Response: u.Response, FormData: u.FormData });
}

const Anthropic = require("@anthropic-ai/sdk").default;

const PORT = Number(process.env.PORT) || 5173;
const HAS_EXA = Boolean(process.env.EXA_API_KEY);
const HAS_SERPER = Boolean(process.env.SERPER_API_KEY);
// LIVE = real web search for anyone (needs Serper and/or Exa).
// AI = full AI profiles and follow-up chat (also needs Anthropic).
const LIVE = HAS_EXA || HAS_SERPER;
const AI = LIVE && Boolean(process.env.ANTHROPIC_API_KEY);
const MODEL = "claude-opus-5-5";
const PUBLIC_DIR = path.join(__dirname, "public");
const OPTOUT_FILE = path.join(__dirname, "optouts.json");

const client = AI ? new Anthropic() : null;

// ---------- opt-out registry (people can remove themselves) ----------
function readOptouts() {
  try { return JSON.parse(fs.readFileSync(OPTOUT_FILE, "utf8")); } catch { return []; }
}
function norm(s) { return String(s || "").toLowerCase().replace(/\s+/g, " ").trim(); }
function isOptedOut(name, url) {
  return readOptouts().some((o) => (o.url && url && norm(o.url) === norm(url)) || (!o.url && norm(o.name) === norm(name)));
}

// ---------- Exa (public web + people index) ----------
async function exaSearch(body) {
  if (!HAS_EXA) return [];
  const res = await fetch("https://api.exa.ai/search", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": process.env.EXA_API_KEY },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Exa search failed (${res.status})`);
  return (await res.json()).results || [];
}

function hostOf(u) { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; } }

// Optional Google results via Serper (SERPER_API_KEY): more profile hits + an images tab.
async function serper(kind, body) {
  if (!process.env.SERPER_API_KEY) return null;
  const res = await fetch(`https://google.serper.dev/${kind}`, {
    method: "POST",
    headers: { "content-type": "application/json", "X-API-KEY": process.env.SERPER_API_KEY },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Serper ${kind} failed (${res.status})`);
  return res.json();
}

const PLATFORM_HOSTS = [
  ["linkedin", /linkedin\.com$/], ["x", /(^|\.)(x|twitter)\.com$/], ["instagram", /instagram\.com$/], ["facebook", /facebook\.com$/],
  ["github", /github\.com$/], ["tiktok", /tiktok\.com$/], ["youtube", /youtube\.com$/], ["medium", /medium\.com$/],
  ["substack", /substack\.com$/], ["threads", /threads\.net$/], ["bluesky", /bsky\.app$/], ["wikipedia", /wikipedia\.org$/],
  ["researchgate", /researchgate\.net$/], ["academia", /academia\.edu$/], ["scholar", /scholar\.google\./], ["orcid", /orcid\.org$/],
  ["behance", /behance\.net$/], ["dribbble", /dribbble\.com$/], ["pinterest", /pinterest\./], ["crunchbase", /crunchbase\.com$/],
];
function platformOf(url) { const h = hostOf(url); return (PLATFORM_HOSTS.find(([, re]) => re.test(h)) || ["website"])[0]; }
// "Jane Doe - Engineer - Acme | LinkedIn" -> { name: "Jane Doe", headline: "Engineer · Acme" }
const SITE_WORDS = /^(LinkedIn|Instagram|X|Twitter|Facebook|GitHub|TikTok|YouTube|ResearchGate|Academia\.edu|Medium|Pinterest)\b|photos and videos|on X$/i;
function splitTitle(title, fallback) {
  const parts = String(title || "").split(/\s+[|\-–·•]\s+/).map((p) => p.trim()).filter(Boolean);
  let name = parts[0] || fallback;
  const handle = name.match(/\((@[\w.]+)\)/);
  name = name.replace(/\s*\(@?[\w.]+\)\s*/, " ").replace(/\s+on (X|Twitter)$/i, "").trim();
  const rest = parts.slice(1).filter((p) => !SITE_WORDS.test(p));
  if (handle) rest.unshift(handle[1]);
  return { name, headline: rest.join(" · ") };
}
// Normalise profile URLs so the same account from two sources is shown once.
function profileKey(url) { try { const u = new URL(url); return (u.hostname.replace(/^(www|[a-z]{2})\./, "") + u.pathname.replace(/\/$/, "")).toLowerCase(); } catch { return url; } }

// Every public profile we can find for a name, with photos where the source has one.
// Serper = Google web + Google Images; Exa = people index. Either one is enough.
const fold = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
async function findCandidates(name, hint) {
  const q = [name, hint].filter(Boolean).join(" ");
  const quoted = `"${name}" ${hint || ""}`.trim();
  const opts = { type: "auto", contents: { text: { maxCharacters: 600 } } };
  const [people, social, gWeb, gLinkedIn, gImages] = await Promise.all([
    exaSearch({ ...opts, query: q, category: "people", numResults: 20 }).catch(() => []),
    exaSearch({ ...opts, query: q, numResults: 15, includeDomains: SOCIAL_DOMAINS.concat(["facebook.com", "tiktok.com"]) }).catch(() => []),
    serper("search", { q: quoted, num: 30 }).catch(() => null),
    serper("search", { q: `site:linkedin.com/in ${quoted}`, num: 20 }).catch(() => null),
    serper("images", { q: quoted, num: 60 }).catch(() => null),
  ]);

  // A result must contain every part of the searched name (so "Usman Babar" never matches "Babar Azam").
  const tokens = fold(name).split(/\s+/).filter((t) => t.length > 1);
  const matchesName = (text) => { const t = fold(text); return tokens.every((tok) => t.includes(tok)); };

  const seen = new Set();
  const candidates = [];
  const add = (c) => {
    const key = profileKey(c.url);
    if (!c.url || seen.has(key) || isOptedOut(c.name, c.url)) return;
    if (!matchesName(`${c.name} ${c.headline} ${c.url.replace(/[-_/.]/g, " ")}`)) return;
    seen.add(key); candidates.push(c);
  };
  [...people, ...social].forEach((r, i) => {
    const t = splitTitle(r.title, name);
    add({ id: r.id || `e${i}`, name: t.name, headline: t.headline || hostOf(r.url), snippet: (r.text || "").slice(0, 220), url: r.url, image: r.image || null, platform: platformOf(r.url) });
  });
  [...(gLinkedIn?.organic || []), ...(gWeb?.organic || [])].forEach((r, i) => {
    const t = splitTitle(r.title, name);
    add({ id: `g${i}`, name: t.name, headline: t.headline || hostOf(r.link), snippet: r.snippet || "", url: r.link, image: r.imageUrl || null, platform: platformOf(r.link) });
  });

  // Google Images results, filtered to ones whose title mentions the full name.
  const gImgs = (gImages?.images || [])
    .filter((im) => (im.thumbnailUrl || im.imageUrl) && matchesName(`${im.title} ${im.link}`))
    .map((im) => ({ thumb: im.thumbnailUrl || im.imageUrl, full: im.imageUrl, link: im.link, title: im.title, site: im.source || im.domain || hostOf(im.link), platform: platformOf(im.link) }));

  // Give profile cards the photo Google Images found on that same page (e.g. a LinkedIn profile photo).
  const byPage = new Map(gImgs.map((im) => [profileKey(im.link), im]));
  candidates.forEach((c) => { if (!c.image && byPage.has(profileKey(c.url))) c.image = byPage.get(profileKey(c.url)).thumb; });
  // Image results on profile pages we don't have yet become profile cards too.
  gImgs.forEach((im, i) => {
    if (im.platform !== "website") add({ id: `i${i}`, ...splitTitle(im.title, name), snippet: "", url: im.link, image: im.thumb, platform: im.platform });
  });
  candidates.forEach((c) => { if (!c.headline) c.headline = hostOf(c.url); });

  const images = [];
  const seenImg = new Set();
  const addImg = (img) => { if (img.thumb && !seenImg.has(img.thumb)) { seenImg.add(img.thumb); images.push(img); } };
  gImgs.forEach(addImg);
  candidates.forEach((c) => c.image && addImg({ thumb: c.image, full: c.image, link: c.url, title: `${c.name} — ${c.headline}`, site: hostOf(c.url), platform: c.platform }));

  // Profiles with photos first, then the rest in search order.
  candidates.sort((a, b) => Boolean(b.image) - Boolean(a.image));
  return { candidates: candidates.slice(0, 50), images: images.slice(0, 60) };
}

// General web search used to gather sources for a full profile (Exa if available, else Google via Serper).
async function webSearch(query, num, extra = {}) {
  if (HAS_EXA) return exaSearch({ type: "auto", contents: { text: { maxCharacters: 2000 } }, query, numResults: num, ...extra }).catch(() => []);
  const kind = extra.category === "news" ? "news" : "search";
  const q = extra.includeDomains ? `${query} (${extra.includeDomains.slice(0, 8).map((d) => "site:" + d).join(" OR ")})` : query;
  const data = await serper(kind, { q, num }).catch(() => null);
  return ((kind === "news" ? data?.news : data?.organic) || []).map((r) => ({ url: r.link, title: r.title, text: r.snippet || "", publishedDate: null }));
}

const SOCIAL_DOMAINS = ["linkedin.com", "github.com", "x.com", "twitter.com", "instagram.com", "youtube.com", "medium.com", "substack.com", "threads.net", "bsky.app", "dribbble.com", "behance.net", "scholar.google.com"];

// Several searches in parallel: the selected profile, social accounts, general web, news.
async function gatherSources(candidate) {
  const org = candidate.headline ? candidate.headline.split("·").pop().trim() : "";
  const q = `"${candidate.name}" ${org}`.trim();
  const [social, web, news] = await Promise.all([
    webSearch(q, 8, { includeDomains: SOCIAL_DOMAINS }),
    webSearch(q, 10),
    webSearch(q, 6, { category: "news" }),
  ]);
  const seen = new Set();
  const list = [{ url: candidate.url, title: `${candidate.name} — ${candidate.headline}`, text: candidate.snippet }, ...social, ...web, ...news];  return list
    .filter((s) => s.url && !seen.has(s.url) && seen.add(s.url))
    .slice(0, 18)
    .map((s, i) => ({ id: i + 1, url: s.url, title: s.title || hostOf(s.url), site: hostOf(s.url), date: s.publishedDate ? s.publishedDate.slice(0, 10) : null, text: (s.text || "").slice(0, 2000) }));
}

// ---------- Claude: profile + follow-up ----------
const SCOPE_RULES = `Rules:
- Use only the numbered sources. Cite source ids for everything. If something isn't in the sources, leave it out or list it under gaps.
- Sources may describe different people with the same name. Only use sources that match the selected person's role/company/location; drop the rest and lower match_confidence if unsure.
- Location is city or region only.
- Never include: home or street addresses, phone numbers, personal email addresses, names of family members or relatives, dates of birth, health, religion, sexuality, political affiliation, or financial details.
- If the person appears to be a minor, return an empty profile with match_confidence 0 and explain in match_reason.`;

const ids = { type: "array", items: { type: "integer" } };
const obj = (props) => ({ type: "object", additionalProperties: false, required: Object.keys(props), properties: props });
const PROFILE_SCHEMA = obj({
  identity: obj({
    name: { type: "string" },
    headline: { type: "string" },
    match_confidence: { type: "integer", description: "0-100: how sure we are all used sources are the same person" },
    match_reason: { type: "string" },
  }),
  summary: { type: "string", description: "3-5 sentences with [n] citations" },
  location: obj({ region: { type: "string", description: "City/region or empty" }, source_ids: ids }),
  social: { type: "array", items: obj({ platform: { type: "string", enum: ["linkedin", "github", "x", "instagram", "youtube", "medium", "substack", "threads", "bluesky", "website", "other"] }, handle: { type: "string" }, url: { type: "string" }, source_id: { type: "integer" } }) },
  experience: { type: "array", items: obj({ title: { type: "string" }, org: { type: "string" }, period: { type: "string" }, source_ids: ids }) },
  education: { type: "array", items: obj({ school: { type: "string" }, degree: { type: "string" }, period: { type: "string" }, source_ids: ids }) },
  mentions: { type: "array", items: obj({ type: { type: "string", enum: ["article", "interview", "talk", "podcast", "news", "publication", "project", "event", "other"] }, title: { type: "string" }, date: { type: "string" }, source_id: { type: "integer" } }) },
  topics: { type: "array", items: { type: "string" } },
  gaps: { type: "array", items: { type: "string" } },
});

function sourcesBlock(sources) {
  return sources.map((s) => `[${s.id}] ${s.title} — ${s.url}${s.date ? ` (published ${s.date})` : ""}\n${s.text}`).join("\n\n");
}

async function callClaude(params) {
  const res = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    ...params,
  });
  if (res.stop_reason === "refusal") throw new Error("This lookup was declined.");
  return res.content.filter((b) => b.type === "text").map((b) => b.text).join("");
}

async function buildProfile(candidate) {
  const sources = await gatherSources(candidate);
  const text = await callClaude({
    system: `You build structured people profiles from public web sources. ${SCOPE_RULES}`,
    output_config: { effort: "medium", format: { type: "json_schema", schema: PROFILE_SCHEMA } },
    messages: [{
      role: "user",
      content: `Selected person: ${candidate.name} — ${candidate.headline} (${candidate.url})\n\nSources:\n${sourcesBlock(sources)}\n\nBuild the profile.`,
    }],
  });
  const profile = JSON.parse(text);
  return { ...profile, image: candidate.image || null, sources: sources.map(({ text: _t, ...s }) => s), sourceTexts: sources, generatedAt: new Date().toISOString() };
}

async function answer(profile, question, history) {
  return callClaude({
    system: `You answer follow-up questions about a person's public profile in 2-5 sentences, citing sources as [n]. If the sources don't cover it, say so. ${SCOPE_RULES}\nIf asked for anything in the never-include list, decline briefly.`,
    output_config: { effort: "low" },
    messages: [
      { role: "user", content: `Profile:\n${JSON.stringify({ identity: profile.identity, summary: profile.summary, experience: profile.experience, education: profile.education, mentions: profile.mentions })}\n\nSources:\n${sourcesBlock(profile.sourceTexts || [])}` },
      { role: "assistant", content: "Ready. Ask me anything about this profile." },
      ...history.slice(-8).map((m) => ({ role: m.role === "me" ? "user" : "assistant", content: m.text })),
      { role: "user", content: question },
    ],
  });
}

// ---------- rate limit (per visitor, in memory) ----------
// Keeps a public deployment from burning through API credits.
const LIMITS = { "POST /api/candidates": 30, "POST /api/profile": 10, "POST /api/ask": 40 }; // per hour
const hits = new Map();
function rateLimited(req, key) {
  const max = LIMITS[key];
  if (!max || !LIVE) return false;
  const ip = String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim();
  const now = Date.now();
  const recent = (hits.get(ip + key) || []).filter((t) => now - t < 36e5);
  if (recent.length >= max) return true;
  recent.push(now);
  hits.set(ip + key, recent);
  return false;
}

// ---------- HTTP ----------
const MIME = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json", ".png": "image/png" };

function send(res, status, data) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(data));
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (c) => { raw += c; if (raw.length > 2e6) req.destroy(); });
    req.on("end", () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch (e) { reject(e); } });
  });
}
// Lookups are by name, not reverse lookups on phone numbers, emails or addresses.
function looksLikeContactLookup(q) {
  return /@|\d{3}[\s.-]?\d{3,4}|\b\d+\s+\w+\s+(st|street|ave|road|rd|lane|blvd)\b/i.test(q);
}

const routes = {
  "GET /api/status": async () => ({ live: LIVE, ai: AI, model: AI ? MODEL : null, googleImages: HAS_SERPER }),
  "POST /api/candidates": async ({ name, hint }) => {
    if (!name || name.trim().length < 3) return [400, { error: "Enter a full name." }];
    if (looksLikeContactLookup(`${name} ${hint || ""}`)) return [400, { error: "Search by name. Reverse lookups on phone numbers, emails or addresses aren't supported." }];
    if (!LIVE) return [503, { error: "Live search needs API keys." }];
    return findCandidates(name.trim(), (hint || "").trim());
  },
  "POST /api/profile": async ({ candidate }) => {
    if (!candidate) return [400, { error: "Pick a person." }];
    if (!AI) return [503, { error: "Full AI profiles need ANTHROPIC_API_KEY on the server." }];
    return buildProfile(candidate);
  },
  "POST /api/ask": async ({ profile, question, history }) => {
    if (!profile || !question) return [400, { error: "Missing question." }];
    if (!AI) return [503, { error: "Follow-up chat needs ANTHROPIC_API_KEY on the server." }];
    return { answer: await answer(profile, question, history || []) };
  },
  "POST /api/optout": async ({ name, url, reason }) => {
    if (!name) return [400, { error: "Name is required." }];
    const list = readOptouts();
    list.push({ name, url: url || null, reason: reason || "", at: new Date().toISOString() });
    fs.writeFileSync(OPTOUT_FILE, JSON.stringify(list, null, 2));
    return { ok: true };
  },
};

http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  const handler = routes[`${req.method} ${url.pathname}`];
  if (handler) {
    if (rateLimited(req, `${req.method} ${url.pathname}`)) return send(res, 429, { error: "Too many lookups from this device. Try again in an hour." });
    try {
      const out = await handler(req.method === "POST" ? await readBody(req) : {});
      return Array.isArray(out) ? send(res, out[0], out[1]) : send(res, 200, out);
    } catch (err) {
      console.error(err);
      return send(res, 500, { error: err.message || "Something went wrong." });
    }
  }
  let file = path.normalize(path.join(PUBLIC_DIR, url.pathname === "/" ? "index.html" : url.pathname));
  if (!file.startsWith(PUBLIC_DIR) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(PUBLIC_DIR, "index.html");
  res.writeHead(200, { "content-type": MIME[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, () => console.log(`Prelude running on http://localhost:${PORT} (${LIVE ? "LIVE" : "FREE"} mode)`));
