// Shared by server.js (Node) and the static build (browser).
// Fictional sample people for DEMO mode. None of these people exist; every
// source uses the reserved .example TLD. Demo mode never invents data about a
// real name someone types — it always returns these personas.

const PEOPLE = {
  "maya-pm": {
    candidate: { id: "maya-pm", name: "Maya Okafor", headline: "VP Product · Lumen Health", snippet: "Leads product for Lumen Health's care-navigation app. Previously Group PM at Ferrow Pay. Writes about onboarding and trust in health apps.", url: "https://lumenhealth.example/team/maya-okafor", image: null, region: "London, UK" },
    identity: { match_confidence: 94, match_reason: "Company page, conference bio and two interviews share the same role history and photo." },
    sources: [
      { id: 1, url: "https://lumenhealth.example/team/maya-okafor", title: "Leadership — Lumen Health", site: "lumenhealth.example", date: "2026-06-02" },
      { id: 2, url: "https://productconf.example/2026/speakers/okafor", title: "Speaker: Maya Okafor — ProductConf 2026", site: "productconf.example", date: "2026-03-14" },
      { id: 3, url: "https://healthtechweekly.example/interviews/okafor-onboarding", title: "‘Trust is the onboarding’: an interview with Maya Okafor", site: "healthtechweekly.example", date: "2025-11-20" },
      { id: 4, url: "https://mayaokafor.example/writing/fewer-screens", title: "Fewer screens, more certainty (blog)", site: "mayaokafor.example", date: "2026-08-09" },
      { id: 5, url: "https://ferrowpay.example/blog/2023-team-update", title: "Ferrow Pay team update, 2023", site: "ferrowpay.example", date: "2023-05-01" },
    ],
    facts: [
      { category: "role", text: "VP Product at Lumen Health since early 2024, owning the care-navigation app.", source_ids: [1, 2], confidence: "high", as_of: "2026-06" },
      { category: "company", text: "Previously Group PM at Ferrow Pay, leading merchant onboarding.", source_ids: [5, 2], confidence: "high", as_of: "2023" },
      { category: "talk", text: "Spoke at ProductConf 2026 on cutting onboarding steps without hurting activation.", source_ids: [2], confidence: "high", as_of: "2026-03" },
      { category: "publication", text: "Recent post argues health apps should ask fewer questions up front and explain every data request.", source_ids: [4], confidence: "high", as_of: "2026-08" },
      { category: "education", text: "MSc in Human–Computer Interaction (mentioned in conference bio; institution not named).", source_ids: [2], confidence: "medium", as_of: "" },
    ],
    common_ground: [
      { text: "You both care about onboarding metrics — she has published specific numbers on activation.", source_ids: [3] },
      { text: "Fintech background overlaps with payments work at Ferrow Pay.", source_ids: [5] },
    ],
    avoid: ["Don't pitch features that add onboarding steps without a clear trust payoff — it's her stated pet peeve.", "Her Ferrow Pay role ended in 2023; don't treat it as current."],
    gaps: ["No public info on team size or budget ownership.", "Unclear who she reports to at Lumen Health."],
    themes: { topic: "onboarding & trust in health apps", recent: "her August post on fewer screens", company: "Lumen Health" },
  },
  "maya-ceramics": {
    candidate: { id: "maya-ceramics", name: "Maya Okafor", headline: "Ceramicist & teacher · Kiln Street Studio", snippet: "Runs wheel-throwing classes and sells functional stoneware. Exhibited at the Harbour Craft Fair.", url: "https://kilnstreet.example/about", image: null, region: "Bristol, UK" },
    identity: { match_confidence: 88, match_reason: "Studio site and craft-fair listing describe the same studio; clearly a different person from the Lumen Health VP." },
    sources: [
      { id: 1, url: "https://kilnstreet.example/about", title: "About — Kiln Street Studio", site: "kilnstreet.example", date: "2026-02-10" },
      { id: 2, url: "https://harbourcraft.example/2025/makers", title: "Harbour Craft Fair 2025 — Makers", site: "harbourcraft.example", date: "2025-09-01" },
    ],
    facts: [
      { category: "role", text: "Founder of Kiln Street Studio, teaching beginner and intermediate wheel-throwing.", source_ids: [1], confidence: "high", as_of: "2026-02" },
      { category: "project", text: "Exhibited functional stoneware at Harbour Craft Fair 2025.", source_ids: [2], confidence: "high", as_of: "2025-09" },
    ],
    common_ground: [],
    avoid: ["Don't confuse with Maya Okafor of Lumen Health — different person."],
    gaps: ["Very little public professional information beyond the studio."],
    themes: { topic: "running a small craft business", recent: "the Harbour Craft Fair", company: "Kiln Street Studio" },
  },
  "daniel": {
    candidate: { id: "daniel", name: "Daniel Reyes", headline: "Co-founder & CEO · Kelpworks Robotics", snippet: "Building autonomous underwater drones for aquaculture inspection. Ex-marine engineer. Seed round led by Ocean Ventures (fictional).", url: "https://kelpworks.example/team", image: null, region: "Lisbon, Portugal" },
    identity: { match_confidence: 91, match_reason: "Company site, funding announcement and GitHub org all reference the same founder and product." },
    sources: [
      { id: 1, url: "https://kelpworks.example/team", title: "Team — Kelpworks Robotics", site: "kelpworks.example", date: "2026-07-01" },
      { id: 2, url: "https://startupnews.example/kelpworks-seed", title: "Kelpworks raises seed to automate fish-farm inspection", site: "startupnews.example", date: "2026-04-22" },
      { id: 3, url: "https://code.example/kelpworks", title: "kelpworks — open-source sonar tooling", site: "code.example", date: "2026-09-12" },
      { id: 4, url: "https://bluepodcast.example/ep/88", title: "Blue Economy Podcast #88: Robots under the sea", site: "bluepodcast.example", date: "2026-05-30" },
    ],
    facts: [
      { category: "role", text: "Co-founder and CEO of Kelpworks Robotics (founded 2024).", source_ids: [1, 2], confidence: "high", as_of: "2026-07" },
      { category: "company", text: "Raised a seed round in April 2026 to scale drone inspections for salmon farms.", source_ids: [2], confidence: "high", as_of: "2026-04" },
      { category: "project", text: "Maintains an open-source sonar-processing library; active commits this month.", source_ids: [3], confidence: "high", as_of: "2026-09" },
      { category: "talk", text: "On a podcast, said hiring embedded engineers is their biggest bottleneck.", source_ids: [4], confidence: "medium", as_of: "2026-05" },
      { category: "education", text: "Background in marine engineering (degree mentioned on podcast; school not named).", source_ids: [4], confidence: "low", as_of: "" },
    ],
    common_ground: [{ text: "Open-source — his sonar library welcomes outside contributors.", source_ids: [3] }],
    avoid: ["Don't lead with valuation questions; he deflected them on the podcast.", "Revenue figures are not public — don't quote any."],
    gaps: ["No public info on revenue or customer count.", "Co-founder's name not listed on the team page."],
    themes: { topic: "underwater robotics for aquaculture", recent: "the April seed round", company: "Kelpworks Robotics" },
  },
  "aiko": {
    candidate: { id: "aiko", name: "Aiko Tanabe", headline: "Principal Data Scientist · Northwind Grocers", snippet: "Forecasting and pricing at a regional grocery chain. Kaggle competitions grandmaster. Speaks on causal inference.", url: "https://northwindgrocers.example/careers/data", image: null, region: "Osaka, Japan" },
    identity: { match_confidence: 86, match_reason: "Employer page and meetup talk match; one older profile under a similar name was excluded." },
    sources: [
      { id: 1, url: "https://northwindgrocers.example/careers/data", title: "Data team — Northwind Grocers", site: "northwindgrocers.example", date: "2026-05-15" },
      { id: 2, url: "https://causalmeetup.example/talks/tanabe-pricing", title: "Causal pricing experiments at a grocery scale", site: "causalmeetup.example", date: "2026-01-28" },
      { id: 3, url: "https://competitions.example/users/atanabe", title: "atanabe — competition profile", site: "competitions.example", date: "2026-08-30" },
    ],
    facts: [
      { category: "role", text: "Principal Data Scientist working on demand forecasting and pricing.", source_ids: [1], confidence: "high", as_of: "2026-05" },
      { category: "talk", text: "Gave a meetup talk on running causal pricing experiments across 300 stores.", source_ids: [2], confidence: "high", as_of: "2026-01" },
      { category: "project", text: "Top-ranked competitor on a data-science competition platform.", source_ids: [3], confidence: "medium", as_of: "2026-08" },
    ],
    common_ground: [],
    avoid: ["An older profile with a similar name (different city) was excluded — don't mix them up."],
    gaps: ["Education not found in public sources.", "Team size unknown."],
    themes: { topic: "causal inference for pricing", recent: "her meetup talk on pricing experiments", company: "Northwind Grocers" },
  },
};

