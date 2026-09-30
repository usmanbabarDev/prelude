// Shared by server.js (Node) and the static build (browser).
// Fictional sample people for DEMO mode. None of these people exist; every
// source uses the reserved .example TLD. Demo mode never invents data about a
// real name someone types — it always returns these personas.

const PEOPLE = {
  "maya-pm": {
    candidate: { id: "maya-pm", name: "Maya Okafor", headline: "VP Product · Lumen Health", snippet: "Leads product for Lumen Health's care-navigation app. Previously Group PM at Ferrow Pay. Writes about onboarding and trust in health apps.", url: "https://lumenhealth.example/team/maya-okafor", region: "London, UK" },
    identity: { match_confidence: 94, match_reason: "Company page, conference bio, blog and two interviews share the same role history, photo and handle." },
    summary: "Maya Okafor is VP Product at Lumen Health [1], where she leads the care-navigation app. Before that she was a Group PM at Ferrow Pay working on merchant onboarding [5]. She speaks and writes regularly about reducing onboarding friction and earning user trust in health apps [2][4], and was featured in HealthTech Weekly in 2025 [3].",
    location: { region: "London, UK", source_ids: [1, 2] },
    social: [
      { platform: "linkedin", handle: "in/mayaokafor", url: "https://linkedin.example/in/mayaokafor", source_id: 6 },
      { platform: "x", handle: "@mayabuilds", url: "https://x.example/mayabuilds", source_id: 7 },
      { platform: "website", handle: "mayaokafor.example", url: "https://mayaokafor.example", source_id: 4 },
    ],
    experience: [
      { title: "VP Product", org: "Lumen Health", period: "2024 – present", source_ids: [1, 6] },
      { title: "Group Product Manager", org: "Ferrow Pay", period: "2020 – 2023", source_ids: [5, 6] },
      { title: "Product Manager", org: "Brightline Travel", period: "2017 – 2020", source_ids: [6] },
    ],
    education: [
      { school: "University College (name not public)", degree: "MSc Human–Computer Interaction", period: "", source_ids: [2] },
    ],
    mentions: [
      { type: "talk", title: "Cutting onboarding steps without hurting activation — ProductConf 2026", date: "2026-03", source_id: 2 },
      { type: "interview", title: "‘Trust is the onboarding’ — HealthTech Weekly", date: "2025-11", source_id: 3 },
      { type: "article", title: "Fewer screens, more certainty (personal blog)", date: "2026-08", source_id: 4 },
    ],
    topics: ["Product management", "Onboarding", "Health tech", "Fintech", "UX research"],
    gaps: ["No public information on team size.", "Undergraduate education not found."],
    sources: [
      { id: 1, url: "https://lumenhealth.example/team/maya-okafor", title: "Leadership — Lumen Health", site: "lumenhealth.example", date: "2026-06-02" },
      { id: 2, url: "https://productconf.example/2026/speakers/okafor", title: "Speaker: Maya Okafor — ProductConf 2026", site: "productconf.example", date: "2026-03-14" },
      { id: 3, url: "https://healthtechweekly.example/interviews/okafor-onboarding", title: "‘Trust is the onboarding’: an interview with Maya Okafor", site: "healthtechweekly.example", date: "2025-11-20" },
      { id: 4, url: "https://mayaokafor.example/writing/fewer-screens", title: "Fewer screens, more certainty", site: "mayaokafor.example", date: "2026-08-09" },
      { id: 5, url: "https://ferrowpay.example/blog/2023-team-update", title: "Ferrow Pay team update, 2023", site: "ferrowpay.example", date: "2023-05-01" },
      { id: 6, url: "https://linkedin.example/in/mayaokafor", title: "Maya Okafor — LinkedIn", site: "linkedin.example", date: null },
      { id: 7, url: "https://x.example/mayabuilds", title: "Maya Okafor (@mayabuilds) — X", site: "x.example", date: null },
    ],
  },
  "maya-ceramics": {
    candidate: { id: "maya-ceramics", name: "Maya Okafor", headline: "Ceramicist & teacher · Kiln Street Studio", snippet: "Runs wheel-throwing classes and sells functional stoneware. Exhibited at the Harbour Craft Fair.", url: "https://kilnstreet.example/about", region: "Bristol, UK" },
    identity: { match_confidence: 88, match_reason: "Studio site, Instagram-style portfolio and craft-fair listing describe the same studio. Clearly a different person from the Lumen Health VP." },
    summary: "This Maya Okafor is a ceramicist who founded Kiln Street Studio in Bristol, where she teaches wheel-throwing classes [1]. She exhibited functional stoneware at the Harbour Craft Fair in 2025 [2].",
    location: { region: "Bristol, UK", source_ids: [1] },
    social: [
      { platform: "instagram", handle: "@kilnstreetmaya", url: "https://instagram.example/kilnstreetmaya", source_id: 3 },
      { platform: "website", handle: "kilnstreet.example", url: "https://kilnstreet.example", source_id: 1 },
    ],
    experience: [{ title: "Founder & teacher", org: "Kiln Street Studio", period: "2019 – present", source_ids: [1] }],
    education: [],
    mentions: [{ type: "event", title: "Harbour Craft Fair 2025 — featured maker", date: "2025-09", source_id: 2 }],
    topics: ["Ceramics", "Teaching", "Small business"],
    gaps: ["Education not found in public sources."],
    sources: [
      { id: 1, url: "https://kilnstreet.example/about", title: "About — Kiln Street Studio", site: "kilnstreet.example", date: "2026-02-10" },
      { id: 2, url: "https://harbourcraft.example/2025/makers", title: "Harbour Craft Fair 2025 — Makers", site: "harbourcraft.example", date: "2025-09-01" },
      { id: 3, url: "https://instagram.example/kilnstreetmaya", title: "Kiln Street (@kilnstreetmaya)", site: "instagram.example", date: null },
    ],
  },
  "daniel": {
    candidate: { id: "daniel", name: "Daniel Reyes", headline: "Co-founder & CEO · Kelpworks Robotics", snippet: "Building autonomous underwater drones for aquaculture inspection. Ex-marine engineer.", url: "https://kelpworks.example/team", region: "Lisbon, Portugal" },
    identity: { match_confidence: 91, match_reason: "Company site, funding announcement, GitHub org and podcast all reference the same founder and product." },
    summary: "Daniel Reyes is co-founder and CEO of Kelpworks Robotics, which builds underwater inspection drones for fish farms [1]. The company raised a seed round in April 2026 [2]. He maintains an open-source sonar library on GitHub [3] and has talked on podcasts about hiring embedded engineers [4].",
    location: { region: "Lisbon, Portugal", source_ids: [1, 2] },
    social: [
      { platform: "github", handle: "dreyes-kelp", url: "https://github.example/dreyes-kelp", source_id: 3 },
      { platform: "linkedin", handle: "in/danielreyes-kelp", url: "https://linkedin.example/in/danielreyes-kelp", source_id: 5 },
      { platform: "x", handle: "@danreyes_sea", url: "https://x.example/danreyes_sea", source_id: 6 },
    ],
    experience: [
      { title: "Co-founder & CEO", org: "Kelpworks Robotics", period: "2024 – present", source_ids: [1, 5] },
      { title: "Marine Systems Engineer", org: "Atlantic Offshore Group", period: "2018 – 2024", source_ids: [5] },
    ],
    education: [{ school: "Instituto Técnico (fictional)", degree: "MEng Naval & Marine Engineering", period: "2013 – 2018", source_ids: [5] }],
    mentions: [
      { type: "news", title: "Kelpworks raises seed to automate fish-farm inspection", date: "2026-04", source_id: 2 },
      { type: "podcast", title: "Blue Economy Podcast #88: Robots under the sea", date: "2026-05", source_id: 4 },
      { type: "project", title: "kelpworks/sonar-tools — open-source sonar processing", date: "2026-09", source_id: 3 },
    ],
    topics: ["Robotics", "Aquaculture", "Open source", "Startups", "Sonar"],
    gaps: ["Revenue and customer count are not public."],
    sources: [
      { id: 1, url: "https://kelpworks.example/team", title: "Team — Kelpworks Robotics", site: "kelpworks.example", date: "2026-07-01" },
      { id: 2, url: "https://startupnews.example/kelpworks-seed", title: "Kelpworks raises seed to automate fish-farm inspection", site: "startupnews.example", date: "2026-04-22" },
      { id: 3, url: "https://github.example/dreyes-kelp", title: "dreyes-kelp — GitHub", site: "github.example", date: "2026-09-12" },
      { id: 4, url: "https://bluepodcast.example/ep/88", title: "Blue Economy Podcast #88", site: "bluepodcast.example", date: "2026-05-30" },
      { id: 5, url: "https://linkedin.example/in/danielreyes-kelp", title: "Daniel Reyes — LinkedIn", site: "linkedin.example", date: null },
      { id: 6, url: "https://x.example/danreyes_sea", title: "Daniel Reyes (@danreyes_sea) — X", site: "x.example", date: null },
    ],
  },
  "aiko": {
    candidate: { id: "aiko", name: "Aiko Tanabe", headline: "Principal Data Scientist · Northwind Grocers", snippet: "Forecasting and pricing at a regional grocery chain. Speaks on causal inference.", url: "https://northwindgrocers.example/careers/data", region: "Osaka, Japan" },
    identity: { match_confidence: 86, match_reason: "Employer page, meetup talk and competition profile match. One older profile under a similar name was excluded." },
    summary: "Aiko Tanabe is a Principal Data Scientist at Northwind Grocers working on demand forecasting and pricing [1]. She gave a meetup talk on running causal pricing experiments across 300 stores [2] and ranks highly on a data-science competition platform [3].",
    location: { region: "Osaka, Japan", source_ids: [1] },
    social: [
      { platform: "github", handle: "atanabe", url: "https://github.example/atanabe", source_id: 4 },
      { platform: "website", handle: "competitions.example/atanabe", url: "https://competitions.example/users/atanabe", source_id: 3 },
    ],
    experience: [{ title: "Principal Data Scientist", org: "Northwind Grocers", period: "2022 – present", source_ids: [1] }],
    education: [],
    mentions: [
      { type: "talk", title: "Causal pricing experiments at grocery scale", date: "2026-01", source_id: 2 },
      { type: "project", title: "Top-ranked competition profile", date: "2026-08", source_id: 3 },
    ],
    topics: ["Data science", "Causal inference", "Forecasting", "Retail"],
    gaps: ["Education not found.", "An older profile with a similar name (different city) was excluded."],
    sources: [
      { id: 1, url: "https://northwindgrocers.example/careers/data", title: "Data team — Northwind Grocers", site: "northwindgrocers.example", date: "2026-05-15" },
      { id: 2, url: "https://causalmeetup.example/talks/tanabe-pricing", title: "Causal pricing experiments at a grocery scale", site: "causalmeetup.example", date: "2026-01-28" },
      { id: 3, url: "https://competitions.example/users/atanabe", title: "atanabe — competition profile", site: "competitions.example", date: "2026-08-30" },
      { id: 4, url: "https://github.example/atanabe", title: "atanabe — GitHub", site: "github.example", date: null },
    ],
  },
};

