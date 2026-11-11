// VitaIQ — "Sync from iPhone": reads health data sent by the "VitaIQ Sync" Apple Shortcut.
// The Shortcut opens https://vitalstats.netlify.app/#sync=<data>. Everything after "#" stays in
// the browser (it is never sent to Netlify or any server), so data still never leaves the device.
//
// <data> is the Shortcut's text, optionally gzip- or zip-compressed, base64-encoded and URL-encoded:
//   VITAIQ1
//   #Heart Rate Variability
//   2026-11-09T00:00:00+08:00|48.2          (start | value)  — one line per day (Group By: Day)
//   #Sleep
//   2026-11-09T23:41:00+08:00|2026-11-10T00:12:00+08:00|Core   (start | end | stage)
// Section names are matched loosely, so the Shortcut can use Apple's own type names.
import { ungzip } from 'pako'
import { analyzeRows, readZipText } from './parseHealth.js'

export const SHORTCUT_NAME = 'VitaIQ Sync'
// Ready-made shortcut shared by Wai Git (an iCloud link is a snapshot: update it when the shortcut changes)
export const SHORTCUT_INSTALL_URL = 'https://www.icloud.com/shortcuts/008077ab91d541b6b0095710637052f8'
export const shortcutRunUrl = days =>
  `shortcuts://run-shortcut?name=${encodeURIComponent(SHORTCUT_NAME)}${days ? `&input=text&text=${days}` : ''}`

export const isAppleMobile = () =>
  typeof navigator !== 'undefined' &&
  (/iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))

// Section header → Apple Health type name used by analyzeRows. Order matters ("resting energy"
// must win over "resting heart rate").
const SECTIONS = [
  [/workout/, 'WorkoutActivityType'],
  [/variab|hrv/, 'HeartRateVariabilitySDNN'],
  [/resting energy|resting cal|basal/, 'BasalEnergyBurned'],
  [/resting heart|resting hr|rhr/, 'RestingHeartRate'],
  [/walking heart/, null], // walking HR average isn't used
  [/heart rate|^hr$|pulse/, 'HeartRate'], // raw samples (no grouping) → exercise sessions with HR
  [/oxygen|spo2/, 'OxygenSaturation'],
  [/respirat/, 'RespiratoryRate'],
  [/vo2|cardio fitness/, 'VO2Max'],
  [/wrist/, 'AppleSleepingWristTemperature'],
  [/weight|body mass/, 'BodyMass'],
  [/step/, 'StepCount'],
  [/active energy|active cal|move/, 'ActiveEnergyBurned'],
  [/exercise/, 'AppleExerciseTime'],
  [/sleep/, 'SleepAnalysis'],
]
const sectionType = name => {
  const n = name.toLowerCase()
  for (const [re, type] of SECTIONS) if (re.test(n)) return type
  return null
}

// Shortcuts shows stages as "Core", "Deep", "REM", "Awake", "In Bed", "Asleep"/"Unspecified"
function sleepStage(v) {
  const s = v.toLowerCase().replace(/[^a-z]/g, '')
  if (s.includes('core') || s.includes('light')) return 'asleepCore'
  if (s.includes('deep')) return 'asleepDeep'
  if (s.includes('rem')) return 'asleepREM'
  if (s.includes('awake')) return 'awake'
  if (s.includes('inbed')) return 'inBed'
  if (s.includes('asleep') || s.includes('unspecified')) return 'asleep'
  return null
}

// "48.2", "48,2", "48.2 ms", "97%", "8 432" → number (null if none)
function toNumber(v) {
  let s = String(v).trim().replace(/[\s  ]/g, '')
  if (/^-?\d+,\d+/.test(s) && !s.includes('.')) s = s.replace(',', '.')
  s = s.replace(/,/g, '')
  const n = parseFloat(s)
  return isNaN(n) ? null : n
}

// Decode whatever the Shortcut put after "#sync=" into its text
export function decodeSyncPayload(raw) {
  let s = raw
  try { s = decodeURIComponent(raw) } catch {}
  s = s.trim()
  if (/^VITAIQ/i.test(s) || s.startsWith('#')) return s // plain text, not compressed
  const b64 = s.replace(/\s/g, '+').replace(/-/g, '+').replace(/_/g, '/')
  let bytes
  try {
    const bin = atob(b64)
    bytes = Uint8Array.from(bin, c => c.charCodeAt(0))
  } catch {
    throw new Error("The data from the Shortcut couldn't be read (not valid base64).")
  }
  if (bytes[0] === 0x1f && bytes[1] === 0x8b) return new TextDecoder().decode(ungzip(bytes)) // gzip
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) return readZipText(bytes) // zip
  return new TextDecoder().decode(bytes)
}

// Text from the Shortcut → { rows: {AppleType: [row]}, counts: {AppleType: n}, days }
// Two layouts are accepted:
//  • line mode:   "#Sleep" then one "start|end|value" line per sample (built with a Repeat loop)
//  • column mode: "#Sleep starts" / "#Sleep ends" / "#Sleep values" (or "… dates" / "… values"),
//    each followed by one item per line — the Shortcut inserts a whole list at once, no loop,
//    which is much faster. Columns are paired up by position.
//  Workouts use line mode: "#Workouts" then "start|end|activity type|kcal" (kcal optional).
const COLUMN = /\s+(start dates?|starts?|end dates?|ends?|dates?|values?)\s*$/i
const colName = w => { w = w.toLowerCase(); return w.startsWith('end') ? 'end' : w.startsWith('value') ? 'value' : 'start' }

