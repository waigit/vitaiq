# VitaIQ — vitalstats.netlify.app

Free Apple Watch health dashboard + nutrition tracking + AI coach.
Rebuilt on 9 Nov 2026 from the live site (deploy of 16 Sep 2026) after the iMac was reformatted, plus the newer dashboard.

## Set up on a fresh Mac (once)

1. Install **Node.js LTS** from https://nodejs.org (the macOS installer).
2. In Terminal:
   ```
   sudo npm install -g netlify-cli
   netlify login
   ```
3. Unzip this project into `~/Downloads/vitaiq_deploy`, then:
   ```
   cd ~/Downloads/vitaiq_deploy
   npm install
   netlify link
   ```
   Choose **"Search by full or partial project name"** → `vitalstats`.

## Deploy

```
cd ~/Downloads/vitaiq_deploy
npm run build && netlify deploy --prod --dir=dist --functions=netlify/functions
```

Test locally first (AI features need this, plain `npm run dev` has no functions):
```
netlify dev
```

## Never lose the code again — put it on GitHub (once)

1. Make a free account at https://github.com and install **GitHub Desktop** (https://desktop.github.com).
2. GitHub Desktop → File → **Add Local Repository** → pick `~/Downloads/vitaiq_deploy` → it offers to "create a repository" → yes.
3. Click **Publish repository**, keep **"Keep this code private"** ticked.
4. Optional but recommended: Netlify → vitalstats → Project configuration → Build & deploy → **Link repository** → pick the GitHub repo. From then on every change pushed to GitHub deploys automatically — and Claude can push changes for you without your Mac.

`.gitignore` already keeps `node_modules`, `dist`, `.netlify` and any `.env` file out of GitHub.

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