const PURPOSE_COPY = {
  "Sales call": { lead: "For a sales call", ask: (t) => [`What's the hardest part of ${t.topic} for your team right now?`, `How do you evaluate new tools at ${t.company}?`, `Who else would weigh in on a decision like this?`] },
  "Hiring": { lead: "For a hiring conversation", ask: (t) => [`What would you want to own in your first 90 days?`, `What did you learn from ${t.recent}?`, `What kind of team do you do your best work in?`] },
  "Investor meeting": { lead: "For an investor meeting", ask: (t) => [`What's your thesis on ${t.topic}?`, `What would make you lean in after ${t.recent}?`, `How do you like to work with founders after investing?`] },
  "Partnership": { lead: "For a partnership chat", ask: (t) => [`Where does ${t.company} want outside partners today?`, `What made past partnerships work — or not?`, `What would a small first pilot look like?`] },
  "Networking": { lead: "For a networking coffee", ask: (t) => [`How did you get into ${t.topic}?`, `What surprised you about ${t.recent}?`, `Who should I be learning from in this space?`] },
  "Podcast / event": { lead: "For a podcast or event invite", ask: (t) => [`What's a contrarian view you hold on ${t.topic}?`, `What's the story behind ${t.recent}?`, `What should the audience try after listening?`] },
};

