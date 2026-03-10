/**
 * Enrich a single kanji with onyomi, kunyomi, examples
 * POST body: { char: string } or { chars: string[] }
 * Returns: { char, onyomi, kunyomi, onExamples, kunExamples } or array for batch
 */
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 15
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

const PROMPT = `You are a Japanese language expert. For each kanji given, return ONLY a JSON object.

Format (single char): {"char":"月","onyomi":"ゲツ,ガツ","kunyomi":"つき","onExamples":[{"jp":"今月(こんげつ)","en":"this month"},{"jp":"来月(らいげつ)","en":"next month"},{"jp":"先月(せんげつ)","en":"last month"}],"kunExamples":[{"jp":"月(つき)","en":"moon"},{"jp":"毎月(まいつき)","en":"every month"},{"jp":"三日月(みかづき)","en":"crescent moon"}]}

For multiple chars: {"kanji":[{"char":"日","onyomi":"ニチ,ジツ","kunyomi":"ひ,か","onExamples":[...],"kunExamples":[...]},...]}

Rules:
- onyomi: comma-separated katakana readings
- kunyomi: comma-separated hiragana readings  
- onExamples, kunExamples: exactly 3 each, objects with jp (sentence with 漢字(読み)) and en
- Output ONLY valid JSON, no markdown`

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
    return res.status(503).json({ error: 'Enrichment not configured. Add GEMINI_API_KEY.' })
  }

  let body
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' })
  }

  const char = body.char || (body.chars && body.chars[0])
  const chars = body.chars || (char ? [char] : [])
  const inputChars = chars.filter((c) => typeof c === 'string' && c.trim()).slice(0, 5)

  if (inputChars.length === 0) {
    return res.status(400).json({ error: 'Provide char or chars array' })
  }

  const promptText = inputChars.length === 1
    ? `Return JSON for this kanji: ${inputChars[0]}`
    : `Return JSON with "kanji" array for these kanji: ${inputChars.join(', ')}`

  try {
    const response = await fetch(`${GEMINI_URL}?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: `${PROMPT}\n\n${promptText}` }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 4096,
          responseMimeType: 'application/json',
        },
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('Enrich kanji error', response.status, errText)
      throw new Error('Enrichment failed')
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

    if (inputChars.length === 1) {
      const r = result.char ? result : result.kanji?.[0]
      return res.status(200).json({
        char: inputChars[0],
        onyomi: r?.onyomi || '',
        kunyomi: r?.kunyomi || '',
        onExamples: Array.isArray(r?.onExamples) ? r.onExamples.slice(0, 3) : [],
        kunExamples: Array.isArray(r?.kunExamples) ? r.kunExamples.slice(0, 3) : [],
      })
    }

    const kanji = Array.isArray(result.kanji) ? result.kanji : []
    return res.status(200).json({
      kanji: inputChars.map((c) => {
        const k = kanji.find((x) => x.char === c) || {}
        return {
          char: c,
          onyomi: k.onyomi || '',
          kunyomi: k.kunyomi || '',
          onExamples: Array.isArray(k.onExamples) ? k.onExamples.slice(0, 3) : [],
          kunExamples: Array.isArray(k.kunExamples) ? k.kunExamples.slice(0, 3) : [],
        }
      }),
    })
  } catch (err) {
    console.error('Enrich kanji', err)
    const msg = err?.message?.includes('parse') ? 'Could not parse result. Try again.' : 'Enrichment failed. Try again.'
    return res.status(502).json({ error: msg })
  }
}
