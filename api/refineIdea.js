/**
 * AI refines a raw idea into a clearer, more actionable form
 * POST body: { idea: string }
 * Returns: { refined: string, summary?: string }
 */
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 20
const requestCounts = new Map()

function checkRateLimit(ip) {
  const now = Date.now()
  const record = requestCounts.get(ip) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS }
  if (now >= record.resetAt) {
    record.count = 0
    record.resetAt = now + RATE_LIMIT_WINDOW_MS
  }
  record.count++
  requestCounts.set(ip, record)
  return record.count <= RATE_LIMIT_MAX
}

const PROMPT = `You help users refine and optimize their ideas for a Japanese learning app (Kotoba / MJJ Dashboard).

The user will paste a rough idea—it can be incomplete, messy, or just a quick note. Your job:
1. Clarify and expand it into a clear, actionable form
2. Keep the user's intent
3. Add structure if helpful (bullets, steps)
4. Suggest implementation considerations if relevant
5. Keep it concise—no long essays

Reply with ONLY a JSON object:
{"refined":"<your refined idea as a string>","summary":"<optional one-line summary>"}

If the idea is already clear, you may only polish it slightly. Output ONLY valid JSON, no markdown.`

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(204).end()

  const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.headers['x-real-ip'] || 'unknown'
  if (!checkRateLimit(clientIp)) {
    return res.status(429).json({ error: 'Too many requests. Try again in a minute.' })
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return res.status(503).json({ error: 'Refinement not configured. Add GEMINI_API_KEY.' })
  }

  let body
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' })
  }

  const idea = String(body.idea || body.text || '').trim().slice(0, 4000)
  if (!idea) {
    return res.status(400).json({ error: 'Idea text is required' })
  }

  try {
    const response = await fetch(`${GEMINI_URL}?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: `${PROMPT}\n\nUser's idea:\n${idea}` }] }],
        generationConfig: {
          temperature: 0.5,
          maxOutputTokens: 2048,
          responseMimeType: 'application/json',
        },
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('Refine idea error', response.status, errText)
      throw new Error('Refinement failed')
    }

    const data = await response.json()
    const textPart = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}'
    let raw = String(textPart).trim().replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?\s*```\s*$/i, '')
    const start = raw.indexOf('{')
    if (start >= 0) {
      let depth = 0
      let end = start
      for (let i = start; i < raw.length; i++) {
        if (raw[i] === '{') depth++
        else if (raw[i] === '}') {
          depth--
          if (depth === 0) {
            end = i + 1
            break
          }
        }
      }
      raw = raw.slice(start, end)
    }
    raw = raw.replace(/,(\s*[}\]])/g, '$1')

    const result = JSON.parse(raw)
    return res.status(200).json({
      refined: result.refined || idea,
      summary: result.summary || '',
    })
  } catch (err) {
    console.error('Refine idea', err)
    return res.status(502).json({ error: 'Could not refine. Try again.' })
  }
}
