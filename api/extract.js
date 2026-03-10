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

const EXTRACT_PROMPT = `You are a Japanese language expert. Extract vocabulary, grammar, and kanji from the user's text.

CRITICAL: Respond with ONLY a valid JSON object. No markdown, no \`\`\`json, no explanation. Start with { and end with }.

Exact format (copy this structure):
{"vocab":[{"word":"日","reading":"ひ","meaning":"day","level":"N5","examples":[{"jp":"今日(きょう)はいい天気(てんき)です。","en":"Today is nice weather."}]}],"grammar":[{"name":"〜です","structure":"Noun+です","meaning":"polite copula","level":"N5","example":"学生です"}],"kanji":[{"char":"月","reading":"つき","meaning":"moon, month","level":"N5","onyomi":"ゲツ,ガツ","kunyomi":"つき","onExamples":[{"jp":"今月(こんげつ)","en":"this month"},{"jp":"来月(らいげつ)","en":"next month"}],"kunExamples":[{"jp":"月(つき)","en":"moon"},{"jp":"毎月(まいつき)","en":"every month"}]}]}

Rules:
- vocab: word, reading, meaning, level; optional "examples": [{"jp":"sentence with 漢字(読み)","en":"translation"}]
- grammar: name, structure, meaning, level, example
- kanji: char, reading (primary), meaning, level; onyomi (e.g. "ゲツ"), kunyomi (e.g. "つき"); optional "onExamples": [{"jp":"","en":""}], "kunExamples": [{"jp":"","en":""}]
- Use double quotes for all keys and string values. Escape " as \\" inside strings.
- No trailing commas. No comments.
- Empty arrays [] if nothing found.
- Keep output compact. Limit to ~50 vocab, ~20 grammar, ~30 kanji to stay within token limit.`

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

  const fullText = (body.text || body.content || '').trim().slice(0, 50000)
  if (!fullText) {
    return res.status(400).json({ error: 'Text is required' })
  }

  const CHUNK_SIZE = 5500
  const chunks = fullText.length <= CHUNK_SIZE
    ? [fullText]
    : (() => {
        const arr = []
        let pos = 0
        const breakChars = new Set(['。', '．', '\n', '.', ' ', '\t'])
        while (pos < fullText.length) {
          let end = Math.min(pos + CHUNK_SIZE, fullText.length)
          if (end < fullText.length) {
            for (let i = end - 1; i > pos; i--) {
              if (breakChars.has(fullText[i])) { end = i + 1; break }
            }
          }
          arr.push(fullText.slice(pos, end))
          pos = end
        }
        return arr
      })()

  const runExtract = async (textChunk) => {
    const response = await fetch(`${GEMINI_URL}?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: textChunk }] }],
        systemInstruction: { parts: [{ text: EXTRACT_PROMPT }] },
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 8192,
          responseMimeType: 'application/json',
        },
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('Gemini extract error', response.status, errText)
      throw new Error('Extraction failed')
    }

    const data = await response.json()
    // Handle multiple possible response shapes (Gemini API can vary)
    const parts = data?.candidates?.[0]?.content?.parts || []
    const textPart = parts.find(p => p?.text) || parts[0]
    let raw = (textPart?.text || '').trim() || '{}'

    // Strip markdown code blocks
    raw = raw.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?\s*```\s*$/i, '')

    // Extract the first complete {...} object using brace balance
    let jsonStr = raw
    const start = raw.indexOf('{')
    if (start >= 0) {
      let depth = 0
      let end = start
      for (let i = start; i < raw.length; i++) {
        if (raw[i] === '{') depth++
        else if (raw[i] === '}') { depth--; if (depth === 0) { end = i + 1; break } }
      }
      if (end > start) jsonStr = raw.slice(start, end)
    }

    // Repair common LLM JSON issues
    jsonStr = jsonStr
      .replace(/,(\s*[}\]])/g, '$1')           // trailing commas
      .replace(/\r\n/g, '\n')                  // normalize newlines
      .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')  // remove control chars, keep \n \t

    let result
    try {
      result = JSON.parse(jsonStr)
    } catch (parseErr) {
      try {
        const cleaned = jsonStr.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '')
        result = JSON.parse(cleaned)
      } catch {
        console.error('Extract parse error:', parseErr?.message, 'Preview:', jsonStr?.slice(0, 600))
        throw new Error('Could not parse extraction result')
      }
    }

    if (!result || typeof result !== 'object') {
      throw new Error('Could not parse extraction result')
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
        examples: Array.isArray(v.examples) ? v.examples.slice(0, 3).map((e) => ({ jp: String(e?.jp ?? e?.ja ?? ''), en: String(e?.en ?? e?.english ?? '') })) : [],
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
        reading: String(k.reading ?? k.kunyomi ?? k.on ?? ''),
        meaning: String(k.meaning ?? k.english ?? ''),
        level: String(k.level ?? 'N5'),
        onyomi: String(k.onyomi ?? k.on ?? '').trim(),
        kunyomi: String(k.kunyomi ?? k.kun ?? '').trim(),
        onExamples: Array.isArray(k.onExamples) ? k.onExamples.slice(0, 3).map((e) => ({ jp: String(e?.jp ?? ''), en: String(e?.en ?? '') })) : [],
        kunExamples: Array.isArray(k.kunExamples) ? k.kunExamples.slice(0, 3).map((e) => ({ jp: String(e?.jp ?? ''), en: String(e?.en ?? '') })) : [],
        examples: Array.isArray(k.examples) ? k.examples.slice(0, 2).map((e) => ({ jp: String(e?.jp ?? ''), en: String(e?.en ?? '') })) : [],
      }))
      .filter((k) => k.char)

    return result
  }

  const seenVocab = new Set()
  const seenGrammar = new Set()
  const seenKanji = new Set()
  const merged = { vocab: [], grammar: [], kanji: [] }

  try {
    for (let i = 0; i < chunks.length; i++) {
      const chunkResult = await runExtract(chunks[i])
      if (!chunkResult) continue
      for (const v of chunkResult.vocab || []) {
        const key = `${v.word}|${v.reading || ''}`
        if (!seenVocab.has(key)) { seenVocab.add(key); merged.vocab.push(v) }
      }
      for (const g of chunkResult.grammar || []) {
        const key = g.name || ''
        if (key && !seenGrammar.has(key)) { seenGrammar.add(key); merged.grammar.push(g) }
      }
      for (const k of chunkResult.kanji || []) {
        if (k.char && !seenKanji.has(k.char)) { seenKanji.add(k.char); merged.kanji.push(k) }
      }
    }
    return res.status(200).json(merged)
  } catch (err) {
    console.error('Extract error', err)
    const isParseErr = err?.message?.includes('parse extraction')
    const isExtractErr = err?.message === 'Extraction failed'
    const status = isParseErr || isExtractErr ? 502 : 500
    const msg = isParseErr ? 'Could not parse extraction result. Try again or use shorter text.' : (isExtractErr ? 'Extraction failed. Try again.' : 'Something went wrong. Please try again.')
    return res.status(status).json({ error: msg })
  }
}
