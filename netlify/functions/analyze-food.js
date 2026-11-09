// VitaIQ — food photo analysis (Nutrition tab)
// Receives { imageDataUrl } (JPEG data URL, resized client-side to ≤900px)
// and returns { items: [{ name, portion_label, calories, protein_g, carbs_g, fat_g, confidence }] }.
// Uses a vision model via OpenRouter. Reads VITAIQ_OPENROUTER_KEY first because Netlify's
// AI Gateway can silently replace OPENROUTER_API_KEY with its own rotating token (see chat.js).
const MODEL = 'google/gemini-2.5-flash-lite'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (statusCode, body) => ({ statusCode, headers: { ...CORS, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

const PROMPT = `You are a nutrition analyst. Identify every distinct food and drink item visible in this photo.
For each item estimate the portion actually shown and its nutrition for that portion.
Malaysian and other Asian dishes are common — use their local names where appropriate (e.g. "Nasi lemak", "Roti canai", "Teh tarik").
Respond with ONLY a JSON object, no markdown, in exactly this shape:
{"items":[{"name":"...","portion_label":"e.g. 1 plate (350g)","calories":0,"protein_g":0,"carbs_g":0,"fat_g":0,"confidence":0}]}
"confidence" is 0-100: how sure you are of the identification. Use whole numbers. If there is no food in the photo, return {"items":[]}.`

function extractJson(text) {
  if (!text) return null
  const cleaned = text.replace(/```json|```/g, '').trim()
  try { return JSON.parse(cleaned) } catch {}
  const m = cleaned.match(/\{[\s\S]*\}/)
  if (m) { try { return JSON.parse(m[0]) } catch {} }
  return null
}
const n = v => { const x = Math.round(Number(v)); return Number.isFinite(x) && x >= 0 ? x : 0 }

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS, body: '' }
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method Not Allowed' })

  const apiKey = process.env.VITAIQ_OPENROUTER_KEY || process.env.OPENROUTER_API_KEY
  if (!apiKey) return json(500, { error: 'VITAIQ_OPENROUTER_KEY not configured in Netlify environment variables.' })

  let imageDataUrl
  try { ({ imageDataUrl } = JSON.parse(event.body || '{}')) } catch { return json(400, { error: 'Invalid JSON body' }) }
  if (!imageDataUrl || !/^data:image\/(jpeg|jpg|png|webp);base64,/.test(imageDataUrl)) return json(400, { error: 'imageDataUrl (base64 image data URL) required' })
  if (imageDataUrl.length > 6_000_000) return json(413, { error: 'Image too large — please use a smaller photo' })

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey.trim()}`,
        'HTTP-Referer': 'https://vitalstats.netlify.app',
        'X-Title': 'VitaIQ Food Analysis',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 800,
        temperature: 0.2,
        messages: [{ role: 'user', content: [
          { type: 'text', text: PROMPT },
          { type: 'image_url', image_url: { url: imageDataUrl } },
        ] }],
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      console.error('OpenRouter error:', JSON.stringify(data))
      return json(res.status, { error: data.error?.message || `OpenRouter error ${res.status}` })
    }
    const parsed = extractJson(data.choices?.[0]?.message?.content)
    if (!parsed || !Array.isArray(parsed.items)) return json(502, { error: 'Could not read the analysis — please try another photo' })
    const items = parsed.items.filter(it => it && it.name).map(it => ({
      name: String(it.name).slice(0, 80),
      portion_label: String(it.portion_label || '1 serving').slice(0, 60),
      calories: n(it.calories), protein_g: n(it.protein_g), carbs_g: n(it.carbs_g), fat_g: n(it.fat_g),
      confidence: it.confidence == null ? null : Math.max(0, Math.min(100, n(it.confidence))),
    }))
    return json(200, { items })
  } catch (err) {
    console.error('analyze-food error:', err.message)
    return json(500, { error: err.message })
  }
}
