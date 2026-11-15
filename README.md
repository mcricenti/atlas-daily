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

### Connect GitHub (auto-deploy on push)

**Option A — Workers Builds (recommended)**

1. Open [Workers & Pages](https://dash.cloudflare.com/?to=/:account/workers-and-pages)
2. Select the **atlas-daily** Worker (the one you claimed)
3. **Settings → Builds → Connect**
4. Authorize the Cloudflare GitHub App if prompted
5. Choose repo **mcricenti/atlas-daily**, branch **main**
6. Build command: `npm run build` · Deploy command: `npx wrangler deploy`

**Option B — GitHub Actions**

1. Create a Cloudflare API token with **Edit Cloudflare Workers**
2. In GitHub → **Settings → Secrets and variables → Actions**, add:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
3. Push to `main` (or run the **Deploy to Cloudflare Workers** workflow)

Uses the Cloudflare Vite plugin + Workers static assets (`wrangler.jsonc`). Worker name must stay `atlas-daily` to match the dashboard.

## Stack

- React + TypeScript + Vite
- Tailwind CSS
- Framer Motion
- Cloudflare Workers (SPA assets)
