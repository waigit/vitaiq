# VitaIQ — vitalstats.netlify.app

Free Apple Watch health dashboard + nutrition tracking + AI coach.
Rebuilt on 9 Nov 2026 from the live site (deploy of 16 Sep 2026) after the iMac was reformatted, plus the newer dashboard.

## How changes go live (no Mac needed)

Code lives on GitHub at **waigit/vitaiq** (branch `main`). Netlify project **vitalstats** is linked to it:
every push to `main` is built by Netlify (`npm run build`, publish `dist`, functions `netlify/functions`,
all from `netlify.toml`) and published to https://vitalstats.netlify.app automatically.

- Ask Claude (any device) for a change → it pushes to `main` → live in ~2 minutes.
- Or edit a file on github.com and commit to `main`.
- A failed build never publishes — the previous version stays live.
- Deploy history: Netlify → vitalstats → Deploys.

## Working on a computer (optional)

```
git clone https://github.com/waigit/vitaiq && cd vitaiq
npm install
npm i -g netlify-cli && netlify login && netlify link   # pick vitalstats
netlify dev     # local test incl. AI functions
```
Commit and push to `main` to deploy — no `netlify deploy` needed.

## Netlify environment variables (already set on Netlify — nothing to do)

- `VITAIQ_OPENROUTER_KEY` — used by both functions. Don't rename it to `OPENROUTER_API_KEY`: Netlify's AI Gateway silently overrides that name.

## Layout

```
src/App.jsx                  page routing (landing / dashboard / admin — type "vitaiq" for admin)
src/components/Landing.jsx   landing page, language strings, upload handling
src/components/Dashboard.jsx all dashboard tabs, AI coach, nutrition
src/components/Admin.jsx     affiliate link admin
src/lib/parseHealth.js       reads the Simple Health Export CSV zip in the browser
src/lib/supabase.js          Supabase (users, uploads, affiliates, nutrition logs, meal photos)
netlify/functions/chat.js         AI Coach  → OpenRouter qwen/qwen3-14b
netlify/functions/analyze-food.js food photo → OpenRouter google/gemini-2.5-flash-lite
supabase/*.sql               table definitions (already applied — keep for reference)
```

## Changes compared with the 16 Sep live site

- Sleep tab: personal sleep need, 7-night sleep debt, real bedtime tip (replaces fixed "7.8 hrs" and invented tips).
- Effort tab: new Training Load card (7-day vs 28-day strain, overtraining warning).
- Blood Pressure tab: shows real cuff readings when present, otherwise says so — no more estimated numbers; new Heart Trend card.
- AI Coach gets sleep need, sleep debt, training load and "never invent BP".
- Fixed: bed/wake times were read 8 hours late in Malaysia (habit insights said nearly every night was "after midnight").
- Fixed: naps made Sleep Consistency 0/100.
- Fixed: Sleep Stages always showed Core 0h.
- Food analysis function rewritten (original source was lost); reads `VITAIQ_OPENROUTER_KEY`, falls back to the old name.
