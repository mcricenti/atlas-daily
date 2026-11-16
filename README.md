# Atlas Daily

GitHub: [mcricenti/atlas-daily](https://github.com/mcricenti/atlas-daily)

A geography learning app for kids built around **direct instruction** and **spaced repetition**. About **10 minutes a day**.

## What kids learn

Progressive path:

1. U.S. states & capitals (by region)
2. Seven continents & five oceans
3. North America countries & capitals
4. South America countries & capitals
5. Europe countries & capitals
6. Africa countries & capitals
7. Asia countries & capitals
8. Oceania & rest-of-world countries & capitals
9. Rivers, mountains & landmarks

## How a lesson works

Inspired by strong patterns from apps like Yonder, US States Trainer, Geo Touch, and Classical Quest:

- **I Do** — clear teach step with map pin and a memorable clue
- **We Do** — guided multiple-choice with scaffolding
- **You Do** — capital recall and map location
- **Spaced review** — due cards return on expanding intervals until mastered

Progress stays on the device (localStorage). Multiple explorers (siblings) are supported.

### Section final review

On the **Trail map**, each unlocked unit has **Final review · worksheet**:

- Electronic fill-in blanks with a **word bank** (place names and capitals)
- **Print worksheet** for paper practice (name/date line + answer key at bottom)

## Run locally

```bash
npm install
npm run dev
```

Dev server: [http://127.0.0.1:3847](http://127.0.0.1:3847)

## Deploy to Cloudflare Workers

Local:

```bash
npm run deploy
```

### Live sites

- **Workers (latest preview):** https://atlas-daily.colossal-plough.workers.dev  
  Claim into your Cloudflare account (60‑minute window when freshly deployed): use the claim link from the latest deploy output / chat.
- **Workers (earlier claimed):** https://atlas-daily.wirehaired-jingle.workers.dev — redeploy after claim/`wrangler login` to refresh.

Note: `https://atlas-daily.pages.dev` is a **different** Cloudflare project (an intelligence feed), not this geography app.

### GitHub → Cloudflare Pages (`atlas-daily-1te`)

This repo is also linked as Pages project **atlas-daily-1te**. In the dashboard, set:

- **Build command:** `npm run build`
- **Build output directory:** `dist` (required — if this is `/` or empty, Pages serves the Vite source and the app breaks)

Then push to `main` (or Retry deployment).

## Stack

- React + TypeScript + Vite
- Tailwind CSS
- Framer Motion
- Cloudflare Workers (SPA assets)
