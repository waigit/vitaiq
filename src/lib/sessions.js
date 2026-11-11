// VitaIQ — exercise sessions with heart rate.
// Two sources:
//  • Apple workouts (CSV ZIP upload): typed ("Tennis"), Apple's own start/end + calories.
//  • Detected sessions (iPhone Shortcut sync, which can't read workouts): Apple Watch samples heart
//    rate every few seconds during a recorded workout and only every few minutes otherwise, so a
//    long run of dense heart-rate samples is a recorded session. These start untyped; the user can
//    label them (saved on this device).
// Heart rate comes only from real samples; nothing is estimated or filled in.

const LABELS_KEY = 'vitaiq_session_labels'
const DENSE_GAP_S = 60       // samples at most this far apart = workout-mode sampling
const MIN_SESSION_S = 8 * 60 // shorter runs are ignored (e.g. a manual HR check)
const MERGE_GAP_S = 3 * 60   // a short pause (water break, changeover) doesn't split a session
const MAX_POINTS = 180       // series is averaged into at most this many points

let parseDate = s => new Date(s)
const t = s => {
  if (!s) return null
  let d = parseDate(s), v = d ? d.getTime() : NaN
  if (isNaN(v)) v = new Date(String(s).replace(/\s+at\s+/i, ' ').replace(/\u202f/g, ' ')).getTime() // "11 Nov 2026 at 7:00 PM"
  return isNaN(v) ? null : v
}
const num = v => { const n = parseFloat(String(v ?? '').replace(',', '.')); return isNaN(n) ? null : n }

// [{startDate, endDate?, value}] → sorted [[ms, bpm, endMs]] (plausible values only).
// During workouts HealthKit may store heart rate as "series" samples that span a stretch of
// time (start < end) instead of one reading every few seconds; endMs keeps that span.
export function hrSamples(rows) {
  const out = []
  for (const r of rows || []) {
    const ms = t(r.startDate), v = num(r.value)
    if (ms == null || v == null || v < 30 || v > 230) continue
    const e = r.endDate && r.endDate !== r.startDate ? t(r.endDate) : null
    out.push([ms, v, e != null && e > ms && e - ms < 6 * 3600e3 ? e : ms])
  }
  return out.sort((a, b) => a[0] - b[0])
}

// What arrived, for troubleshooting when no sessions are found
export function hrDiagnostics(rows) {
  const s = hrSamples(rows)
  const gaps = []
  for (let i = 1; i < s.length; i++) gaps.push((s[i][0] - s[i - 1][0]) / 1000)
  gaps.sort((a, b) => a - b)
  return {
    raw: (rows || []).length, parsed: s.length,
    first: s[0] ? new Date(s[0][0]).toISOString() : null, last: s.length ? new Date(s[s.length - 1][0]).toISOString() : null,
    medianGapS: gaps.length ? Math.round(gaps[Math.floor(gaps.length / 2)]) : null,
    shortGaps: gaps.filter(g => g <= DENSE_GAP_S).length,
    withSpan: s.filter(x => x[2] - x[0] >= 20e3).length,
    sampleStart: (rows || [])[0]?.startDate ?? null,
  }
}

function hrStats(samples, startMs, endMs) {
  const s = samples.filter(([ms]) => ms >= startMs - 30e3 && ms <= endMs + 30e3)
  if (!s.length) return null
  const vals = s.map(x => x[1])
  // Time-weighted average (gaps capped at 60 s, so a sparse stretch doesn't dominate)
  let wsum = 0, w = 0
  for (let i = 0; i < s.length; i++) {
    const dt = Math.min(60, ((s[i + 1]?.[0] ?? s[i][0] + 5e3) - s[i][0]) / 1000) || 1
    wsum += s[i][1] * dt; w += dt
  }
  const span = Math.max(1, endMs - startMs), bucket = Math.max(5e3, span / MAX_POINTS)
  const buckets = new Map()
  for (const [ms, v] of s) {
    const k = Math.max(0, Math.floor((ms - startMs) / bucket))
    const b = buckets.get(k) || [0, 0]; b[0] += v; b[1]++; buckets.set(k, b)
  }
  const series = [...buckets.entries()].sort((a, b) => a[0] - b[0])
    .map(([k, [sum, n]]) => [Math.round(k * bucket / 1000), Math.round(sum / n)]) // [seconds from start, bpm]
  return { avg: Math.round(wsum / w), max: Math.max(...vals), min: Math.min(...vals), samples: s.length, series }
}

