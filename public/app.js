// Prelude front end — vanilla JS, hash router, localStorage for per-device state.
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const view = $("#view");
  const FREE_LOOKUPS = 3;
  const FAMOUS = ["Satya Nadella", "Taylor Swift", "Lionel Messi", "Sam Altman", "Serena Williams", "Jensen Huang", "Oprah Winfrey", "Linus Torvalds"];

  // ---------- storage ----------
  const store = {
    get(k, d) { try { const v = localStorage.getItem("prelude:" + k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem("prelude:" + k, JSON.stringify(v)); } catch {} },
  };
  const state = { live: false, search: { name: "", hint: "" }, candidates: [], current: null, chat: [], tab: "overview" };
  const history_ = () => store.get("history", []);
  const saveProfile = (p) => { const all = history_().filter((x) => x.key !== p.key); all.unshift(p); store.set("history", all.slice(0, 50)); };
  const monthKey = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth()}`; };
  const usage = () => { const u = store.get("usage", { month: monthKey(), used: 0 }); return u.month === monthKey() ? u : { month: monthKey(), used: 0 }; };

  // ---------- helpers ----------
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const initials = (n) => String(n).split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const hue = (s) => [...String(s)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7);
  const avatar = (name, lg, seed = name, img) => img ? `<img class="avatar${lg ? " lg" : ""}" src="${esc(img)}" alt="" loading="lazy">` : `<div class="avatar${lg ? " lg" : ""}" style="background:linear-gradient(135deg,hsl(${hue(seed)} 70% 58%),hsl(${(hue(seed) + 40) % 360} 65% 45%))">${esc(initials(name))}</div>`;
  const safeUrl = (u) => (/^https?:\/\//i.test(u || "") ? u : "#");
  const cite = (id) => `<button class="cite" data-src="${+id}">${+id}</button>`;
  const cites = (list) => (list || []).map(cite).join("");
  const withCites = (html) => html.replace(/\[(\d+)\]/g, (_, n) => cite(n));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const svg = (d) => `<svg viewBox="0 0 24 24">${d}</svg>`;
  const ICON = {
    search: svg('<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>'),
    pin: svg('<path d="M12 21s-7-6.2-7-11a7 7 0 0114 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>'),
    chev: '<svg class="chev" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>',
    info: svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>'),
    shield: svg('<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>'),
    link: svg('<path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"/>'),
    eye: svg('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/><path d="M4 4l16 16"/>'),
    send: svg('<path d="M5 12h14M13 6l6 6-6 6"/>'),
    share: svg('<path d="M12 3v12M7 8l5-5 5 5"/><path d="M5 13v6a2 2 0 002 2h10a2 2 0 002-2v-6"/>'),
    clock: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
    work: svg('<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2"/>'),
    school: svg('<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2 9 2 12 0v-5"/>'),
    refresh: svg('<path d="M20 11a8 8 0 10-2.3 5.7"/><path d="M20 4v7h-7"/>'),
  };
  const PLATFORM = {
    linkedin: ["LinkedIn", "#0a66c2", "in"], github: ["GitHub", "#24292f", "gh"], x: ["X", "#000000", "𝕏"], instagram: ["Instagram", "#d62976", "ig"],
    youtube: ["YouTube", "#ff0000", "▶"], medium: ["Medium", "#111111", "M"], substack: ["Substack", "#ff6719", "S"], threads: ["Threads", "#000000", "@"],
    bluesky: ["Bluesky", "#1185fe", "b"], website: ["Website", "#4b3df5", "◎"], tiktok: ["TikTok", "#010101", "♪"], facebook: ["Facebook", "#1877f2", "f"], other: ["Profile", "#6b6b76", "↗"],
  };
  const MENTION = { article: "Article", interview: "Interview", talk: "Talk", podcast: "Podcast", news: "News", publication: "Publication", project: "Project", event: "Event", award: "Award", other: "Mention" };

  function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("show"), 2200); }

  // ---------- API ----------
  // Live mode (server has API keys): Exa + Claude on the server.
  // Free mode (no keys, or no server at all e.g. GitHub Pages): Wikipedia + Wikidata + Hacker News, in the browser.
  const CONTACT_LOOKUP = /@|\d{3}[\s.-]?\d{3,4}|\b\d+\s+\w+\s+(st|street|ave|road|rd|lane|blvd)\b/i;
  const freeApi = {
    "api/candidates": async ({ name, hint }) => {
      if (CONTACT_LOOKUP.test(`${name} ${hint || ""}`)) throw new Error("Search by name. Reverse lookups on phone numbers, emails or addresses aren't supported.");
      const removed = store.get("optouts", []);
      return { candidates: (await FreeSearch.candidates(name, hint)).filter((c) => !removed.includes(c.url)) };
    },
    "api/profile": async ({ candidate }) => FreeSearch.profile(candidate),
    "api/ask": async ({ profile, question }) => { await sleep(400); return { answer: FreeSearch.answer(profile, question) }; },
    "api/optout": async ({ url }) => { if (url) store.set("optouts", [...store.get("optouts", []), url]); return { ok: true }; },
  };
  const ready = fetch("api/status")
    .then((r) => ((r.headers.get("content-type") || "").includes("application/json") ? r.json() : { live: false }))
    .catch(() => ({ live: false }))
    .then((s) => {
      state.live = !!s.live;
      const pill = $("#modePill"); pill.textContent = state.live ? "Live" : "Free"; pill.classList.toggle("live", state.live);
    });
  async function api(path, body) {
    await ready;
    if (!state.live) return freeApi[path](body || {});
    const res = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body || {}) });
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
  const routes = { "": renderHome, results: renderResults, profile: renderProfile, history: renderHistory, account: renderAccount };
  function go(hash) { if (location.hash === hash) route(); else location.hash = hash; }
  function route() {
    const [name] = location.hash.replace(/^#\/?/, "").split("/");
    const r = routes[name] ? name : "";
    if ((r === "profile" && !state.current) || (r === "results" && !state.candidates.length)) return go("#/");
    const tab = { "": "search", results: "search", profile: "search", history: "history", account: "account" }[r];
    document.querySelectorAll(".tabbar a").forEach((a) => a.classList.toggle("active", a.dataset.tab === tab));
    $("#backBtn").hidden = !(r === "results" || r === "profile");
    window.scrollTo(0, 0);
    routes[r]();
    view.classList.remove("fade-in"); void view.offsetWidth; view.classList.add("fade-in");
  }
  window.addEventListener("hashchange", route);
  $("#backBtn").addEventListener("click", () => (history.length > 1 ? history.back() : go("#/")));

  // ---------- Home / search ----------
  function renderHome() {
    const recent = history_().slice(0, 4);
    const u = usage(); const pro = store.get("pro", false);
    view.innerHTML = `
      <p class="eyebrow">People search · public web</p>
      <h1 class="display">Find anyone <em>by name.</em></h1>
      <p class="lede">Social profiles, work history, education, location and web mentions — pulled from the public web into one sourced profile.</p>

      <form class="card stack" id="searchForm" autocomplete="off">
        <div class="field">${ICON.search}<input id="qName" placeholder="Full name" aria-label="Full name" required value="${esc(state.search.name)}"></div>
        <div class="field">${ICON.pin}<input id="qHint" placeholder="City, company or school (optional)" aria-label="Extra context" value="${esc(state.search.hint)}"></div>
        <button class="btn primary block" type="submit">Search</button>
        <p class="err" id="searchErr" hidden></p>
        <p class="muted small" style="margin:0;text-align:center">${pro ? "Unlimited lookups" : `${Math.max(0, FREE_LOOKUPS - u.used)} of ${FREE_LOOKUPS} free lookups left this month`} · searches are private</p>
      </form>

      <div class="section">
        <div class="section-head"><h2>Try a famous name</h2></div>
        <div class="chips">${FAMOUS.map((n) => `<button type="button" class="chip" data-famous="${esc(n)}">${esc(n)}</button>`).join("")}</div>
      </div>

      ${recent.length ? `
      <div class="section">
        <div class="section-head"><h2>Recent</h2><a href="#/history">See all</a></div>
        ${recent.map((p, i) => historyRow(p, i)).join("")}
      </div>` : ""}

      <div class="section">
        <div class="section-head"><h2>What you get</h2></div>
        <div class="grid-2">
          ${feature(ICON.link, "Social profiles", "LinkedIn, GitHub, X, Instagram and more")}
          ${feature(ICON.work, "Work history", "Roles, companies and dates")}
          ${feature(ICON.school, "Education", "Schools and degrees")}
          ${feature(ICON.pin, "Location", "City or region")}
          ${feature(ICON.clock, "Web mentions", "Articles, talks, podcasts, news")}
          ${feature(ICON.shield, "Every fact sourced", "Tap any number to see where it came from")}
        </div>
      </div>

      <div class="section">
        <div class="section-head"><h2>How it works</h2></div>
        <div class="card"><ol class="bullet-list q-list">
          <li>Type a name. Add a city or company if it's a common name.</li>
          <li>Pick the right person from the matches.</li>
          <li>Get a full profile with an AI summary, then ask follow-up questions.</li>
        </ol></div>
      </div>`;
    $("#searchForm").addEventListener("submit", (e) => { e.preventDefault(); runSearch($("#qName").value, $("#qHint").value); });
    view.querySelectorAll("[data-famous]").forEach((c) => c.addEventListener("click", () => runSearch(c.dataset.famous, "")));
    bindHistoryRows(recent);
  }
  const feature = (ico, t, d) => `<div class="feature"><div class="ico">${ico}</div><h3>${t}</h3><p>${d}</p></div>`;

  async function runSearch(name, hint) {
    state.search = { name: name.trim(), hint: (hint || "").trim() };
    const err = $("#searchErr");
    if (state.search.name.split(/\s+/).length < 2) { if (err) { err.hidden = false; err.textContent = "Enter a first and last name."; } return; }
    view.innerHTML = `<p class="eyebrow">Searching the public web</p><h2 style="margin-bottom:16px">${esc(state.search.name)}</h2><div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div>`;
    try {
      const { candidates } = await api("api/candidates", state.search);
      state.candidates = candidates;
      go("#/results");
    } catch (e) {
      renderHome(); const er = $("#searchErr"); er.hidden = false; er.textContent = e.message;
    }
  }

  // ---------- Results ----------
  function renderResults() {
    const c = state.candidates;
    const sameName = c.filter((x) => x.name.toLowerCase() === (c[0]?.name || "").toLowerCase()).length > 1;
    view.innerHTML = `
      <p class="eyebrow">${c.length} match${c.length === 1 ? "" : "es"}</p>
      <h2>Which ${esc(state.search.name)}?</h2>
      <p class="lede small">Pick the right person. We only combine sources that belong to the same person.</p>
      ${state.live ? "" : `<div class="notice" style="margin-bottom:12px">${ICON.info}<span><b>Free mode</b> searches Wikipedia and Wikidata, so it finds well-known people. Searching anyone on the web needs the live version with API keys.</span></div>`}
      ${sameName ? `<div class="notice warn" style="margin-bottom:12px">${ICON.info}<span>Several people share this name — check the role and location.</span></div>` : ""}
      ${c.length ? c.map((x, i) => `
        <button class="row" data-i="${i}">
          ${avatar(x.name, false, x.url, x.image)}
          <div class="grow">
            <div class="title">${esc(x.name)}</div>
            <div class="sub">${esc(x.headline)}</div>
            ${x.region ? `<div class="small muted">${esc(x.region)}</div>` : ""}
            <div class="snip">${esc(x.snippet)}</div>
          </div>${ICON.chev}
        </button>`).join("") : `<div class="empty">${ICON.search}<p>No public profiles found. Try adding a city or company.</p></div>`}
      <p class="subject-note">Not here? <button class="linkish" id="refine">Refine search</button></p>`;
    view.querySelectorAll(".row").forEach((r) => r.addEventListener("click", () => buildProfile(c[r.dataset.i])));
    $("#refine").addEventListener("click", () => go("#/"));
  }

  // ---------- Profile generation ----------
  async function buildProfile(candidate) {
    const u = usage();
    if (state.live && u.used >= FREE_LOOKUPS && !store.get("pro", false)) return showPlans(true);
    const steps = ["Finding social profiles", "Reading work & education history", "Scanning articles, talks & news", "Checking it's all the same person", "Writing the AI summary"];
    view.innerHTML = `<div class="loading"><div class="pulse"></div><p class="eyebrow">Building profile</p><h2>${esc(candidate.name)}</h2><ul class="steps">${steps.map((s) => `<li><span class="dot"></span>${esc(s)}</li>`).join("")}</ul></div>`;
    $("#backBtn").hidden = true;
    const lis = [...view.querySelectorAll(".steps li")];
    let i = 0; lis[0].className = "on";
    const timer = setInterval(() => { if (i < lis.length - 1) { lis[i].className = "done"; lis[++i].className = "on"; } }, state.live ? 4000 : 500);
    try {
      const profile = await api("api/profile", { candidate });
      clearInterval(timer); lis.forEach((l) => (l.className = "done"));
      if (state.live) store.set("usage", { ...u, used: u.used + 1 });
      profile.key = candidate.url; profile.candidate = candidate;
      saveProfile(profile);
      await sleep(300);
      openProfile(profile);
    } catch (e) {
      clearInterval(timer);
      view.innerHTML = `<div class="empty"><h2>Couldn't build that profile</h2><p>${esc(e.message)}</p><button class="btn ghost" id="bk">Go back</button></div>`;
      $("#bk").onclick = () => history.back();
    }
  }
  function openProfile(p) { state.current = p; state.chat = []; state.tab = "overview"; go("#/profile"); }

  // ---------- Profile view ----------
  function renderProfile() {
    const p = state.current;
    const conf = p.identity.match_confidence;
    const confColor = conf >= 85 ? "var(--good)" : conf >= 65 ? "var(--warn)" : "var(--bad)";
    view.innerHTML = `
      ${p.mode === "free" ? `<div class="notice" style="margin-bottom:14px">${ICON.info}<span>Free mode: built from Wikipedia, Wikidata and Hacker News.</span></div>` : ""}
      <div class="id-card">
        ${avatar(p.identity.name, true, p.key, p.image)}
        <div class="grow">
          <h2>${esc(p.identity.name)}</h2>
          <div class="muted small">${esc(p.identity.headline)}</div>
        </div>
        <button class="ring" style="--p:${conf};--c:${confColor};border:0;cursor:pointer" id="matchBtn" aria-label="Identity match ${conf}%"><span>${conf}%<small>MATCH</small></span></button>
      </div>
      <div class="meta">
        ${p.location?.region ? `<span class="tag">${ICON.pin.replace("<svg", '<svg style="width:13px;height:13px"')} ${esc(p.location.region)}</span>` : ""}
        <span class="tag">${p.sources.length} sources</span>
        <span class="tag">Updated ${new Date(p.generatedAt).toLocaleDateString()}</span>
      </div>

      ${p.social.length ? `<div class="socials">${p.social.map((s) => { const [label, color, glyph] = PLATFORM[s.platform] || PLATFORM.other; return `<a class="social" href="${esc(safeUrl(s.url))}" target="_blank" rel="noopener noreferrer"><span class="glyph" style="background:${color}">${esc(glyph)}</span><span><b>${esc(label)}</b><br><span class="muted">${esc(s.handle)}</span></span></a>`; }).join("")}</div>` : ""}

      <div class="card" style="margin-top:14px"><p class="eyebrow">AI summary</p><p class="tldr">${withCites(esc(p.summary))}</p></div>

      <div class="seg" role="tablist">
        ${["overview", "mentions", "sources", "ask"].map((t) => `<button role="tab" data-tab="${t}" aria-selected="${state.tab === t}">${{ overview: "Profile", mentions: "Mentions", sources: "Sources", ask: "Ask" }[t]}</button>`).join("")}
      </div>
      <div id="tabBody"></div>

      <div class="actions">
        <button class="btn ghost sm" id="shareBtn">${ICON.share} Share</button>
        <button class="btn ghost sm" id="refreshBtn">${ICON.refresh} Refresh</button>
      </div>
      <p class="subject-note">Is this you? <button class="linkish" id="claimBtn">Correct or remove this profile</button></p>`;

    view.querySelectorAll(".seg button").forEach((btn) => btn.addEventListener("click", () => {
      state.tab = btn.dataset.tab; view.querySelectorAll(".seg button").forEach((x) => x.setAttribute("aria-selected", x === btn)); renderTab();
    }));
    $("#matchBtn").addEventListener("click", () => openSheet(`<h2>Identity match: ${conf}%</h2><p class="lede">${esc(p.identity.match_reason)}</p><p class="muted small">Sources are only combined when name, role, company and location line up. People with the same name are kept apart.</p><button class="btn ghost block" id="x">Got it</button>`, (el) => ($("#x", el).onclick = closeSheet)));
    $("#shareBtn").addEventListener("click", shareProfile);
    $("#refreshBtn").addEventListener("click", () => buildProfile(p.candidate));
    $("#claimBtn").addEventListener("click", () => optOutSheet(p.identity.name, p.candidate?.url));
    bindCites(view);
    renderTab();
  }

  function bindCites(el) { el.querySelectorAll(".cite").forEach((c) => (c.onclick = () => showSource(+c.dataset.src))); }
  function showSource(id) {
    const s = state.current.sources.find((x) => x.id === id); if (!s) return;
    openSheet(`<p class="eyebrow">Source ${s.id}</p><h2>${esc(s.title)}</h2><p class="muted small">${esc(s.site)}${s.date ? " · " + esc(s.date) : ""}</p>
      <p class="small" style="word-break:break-all">${esc(s.url)}</p>
      <div class="actions"><button class="btn ghost" id="x">Close</button><a class="btn primary" href="${esc(safeUrl(s.url))}" target="_blank" rel="noopener noreferrer">Open ${ICON.send}</a></div>`, (el) => ($("#x", el).onclick = closeSheet));
  }

  function renderTab() {
    const p = state.current; const el = $("#tabBody");
    if (state.tab === "overview") {
      el.innerHTML = `
        <div class="section-head"><h2>Work history</h2></div>
        <div class="card">${p.experience.length ? `<ul class="timeline">${p.experience.map((e, i) => `<li class="${i === 0 ? "now" : ""}"><b>${esc(e.title)}</b><div>${esc(e.org)}</div><div class="small muted">${esc(e.period)} ${cites(e.source_ids)}</div></li>`).join("")}</ul>` : `<p class="muted small" style="margin:0">No public work history found.</p>`}</div>

        <div class="section"><div class="section-head"><h2>Education</h2></div>
        <div class="card">${p.education.length ? `<ul class="bullet-list">${p.education.map((e) => `<li><b>${esc(e.school)}</b><div class="why">${esc(e.degree)}${e.period ? " · " + esc(e.period) : ""} ${cites(e.source_ids)}</div></li>`).join("")}</ul>` : `<p class="muted small" style="margin:0">No public education records found.</p>`}</div></div>

        ${p.location?.region ? `<div class="section"><div class="section-head"><h2>Location</h2></div>
        <div class="card" style="display:flex;gap:12px;align-items:center"><div class="ico-box">${ICON.pin}</div><div><b>${esc(p.location.region)}</b><div class="small muted">Based on public sources ${cites(p.location.source_ids)}</div></div></div></div>` : ""}

        ${p.topics.length ? `<div class="section"><div class="section-head"><h2>Known for</h2></div><div class="tags">${p.topics.map((t) => `<span class="tag accent">${esc(t)}</span>`).join("")}</div></div>` : ""}

        ${p.gaps.length ? `<div class="section"><div class="section-head"><h2>Not found</h2></div><div class="card"><ul class="bullet-list">${p.gaps.map((g) => `<li class="muted small">${esc(g)}</li>`).join("")}</ul></div></div>` : ""}`;
    } else if (state.tab === "mentions") {
      el.innerHTML = p.mentions.length ? `<div class="card">${p.mentions.map((m) => { const s = p.sources.find((x) => x.id === m.source_id); return `
        <a class="source" href="${esc(safeUrl(s?.url))}" target="_blank" rel="noopener noreferrer"><span class="mtype">${esc(MENTION[m.type] || "Mention")}</span>
          <span><span class="t">${esc(m.title)}</span><br><span class="s">${esc(s?.site || "")}${m.date ? " · " + esc(m.date) : ""}</span></span></a>`; }).join("")}</div>` : `<div class="empty"><p>No articles, talks or news mentions found.</p></div>`;
    } else if (state.tab === "sources") {
      el.innerHTML = `<div class="card">${p.sources.map((s) => `
        <a class="source" href="${esc(safeUrl(s.url))}" target="_blank" rel="noopener noreferrer"><span class="num">${s.id}</span>
          <span><span class="t">${esc(s.title)}</span><br><span class="s">${esc(s.site)}${s.date ? " · " + esc(s.date) : ""}</span></span></a>`).join("")}</div>
        <p class="muted small" style="text-align:center">Only publicly available web pages are used.</p>`;
    } else {
      const sugg = ["What do they do right now?", "Where can I find them online?", "What have they spoken or written about?"];
      el.innerHTML = `
        <div class="chat" id="chat">${state.chat.length ? "" : `<p class="muted small" style="margin:0">Ask anything about ${esc(p.identity.name)}. Answers cite sources.</p><div class="suggest">${sugg.map((s) => `<button class="chip" data-s="${esc(s)}">${esc(s)}</button>`).join("")}</div>`}</div>
        <form class="composer" id="askForm"><input id="askIn" placeholder="Ask a follow-up…" aria-label="Question" autocomplete="off"><button class="btn primary sm" aria-label="Send">${ICON.send}</button></form>`;
      renderChat();
      el.querySelectorAll("[data-s]").forEach((c) => c.addEventListener("click", () => ask(c.dataset.s)));
      $("#askForm").addEventListener("submit", (e) => { e.preventDefault(); const v = $("#askIn").value.trim(); if (v) { $("#askIn").value = ""; ask(v); } });
    }
    bindCites(el);
  }

  function renderChat() {
    const c = $("#chat"); if (!c || !state.chat.length) return;
    c.innerHTML = state.chat.map((m) => `<div class="bubble ${m.role}${m.typing ? " typing" : ""}">${m.role === "ai" ? withCites(esc(m.text)) : esc(m.text)}</div>`).join("");
    bindCites(c);
    c.lastElementChild?.scrollIntoView({ block: "nearest" });
  }
  async function ask(q) {
    const hist = state.chat.filter((m) => !m.typing);
    state.chat.push({ role: "me", text: q }, { role: "ai", text: "Checking sources…", typing: true }); renderChat();
    try {
      const { answer } = await api("api/ask", { profile: state.current, question: q, history: hist });
      state.chat[state.chat.length - 1] = { role: "ai", text: answer };
    } catch (e) { state.chat[state.chat.length - 1] = { role: "ai", text: e.message }; }
    renderChat();
  }

  async function shareProfile() {
    const p = state.current;
    const text = [`${p.identity.name} — ${p.identity.headline}`, p.location?.region || "", "", p.summary.replace(/\[\d+\]/g, ""), "", ...p.social.map((s) => `${(PLATFORM[s.platform] || PLATFORM.other)[0]}: ${s.url}`)].join("\n");
    try {
      if (navigator.share) await navigator.share({ title: p.identity.name, text });
      else { await navigator.clipboard.writeText(text); toast("Profile copied to clipboard"); }
    } catch {}
  }

  // ---------- opt-out / correction ----------
  function optOutSheet(name = "", url = "") {
    openSheet(`<h2>Is this you?</h2><p class="lede small">Ask us to correct or remove your profile. Removed profiles stop appearing in search results.</p>
      <form class="stack" id="optForm">
        <div><label class="lbl" for="oName">Your name</label><input class="plain" id="oName" required value="${esc(name)}"></div>
        <div><label class="lbl" for="oUrl">Profile link (optional)</label><input class="plain" id="oUrl" value="${esc(url)}"></div>
        <div><label class="lbl" for="oWhy">What should change?</label><textarea class="plain" id="oWhy" rows="3" placeholder="e.g. Remove me entirely / my job is out of date"></textarea></div>
        <button class="btn primary block">Submit request</button>
      </form>`, (el) => $("#optForm", el).addEventListener("submit", async (e) => {
      e.preventDefault();
      try { await api("api/optout", { name: $("#oName").value, url: $("#oUrl").value, reason: $("#oWhy").value }); closeSheet(); toast("Request received"); }
      catch (err) { toast(err.message); }
    }));
  }

  // ---------- History ----------
  function historyRow(p, i) {
    return `<button class="row" data-h="${i}">${avatar(p.identity.name, false, p.key, p.image)}<div class="grow"><div class="title">${esc(p.identity.name)}</div><div class="sub">${esc(p.identity.headline)}</div><div class="small muted">Searched ${new Date(p.generatedAt).toLocaleDateString()}</div></div>${ICON.chev}</button>`;
  }
  function bindHistoryRows(list) { view.querySelectorAll("[data-h]").forEach((r) => r.addEventListener("click", () => openProfile(list[r.dataset.h]))); }
  function renderHistory() {
    const list = history_();
    view.innerHTML = `<p class="eyebrow" style="margin-top:8px">Saved on this device</p><h2 style="margin-bottom:14px">Search history</h2>
      ${list.length ? list.map(historyRow).join("") + `<div class="section"><button class="btn ghost block" id="clearBtn">Clear history</button></div>`
        : `<div class="empty">${ICON.clock}<p>People you look up are saved here.</p><a class="btn primary" href="#/">Search someone</a></div>`}`;
    bindHistoryRows(list);
    $("#clearBtn")?.addEventListener("click", () => { store.set("history", []); renderHistory(); toast("History cleared"); });
  }

  // ---------- Account ----------
  function renderAccount() {
    const u = usage(); const pro = store.get("pro", false);
    view.innerHTML = `
      <p class="eyebrow" style="margin-top:8px">Account</p><h2 style="margin-bottom:14px">Your plan</h2>
      <div class="card">
        <div style="display:flex;justify-content:space-between"><b>${pro ? "Unlimited" : "Free"}</b><span class="muted small">${pro ? "Unlimited lookups" : `${FREE_LOOKUPS} lookups / month`}</span></div>
        ${pro ? "" : `<div class="meter"><i style="width:${Math.min(100, (u.used / FREE_LOOKUPS) * 100)}%"></i></div><p class="muted small" style="margin:8px 0 0">${u.used} used this month.</p>`}
        <button class="btn primary block" style="margin-top:12px" id="plansBtn">${pro ? "Manage plan" : "Upgrade"}</button>
      </div>

      <div class="section"><div class="section-head"><h2>Privacy</h2></div>
        <div class="card principles">
          ${principle(ICON.eye, "Private searches", "People are never notified when you look them up. History stays on this device.")}
          ${principle(ICON.link, "Public web only", "Profiles are built from publicly available pages — no hacked, leaked or paid broker data.")}
          ${principle(ICON.shield, "Remove a profile", `Anyone can ask to correct or remove themselves. <button class="linkish" id="optBtn">Open the request form</button>`)}
          ${principle(ICON.info, "Not a background check", "Not a consumer reporting agency. Don't use it for employment, tenant, credit or insurance decisions.")}
        </div></div>`;
    $("#plansBtn").addEventListener("click", () => showPlans(false));
    $("#optBtn").addEventListener("click", () => optOutSheet());
  }
  const principle = (ico, t, d) => `<div class="principle"><div class="ico">${ico}</div><div><h3>${t}</h3><p>${d}</p></div></div>`;

  function showPlans(limitHit) {
    const pro = store.get("pro", false);
    openSheet(`<h2>${limitHit ? "You've used your free lookups" : "Plans"}</h2>
      <p class="lede small">No weekly plans. Cancel any time in one tap.</p>
      <div class="plans">
        <div class="plan${pro ? "" : " current"}"><div><b>Free</b><div class="muted small">${FREE_LOOKUPS} lookups a month</div></div><div class="price">$0</div></div>
        <div class="plan${pro ? " current" : ""}"><div><b>Monthly</b><div class="muted small">Unlimited lookups · follow-up chat</div></div><div class="price">$9.99<span class="muted small">/mo</span></div></div>
        <div class="plan"><div><b>Yearly</b><div class="muted small">Everything in Monthly · save 58%</div></div><div class="price">$49.99<span class="muted small">/yr</span></div></div>
      </div>
      <button class="btn primary block" style="margin-top:14px" id="goPro">${pro ? "You're on Unlimited" : "Try Unlimited (demo — no charge)"}</button>
      <p class="muted small" style="text-align:center">Payments aren't connected in this prototype.</p>`, (el) => ($("#goPro", el).onclick = () => { store.set("pro", true); closeSheet(); toast("Unlimited enabled for this demo"); route(); }));
  }

  // ---------- boot ----------
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
  route();
})();
