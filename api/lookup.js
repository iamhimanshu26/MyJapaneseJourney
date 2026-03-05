const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

// Simple in-memory rate limit: 30 requests per IP per minute
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 30
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
  if (record.count > RATE_LIMIT_MAX) {
    return false
  }
  return true
}

const SYSTEM_PROMPT = `You are a Japanese language expert for a JLPT learning platform. The user will search for a Japanese word or grammar point (they may type in Japanese kana/kanji or romaji).

Your task: Return a JSON object with the following structure. No other text—only valid JSON.

For VOCABULARY:
{
  "type": "vocab",
  "word": "<the word in Japanese>",
  "reading": "<reading in hiragana/romaji>",
  "meaning": "<concise English meaning>",
  "partOfSpeech": "<e.g. adverb, noun, verb>",
  "level": "<one of: N5, N4, N3, N2, N1>",
  "examples": [
    { "jp": "<ONE line: full sentence with 漢字(読み) inline>", "en": "<English translation>" },
    ...
  ]
}

For GRAMMAR:
{
  "type": "grammar",
  "name": "<grammar point name/structure>",
  "structure": "<pattern e.g. verb-ます form + に行く>",
  "meaning": "<concise explanation>",
  "level": "<one of: N5, N4, N3, N2, N1>",
  "examples": [
    { "jp": "<ONE line: full sentence with 漢字(読み) inline>", "en": "<English translation>" },
    ...
  ]
}

CRITICAL - Example sentence format:
- "jp" must be ONE single line. Never split into multiple lines. Never list kanji separately.
- Write the FULL sentence with kanji. For EACH kanji, add (reading) immediately after it. Example: 予約(よやく)の確認(かくにん)をお願い(おねがい)します。
- ALL kanji in the sentence must have furigana. No exceptions for N5, N4.
- Hiragana/katakana between kanji stay as-is (の, を, し, etc). Only kanji get (読み).

Rules:
- Decide if the query is vocab or grammar. Single words/phrases = vocab. Patterns like 〜ている, 〜方がいい = grammar.
- examples must be array of objects with "jp" and "en" keys
- level must be exactly N5, N4, N3, N2, or N1
- Be concise. If unsure of level, use the most likely one.
- Output ONLY the JSON object, no markdown, no extra text.`

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }

  const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.headers['x-real-ip'] || 'unknown'
  if (!checkRateLimit(clientIp)) {
    return res.status(429).json({ error: 'Too many requests. Please try again in a minute.' })
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return res.status(503).json({ error: 'Lookup is not configured. Add GEMINI_API_KEY.' })
  }

  let body
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' })
  }

  const query = (body.query || body.q || '').trim()
  if (!query) {
    return res.status(400).json({ error: 'Query is required' })
  }

  try {
    const response = await fetch(
      `${GEMINI_URL}?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ role: 'user', parts: [{ text: query }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1024,
            responseMimeType: 'application/json',
          },
        }),
      }
    )

    if (!response.ok) {
      const errText = await response.text()
      console.error('Gemini API error', response.status, errText)
      let msg = 'Lookup temporarily unavailable. Try again.'
      try {
        const err = JSON.parse(errText)
        if (err?.error?.message) msg = err.error.message
      } catch (_) {}
      return res.status(502).json({ error: msg })
    }

    const data = await response.json()
    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '{}'

    // Extract JSON from response (Gemini sometimes wraps in markdown)
    let jsonStr = text
    const match = text.match(/\{[\s\S]*\}/)
    if (match) jsonStr = match[0]

    let result
    try {
      result = JSON.parse(jsonStr)
    } catch {
      return res.status(502).json({ error: 'Could not parse lookup result.' })
    }

    // Normalize for frontend
    const normalizeExample = (ex) => {
      if (typeof ex === 'string') {
        const match = ex.match(/^(.+?)[。\s]*\(([^)]+)\)\s*$/)
        return match ? { jp: match[1].trim(), en: match[2].trim() } : { jp: ex, en: '' }
      }
      return { jp: ex?.jp || ex?.ja || '', en: ex?.en || ex?.english || '' }
    }
    result.examples = (Array.isArray(result.examples) ? result.examples : [])
      .filter(Boolean)
      .map(normalizeExample)
      .filter((e) => e.jp)

    if (result.type === 'vocab') {
      result.word = result.word || query
      result.reading = result.reading || ''
      result.meaning = result.meaning || 'Unknown'
      result.level = result.level || 'N?'
    } else {
      result.name = result.name || result.structure || query
      result.meaning = result.meaning || 'Unknown'
      result.level = result.level || 'N?'
    }

    return res.status(200).json(result)
  } catch (err) {
    console.error('Lookup error', err)
    return res.status(500).json({
      error: 'Something went wrong. Please try again.',
    })
  }
}