// Runs of dense heart-rate sampling → [{startMs, endMs}]
function detectRuns(samples) {
  const runs = []
  let cur = null
  for (const [ms, , end] of samples) {
    const isSpan = end - ms >= 60e3
    if (cur && ms - cur.reach <= DENSE_GAP_S * 1000) {
      cur.n++; cur.reach = Math.max(cur.reach, end, ms); if (isSpan) cur.spans++
    } else {
      if (cur) runs.push(cur)
      cur = { startMs: ms, reach: Math.max(ms, end), n: 1, spans: isSpan ? 1 : 0 }
    }
  }
  if (cur) runs.push(cur)
  // dense readings (10+) or series samples = workout-mode heart rate
  const kept = runs.filter(r => r.n >= 10 || r.spans > 0).map(r => ({ startMs: r.startMs, endMs: r.reach }))
  const merged = []
  for (const r of kept) {
    const last = merged[merged.length - 1]
    if (last && r.startMs - last.endMs <= MERGE_GAP_S * 1000) last.endMs = r.endMs
    else merged.push({ ...r })
  }
  return merged.filter(r => r.endMs - r.startMs >= MIN_SESSION_S * 1000)
}

const idOf = ms => new Date(Math.round(ms / 60e3) * 60e3).toISOString().slice(0, 16) // to the minute
const overlaps = (a, b) => a.startMs < b.endMs && b.startMs < a.endMs

// workouts: rows as read from the ZIP ({startDate, endDate, activityType, duration (s), totalEnergyBurned})
// hrRows: raw Heart Rate rows; dayKey: the app's date → local day function
export function buildSessions({ workoutRows = [], hrRows = [], dayKey, typeName, parse }) {
  if (parse) parseDate = parse
  const samples = hrSamples(hrRows)
  const sessions = []
  for (const w of workoutRows) {
    const startMs = t(w.startDate)
    if (startMs == null) continue
    let endMs = t(w.endDate)
    const dur = num(w.duration)
    if ((endMs == null || endMs <= startMs) && dur) endMs = startMs + dur * 1000
    if (endMs == null || endMs <= startMs) continue
    sessions.push({
      id: idOf(startMs), source: 'workout', type: typeName ? typeName(w.activityType) : (w.activityType || 'Workout'),
      start: new Date(startMs).toISOString(), end: new Date(endMs).toISOString(), date: dayKey(w.startDate),
      durationMin: Math.round((endMs - startMs) / 60e3), calories: num(w.totalEnergyBurned),
      hr: hrStats(samples, startMs, endMs), startMs, endMs,
    })
  }
  for (const r of detectRuns(samples)) {
    if (sessions.some(s => s.source === 'workout' && overlaps(s, r))) continue
    const iso = new Date(r.startMs).toISOString()
    sessions.push({
      id: idOf(r.startMs), source: 'detected', type: null,
      start: iso, end: new Date(r.endMs).toISOString(), date: dayKey(iso),
      durationMin: Math.round((r.endMs - r.startMs) / 60e3), calories: null,
      hr: hrStats(samples, r.startMs, r.endMs), startMs: r.startMs, endMs: r.endMs,
    })
  }
  return sessions.map(({ startMs, endMs, ...s }) => s).sort((a, b) => a.start.localeCompare(b.start))
}

// ── Labels for detected sessions (this device only) ────────────────────────
export function loadLabels() {
  try { return JSON.parse(localStorage.getItem(LABELS_KEY) || '{}') || {} } catch { return {} }
}
export function saveLabel(id, label) {
  const all = loadLabels()
  if (label) all[id] = label; else delete all[id]
  try { localStorage.setItem(LABELS_KEY, JSON.stringify(all)) } catch {}
  return all
}

// Heart-rate zones as % of a max heart rate. maxHr comes from the person's own highest recorded
// session heart rate (an approximation, labelled as such in the UI).
export const ZONES = [
  { name: 'Easy', lo: 0, hi: 0.6, color: '#4D9EFF' },
  { name: 'Zone 2', lo: 0.6, hi: 0.7, color: '#00FF88' },
  { name: 'Zone 3', lo: 0.7, hi: 0.8, color: '#FFD60A' },
  { name: 'Zone 4', lo: 0.8, hi: 0.9, color: '#FF9F0A' },
  { name: 'Zone 5', lo: 0.9, hi: 9, color: '#FF3B5C' },
]
export function zoneMinutes(series, maxHr) {
  if (!series?.length || !maxHr) return null
  const mins = ZONES.map(() => 0)
  for (let i = 0; i < series.length; i++) {
    const dt = Math.min(120, (series[i + 1]?.[0] ?? series[i][0] + 30) - series[i][0]) / 60
    const p = series[i][1] / maxHr
    const z = ZONES.findIndex(z => p >= z.lo && p < z.hi)
    mins[z < 0 ? ZONES.length - 1 : z] += dt
  }
  return mins.map(m => Math.round(m))
}
