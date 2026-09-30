// Prelude front end — vanilla JS, hash router, localStorage for per-device state.
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const view = $("#view");
  const PURPOSES = ["Sales call", "Hiring", "Investor meeting", "Partnership", "Networking", "Podcast / event"];
  const FREE_BRIEFS = 5;

  // ---------- storage ----------
  const store = {
    get(k, d) { try { const v = localStorage.getItem("prelude:" + k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem("prelude:" + k, JSON.stringify(v)); } catch {} },
  };
  const state = {
    live: false,
    search: { name: "", hint: "", purpose: store.get("purpose", "Sales call") },
    candidates: [],
    current: null, // brief being viewed
    chat: [],
    tab: "brief",
  };
  const briefs = () => store.get("briefs", []);
  const saveBrief = (b) => { const all = briefs().filter((x) => x.key !== b.key); all.unshift(b); store.set("briefs", all.slice(0, 50)); };
  const meetings = () => store.get("meetings", null) ?? seedMeetings();
  const usage = () => { const u = store.get("usage", { month: monthKey(), used: 0 }); return u.month === monthKey() ? u : { month: monthKey(), used: 0 }; };
  function monthKey() { const d = new Date(); return `${d.getFullYear()}-${d.getMonth()}`; }

  function seedMeetings() {
    const d = new Date(); const at = (days, h, m) => { const x = new Date(d); x.setDate(x.getDate() + days); x.setHours(h, m, 0, 0); return x.toISOString(); };
    const list = [
      { id: "m1", name: "Maya Okafor", hint: "Lumen Health", purpose: "Sales call", at: at(0, 15, 30), title: "Intro — Lumen Health" },
      { id: "m2", name: "Daniel Reyes", hint: "Kelpworks", purpose: "Investor meeting", at: at(1, 10, 0), title: "Kelpworks follow-up" },
      { id: "m3", name: "Aiko Tanabe", hint: "Northwind Grocers", purpose: "Hiring", at: at(3, 13, 0), title: "Principal DS — final round" },
    ];
    store.set("meetings", list); return list;
  }

  // ---------- helpers ----------
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const initials = (n) => String(n).split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const hue = (s) => [...String(s)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7);
  const avatar = (name, lg, seed = name) => `<div class="avatar${lg ? " lg" : ""}" style="background:linear-gradient(135deg,hsl(${hue(seed)} 70% 58%),hsl(${(hue(seed) + 40) % 360} 65% 45%))">${esc(initials(name))}</div>`;
  const safeUrl = (u) => (/^https?:\/\//i.test(u || "") ? u : "#");
  const ICON = {
    search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
    at: '<svg viewBox="0 0 24 24"><path d="M3 7h18M3 12h18M3 17h12"/></svg>',
    chev: '<svg class="chev" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>',
    info: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>',
    shield: '<svg viewBox="0 0 24 24"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/></svg>',
    link: '<svg viewBox="0 0 24 24"><path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"/></svg>',
    hand: '<svg viewBox="0 0 24 24"><path d="M12 21c-4 0-7-3-7-7V9a1.5 1.5 0 013 0v3V5a1.5 1.5 0 013 0v6V4a1.5 1.5 0 013 0v7V6a1.5 1.5 0 013 0v8c0 4-3 7-8 7z"/></svg>',
    doc: '<svg viewBox="0 0 24 24"><path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h5"/></svg>',
    send: '<svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    share: '<svg viewBox="0 0 24 24"><path d="M12 3v12M7 8l5-5 5 5"/><path d="M5 13v6a2 2 0 002 2h10a2 2 0 002-2v-6"/></svg>',
    bookmark: '<svg viewBox="0 0 24 24"><path d="M6 3h12v18l-6-4-6 4z"/></svg>',
    plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
    cal: '<svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M8 3v4M16 3v4M3.5 10h17"/></svg>',
    role: '<svg viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2"/></svg>',
    company: '<svg viewBox="0 0 24 24"><path d="M4 21V5l8-2v18M12 9l8 2v10M8 9h.01M8 13h.01M8 17h.01M16 14h.01M16 18h.01"/></svg>',
    education: '<svg viewBox="0 0 24 24"><path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2 9 2 12 0v-5"/></svg>',
    project: '<svg viewBox="0 0 24 24"><path d="M8 6l-6 6 6 6M16 6l6 6-6 6"/></svg>',
    publication: '<svg viewBox="0 0 24 24"><path d="M4 5h11a3 3 0 013 3v11H7a3 3 0 01-3-3z"/><path d="M8 9h6M8 13h6"/></svg>',
    talk: '<svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3"/></svg>',
    other: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="1"/><circle cx="6" cy="12" r="1"/><circle cx="18" cy="12" r="1"/></svg>',
  };

  function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("show"), 2200); }

  // With no server (e.g. GitHub Pages), the API is answered in the browser from demo data.
  let staticMode = null;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const staticApi = {
    "api/status": async () => ({ live: false, static: true }),
    "api/candidates": async ({ name }) => {
      if (/@|\d{3}[\s.-]?\d{3,4}|\b\d+\s+\w+\s+(st|street|ave|road|rd|lane|blvd)\b/i.test(name)) throw new Error("Prelude looks people up by name for professional context — not by phone, email or address.");
      await sleep(500);
      const removed = store.get("optouts", []);
      return { candidates: PreludeDemo.candidates(name).filter((c) => !removed.includes(c.url)) };
    },
    "api/brief": async ({ candidate, purpose }) => { await sleep(2600); return PreludeDemo.brief(candidate, purpose); },
    "api/ask": async ({ brief, question }) => { await sleep(900); return { answer: PreludeDemo.answer(brief, question) }; },
    "api/optout": async ({ url }) => { if (url) store.set("optouts", [...store.get("optouts", []), url]); return { ok: true }; },
  };
  async function api(path, body) {
    if (staticMode) return staticApi[path](body || {});
    let res;
    try { res = await fetch(path, body ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : {}); } catch { res = null; }
    const isJson = res && (res.headers.get("content-type") || "").includes("application/json");
    if (!isJson && window.PreludeDemo) { staticMode = true; return staticApi[path](body || {}); }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Something went wrong.");
    return data;
  }

  // ---------- sheet ----------
  function openSheet(html, onMount) {
    $("#sheetBody").innerHTML = html; $("#sheet").hidden = false; $("#sheetBackdrop").hidden = false;
    onMount && onMount($("#sheetBody"));
  }
  function closeSheet() { $("#sheet").hidden = true; $("#sheetBackdrop").hidden = true; }
  $("#sheetBackdrop").addEventListener("click", closeSheet);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeSheet(); });

  // ---------- router ----------
  const routes = {
    "": renderHome, "results": renderResults, "brief": renderBrief, "loading": () => {},
    "meetings": renderMeetings, "briefs": renderBriefs, "me": renderMe,
  };
  function go(hash) { if (location.hash === hash) route(); else location.hash = hash; }
  function route() {
    const [name] = location.hash.replace(/^#\/?/, "").split("/");
    const r = routes[name] ? name : "";
    if ((r === "brief" && !state.current) || (r === "results" && !state.candidates.length)) return go("#/");
    const tab = { "": "search", results: "search", brief: "search", meetings: "meetings", briefs: "briefs", me: "me" }[r];
    document.querySelectorAll(".tabbar a").forEach((a) => a.classList.toggle("active", a.dataset.tab === tab));
    $("#backBtn").hidden = !(r === "results" || r === "brief");
    window.scrollTo(0, 0);
    routes[r]();
    view.classList.remove("fade-in"); void view.offsetWidth; view.classList.add("fade-in");
  }
  window.addEventListener("hashchange", route);
  $("#backBtn").addEventListener("click", () => history.length > 1 ? history.back() : go("#/"));

  // ---------- Home / search ----------
  function renderHome() {
    const next = meetings().filter((m) => new Date(m.at) > Date.now() - 36e5).sort((a, b) => a.at.localeCompare(b.at))[0];
    const u = usage();
    view.innerHTML = `
      <p class="eyebrow">Meeting prep, not people-stalking</p>
      <h1 class="display">Know who you're <em>meeting.</em></h1>
      <p class="lede">A sourced, purpose-built brief on anyone you're about to talk to — in about 20 seconds.</p>

      <form class="card stack" id="searchForm" autocomplete="off">
        <div class="field">${ICON.search}<input id="qName" name="name" placeholder="Full name" aria-label="Full name" required value="${esc(state.search.name)}"></div>
        <div class="field">${ICON.at}<input id="qHint" name="hint" placeholder="Company, role or city (optional)" aria-label="Context" value="${esc(state.search.hint)}"></div>
        <div>
          <label class="lbl">What's the meeting for?</label>
          <div class="chips" role="group" aria-label="Purpose">
            ${PURPOSES.map((p) => `<button type="button" class="chip" data-purpose="${esc(p)}" aria-pressed="${p === state.search.purpose}">${esc(p)}</button>`).join("")}
          </div>
        </div>
        <button class="btn primary block" type="submit">Find the right person</button>
        <p class="err" id="searchErr" hidden></p>
        <p class="muted small" style="margin:0;text-align:center">${Math.max(0, FREE_BRIEFS - u.used)} of ${FREE_BRIEFS} free briefs left this month · no card needed</p>
      </form>

      ${next ? `
      <div class="section">
        <div class="section-head"><h2>Up next</h2><a href="#/meetings">All meetings</a></div>
        ${meetingRow(next)}
      </div>` : ""}

      <div class="section">
        <div class="section-head"><h2>How Prelude is different</h2></div>
        <div class="card principles">
          ${principle(ICON.hand, "Purpose first", "You say why you're meeting. The brief is built for that conversation — talking points, questions, what to avoid.")}
          ${principle(ICON.link, "Every claim is sourced", "Each fact has a link, a date and a confidence level. Gaps are shown, never guessed.")}
          ${principle(ICON.shield, "Professional context only", "No home addresses, phone numbers, family or personal life. People can correct or remove themselves.")}
        </div>
      </div>`;

    const form = $("#searchForm");
    form.querySelectorAll(".chip").forEach((c) => c.addEventListener("click", () => {
      state.search.purpose = c.dataset.purpose; store.set("purpose", c.dataset.purpose);
      form.querySelectorAll(".chip").forEach((x) => x.setAttribute("aria-pressed", x === c));
    }));
    form.addEventListener("submit", (e) => { e.preventDefault(); runSearch($("#qName").value, $("#qHint").value); });
    view.querySelectorAll("[data-prep]").forEach(bindPrep);
  }
  const principle = (ico, t, d) => `<div class="principle"><div class="ico">${ico}</div><div><h3>${t}</h3><p>${d}</p></div></div>`;

  async function runSearch(name, hint, purpose) {
    state.search = { name: name.trim(), hint: (hint || "").trim(), purpose: purpose || state.search.purpose };
    const err = $("#searchErr");
    if (state.search.name.split(/\s+/).length < 2) { if (err) { err.hidden = false; err.textContent = "Use a full name (first and last) so we can find the right person."; } return; }
    view.innerHTML = `<p class="eyebrow">Searching the public web</p><h2 style="margin-bottom:16px">${esc(state.search.name)}</h2><div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div>`;
    try {
      const { candidates } = await api("api/candidates", { name: state.search.name, hint: state.search.hint });
      state.candidates = candidates;
      go("#/results");
    } catch (e) {
      renderHome(); const er = $("#searchErr"); er.hidden = false; er.textContent = e.message;
    }
  }

  // ---------- Results (disambiguation) ----------
  function renderResults() {
    const c = state.candidates;
    const sameName = c.length > 1 && c.filter((x) => x.name.toLowerCase() === c[0].name.toLowerCase()).length > 1;
    view.innerHTML = `
      <p class="eyebrow">${esc(state.search.purpose)}</p>
      <h2>Which ${esc(state.search.name)}?</h2>
      <p class="lede small">${c.length ? `${c.length} public profile${c.length > 1 ? "s" : ""} found. Pick the one you're meeting — we never merge people who just share a name.` : "No public professional profiles found. Try adding a company or city."}</p>
      ${c.some((x) => x.demo) ? `<div class="notice" style="margin-bottom:12px">${ICON.info}<span><b>Demo mode.</b> These are fictional sample people. Add API keys to search the real web.</span></div>` : ""}
      ${sameName ? `<div class="notice warn" style="margin-bottom:12px">${ICON.info}<span>Several people share this name. Check the role and company before you continue.</span></div>` : ""}
      <div>${c.map((x, i) => `
        <button class="row" data-i="${i}">
          ${avatar(x.name, false, x.url)}
          <div class="grow">
            <div class="title">${esc(x.name)}</div>
            <div class="sub">${esc(x.headline)}</div>
            <div class="snip">${esc(x.snippet)}</div>
          </div>${ICON.chev}
        </button>`).join("")}</div>
      <p class="subject-note">Not seeing the right person? <button class="linkish" id="refine">Refine search</button></p>`;
    view.querySelectorAll(".row").forEach((r) => r.addEventListener("click", () => buildBrief(c[r.dataset.i])));
    $("#refine").addEventListener("click", () => go("#/"));
  }

  // ---------- Brief generation ----------
  async function buildBrief(candidate, purpose = state.search.purpose) {
    const u = usage();
    if (u.used >= FREE_BRIEFS && !store.get("pro", false)) return showPlans(true);
    const steps = ["Reading public sources", "Checking it's the same person", `Tailoring for ${purpose.toLowerCase()}`, "Linking every claim to a source"];
    view.innerHTML = `<div class="loading"><div class="pulse"></div><p class="eyebrow">Building brief</p><h2>${esc(candidate.name)}</h2><ul class="steps">${steps.map((s) => `<li><span class="dot"></span>${esc(s)}</li>`).join("")}</ul></div>`;
    $("#backBtn").hidden = true;
    const lis = [...view.querySelectorAll(".steps li")];
    let i = 0; lis[0].classList.add("on");
    const timer = setInterval(() => { if (i < lis.length - 1) { lis[i].className = "done"; lis[++i].className = "on"; } }, state.live ? 4500 : 650);
    try {
      const brief = await api("api/brief", { candidate, purpose, me: store.get("me", {}).about || "" });
      clearInterval(timer); lis.forEach((l) => (l.className = "done"));
      store.set("usage", { ...u, used: u.used + 1 });
      brief.key = `${candidate.url}|${purpose}`; brief.candidate = candidate;
      saveBrief(brief);
      await new Promise((r) => setTimeout(r, 300));
      openBrief(brief);
    } catch (e) {
      clearInterval(timer);
      view.innerHTML = `<div class="empty"><h2>Couldn't build that brief</h2><p>${esc(e.message)}</p><button class="btn ghost" onclick="history.back()">Go back</button></div>`;
    }
  }
  function openBrief(b) { state.current = b; state.chat = []; state.tab = "brief"; go("#/brief"); }

  // ---------- Brief view ----------
  function renderBrief() {
    const b = state.current;
    const conf = b.identity.match_confidence;
    const confColor = conf >= 85 ? "var(--good)" : conf >= 65 ? "var(--warn)" : "var(--bad)";
    view.innerHTML = `
      ${b.demo ? `<div class="notice" style="margin-bottom:14px">${ICON.info}<span>Demo brief about a <b>fictional</b> person.</span></div>` : ""}
      <div class="id-card">
        ${avatar(b.identity.name, true)}
        <div class="grow">
          <h2>${esc(b.identity.name)}</h2>
          <div class="muted small">${esc(b.identity.headline)}${b.identity.region ? " · " + esc(b.identity.region) : ""}</div>
        </div>
        <button class="ring" style="--p:${conf};--c:${confColor};border:0;cursor:pointer" id="matchBtn" aria-label="Identity match ${conf}%"><span>${conf}%<small>MATCH</small></span></button>
      </div>
      <div class="meta"><span class="tag accent">${esc(b.purpose)}</span><span class="tag">${b.sources.length} sources</span><span class="tag">Updated ${new Date(b.generatedAt).toLocaleDateString()}</span></div>

      <div class="card" style="margin-top:16px"><p class="eyebrow">In 20 seconds</p><p class="tldr">${cites(esc(b.tldr))}</p></div>

      <div class="seg" role="tablist">
        ${["brief", "prep", "sources", "ask"].map((t) => `<button role="tab" data-tab="${t}" aria-selected="${state.tab === t}">${{ brief: "Facts", prep: "Prep", sources: "Sources", ask: "Ask" }[t]}</button>`).join("")}
      </div>
      <div id="tabBody"></div>

      <div class="actions">
        <button class="btn ghost sm" id="shareBtn">${ICON.share} Share</button>
        <button class="btn ghost sm" id="rePurpose">${ICON.doc} Other purpose</button>
      </div>
      <p class="subject-note">Is this you? <button class="linkish" id="claimBtn">Correct or remove this profile</button></p>`;

    view.querySelectorAll(".seg button").forEach((btn) => btn.addEventListener("click", () => {
      state.tab = btn.dataset.tab; view.querySelectorAll(".seg button").forEach((x) => x.setAttribute("aria-selected", x === btn)); renderTab();
    }));
    $("#matchBtn").addEventListener("click", () => openSheet(`<h2>Identity match: ${conf}%</h2><p class="lede">${esc(b.identity.match_reason)}</p><p class="muted small">Prelude only combines sources when role, company and timeline agree. Anything uncertain is marked lower-confidence.</p><button class="btn ghost block" id="x">Got it</button>`, (el) => $("#x", el).onclick = closeSheet));
    $("#shareBtn").addEventListener("click", shareBrief);
    $("#rePurpose").addEventListener("click", () => openSheet(`<h2>Rebuild for another purpose</h2><p class="lede small">Same person, different conversation.</p><div class="stack">${PURPOSES.filter((p) => p !== b.purpose).map((p) => `<button class="row" data-p="${esc(p)}"><div class="grow title">${esc(p)}</div>${ICON.chev}</button>`).join("")}</div>`, (el) => el.querySelectorAll("[data-p]").forEach((r) => r.onclick = () => { closeSheet(); buildBrief(b.candidate, r.dataset.p); })));
    $("#claimBtn").addEventListener("click", () => optOutSheet(b.identity.name, b.candidate?.url));
    renderTab();
  }

  function cites(html, ids) {
    const list = ids ? ids.map((id) => `<button class="cite" data-src="${+id}">${+id}</button>`).join(" ") : "";
    return html.replace(/\[(\d+)\]/g, (_, n) => `<button class="cite" data-src="${n}">${n}</button>`) + (list ? " " + list : "");
  }
  function bindCites(el) { el.querySelectorAll(".cite").forEach((c) => c.addEventListener("click", () => showSource(+c.dataset.src))); }
  function showSource(id) {
    const s = state.current.sources.find((x) => x.id === id); if (!s) return;
    openSheet(`<p class="eyebrow">Source ${s.id}</p><h2>${esc(s.title)}</h2><p class="muted small">${esc(s.site)}${s.date ? " · " + esc(s.date) : ""}</p>
      <p class="small" style="word-break:break-all">${esc(s.url)}</p>
      <div class="actions"><button class="btn ghost" id="x">Close</button><a class="btn primary" href="${esc(safeUrl(s.url))}" target="_blank" rel="noopener noreferrer">Open ${ICON.send}</a></div>`, (el) => $("#x", el).onclick = closeSheet);
  }

  function renderTab() {
    const b = state.current; const el = $("#tabBody");
    if (state.tab === "brief") {
      el.innerHTML = `<div class="card">${b.facts.map((f) => `
        <div class="fact"><div class="cat">${ICON[f.category] || ICON.other}</div><div>
          <p>${esc(f.text)}</p>
          <div class="foot"><span class="conf ${esc(f.confidence)}">${esc(f.confidence)}</span>${f.as_of ? `<span>· as of ${esc(f.as_of)}</span>` : ""}<span>·</span>${f.source_ids.map((id) => `<button class="cite" data-src="${+id}">${+id}</button>`).join("")}</div>
        </div></div>`).join("")}</div>
        ${b.gaps.length ? `<div class="section"><div class="section-head"><h2>What we couldn't verify</h2></div><div class="card"><ul class="bullet-list">${b.gaps.map((g) => `<li class="muted">${esc(g)}</li>`).join("")}</ul></div></div>` : ""}`;
    } else if (state.tab === "prep") {
      el.innerHTML = `
        <div class="section-head"><h2>Talking points</h2></div>
        <div class="card"><ul class="bullet-list">${b.talking_points.map((t) => `<li><b>${esc(t.point)}</b><div class="why">${esc(t.why)} ${t.source_ids.map((id) => `<button class="cite" data-src="${+id}">${+id}</button>`).join(" ")}</div></li>`).join("")}</ul></div>
        <div class="section"><div class="section-head"><h2>Questions to ask</h2></div>
        <div class="card"><ol class="bullet-list q-list">${b.questions_to_ask.map((q) => `<li>${esc(q)}</li>`).join("")}</ol></div></div>
        <div class="section"><div class="section-head"><h2>Common ground</h2></div>
        <div class="card">${b.common_ground.length ? `<ul class="bullet-list">${b.common_ground.map((c) => `<li>${esc(c.text)} ${c.source_ids.map((id) => `<button class="cite" data-src="${+id}">${+id}</button>`).join(" ")}</li>`).join("")}</ul>` : `<p class="muted small" style="margin:0">Add a line about yourself in <a href="#/me">Me</a> to find shared ground.</p>`}</div></div>
        <div class="section"><div class="section-head"><h2>Avoid</h2></div>
        <div class="card"><ul class="bullet-list">${b.avoid.map((a) => `<li>${esc(a)}</li>`).join("")}</ul></div></div>`;
    } else if (state.tab === "sources") {
      el.innerHTML = `<div class="card">${b.sources.map((s) => `
        <a class="source" id="src-${s.id}" href="${esc(safeUrl(s.url))}" target="_blank" rel="noopener noreferrer"><span class="num">${s.id}</span>
          <span><span class="t">${esc(s.title)}</span><br><span class="s">${esc(s.site)}${s.date ? " · " + esc(s.date) : ""}</span></span></a>`).join("")}</div>
        <p class="muted small" style="text-align:center">Only public web pages are used. Nothing is bought from data brokers.</p>`;
    } else {
      const sugg = ["What are they working on right now?", "How should I open the conversation?", "What might they push back on?"];
      el.innerHTML = `
        <div class="chat" id="chat">${state.chat.length ? "" : `<p class="muted small" style="margin:0">Ask anything about ${esc(b.identity.name)}'s professional background. Answers cite sources.</p><div class="suggest">${sugg.map((s) => `<button class="chip" data-s="${esc(s)}">${esc(s)}</button>`).join("")}</div>`}</div>
        <form class="composer" id="askForm"><input id="askIn" placeholder="Ask a follow-up…" aria-label="Question" autocomplete="off"><button class="btn primary sm" aria-label="Send">${ICON.send}</button></form>`;
      renderChat();
      el.querySelectorAll("[data-s]").forEach((c) => c.addEventListener("click", () => ask(c.dataset.s)));
      $("#askForm").addEventListener("submit", (e) => { e.preventDefault(); const v = $("#askIn").value.trim(); if (v) { $("#askIn").value = ""; ask(v); } });
    }
    bindCites(el);
  }

  function renderChat() {
    const c = $("#chat"); if (!c || !state.chat.length) return;
    c.innerHTML = state.chat.map((m) => `<div class="bubble ${m.role}${m.typing ? " typing" : ""}">${m.role === "ai" ? cites(esc(m.text)) : esc(m.text)}</div>`).join("");
    bindCites(c);
    c.lastElementChild?.scrollIntoView({ block: "nearest" });
  }
  async function ask(q) {
    const history = state.chat.filter((m) => !m.typing);
    state.chat.push({ role: "me", text: q }, { role: "ai", text: "Checking sources…", typing: true }); renderChat();
    try {
      const { answer } = await api("api/ask", { brief: state.current, question: q, history });
      state.chat[state.chat.length - 1] = { role: "ai", text: answer };
    } catch (e) { state.chat[state.chat.length - 1] = { role: "ai", text: e.message }; }
    renderChat();
  }

  async function shareBrief() {
    const b = state.current;
    const text = [`${b.identity.name} — ${b.identity.headline}`, `Purpose: ${b.purpose}`, "", b.tldr, "", "Questions to ask:", ...b.questions_to_ask.map((q, i) => `${i + 1}. ${q}`), "", "Sources:", ...b.sources.map((s) => `[${s.id}] ${s.url}`)].join("\n");
    try {
      if (navigator.share) await navigator.share({ title: `Brief: ${b.identity.name}`, text });
      else { await navigator.clipboard.writeText(text); toast("Brief copied to clipboard"); }
    } catch {}
  }

  // ---------- opt-out / correction ----------
  function optOutSheet(name = "", url = "") {
    openSheet(`<h2>Is this you?</h2><p class="lede small">Ask us to correct or remove your profile. Removed people stop appearing in search results.</p>
      <form class="stack" id="optForm">
        <div><label class="lbl" for="oName">Your name</label><input class="plain" id="oName" required value="${esc(name)}"></div>
        <div><label class="lbl" for="oUrl">Profile link (optional)</label><input class="plain" id="oUrl" value="${esc(url)}"></div>
        <div><label class="lbl" for="oWhy">What should change?</label><textarea class="plain" id="oWhy" rows="3" placeholder="e.g. Remove me entirely / my role is out of date"></textarea></div>
        <button class="btn primary block">Submit request</button>
      </form>`, (el) => $("#optForm", el).addEventListener("submit", async (e) => {
      e.preventDefault();
      try { await api("api/optout", { name: $("#oName").value, url: $("#oUrl").value, reason: $("#oWhy").value }); closeSheet(); toast("Request received — thank you"); }
      catch (err) { toast(err.message); }
    }));
  }

  // ---------- Meetings ----------
  function meetingRow(m) {
    const d = new Date(m.at);
    const ready = briefs().some((b) => b.identity.name.toLowerCase() === m.name.toLowerCase() && b.purpose === m.purpose);
    return `<div class="row" data-prep="${esc(m.id)}" role="button" tabindex="0">
      <div class="meeting-time"><span>${d.toLocaleDateString(undefined, { weekday: "short" })}</span><b>${d.getDate()}</b></div>
      <div class="grow"><div class="title">${esc(m.title || m.name)}</div>
        <div class="sub">${d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} · ${esc(m.name)} · ${esc(m.purpose)}</div>
        <div class="small muted"><span class="status-dot${ready ? " ready" : ""}"></span>${ready ? "Brief ready" : "Tap to prep"}</div></div>${ICON.chev}</div>`;
  }
  function bindPrep(el) {
    const handler = () => {
      const m = meetings().find((x) => x.id === el.dataset.prep); if (!m) return;
      const existing = briefs().find((b) => b.identity.name.toLowerCase() === m.name.toLowerCase() && b.purpose === m.purpose);
      if (existing) return openBrief(existing);
      state.search.purpose = m.purpose; runSearch(m.name, m.hint, m.purpose);
    };
    el.addEventListener("click", handler);
    el.addEventListener("keydown", (e) => { if (e.key === "Enter") handler(); });
  }
  function renderMeetings() {
    const list = meetings().sort((a, b) => a.at.localeCompare(b.at));
    view.innerHTML = `
      <div class="section-head" style="margin-top:8px"><div><p class="eyebrow">Your calendar</p><h2>Upcoming meetings</h2></div>
      <button class="btn primary sm" id="addM">${ICON.plus} Add</button></div>
      <div class="notice" style="margin:8px 0 14px">${ICON.cal}<span>Connect Google or Outlook calendar to get a brief in your inbox 30 minutes before every external meeting. <b>Coming soon</b> — add meetings manually for now.</span></div>
      ${list.length ? list.map(meetingRow).join("") : `<div class="empty">${ICON.cal}<p>No meetings yet.</p></div>`}`;
    view.querySelectorAll("[data-prep]").forEach(bindPrep);
    $("#addM").addEventListener("click", () => {
      const def = new Date(Date.now() + 864e5); def.setMinutes(0, 0, 0);
      const local = new Date(def - def.getTimezoneOffset() * 6e4).toISOString().slice(0, 16);
      openSheet(`<h2>Add a meeting</h2><form class="stack" id="mForm" style="margin-top:12px">
        <div><label class="lbl" for="mName">Who are you meeting?</label><input class="plain" id="mName" required placeholder="Full name"></div>
        <div><label class="lbl" for="mHint">Company (optional)</label><input class="plain" id="mHint"></div>
        <div><label class="lbl" for="mAt">When</label><input class="plain" id="mAt" type="datetime-local" value="${local}" required></div>
        <div><label class="lbl" for="mP">Purpose</label><select class="plain" id="mP">${PURPOSES.map((p) => `<option>${esc(p)}</option>`).join("")}</select></div>
        <button class="btn primary block">Save meeting</button></form>`, (el) => $("#mForm", el).addEventListener("submit", (e) => {
        e.preventDefault();
        const m = { id: "m" + Date.now(), name: $("#mName").value.trim(), hint: $("#mHint").value.trim(), purpose: $("#mP").value, at: new Date($("#mAt").value).toISOString() };
        m.title = `${m.purpose} — ${m.name}`;
        store.set("meetings", [...meetings(), m]); closeSheet(); renderMeetings(); toast("Meeting added");
      }));
    });
  }

  // ---------- Saved briefs ----------
  function renderBriefs() {
    const list = briefs();
    view.innerHTML = `<p class="eyebrow" style="margin-top:8px">Saved on this device</p><h2 style="margin-bottom:14px">Your briefs</h2>
      ${list.length ? list.map((b, i) => `<button class="row" data-i="${i}">${avatar(b.identity.name)}<div class="grow"><div class="title">${esc(b.identity.name)}</div><div class="sub">${esc(b.purpose)} · ${new Date(b.generatedAt).toLocaleDateString()}</div></div>${ICON.chev}</button>`).join("")
        : `<div class="empty">${ICON.bookmark}<p>Briefs you build are saved here, and work offline.</p><a class="btn primary" href="#/">Build your first brief</a></div>`}`;
    view.querySelectorAll("[data-i]").forEach((r) => r.addEventListener("click", () => openBrief(list[r.dataset.i])));
  }

  // ---------- Me ----------
  function renderMe() {
    const me = store.get("me", {}); const u = usage(); const pro = store.get("pro", false);
    view.innerHTML = `
      <p class="eyebrow" style="margin-top:8px">Settings</p><h2 style="margin-bottom:14px">About you</h2>
      <div class="card stack">
        <div><label class="lbl" for="about">One line about you — used to find common ground</label>
        <textarea class="plain" id="about" rows="3" placeholder="e.g. Founder of a fintech startup, ex-Stripe, into open-source and climbing">${esc(me.about || "")}</textarea></div>
        <button class="btn ghost sm" id="saveMe">Save</button>
      </div>

      <div class="section"><div class="section-head"><h2>Plan</h2></div>
        <div class="card">
          <div style="display:flex;justify-content:space-between"><b>${pro ? "Pro" : "Free"}</b><span class="muted small">${pro ? "60" : FREE_BRIEFS} briefs / month</span></div>
          <div class="meter"><i style="width:${Math.min(100, (u.used / (pro ? 60 : FREE_BRIEFS)) * 100)}%"></i></div>
          <p class="muted small" style="margin:8px 0 12px">${u.used} used this month. Resets on the 1st.</p>
          <button class="btn primary block" id="plansBtn">See plans</button>
        </div></div>

      <div class="section"><div class="section-head"><h2>Privacy</h2></div>
        <div class="card principles">
          ${principle(ICON.shield, "Your searches stay private", "Briefs are stored on this device. We don't sell or share search history.")}
          ${principle(ICON.hand, "Remove a profile", `Anyone can ask to correct or remove themselves. <button class="linkish" id="optBtn">Open the request form</button>`)}
          ${principle(ICON.info, "Not a background check", "Prelude isn't a consumer reporting agency. Don't use it for hiring eligibility, tenancy, credit or insurance decisions.")}
        </div></div>
      <div class="section"><button class="btn ghost block" id="clearBtn">Clear saved briefs on this device</button></div>`;
    $("#saveMe").addEventListener("click", () => { store.set("me", { about: $("#about").value.trim() }); toast("Saved"); });
    $("#plansBtn").addEventListener("click", () => showPlans(false));
    $("#optBtn").addEventListener("click", () => optOutSheet());
    $("#clearBtn").addEventListener("click", () => { store.set("briefs", []); toast("Cleared"); });
  }

  function showPlans(limitHit) {
    const pro = store.get("pro", false);
    openSheet(`<h2>${limitHit ? "You've used your free briefs" : "Simple, honest pricing"}</h2>
      <p class="lede small">No weekly subscriptions. No paywall before you see a result. Cancel in one tap.</p>
      <div class="plans">
        <div class="plan${pro ? "" : " current"}"><div><b>Free</b><div class="muted small">${FREE_BRIEFS} briefs a month · all features</div></div><div class="price">$0</div></div>
        <div class="plan${pro ? " current" : ""}"><div><b>Pro</b><div class="muted small">60 briefs · calendar auto-prep · team sharing</div></div><div class="price">$12<span class="muted small">/mo</span></div></div>
        <div class="plan"><div><b>Pack</b><div class="muted small">10 briefs that never expire</div></div><div class="price">$6</div></div>
      </div>
      <button class="btn primary block" style="margin-top:14px" id="goPro">${pro ? "You're on Pro" : "Try Pro (demo — no charge)"}</button>
      <p class="muted small" style="text-align:center">Payments aren't connected in this prototype.</p>`, (el) => $("#goPro", el).onclick = () => { store.set("pro", true); closeSheet(); toast("Pro enabled for this demo"); if (location.hash === "#/me") renderMe(); });
  }

  // ---------- boot ----------
  api("api/status").then((s) => {
    state.live = s.live;
    const pill = $("#modePill"); pill.textContent = s.live ? "Live" : "Demo"; pill.classList.toggle("live", s.live);
  }).catch(() => ($("#modePill").textContent = "Offline"));
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
  route();
})();
