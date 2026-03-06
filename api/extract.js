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

const EXTRACT_PROMPT = `You are a Japanese language expert. Extract ALL Japanese vocabulary, grammar, and individual kanji from the user's text.

You MUST respond with ONLY a single valid JSON object. No markdown, no code blocks, no explanation. The response must parse with JSON.parse().

Format:
{"vocab":[{"word":"日本語","reading":"にほんご","meaning":"Japanese language","level":"N5"}],"grammar":[{"name":"〜です","structure":"Noun + です","meaning":"Polite copula","level":"N5","example":"学生(がくせい)です。"}],"kanji":[{"char":"日","reading":"ひ","meaning":"day","level":"N5"}]}

Rules:
- vocab: every word/phrase with {word, reading, meaning, level}. "word"=Japanese, "reading"=hiragana.
- grammar: every grammar point with {name, structure, meaning, level, example}. Example uses 漢字(読み).
- kanji: individual kanji characters with {char, reading, meaning, level}. Extract kanji that appear in the text.
- JLPT level N5–N1 when inferrable, else "N5"
- Skip purely English or numbers. Empty arrays [] if nothing found.
- No trailing commas. Double quotes only. Escape quotes in strings.`

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
    // Handle multiple possible response shapes (Gemini API can vary)
    const parts = data?.candidates?.[0]?.content?.parts || []
    const textPart = parts.find(p => p?.text) || parts[0]
    let raw = (textPart?.text || '').trim() || '{}'

    // Strip markdown code blocks (Gemini sometimes wraps JSON)
    raw = raw.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?\s*```\s*$/, '')

    // Extract the JSON object
    let jsonStr = raw
    const braceMatch = raw.match(/\{[\s\S]*\}/)
    if (braceMatch) jsonStr = braceMatch[0]

    // Fix trailing commas (invalid in JSON but LLMs often produce them)
    jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1')

    let result
    try {
      result = JSON.parse(jsonStr)
    } catch (parseErr) {
      // Fallback: try parsing as JSONC (strip // and /* */ comments)
      try {
        const cleaned = jsonStr
          .replace(/\/\/[^\n]*/g, '')
          .replace(/\/\*[\s\S]*?\*\//g, '')
        result = JSON.parse(cleaned)
      } catch {
        console.error('Extract parse error:', parseErr?.message, 'Preview:', jsonStr?.slice(0, 400))
        return res.status(502).json({
          error: 'Could not parse extraction result. Try again or use shorter text.',
        })
      }
    }

    // Normalize: some models use vocabulary/vocabulary_items or grammar_points
    result.vocab = Array.isArray(result.vocab)
      ? result.vocab
      : Array.isArray(result.vocabulary)
        ? result.vocabulary
        : Array.isArray(result.vocabulary_items)
          ? result.vocabulary_items
          : []
    result.grammar = Array.isArray(result.grammar)
      ? result.grammar
      : Array.isArray(result.grammar_points)
        ? result.grammar_points
        : []

    // Normalize vocab items: handle word/japanese, reading/kana, meaning/english
    result.vocab = result.vocab
      .filter((v) => v && typeof v === 'object')
      .map((v) => ({
        word: String(v.word ?? v.japanese ?? v.jp ?? ''),
        reading: String(v.reading ?? v.kana ?? v.furigana ?? ''),
        meaning: String(v.meaning ?? v.english ?? v.en ?? ''),
        level: String(v.level ?? 'N5'),
      }))
      .filter((v) => v.word)

    // Normalize grammar items
    result.grammar = result.grammar
      .filter((g) => g && typeof g === 'object')
      .map((g) => ({
        name: String(g.name ?? g.pattern ?? ''),
        structure: String(g.structure ?? ''),
        meaning: String(g.meaning ?? ''),
        level: String(g.level ?? 'N5'),
        example: String(g.example ?? g.examples?.[0] ?? ''),
      }))
      .filter((g) => g.name)

    // Normalize kanji array
    result.kanji = Array.isArray(result.kanji) ? result.kanji : []
    result.kanji = result.kanji
      .filter((k) => k && typeof k === 'object')
      .map((k) => ({
        char: String(k.char ?? k.character ?? k.kanji ?? ''),
        reading: String(k.reading ?? k.on ?? k.kunyomi ?? ''),
        meaning: String(k.meaning ?? k.english ?? ''),
        level: String(k.level ?? 'N5'),
      }))
      .filter((k) => k.char)

    return res.status(200).json(result)
  } catch (err) {
    console.error('Extract error', err)
    return res.status(500).json({ error: 'Something went wrong. Please try again.' })
  }
}