function candidates(name) {
  const q = String(name || "").toLowerCase();
  const all = Object.values(PEOPLE).map((p) => p.candidate);
  const hits = all.filter((c) => q.split(/\s+/).some((w) => w.length > 2 && c.name.toLowerCase().includes(w)));
  return (hits.length ? hits : all).map((c) => ({ ...c, demo: true }));
}

function brief(candidate, purpose) {
  const p = PEOPLE[candidate.id] || PEOPLE["maya-pm"];
  const copy = PURPOSE_COPY[purpose] || PURPOSE_COPY["Networking"];
  const t = p.themes;
  const topFact = p.facts[0];
  return {
    demo: true,
    purpose,
    generatedAt: new Date().toISOString(),
    identity: { name: p.candidate.name, headline: p.candidate.headline, region: p.candidate.region, ...p.identity },
    tldr: `${copy.lead} with ${p.candidate.name} (${p.candidate.headline}): ${topFact.text} Open with ${t.recent} — it's recent and squarely on ${t.topic}.`,
    facts: p.facts,
    talking_points: [
      { point: `Ask about ${t.recent}.`, why: "It's their most recent public work, so it's top of mind.", source_ids: [p.sources[p.sources.length > 3 ? 3 : 0].id] },
      { point: `Connect your agenda to ${t.topic}.`, why: "It's the theme that runs through every source.", source_ids: p.sources.slice(0, 2).map((s) => s.id) },
      { point: `Reference their work at ${t.company} specifically, not the industry in general.`, why: "Shows you did your homework without being creepy.", source_ids: [1] },
    ],
    common_ground: p.common_ground,
    questions_to_ask: copy.ask(t),
    avoid: p.avoid,
    gaps: p.gaps,
    sources: p.sources,
  };
}

function answer(b, question) {
  const q = question.toLowerCase();
  if (/address|live|phone|married|wife|husband|kids|children|salary|age|religio|politic|health|dating/.test(q)) {
    return "That's personal information outside Prelude's scope — briefs cover professional context only. You could ask instead about their current role or recent work.";
  }
  const words = q.split(/\W+/).filter((w) => w.length > 3);
  const fact = b.facts.find((f) => words.some((w) => f.text.toLowerCase().includes(w))) || b.facts[0];
  return `${fact.text} [${fact.source_ids.join("][")}] (Demo answer — connect API keys for real follow-ups.)`;
}

const api = { candidates, brief, answer };
if (typeof module !== "undefined") module.exports = api;
else window.PreludeDemo = api;
