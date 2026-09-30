# Prelude: find anyone by name

**Live (free mode):** https://usmanbabardev.github.io/prelude/ — searches real, well-known people with no API keys, straight from the browser.

Type a name, pick the right person, and get one AI-built profile from public web data: social profiles, work history, education, city/region, and web mentions (articles, talks, podcasts, news), plus an AI summary where every fact links to its source. Ask follow-up questions in chat.

## Search results (like Google for a name)

Searching a name opens a results page with two tabs:

- **Profiles**: every public profile found for the name, each with its photo, platform badge (LinkedIn, Instagram, X, Facebook, GitHub, TikTok, YouTube, Wikipedia, website), headline and snippet. Filter by platform, open the original profile, or tap **Full profile** for the AI-built profile.
- **Images**: a photo grid for the name. Every photo links back to the page it came from.
- **Search this name on**: one-tap Google site searches for LinkedIn, Instagram, X, Facebook, TikTok and Google Images, so you can go further for anyone.

Photos come only from searching the name. There is no face matching or reverse image search.

| | Free mode | Live mode |
|---|---|---|
| Profiles | Wikipedia + each person's official accounts listed on Wikidata | Google results via Serper (LinkedIn, ResearchGate, Academia, Instagram, X…), plus Exa's people index if `EXA_API_KEY` is set |
| Images | Wikipedia photo + Wikimedia Commons photos whose file name matches | Google Images via Serper; profile cards get the photo Google found on that page |

## Two modes

| | Free mode | Live mode |
|---|---|---|
| Who it finds | Notable people with a Wikipedia article | Anyone with a public web presence |
| Sources | Wikipedia, Wikidata (roles, education, awards, verified social accounts), Hacker News | Google (Serper) and/or Exa; Full profile pages summarised by Claude |
| Needs | Nothing — runs in the browser, works on GitHub Pages | `SERPER_API_KEY` on a server (Render). `ANTHROPIC_API_KEY` adds Full profile + chat; `EXA_API_KEY` adds more profiles |
| Follow-up chat | Rule-based answers from the profile | Claude, with citations |

The app checks `api/status` on load: if the server reports live mode it uses the server, otherwise it runs free mode in the browser. Free mode only reads professional properties from Wikidata (never spouse, children, relatives, date of birth or residence) and drops summary sentences about family or wealth.

## Deploy (live mode)

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/usmanbabarDev/prelude)

Click the button, sign in to Render, and paste your `SERPER_API_KEY` (serper.dev, 2,500 free searches, no card) when asked. That alone turns on Google-style results with photos for anyone. `ANTHROPIC_API_KEY` (Full profile pages and follow-up chat) and `EXA_API_KEY` (more LinkedIn profiles) are optional; leave them blank to skip. Render builds `render.yaml` (free web service) and gives you a `*.onrender.com` URL. Each visitor is limited to 10 profiles, 30 searches and 40 questions per hour. On the free plan the service sleeps after 15 idle minutes (first request then takes ~1 min), and removal requests in `optouts.json` reset on redeploy.

## Run locally

```bash
npm install
npm start            # http://localhost:5173, free mode unless API keys are set
```

To search anyone, set a Serper key and restart:

```bash
SERPER_API_KEY=... npm start                      # Google-style results for anyone
SERPER_API_KEY=... ANTHROPIC_API_KEY=... npm start # + Full profile pages and chat
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
  free-search.js  Free mode: Wikipedia + Wikidata + Hacker News lookups, in the browser
.github/       GitHub Pages workflow that publishes public/ (free mode)
```

Without a live server (e.g. on GitHub Pages) the front end runs free mode itself. Works on Node 17+. The `undici` package supplies `fetch` on Node versions older than 18.

## Not built yet

Payments, user accounts and server-side history, a moderation queue for removal requests, and hosting for live mode (GitHub Pages is static-only).
