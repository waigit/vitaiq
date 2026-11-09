// VitaIQ — admin login check. The password lives only in the ADMIN_PASSWORD
// environment variable on Netlify (Project configuration → Environment variables).
import { createHash, timingSafeEqual } from 'node:crypto'

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
const digest = v => createHash('sha256').update(String(v)).digest()

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS, body: '' }
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: CORS, body: 'Method Not Allowed' }
  const expected = process.env.ADMIN_PASSWORD
  if (!expected) return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'ADMIN_PASSWORD not set' }) }
  let password = ''
  try { ({ password = '' } = JSON.parse(event.body || '{}')) } catch {}
  // Small fixed delay slows down password guessing
  await new Promise(r => setTimeout(r, 400))
  const ok = timingSafeEqual(digest(password), digest(expected))
  return { statusCode: ok ? 200 : 401, headers: { ...CORS, 'Content-Type': 'application/json' }, body: JSON.stringify({ ok }) }
}
