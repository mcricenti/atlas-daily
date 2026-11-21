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

- **I Do** — a short narrated map tour of each new place (see below)
- **We Do** — guided multiple-choice with scaffolding
- **You Do** — capital recall and map location
- **Spaced review** — due cards return on expanding intervals until mastered

### Long-term spaced review

- Every daily lesson pulls in places that are **due from every unit learned so far**, most overdue first.
  On heavy review days fewer new places are introduced (3 → 2 → 1 → 0), so lessons stay about 10 minutes.
- Each correct answer pushes the next review further out (about 1 day → 3 days → a week → weeks → months);
  a miss brings it back soon and re-asks it later in the same lesson in an easier form (max 5 retries).
- **Difficulty ladder** — questions get harder as a place becomes familiar:
  - Level 1: pick from a clue, pick the capital, tap it on a labelled map
  - Level 2: capital → which place, flags, "which of these shares a border?"
  - Level 3: type the capital (spelling slips allowed), tap it on a map with no names, "which is bigger?"

### Fun extras

- **My Atlas** — U.S. and world maps that color in as places go from Learning → Strong → Mastered,
  a **passport** with a stamp (flag) for every country known well, continent badges, and trophies.
- **Weekly challenge** — opens about once a week after 10 places; 15 harder mixed questions from everything
  learned, favouring missed places; gold/silver/bronze trophies.
- **Map games** (home screen) — two games on real maps, 10 places a round, stars and coins:
  - **Find it!** — see a name ("Find Texas!"), tap it on the map. A miss shows what was tapped and a hint
    circle for a second try. Works for states, countries, continents, oceans (tap the water), rivers (tap
    along the course), mountains and landmarks; tiny islands count if you tap close.
  - **What's this?** — a place lights up; pick its name from four choices.
  - A map opens once 3 of its places are learned (all of them once the unit is done), plus an
    "Everything I've learned" mix. Missed places come back in the next daily lesson. Logic in
    `src/lib/mapGames.ts`, screen in `src/components/MapGames.tsx`.
- **Head-to-head** — two siblings take turns on one tablet, 5 questions each.
- **Memory tricks** for all 50 state capitals (`src/data/memoryHooks.ts`), shown in tours and after a miss.
- **Flags** for every country (`public/flags`, from the MIT-licensed flag-icons project).

### Narration in your own voice (MiniMax)

Tours play recorded clips from `public/voice/` when they exist and fall back to the device voice otherwise.
To record the narration (~1,140 lines, ~99k characters) in a MiniMax voice:

1. Get an API key at https://platform.minimax.io (Account → API Keys) and add some balance.
2. Create `.env.local` in the project folder (it is git-ignored):
   ```
   MINIMAX_API_KEY=...
   MINIMAX_VOICE_ID=...
   ```
3. `npm install`, then:
   - `npm run voice` — counts missing lines and estimates cost
   - `npm run voice -- --voices` — lists voice IDs your key can use
   - `npm run voice -- --clone recording.mp3 myvoice01` — clones a voice from a 10 s–5 min recording
   - `npm run voice -- --sample` — records 3 lines to listen to
   - `npm run voice -- --go` — records everything missing (safe to re-run; only new or changed lines)
4. Commit `public/voice` and push; GitHub Pages redeploys with your voice.

### Grown-ups page

Behind a simple multiplication gate on the home screen: places learned and mastered, an estimated
"memory today" score, a 2-week review forecast, a 4-week activity chart, tricky places, and progress by unit.

### Install and offline

The app has a web manifest and a service worker (`public/sw.js`), so it can be added to a tablet's home
screen and works offline after the first visit. Progress is stored per device.

`src/data/geo/geoFacts.ts` (borders and areas) is generated: `npx tsx scripts/build-geo-facts.ts`.

### Place tours

Every new place is introduced with a 30–45 second animated tour that plays like a short video:

1. **Find it** — the place glows on the whole U.S. or world map
2. **Fly in** — the camera zooms to the region while the clue is read
3. **Neighbors** — bordering states/countries light up one by one (worked out from the map data)
4. **Capital** — a star drops onto the capital
5. **Key facts** — nickname, population and a fun fact
6. **Say it** — recap to repeat out loud

Rivers, the Great Wall and the Great Barrier Reef draw themselves along their course. Narration uses the
device's built-in voice (Web Speech API) and can be muted; captions always show. Tours can be paused,
stepped through, replayed, and rewatched any time from the **Trail map** by tapping a place.

Tour content lives in:

- `src/data/funFacts.ts` — nickname and fun fact per place
- `src/data/geo/worldCoords.ts` — real coordinates, camera frames and river courses
- `src/lib/tour.ts` — the scene script and captions
- `public/geo/countries-50m.json` — world map (Natural Earth 1:50m via `world-atlas`, simplified)

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

- **GitHub Pages (main site):** https://mcricenti.github.io/atlas-daily/ — rebuilt automatically on every push
  to `main` by `.github/workflows/pages.yml`.

- **Workers:** https://atlas-daily.michael-cricenti.workers.dev  
- Older claim previews (`colossal-plough`, `wirehaired-jingle`) may lag — prefer GitHub Pages or the Workers URL above.

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