function candidates(name) {
  const q = String(name || "").toLowerCase();
  const all = Object.values(PEOPLE).map((p) => p.candidate);
  const hits = all.filter((c) => q.split(/\s+/).some((w) => w.length > 2 && c.name.toLowerCase().includes(w)));
  return (hits.length ? hits : all).map((c) => ({ ...c, demo: true }));
}

function profile(candidate) {
  const p = PEOPLE[candidate.id] || PEOPLE["maya-pm"];
  const { candidate: c, ...rest } = p;
  return {
    demo: true,
    generatedAt: new Date().toISOString(),
    ...rest,
    identity: { name: c.name, headline: c.headline, ...p.identity },
  };
}

function answer(prof, question) {
  const q = question.toLowerCase();
  if (/address|where .*live|phone|number|email|married|wife|husband|kids|children|relative|family|age|born|religio|politic|health/.test(q)) {
    return "Profiles don't include home addresses, phone numbers, personal emails or family details. Try asking about their work, projects or public appearances.";
  }
  if (/work|job|role|company|doing/.test(q)) {
    const e = prof.experience[0];
    return `${prof.identity.name} is currently ${e.title} at ${e.org} (${e.period}). ${e.source_ids.map((i) => `[${i}]`).join("")} (Demo answer — connect API keys for real follow-ups.)`;
  }
  if (/social|twitter|linkedin|github|instagram|online/.test(q)) {
    return `Public profiles found: ${prof.social.map((s) => `${s.platform} ${s.handle} [${s.source_id}]`).join(", ")}. (Demo answer.)`;
  }
  const m = prof.mentions[0];
  return `${prof.summary.split(". ")[0]}. Most recent public mention: “${m.title}” (${m.date}) [${m.source_id}]. (Demo answer — connect API keys for real follow-ups.)`;
}

const api = { candidates, profile, answer };
if (typeof module !== "undefined") module.exports = api;
else window.PreludeDemo = api;
