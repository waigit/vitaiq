// VitaIQ Chat Function v5
// Uses VITAIQ_OPENROUTER_KEY instead of OPENROUTER_API_KEY specifically
// because Netlify's AI Gateway feature auto-injects its own managed token
// under the "OPENROUTER_API_KEY" name (and ANTHROPIC_API_KEY, OPENAI_API_KEY,
// GEMINI_API_KEY, etc.) at the Functions runtime level, silently overriding
// any same-named variable a project defines itself in the dashboard. That
// collision was the root cause of a long "Missing Authentication header"
// debugging session — the function was receiving a rotating Netlify Gateway
// session token instead of the real OpenRouter key, even though the
// dashboard and `netlify env:get` both correctly showed the real key.
exports.handler = async (event) => {
  const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS, body: 'Method Not Allowed' }
  }

  const apiKey = process.env.VITAIQ_OPENROUTER_KEY
  if (!apiKey) {
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({
        error: 'VITAIQ_OPENROUTER_KEY not configured in Netlify environment variables. Add it in Site configuration -> Environment variables, in all contexts including "Local development (Netlify CLI)".',
      })
    }
  }

  try {
    const body = JSON.parse(event.body)
    const { messages, system } = body

    if (!messages || !Array.isArray(messages)) {
      return {
        statusCode: 400,
        headers: CORS,
        body: JSON.stringify({ error: 'Invalid request: messages array required' })
      }
    }

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey.trim()}`,
        'HTTP-Referer': 'https://vitaiq.netlify.app',
        'X-Title': 'VitaIQ Health Coach',
      },
      body: JSON.stringify({
        model: 'qwen/qwen3-14b',
        max_tokens: 1000,
        messages: [
          ...(system ? [{ role: 'system', content: system }] : []),
          ...messages,
        ],
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      console.error('OpenRouter error:', JSON.stringify(data))
      return {
        statusCode: res.status,
        headers: CORS,
        body: JSON.stringify({ 
          error: data.error?.message || `OpenRouter error ${res.status}`,
          details: data
        }),
      }
    }

    const text = data.choices?.[0]?.message?.content || 'No response received.'
    return {
      statusCode: 200,
      headers: { ...CORS, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: [{ type: 'text', text }]
      }),
    }

  } catch (err) {
    console.error('Function error:', err.message)
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ error: err.message }),
    }
  }
}
