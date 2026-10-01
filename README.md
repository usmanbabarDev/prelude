# Prelude: find anyone by name

**Live (free mode):** https://usmanbabardev.github.io/prelude/ — searches real, well-known people with no API keys, straight from the browser.

Type a name, pick the right person, and get one AI-built profile from public web data: social profiles, work history, education, city/region, and web mentions (articles, talks, podcasts, news), plus an AI summary where every fact links to its source. Ask follow-up questions in chat.

## Search results (like Google for a name)

Searching a name opens a results page with two tabs:

- **Profiles**: every public profile found for the name, each with its photo, platform badge (LinkedIn, Instagram, Facebook, X, TikTok, YouTube, Threads, Pinterest, GitHub, ResearchGate, Academia, Wikipedia, websites), headline and snippet. Dedicated social media searches look for Instagram/Facebook/TikTok and X/YouTube/GitHub/Threads/Pinterest accounts, and links to single posts (a tweet, reel or TikTok video) are turned into the account's profile link. Filter by platform or tap **Social** to see just social accounts.
- **Images**: a photo grid for the name. Every photo links back to the page it came from.
- **Search this name on**: one-tap Google site searches for LinkedIn, Instagram, X, Facebook, TikTok and Google Images, so you can go further for anyone.

Photos come only from searching the name. There is no face matching or reverse image search.

| | Free mode | Live mode |
|---|---|---|
| Profiles | Wikipedia + each person's official accounts listed on Wikidata | Google results via Serper (LinkedIn, ResearchGate, Academia, Instagram, X…), plus Exa's people index if `EXA_API_KEY` is set |
| Images | Wikipedia photo + Wikimedia Commons photos whose file name matches | Google Images via Serper; profile cards get the photo Google found on that page |

## Explore: famous people of every country

The **Explore** tab lists the 10 most famous living adults of each of the 196 countries (1,959 people), with photos. Tap anyone to search their profiles. The home page shows a "Famous around the world" row and, when the browser language includes a country (e.g. `en-PK`), a "Famous in <country>" row.

The list is built from Wikidata, not hand-picked:

- **Ranking:** number of Wikipedia language editions with an article about the person (Wikidata "sitelinks").
- **Filters:** living, adult, human, citizenship of the country. Wikidata keeps historical citizenships (people born in Bangladesh before 1971 are also "Pakistani"), so anyone whose English description names a different nationality and not this country's is skipped.
- **Photos:** each person's Wikidata image, as a direct Wikimedia Commons thumbnail.

Rebuild it any time (about 15 minutes):

```bash
FRESH=1 node scripts/build-famous.js
```

## Two modes

| | Free mode | Live mode |
|---|---|---|
| Who it finds | Notable people with a Wikipedia article | Anyone with a public web presence |
| Sources | Wikipedia, Wikidata (roles, education, awards, verified social accounts), Hacker News | Google (Serper) and/or Exa; Full profile pages summarised by Claude |
| Needs | Nothing — runs in the browser, works on GitHub Pages | A server (Render) with SearXNG (free, no key) and/or `SERPER_API_KEY`. `ANTHROPIC_API_KEY` adds Full profile + chat; `EXA_API_KEY` adds more profiles |
| Follow-up chat | Rule-based answers from the profile | Claude, with citations |

The app checks `api/status` on load: if the server reports live mode it uses the server, otherwise it runs free mode in the browser. Free mode only reads professional properties from Wikidata (never spouse, children, relatives, date of birth or residence) and drops summary sentences about family or wealth.

## Deploy (live mode)

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/usmanbabarDev/prelude)

Click the button and sign in to Render. The Blueprint creates two free services:

1. **`prelude-searxng`**: a SearXNG instance (open-source metasearch over Google, Bing, DuckDuckGo, Brave and others). **Free, no API key, no search cap.** It's unreliable by nature: the engines it queries can rate-limit or temporarily block it, and then the app shows "try again in a minute".
2. **`prelude`**: the app. `SEARXNG_URL` defaults to `https://prelude-searxng.onrender.com`; if Render gives the SearXNG service a different URL, paste that URL into `SEARXNG_URL` on the `prelude` service.

All keys are optional; leave them blank for a completely free setup:

- `SERPER_API_KEY` (serper.dev): real Google results and Google Images. Used first when set, with SearXNG as the fallback.
- `ANTHROPIC_API_KEY`: Full profile pages and follow-up chat.
- `EXA_API_KEY`: more LinkedIn profiles with photos.

`SEARCH_LIMIT_PER_HOUR` is `0` (unlimited searches). Full profiles and chat stay limited to 10 and 40 per visitor per hour because they cost money. On the free plan each service sleeps after 15 idle minutes, so the first search after that can take about a minute while both wake up. Removal requests in `optouts.json` reset on redeploy.

## Run locally

```bash
npm install
npm start            # http://localhost:5173, free mode unless API keys are set
```

To search anyone, point it at a SearXNG instance (free) or set a Serper key, and restart:

```bash
SEARXNG_URL=https://your-searxng.example npm start # free search for anyone (no key)
SERPER_API_KEY=... npm start                      # Google results for anyone
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
scripts/       build-famous.js (Explore data from Wikidata), thumbs.js, fix-thumbs.js
  famous.json  1,959 famous people, 10 per country (in public/)
searxng/       Dockerfile + settings.yml for the free SearXNG search service (JSON output on)
.github/       GitHub Pages workflow that publishes public/ (free mode)
```

Without a live server (e.g. on GitHub Pages) the front end runs free mode itself. Works on Node 17+. The `undici` package supplies `fetch` on Node versions older than 18.

## Not built yet

Payments, user accounts and server-side history, a moderation queue for removal requests, and hosting for live mode (GitHub Pages is static-only).
