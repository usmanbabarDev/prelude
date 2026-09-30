// Prelude — find anyone by name, get an AI profile built from public web data.
// Zero-framework Node server. Runs in DEMO mode (fictional data) unless both
// ANTHROPIC_API_KEY and EXA_API_KEY are set, in which case it runs LIVE.

const http = require("http");
const fs = require("fs");
const path = require("path");

// Node < 18 has no global fetch; the Anthropic SDK needs one.
if (typeof globalThis.fetch !== "function") {
  const u = require("undici");
  Object.assign(globalThis, { fetch: u.fetch, Headers: u.Headers, Request: u.Request, Response: u.Response, FormData: u.FormData });
}

const Anthropic = require("@anthropic-ai/sdk").default;
const demo = require("./public/demo-data");

const PORT = Number(process.env.PORT) || 5173;
const LIVE = Boolean(process.env.ANTHROPIC_API_KEY && process.env.EXA_API_KEY);
const MODEL = "claude-opus-5-5";
const PUBLIC_DIR = path.join(__dirname, "public");
const OPTOUT_FILE = path.join(__dirname, "optouts.json");

const client = LIVE ? new Anthropic() : null;

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
  const res = await fetch("https://api.exa.ai/search", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": process.env.EXA_API_KEY },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Exa search failed (${res.status})`);
  return (await res.json()).results || [];
}

function hostOf(u) { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; } }

async function findCandidates(name, hint) {
  const results = await exaSearch({
    query: [name, hint].filter(Boolean).join(" "),
    type: "auto",
    category: "people",
    numResults: 8,
    contents: { text: { maxCharacters: 1200 } },
  });
  return results
    .filter((r) => !isOptedOut(name, r.url))
    .map((r, i) => ({
      id: r.id || `c${i}`,
      name: (r.title || name).split(/[|\-–]/)[0].trim(),
      headline: (r.title || "").split(/[|\-–]/).slice(1).join(" · ").trim() || hostOf(r.url),
      snippet: (r.text || "").slice(0, 220),
      url: r.url,
    }));
}

const SOCIAL_DOMAINS = ["linkedin.com", "github.com", "x.com", "twitter.com", "instagram.com", "youtube.com", "medium.com", "substack.com", "threads.net", "bsky.app", "dribbble.com", "behance.net", "scholar.google.com"];

// Several searches in parallel: the selected profile, social accounts, general web, news.
async function gatherSources(candidate) {
  const org = candidate.headline ? candidate.headline.split("·").pop().trim() : "";
  const q = `"${candidate.name}" ${org}`.trim();
  const opts = { type: "auto", contents: { text: { maxCharacters: 2000 } } };
  const [social, web, news] = await Promise.all([
    exaSearch({ ...opts, query: q, numResults: 8, includeDomains: SOCIAL_DOMAINS }).catch(() => []),
    exaSearch({ ...opts, query: q, numResults: 10 }).catch(() => []),
    exaSearch({ ...opts, query: q, numResults: 6, category: "news" }).catch(() => []),
  ]);
  const seen = new Set();
  const list = [{ url: candidate.url, title: `${candidate.name} — ${candidate.headline}`, text: candidate.snippet }, ...social, ...web, ...news];
  return list
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
  return { ...profile, sources: sources.map(({ text: _t, ...s }) => s), sourceTexts: sources, generatedAt: new Date().toISOString(), demo: false };
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
  "GET /api/status": async () => ({ live: LIVE, model: LIVE ? MODEL : null }),
  "POST /api/candidates": async ({ name, hint }) => {
    if (!name || name.trim().length < 3) return [400, { error: "Enter a full name." }];
    if (looksLikeContactLookup(`${name} ${hint || ""}`)) return [400, { error: "Search by name. Reverse lookups on phone numbers, emails or addresses aren't supported." }];
    const list = LIVE ? await findCandidates(name.trim(), (hint || "").trim()) : demo.candidates(name, hint);
    return { candidates: list.filter((c) => !isOptedOut(c.name, c.url)) };
  },
  "POST /api/profile": async ({ candidate }) => {
    if (!candidate) return [400, { error: "Pick a person." }];
    if (!LIVE) { await new Promise((r) => setTimeout(r, 2600)); return demo.profile(candidate); }
    return buildProfile(candidate);
  },
  "POST /api/ask": async ({ profile, question, history }) => {
    if (!profile || !question) return [400, { error: "Missing question." }];
    if (!LIVE) { await new Promise((r) => setTimeout(r, 900)); return { answer: demo.answer(profile, question) }; }
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
}).listen(PORT, () => console.log(`Prelude running on http://localhost:${PORT} (${LIVE ? "LIVE" : "DEMO"} mode)`));
