# Prelude: know who you're meeting

**Live demo:** https://usmanbabardev.github.io/prelude/ (static build with fictional people; runs entirely in the browser)

A mobile-first web app (it can be installed on a phone) that gives you a short, sourced brief on the person you're about to meet, written for the reason you're meeting them.

## Run

```bash
cd prelude
npm install
npm start            # http://localhost:5173, runs in DEMO mode with fictional people
```

To search real people, set both keys and restart:

```bash
ANTHROPIC_API_KEY=... EXA_API_KEY=... npm start
```

- **Exa** (`category: "people"`, about $7 per 1k searches) finds the candidate profiles and the web pages that mention them.
- **Claude Opus 5.5** writes the brief. It returns structured JSON, and every claim cites a source id. It also answers follow-up questions. Refusal fallback is turned on (`fallbacks: "default"`).

## Research summary

**deepsearch.bio** is an AI people-search tool: "find anyone by name". You type a name, pick the right match, and get a profile built from LinkedIn, GitHub, X and web mentions, plus follow-up chat. Pricing is $7.99/week, $19.99/month or $59.99/year, with a soft cap of 25 lookups a day. You have to sign in before you see results. It says it is not FCRA-compliant, and the people looked up are never notified. The mobile app launched in December 2025 and has a small review base.

**The niche has two tiers:**

| Tier | Examples | Price | Weakness |
|---|---|---|---|
| Consumer "people finder" apps | DeepSearch, Deepsearch AI (TapSuite), PeopleFinders, Spokeo | $8/week to $40/month | Paywall after a "free" promise, weekly auto-renew traps, stale or wrong data, stalking risk |
| B2B sourcing and sales tools | Juicebox/PeopleGPT, HireEZ, SeekOut, Clay, Crystal, Humantic, Sybill, Happenstance | $185 to $800+/month | Desktop-only, built for teams and bulk lists, heavy onboarding |
| Infrastructure | Exa People Search (1B+ profiles), Perplexity Agent API | per call | Developer-only |

**Main complaints in reviews:** a "free" app that then asks for about $40, billing that is hard to cancel, results that are outdated or wrong, and "I had to feed it my own info".

## The gap Prelude targets

1. **Purpose first.** You pick why you're meeting (sales, hiring, investing, partnership, networking, podcast). You get talking points, questions to ask and things to avoid, not just a pile of facts.
2. **Every claim is sourced and scored.** Each fact has a citation, an "as of" date and a confidence level. There is an identity-match score. It won't merge two people just because they share a name. Anything it couldn't find is listed under "What we couldn't verify".
3. **Professional context only.** It doesn't search by phone number, email or address, and it won't give out home location, family, health and similar details. This rule is enforced in both the prompt and the UI.
4. **The subject has a say.** Every brief has an "Is this you?" link to request a correction or removal. Removed people are filtered out of search results.
5. **Honest pricing.** 5 free briefs a month with no card, $12/month for Pro, or $6 for a 10-brief pack that never expires. No weekly plans and no paywall before the first result.
6. **Built around meetings, mobile first.** A meetings list with one-tap prep, briefs saved for offline use, a share sheet, and install to your home screen. Calendar sync is on the roadmap.

## Structure

```
server.js      Node http server: /api/candidates, /api/brief, /api/ask, /api/optout
public/        index.html, app.css, app.js (vanilla, hash router), sw.js, manifest
  demo-data.js Fictional personas (reserved .example domains), shared by the server and the static build
.github/       GitHub Pages workflow that publishes public/ as the static demo
```

Without a server (e.g. on GitHub Pages) the front end answers its own API calls from the demo data. Works on Node 17+. The `undici` package supplies `fetch` on Node versions older than 18.

## Not built yet

Payments, accounts and server-side storage, calendar OAuth, email delivery before a meeting, and team workspaces.
