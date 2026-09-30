# Prelude: find anyone by name

**Live demo:** https://usmanbabardev.github.io/prelude/ (static build with fictional people; runs entirely in the browser)

Type a name, pick the right person, and get one AI-built profile from public web data: social profiles, work history, education, city/region, and web mentions (articles, talks, podcasts, news), plus an AI summary where every fact links to its source. Ask follow-up questions in chat.

## Run

```bash
npm install
npm start            # http://localhost:5173, DEMO mode with fictional people
```

To search real people, set both keys and restart:

```bash
ANTHROPIC_API_KEY=... EXA_API_KEY=... npm start
```

- **Exa** finds candidate profiles (`category: "people"`), then runs three searches in parallel for the chosen person: social sites, the general web, and news.
- **Claude Opus 5.5** turns up to 18 sources into a structured profile (JSON schema) with source ids on every item, and answers follow-up questions. Refusal fallback is on (`fallbacks: "default"`).

## Limits (same as the market leader)

- Public web pages only. Search is by name; reverse lookups by phone, email or address are rejected.
- Location is city/region only. No home addresses, phone numbers, personal emails, relatives, dates of birth, health, religion or politics.
- Anyone can request correction or removal ("Is this you?"); removed profiles are filtered from results.
- Not a consumer reporting agency; not for employment, tenant, credit or insurance decisions.

## Pricing shown in the app

Free: 3 lookups a month. Monthly: $9.99 unlimited. Yearly: $49.99. No weekly plans (the competitor charges $7.99/week).

## Research summary

**deepsearch.bio** is an AI people-search tool: "find anyone by name". You type a name, pick the right match, and get a profile built from LinkedIn, GitHub, X and web mentions, plus follow-up chat. Pricing is $7.99/week, $19.99/month or $59.99/year, with a soft cap of 25 lookups a day. You have to sign in before you see results. It says it is not FCRA-compliant, and the people looked up are never notified. The mobile app launched in December 2025 and has a small review base.

**The niche has two tiers:**

| Tier | Examples | Price | Weakness |
|---|---|---|---|
| Consumer "people finder" apps | DeepSearch, Deepsearch AI (TapSuite), PeopleFinders, Spokeo | $8/week to $40/month | Paywall after a "free" promise, weekly auto-renew traps, stale or wrong data, stalking risk |
| B2B sourcing and sales tools | Juicebox/PeopleGPT, HireEZ, SeekOut, Clay, Crystal, Humantic, Sybill, Happenstance | $185 to $800+/month | Desktop-only, built for teams and bulk lists, heavy onboarding |
| Infrastructure | Exa People Search (1B+ profiles), Perplexity Agent API | per call | Developer-only |

**Main complaints in reviews:** a "free" app that then asks for about $40, billing that is hard to cancel, results that are outdated or wrong, and "I had to feed it my own info".

## Structure

```
server.js      Node http server: /api/candidates, /api/profile, /api/ask, /api/optout
public/        index.html, app.css, app.js (vanilla, hash router), sw.js, manifest
  demo-data.js Fictional personas (reserved .example domains), shared by the server and the static build
.github/       GitHub Pages workflow that publishes public/ as the static demo
```

Without a server (e.g. on GitHub Pages) the front end answers its own API calls from the demo data. Works on Node 17+. The `undici` package supplies `fetch` on Node versions older than 18.

## Not built yet

Payments, user accounts and server-side history, a moderation queue for removal requests, and hosting for live mode (GitHub Pages is static-only).
