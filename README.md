# Atlas Daily

GitHub: [mcricenti/atlas-daily](https://github.com/mcricenti/atlas-daily)

A geography learning app for kids built around **direct instruction** and **spaced repetition**. About **10 minutes a day**.

## What kids learn

Progressive path:

1. U.S. states & capitals (by region)
2. North America countries & capitals
3. South America countries & capitals
4. Seven continents & five oceans
5. Major rivers
6. Europe countries & capitals
7. Africa countries & capitals

## How a lesson works

Inspired by strong patterns from apps like Yonder, US States Trainer, Geo Touch, and Classical Quest:

- **I Do** — clear teach step with map pin and a memorable clue
- **We Do** — guided multiple-choice with scaffolding
- **You Do** — capital recall and map location
- **Spaced review** — due cards return on expanding intervals until mastered

Progress stays on the device (localStorage). Multiple explorers (siblings) are supported.

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

### GitHub → Cloudflare (connected)

Repo [mcricenti/atlas-daily](https://github.com/mcricenti/atlas-daily) is linked to **Cloudflare Pages**. Pushes to `main` auto-build and deploy.

- Production: https://atlas-daily.pages.dev
- Dashboard: [Pages → atlas-daily](https://dash.cloudflare.com/?to=/:account/pages)

Build settings (if you need to re-check): build command `npm run build`, output directory `dist`.

## Stack

- React + TypeScript + Vite
- Tailwind CSS
- Framer Motion
- Cloudflare Workers (SPA assets)
