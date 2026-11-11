// VitaIQ — daily check-ins, streaks and weekly stats. All computed in the browser.

// ── Daily check-in ──────────────────────────────────────────────────────────
export const CHECKIN_TAGS = [
  { id: 'caffeine', icon: '☕', label: 'Caffeine after 2pm' },
  { id: 'alcohol', icon: '🍷', label: 'Alcohol' },
  { id: 'lateMeal', icon: '🍔', label: 'Late heavy meal' },
  { id: 'stress', icon: '😰', label: 'Stressful day' },
  { id: 'screens', icon: '📱', label: 'Screens in bed' },
  { id: 'sick', icon: '🤒', label: 'Feeling unwell' },
  { id: 'relax', icon: '🧘', label: 'Stretch / meditate' },
]
const CHECKIN_KEY = 'vitaiq_checkins_v1'

export function loadCheckins() {
  try { return JSON.parse(localStorage.getItem(CHECKIN_KEY) || '{}') } catch { return {} }
}
export function saveCheckin(date, tags) {
  try {
    const all = loadCheckins()
    if (tags && tags.length) all[date] = tags; else all[date] = []   // [] = "checked in, nothing to report"
    localStorage.setItem(CHECKIN_KEY, JSON.stringify(all))
    return all
  } catch { return loadCheckins() }
}

export function localDay(offset = 0) {
  const d = new Date(); d.setDate(d.getDate() + offset)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
export function addDays(date, n) {
  const d = new Date(date + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
const mean = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : null

// Something done on day D shows up in the HRV recorded on D+1 (overnight readings),
// same convention as the workout habit insights.
export function computeCheckinInsights(checkins, hrvDaily = {}) {
  const days = Object.keys(checkins)
  const loggedWithHrv = days.filter(d => hrvDaily[addDays(d, 1)] != null)
  const result = { logged: days.length, withHrv: loggedWithHrv.length, items: [] }
  if (!loggedWithHrv.length) return result
  const overall = mean(Object.values(hrvDaily))
  for (const tag of CHECKIN_TAGS) {
    const tagged = loggedWithHrv.filter(d => checkins[d].includes(tag.id))
    if (tagged.length < 3) continue
    const untagged = loggedWithHrv.filter(d => !checkins[d].includes(tag.id))
    const base = untagged.length >= 3 ? mean(untagged.map(d => hrvDaily[addDays(d, 1)])) : overall
    if (!base) continue
    const pct = Math.round((mean(tagged.map(d => hrvDaily[addDays(d, 1)])) / base - 1) * 100)
    result.items.push({ ...tag, n: tagged.length, pct })
  }
  result.items.sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct))
  return result
}

// ── Streaks ─────────────────────────────────────────────────────────────────
function runs(sortedDates, ok) {
  // current = run ending at the most recent date; best = longest run. Consecutive calendar days only.
  let best = 0, cur = 0, prev = null
  for (const d of sortedDates) {
    if (ok(d)) { cur = prev && addDays(prev, 1) === d ? cur + 1 : 1; best = Math.max(best, cur) }
    else cur = 0
    prev = d
  }
  return { current: cur, best }
}

export const STEP_GOAL = 8000
export function computeStreaks(d, nutritionAll = {}) {
  const out = {}
  const sleepDays = Object.keys(d.sleep || {}).sort()
  if (sleepDays.length) out.sleep = { ...runs(sleepDays, k => d.sleep[k].total >= 7), asOf: sleepDays[sleepDays.length - 1] }

  const stepDays = Object.keys(d.daily?.steps || {}).sort()
  if (stepDays.length) {
    // The export's last day is often incomplete — if it hasn't hit the goal yet, don't let it break the streak
    let days = stepDays
    const last = stepDays[stepDays.length - 1]
    if (d.daily.steps[last] < STEP_GOAL) days = stepDays.slice(0, -1)
    out.steps = { ...runs(days, k => d.daily.steps[k] >= STEP_GOAL), asOf: last, goal: STEP_GOAL }
  }

  const workouts = d.workouts || []
  if (workouts.length) {
    const weekOf = date => { const x = new Date(date + 'T00:00:00Z'); const dow = (x.getUTCDay() + 6) % 7; x.setUTCDate(x.getUTCDate() - dow); return x.toISOString().slice(0, 10) }
    const daysPerWeek = {}
    for (const w of workouts) (daysPerWeek[weekOf(w.date)] ||= new Set()).add(w.date)
    const first = weekOf(workouts[0].date), lastWeek = weekOf(d.meta?.endDate || workouts[workouts.length - 1].date)
    const weeks = []
    for (let w = first; w <= lastWeek; w = addDays(w, 7)) weeks.push(w)
    // The current week is still in progress — only count it once it already hits the goal
    let list = weeks
    if ((daysPerWeek[lastWeek]?.size || 0) < 3) list = weeks.slice(0, -1)
    let best = 0, cur = 0
    for (const w of list) { if ((daysPerWeek[w]?.size || 0) >= 3) { cur++; best = Math.max(best, cur) } else cur = 0 }
    out.activeWeeks = { current: cur, best, thisWeek: daysPerWeek[lastWeek]?.size || 0 }
  }

  const mealDays = Object.keys(nutritionAll).filter(k => (nutritionAll[k] || []).length).sort()
  if (mealDays.length) {
    const today = localDay(0)
    let cur = 0
    for (let day = (nutritionAll[today] || []).length ? today : addDays(today, -1); (nutritionAll[day] || []).length; day = addDays(day, -1)) cur++
    out.meals = { current: cur, best: runs(mealDays, () => true).best }
  }
  return out
}

// ── Weekly stats for the share card ─────────────────────────────────────────
export function computeWeekStats(d, extra = {}) {
  const end = d.meta?.endDate
  if (!end) return null
  const days = Array.from({ length: 7 }, (_, i) => addDays(end, i - 6))
  const pick = (map) => days.map(k => map?.[k]).filter(v => v != null)
  const sleep = pick(Object.fromEntries(Object.entries(d.sleep || {}).map(([k, v]) => [k, v.total]))).filter(v => v >= 3)
  const steps = pick(d.daily?.steps)
  const hrv = pick(d.daily?.hrv)
  // null (shown as '–') when no workouts have ever arrived, e.g. a Shortcut sync without a Workouts block
  const workoutDays = (d.workouts || []).length ? new Set(d.workouts.filter(w => days.includes(w.date)).map(w => w.date)).size : null
  // Without workouts (the iPhone Shortcut can't read them), count days with 30+ Apple exercise minutes
  // — the default Exercise ring goal. Shown as "Active days", never as workouts.
  const exMin = days.map(k => d.daily?.exercise?.[k]).filter(v => v != null)
  const activeDays = workoutDays == null && exMin.length ? exMin.filter(v => v >= 30).length : null
  return {
    from: days[0], to: end,
    readiness: d.latest?.readiness ?? null,
    avgSleep: sleep.length ? +mean(sleep).toFixed(1) : null,
    avgSteps: steps.length ? Math.round(mean(steps)) : null,
    avgHrv: hrv.length ? Math.round(mean(hrv)) : null,
    workoutDays,
    activeDays,
    ...extra,
  }
}