// Workout: start | end | activity type | kcal (optional). Duration (seconds, as in the CSV) comes from start/end.
function makeWorkout(start, end, activity, kcal) {
  const t0 = Date.parse(start), t1 = end ? Date.parse(end) : NaN
  activity = (activity || '').trim() || 'Workout'
  if (isNaN(t0) || toNumber(activity) != null) return null // needs a real start date and a type name
  const secs = !isNaN(t1) && t1 > t0 ? Math.round((t1 - t0) / 1000) : null
  const e = kcal != null ? toNumber(kcal) : null
  return { startDate: start, endDate: end || start, activityType: activity,
    duration: secs != null ? String(secs) : '', totalEnergyBurned: e != null ? String(e) : '' }
}

function makeRow(type, start, end, value) {
  if (!start) return null
  if (type === 'WorkoutActivityType') return makeWorkout(start, end, value)
  if (type === 'SleepAnalysis') {
    const stage = sleepStage(value || '')
    return stage && end ? { startDate: start, endDate: end, value: stage } : null
  }
  let v = toNumber(value ?? '')
  if (v == null) return null
  if (type === 'OxygenSaturation' && v > 1.5) v = v / 100 // the CSV app uses 0.97, Shortcuts may give 97
  return { startDate: start, endDate: end || start, value: String(v), sourceName: '' }
}

export function parseSyncText(text) {
  const rows = {}, counts = {}, cols = {}
  let type = null, col = null, days = null
  const push = (t, r) => { if (r) (rows[t] || (rows[t] = [])).push(r) }
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line) continue
    const m = line.match(/^VITAIQ\d*\b(.*)$/i)
    if (m) { const d = m[1].match(/days\s*=\s*(\d+)/i); if (d) days = +d[1]; continue }
    if (line.startsWith('#')) {
      const h = line.slice(1).trim(), cm = h.match(COLUMN)
      type = sectionType(cm ? h.slice(0, cm.index) : h)
      col = cm && type ? colName(cm[1]) : null
      if (col) ((cols[type] || (cols[type] = {}))[col] = [])
      continue
    }
    if (!type) continue
    if (col) { cols[type][col].push(line); continue }
    const parts = line.split('|').map(p => p.trim())
    if (parts.length < 2) continue
    if (type === 'WorkoutActivityType') push(type, parts.length >= 3 ? makeWorkout(parts[0], parts[1], parts[2], parts[3]) : null)
    else if (type === 'SleepAnalysis') push(type, parts.length >= 3 ? makeRow(type, parts[0], parts[1], parts[2]) : null)
    else push(type, makeRow(type, parts[0], parts.length > 2 ? parts[1] : parts[0], parts[parts.length - 1]))
  }
  for (const [t, c] of Object.entries(cols)) {
    const start = c.start || [], end = c.end || [], value = c.value || []
    const n = Math.min(start.length, value.length, t === 'SleepAnalysis' ? end.length : Infinity)
    for (let i = 0; i < n; i++) push(t, makeRow(t, start[i], end[i], value[i]))
  }
  for (const [t, r] of Object.entries(rows)) counts[t] = r.length
  return { rows, counts, days }
}

// Full pipeline: "#sync=..." payload → dashboard data (same shape as parseHealthZip output)
export function buildFromSync(raw) {
  const { rows, counts, days } = parseSyncText(decodeSyncPayload(raw))
  if (!Object.keys(rows).length) throw new Error('The Shortcut sent no health data. Check that it has Health access and the period has data.')
  const data = analyzeRows(t => rows[t] || [], t => rows[t] || [], {
    fileName: `iPhone sync${days ? ` (${days} days)` : ''}`,
    uploadedAt: new Date().toISOString(),
    source: 'shortcut',
  })
  // Date range: the CSV path takes it from Resting HR; fall back to any metric the Shortcut sent
  if (!data.meta.startDate) {
    const dates = Object.values(rows).flat().map(r => String(r.startDate).slice(0, 10)).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort()
    if (dates.length) {
      data.meta.startDate = dates[0]; data.meta.endDate = dates[dates.length - 1]
      const n = Math.round((new Date(data.meta.endDate) - new Date(data.meta.startDate)) / 864e5), mo = Math.round(n / 30)
      Object.assign(data.meta, { durationDays: n, durationMonths: mo, durationLabel: mo >= 2 ? `${mo} months` : n <= 1 ? '1 day' : `${n} days` })
    }
  }
  return { data, counts }
}

// Short human summary for the toast, e.g. "HRV 30 · Sleep 28 nights · Steps 30"
export function summarizeSync(data, counts) {
  const parts = []
  const n = o => Object.keys(o || {}).length
  if (counts.HeartRateVariabilitySDNN) parts.push(`HRV ${n(data.daily.hrv)} days`)
  if (counts.RestingHeartRate) parts.push(`Resting HR`)
  if (counts.SleepAnalysis) parts.push(`Sleep ${n(data.sleep)} nights`)
  if (counts.StepCount) parts.push(`Steps ${n(data.daily.steps)} days`)
  if (counts.OxygenSaturation) parts.push('SpO2')
  if (counts.ActiveEnergyBurned) parts.push('Active energy')
  if (counts.WorkoutActivityType) parts.push(`Workouts ${counts.WorkoutActivityType}`)
  if (counts.HeartRate) parts.push(`Heart rate ${counts.HeartRate}${data.sessions?.length ? ` · ${data.sessions.length} session${data.sessions.length === 1 ? '' : 's'}` : ''}`)
  return parts.join(' · ')
}
