// Prelude — purpose-bound professional briefs.
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

// ---------- opt-out registry (subjects can remove themselves) ----------
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
      image: r.image || null,
    }));
}

async function gatherSources(candidate) {
  const org = candidate.headline ? candidate.headline.split("·")[0] : "";
  const mentions = await exaSearch({
    query: `"${candidate.name}" ${org}`.trim(),
    type: "auto",
    numResults: 8,
    contents: { text: { maxCharacters: 2500 } },
  }).catch(() => []);
  const seen = new Set();
  const list = [{ url: candidate.url, title: candidate.headline || candidate.name, text: candidate.snippet, publishedDate: null }, ...mentions];
  return list
    .filter((s) => s.url && !seen.has(s.url) && seen.add(s.url))
    .slice(0, 9)
    .map((s, i) => ({ id: i + 1, url: s.url, title: s.title || hostOf(s.url), site: hostOf(s.url), date: s.publishedDate ? s.publishedDate.slice(0, 10) : null, text: (s.text || "").slice(0, 2500) }));
}

function hostOf(u) { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; } }

// ---------- Claude: brief + follow-up ----------
const SCOPE_RULES = `Scope rules (non-negotiable):
- Professional context only: roles, companies, projects, publications, talks, education, public professional opinions.
- Never include or infer: home address, phone numbers, personal email, family members, relationships, health, religion, sexuality, political affiliation, finances, precise location (city/region at most), or anything about minors.
- If sources disagree or may describe a different person with the same name, say so and lower confidence. Never merge identities on name alone.
- Only state what the numbered sources support, and cite them by id. If something is unknown, list it under gaps instead of guessing.`;

const BRIEF_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["identity", "tldr", "facts", "talking_points", "common_ground", "questions_to_ask", "avoid", "gaps"],
  properties: {
    identity: {
      type: "object",
      additionalProperties: false,
      required: ["name", "headline", "region", "match_confidence", "match_reason"],
      properties: {
        name: { type: "string" },
        headline: { type: "string" },
        region: { type: "string", description: "City or region only, or empty string" },
        match_confidence: { type: "integer", description: "0-100: how sure we are all sources are the same person" },
        match_reason: { type: "string" },
      },
    },
    tldr: { type: "string", description: "Two or three sentences, tailored to the user's purpose" },
    facts: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["category", "text", "source_ids", "confidence", "as_of"],
        properties: {
          category: { type: "string", enum: ["role", "company", "education", "project", "publication", "talk", "other"] },
          text: { type: "string" },
          source_ids: { type: "array", items: { type: "integer" } },
          confidence: { type: "string", enum: ["high", "medium", "low"] },
          as_of: { type: "string", description: "YYYY or YYYY-MM the fact is current as of, or empty" },
        },
      },
    },
    talking_points: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["point", "why", "source_ids"],
        properties: { point: { type: "string" }, why: { type: "string" }, source_ids: { type: "array", items: { type: "integer" } } },
      },
    },
    common_ground: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["text", "source_ids"],
        properties: { text: { type: "string" }, source_ids: { type: "array", items: { type: "integer" } } },
      },
    },
    questions_to_ask: { type: "array", items: { type: "string" } },
    avoid: { type: "array", items: { type: "string" } },
    gaps: { type: "array", items: { type: "string" } },
  },
};

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
  if (res.stop_reason === "refusal") throw new Error("This request was declined. Try a different person or purpose.");
  return res.content.filter((b) => b.type === "text").map((b) => b.text).join("");
}

async function writeBrief(candidate, purpose, me) {
  const sources = await gatherSources(candidate);
  const text = await callClaude({
    system: `You write concise pre-meeting briefs for professionals. ${SCOPE_RULES}`,
    output_config: { effort: "medium", format: { type: "json_schema", schema: BRIEF_SCHEMA } },
    messages: [{
      role: "user",
      content: `Purpose of the meeting: ${purpose}\nAbout me (for common ground): ${me || "not provided"}\nPerson selected: ${candidate.name} — ${candidate.headline} (${candidate.url})\n\nSources:\n${sourcesBlock(sources)}\n\nWrite the brief. Keep talking points and questions specific to the purpose.`,
    }],
  });
  const brief = JSON.parse(text);
  return { ...brief, sources: sources.map(({ text: _t, ...s }) => s), sourceTexts: sources, purpose, generatedAt: new Date().toISOString(), demo: false };
}

async function answer(brief, question, history) {
  const sources = brief.sourceTexts || [];
  return callClaude({
    system: `You answer follow-up questions about a professional brief. Answer in 2-5 sentences, cite sources as [n]. If the sources don't cover it, say so. ${SCOPE_RULES}\nIf the question asks for out-of-scope personal information, decline briefly and suggest a professional angle instead.`,
    output_config: { effort: "low" },
    messages: [
      { role: "user", content: `Brief:\n${JSON.stringify({ identity: brief.identity, tldr: brief.tldr, facts: brief.facts })}\n\nSources:\n${sourcesBlock(sources)}` },
      { role: "assistant", content: "Understood. Ask me anything about this brief." },
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
    req.on("data", (c) => { raw += c; if (raw.length > 1e6) req.destroy(); });
    req.on("end", () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch (e) { reject(e); } });
  });
}
// Guardrail: Prelude searches people by name, not by contact details.
function looksLikeContactLookup(q) {
  return /@|\d{3}[\s.-]?\d{3,4}|\b\d+\s+\w+\s+(st|street|ave|road|rd|lane|blvd)\b/i.test(q);
}

const routes = {
  "GET /api/status": async () => ({ live: LIVE, model: LIVE ? MODEL : null }),
  "POST /api/candidates": async ({ name, hint }) => {
    if (!name || name.trim().length < 3) return [400, { error: "Enter a full name." }];
    if (looksLikeContactLookup(`${name} ${hint || ""}`)) return [400, { error: "Prelude looks people up by name for professional context — not by phone, email or address." }];
    const list = LIVE ? await findCandidates(name.trim(), (hint || "").trim()) : demo.candidates(name, hint);
    return { candidates: list.filter((c) => !isOptedOut(c.name, c.url)) };
  },
  "POST /api/brief": async ({ candidate, purpose, me }) => {
    if (!candidate || !purpose) return [400, { error: "Pick a person and a purpose." }];
    if (!LIVE) { await new Promise((r) => setTimeout(r, 2600)); return demo.brief(candidate, purpose); }
    return writeBrief(candidate, purpose, me);
  },
  "POST /api/ask": async ({ brief, question, history }) => {
    if (!brief || !question) return [400, { error: "Missing question." }];
    if (!LIVE) { await new Promise((r) => setTimeout(r, 900)); return { answer: demo.answer(brief, question) }; }
    return { answer: await answer(brief, question, history || []) };
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
