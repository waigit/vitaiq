// VitaIQ — "View on a computer": move this browser's VitaIQ data to another browser by QR code.
// End-to-end encrypted: the key lives only in the QR link's "#" part (never sent to a server);
// the relay (netlify/functions/handoff.js) only holds the ciphertext, once, for up to 10 minutes.
import { gzip, ungzip } from 'pako'

// Everything that makes up "my VitaIQ" in a browser (not counters or per-device settings)
export const HANDOFF_KEYS = [
  'vitaiq_health_data', 'vitaiq_history_v1', 'vitaiq_checkins_v1', 'vitaiq_session_labels',
  'vitaiq_nutrition_log_v1', 'vitaiq_calorie_goal_override', 'vitaiq_lang',
]
export const HANDOFF_TTL_MS = 10 * 60 * 1000
const API = '/.netlify/functions/handoff'

const b64u = bytes => {
  let s = ''
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i])
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
const unb64u = str => Uint8Array.from(atob(str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4)), c => c.charCodeAt(0))
const importKey = k => crypto.subtle.importKey('raw', unb64u(k), 'AES-GCM', false, ['encrypt', 'decrypt'])
const rand = n => crypto.getRandomValues(new Uint8Array(n))

// Computer side: a new pairing (random 128-bit id, 256-bit key) and the link to put in the QR code
export function newPairing() {
  const id = b64u(rand(16)), key = b64u(rand(32))
  return { id, key, url: `${location.origin}/#send=${id}.${key}`, expiresAt: Date.now() + HANDOFF_TTL_MS }
}

// "#send=<id>.<key>" → { id, key } (or null)
export function parseSendHash(hash) {
  const m = /^#send=([A-Za-z0-9_-]{22,64})\.([A-Za-z0-9_-]{43})$/.exec(hash || '')
  return m ? { id: m[1], key: m[2] } : null
}

export function hasLocalData() {
  try { return !!(localStorage.getItem('vitaiq_health_data') || localStorage.getItem('vitaiq_history_v1')) } catch { return false }
}

// iPhone side: encrypt this browser's data and hand it to the relay
export async function sendLocalData({ id, key }) {
  const items = {}
  for (const k of HANDOFF_KEYS) { try { const v = localStorage.getItem(k); if (v != null) items[k] = v } catch {} }
  if (!items.vitaiq_health_data && !items.vitaiq_history_v1) throw new Error('There is no VitaIQ data in this browser yet. Sync from iPhone first.')
  const plain = gzip(new TextEncoder().encode(JSON.stringify({ v: 1, at: new Date().toISOString(), items })))
  const iv = rand(12)
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await importKey(key), plain))
  const body = new Uint8Array(iv.length + ct.length); body.set(iv); body.set(ct, iv.length)
  if (body.length > 5_500_000) throw new Error('Your data is too large to send this way (over 5 MB).')
  const res = await fetch(`${API}?id=${id}`, { method: 'POST', body, headers: { 'Content-Type': 'application/octet-stream' } })
  if (res.status === 409) throw new Error('This QR code was already used. Show a new one on the computer.')
  if (!res.ok) throw new Error(`Sending failed (${res.status}). Try again with a new QR code.`)
  return { bytes: body.length }
}

// Computer side: check once for the iPhone's data. Returns null while still waiting.
export async function pollOnce({ id, key }) {
  const res = await fetch(`${API}?id=${id}`, { cache: 'no-store' })
  if (res.status === 404) return null
  if (res.status === 410) throw new Error('The code expired. Show a new one.')
  if (!res.ok) throw new Error(`Couldn't check for data (${res.status}).`)
  const buf = new Uint8Array(await res.arrayBuffer())
  let plain
  try { plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: buf.slice(0, 12) }, await importKey(key), buf.slice(12)) }
  catch { throw new Error("The data couldn't be decrypted. Show a new code and scan again.") }
  const payload = JSON.parse(new TextDecoder().decode(ungzip(new Uint8Array(plain))))
  if (!payload || payload.v !== 1 || !payload.items) throw new Error('Unexpected data format.')
  return payload
}

// Replace this browser's VitaIQ data with what arrived
export function applyPayload(payload) {
  for (const k of HANDOFF_KEYS) {
    try {
      if (k in payload.items) localStorage.setItem(k, payload.items[k])
      else if (k !== 'vitaiq_lang') localStorage.removeItem(k)
    } catch (e) { throw new Error("This browser couldn't store the data (storage full or private mode).") }
  }
}
