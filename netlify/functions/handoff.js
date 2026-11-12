// VitaIQ — "View on a computer": a one-time, end-to-end encrypted relay.
// The computer shows a QR code holding a random id + key. The iPhone scans it, encrypts its
// VitaIQ data in the browser (AES-GCM) and POSTs the ciphertext here. The computer polls with
// the id, gets the ciphertext once, and decrypts it locally. The key is only ever in the
// link's "#" part, so it never reaches this function: Netlify only sees unreadable bytes.
// Each entry is deleted on pickup, and anything older than 10 minutes is refused and removed.
import { getStore } from '@netlify/blobs'

const TTL = 10 * 60 * 1000
const MAX_BYTES = 5_500_000 // Netlify function request bodies are capped at ~6 MB
const ID = /^[A-Za-z0-9_-]{22,64}$/
const store = () => getStore({ name: 'vitaiq-handoff', region: 'ap-southeast-1', consistency: 'strong' })
const H = { 'Cache-Control': 'no-store' }
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { ...H, 'Content-Type': 'application/json' } })

// Remove anything left behind past its expiry (best effort)
async function sweep(s) {
  try {
    const { blobs } = await s.list()
    for (const { key } of blobs.slice(0, 50)) {
      const m = await s.getMetadata(key)
      if (m && (!m.metadata?.exp || m.metadata.exp < Date.now())) await s.delete(key)
    }
  } catch (e) { console.warn('handoff sweep:', e.message) }
}

export default async (req) => {
  const id = new URL(req.url).searchParams.get('id') || ''
  if (!ID.test(id)) return json(400, { error: 'bad id' })
  const s = store()

  if (req.method === 'POST') {
    const buf = await req.arrayBuffer()
    if (!buf.byteLength) return json(400, { error: 'empty' })
    if (buf.byteLength > MAX_BYTES) return json(413, { error: 'too large' })
    await sweep(s)
    const { modified } = await s.set(id, buf, { onlyIfNew: true, metadata: { exp: Date.now() + TTL } })
    if (!modified) return json(409, { error: 'this code was already used' })
    return json(200, { ok: true })
  }

  if (req.method === 'GET') {
    const entry = await s.getWithMetadata(id, { type: 'arrayBuffer' })
    if (entry === null) return json(404, { waiting: true })
    await s.delete(id)
    if (!entry.metadata?.exp || entry.metadata.exp < Date.now()) return json(410, { error: 'expired' })
    return new Response(entry.data, { status: 200, headers: { ...H, 'Content-Type': 'application/octet-stream' } })
  }

  return json(405, { error: 'method not allowed' })
}
