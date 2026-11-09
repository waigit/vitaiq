// VitaIQ — upload history kept in this browser only (nothing is sent to a server).
// Each Apple Health upload is merged into a running history, so trends keep growing
// even when people export only the last 30 days.
import { computeHabitInsights } from './parseHealth'

const KEY = 'vitaiq_history_v1'
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function loadHistory() {
  try { return JSON.parse(localStorage.getItem(KEY) || 'null') } catch { return null }
}
export function clearHistory() {
  try { localStorage.removeItem(KEY) } catch {}
}
function saveHistory(h) {
  try { localStorage.setItem(KEY, JSON.stringify(h)); return true }
  catch (e) {
    // Storage full: drop the oldest 20% of daily/sleep entries and try once more
    try {
      const trim = obj => { const k = Object.keys(obj).sort(); k.slice(0, Math.ceil(k.length * 0.2)).forEach(x => delete obj[x]) }
      Object.values(h.daily).forEach(trim); trim(h.sleep); trim(h.sleepTimes)
      localStorage.setItem(KEY, JSON.stringify(h)); return true
    } catch { console.warn('VitaIQ history not saved:', e); return false }
  }
}

// Days of a calendar month (YYYY-MM) covered by an export spanning start..end (YYYY-MM-DD)
function monthCoverage(rawMonth, start, end) {
  if (!start || !end) return 0
  const [y, m] = rawMonth.split('-').map(Number)
  const first = `${rawMonth}-01`, last = `${rawMonth}-${String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, '0')}`
  const a = start > first ? start : first, b = end < last ? end : last
  if (a > b) return 0
  return Math.round((new Date(b) - new Date(a)) / 864e5) + 1
}

function durationLabel(start, end) {
  const days = Math.round((new Date(end) - new Date(start)) / 864e5)
  const months = Math.round(days / 30)
  return { label: months >= 2 ? `${months} months` : days <= 1 ? '1 day' : `${days} days`, days, months }
}

// Merge a freshly parsed upload into the stored history and return the combined view
// that the dashboard should show. `fresh` is the output of parseHealthZip().
export function mergeUpload(fresh) {
  if (!fresh || !fresh.meta) return fresh
  const start = fresh.meta.startDate, end = fresh.meta.endDate
  const h = loadHistory() || { v: 1, uploads: [], monthly: {}, daily: {}, sleep: {}, sleepTimes: {}, workouts: {} }

  // Monthly averages: keep whichever upload covered more of that month (a 30-day export
  // shouldn't replace a full month from an older, longer export with a partial average).
  for (const [metric, rows] of Object.entries(fresh.monthly || {})) {
    if (!Array.isArray(rows)) continue
    h.monthly[metric] = h.monthly[metric] || {}
    for (const r of rows) {
      const cov = monthCoverage(r.rawMonth, start, end)
      const prev = h.monthly[metric][r.rawMonth]
      if (!prev || cov >= prev.cov) h.monthly[metric][r.rawMonth] = { ...r, cov }
    }
  }
  // Day-level data: the new upload wins, except its first day (usually a partial day)
  // when an earlier upload already had that day.
  const keepOld = (date, prev) => prev != null && date === start
  for (const [metric, map] of Object.entries(fresh.daily || {})) {
    h.daily[metric] = h.daily[metric] || {}
    for (const [date, v] of Object.entries(map)) if (!keepOld(date, h.daily[metric][date])) h.daily[metric][date] = v
  }
  for (const [date, v] of Object.entries(fresh.sleep || {})) if (!keepOld(date, h.sleep[date])) h.sleep[date] = v
  for (const t of fresh.sleepTimes || []) if (!keepOld(t.night, h.sleepTimes[t.night])) h.sleepTimes[t.night] = t
  for (const w of fresh.workouts || []) h.workouts[`${w.date}|${w.type}|${w.durationMin ?? ''}`] = w

  h.uploads = [...(h.uploads || []), { at: fresh.meta.uploadedAt, start, end, file: fresh.meta.fileName }].slice(-50)
  saveHistory(h)
  return buildView(fresh, h)
}

function buildView(fresh, h) {
  const view = { ...fresh, meta: { ...fresh.meta }, daily: {}, monthly: {} }
  for (const [metric, byMonth] of Object.entries(h.monthly)) {
    view.monthly[metric] = Object.values(byMonth).sort((a, b) => a.rawMonth.localeCompare(b.rawMonth)).map(({ cov, ...r }) => r)
  }
  for (const [metric, map] of Object.entries(h.daily)) view.daily[metric] = { ...map }
  view.sleep = { ...h.sleep }
  view.sleepTimes = Object.values(h.sleepTimes).sort((a, b) => a.night.localeCompare(b.night))
  view.workouts = Object.values(h.workouts).sort((a, b) => a.date.localeCompare(b.date))

  const starts = h.uploads.map(u => u.start).filter(Boolean), ends = h.uploads.map(u => u.end).filter(Boolean)
  if (starts.length && ends.length) {
    const s = starts.sort()[0], e = ends.sort().slice(-1)[0], dur = durationLabel(s, e)
    Object.assign(view.meta, { startDate: s, endDate: e, durationLabel: dur.label, durationDays: dur.days, durationMonths: dur.months })
  }
  view.meta.uploadsCount = h.uploads.length
  view.meta.latestExport = { start: fresh.meta.startDate, end: fresh.meta.endDate }

  // Re-run habit insights over the whole history (also refreshes workoutTypeCounts)
  try { view.habitInsights = computeHabitInsights(view) } catch (e) { console.warn('habit insights:', e) }
  return view
}

export function monthLabel(rawMonth) {
  const [y, m] = rawMonth.split('-').map(Number)
  return `${MONTHS[m - 1]}'${String(y).slice(2)}`
}
