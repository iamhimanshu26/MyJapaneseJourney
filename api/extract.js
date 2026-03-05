/**
 * Extract vocab & grammar from uploaded text using Gemini
 * POST body: { text: string }
 * Returns: { vocab: [...], grammar: [...] }
 */
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 10
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

const EXTRACT_PROMPT = `You are a Japanese language expert. Extract ALL Japanese vocabulary and grammar points from the user's text.

Return ONLY valid JSON in this exact shape:
{
  "vocab": [
    { "word": "日本語", "reading": "にほんご", "meaning": "Japanese language", "level": "N5" }
  ],
  "grammar": [
    { "name": "〜です", "structure": "Noun + です", "meaning": "Polite copula", "level": "N5", "example": "学生(がくせい)です。(I am a student.)" }
  ]
}

Rules:
- Extract every Japanese word/phrase with its reading (hiragana/romaji) and English meaning
- Include JLPT level (N5–N1) when inferrable, else "N5"
- For grammar: name, structure, meaning, level. Example must use 漢字(読み) format for furigana
- Skip words that are purely English or numbers
- Return empty arrays if nothing found
- Output ONLY the JSON object, no markdown or extra text`

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
    return res.status(503).json({ error: 'Extract not configured. Add GEMINI_API_KEY.' })
  }

  let body
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' })
  }

  const text = (body.text || body.content || '').trim().slice(0, 30000)
  if (!text) {
    return res.status(400).json({ error: 'Text is required' })
  }

  try {
    const response = await fetch(`${GEMINI_URL}?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text }] }],
        systemInstruction: { parts: [{ text: EXTRACT_PROMPT }] },
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 4096,
          responseMimeType: 'application/json',
        },
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('Gemini extract error', response.status, errText)
      return res.status(502).json({ error: 'Extraction failed. Try again.' })
    }

    const data = await response.json()
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '{}'
    const match = raw.match(/\{[\s\S]*\}/)
    const jsonStr = match ? match[0] : raw

    let result
    try {
      result = JSON.parse(jsonStr)
    } catch {
      return res.status(502).json({ error: 'Could not parse extraction result.' })
    }

    result.vocab = Array.isArray(result.vocab) ? result.vocab : []
    result.grammar = Array.isArray(result.grammar) ? result.grammar : []

    return res.status(200).json(result)
  } catch (err) {
    console.error('Extract error', err)
    return res.status(500).json({ error: 'Something went wrong. Please try again.' })
  }
}
