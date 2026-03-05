const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

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
  "examples": ["<Japanese sentence with translation in parentheses>", ...]
}

For GRAMMAR:
{
  "type": "grammar",
  "name": "<grammar point name/structure>",
  "structure": "<pattern e.g. verb-ます form + に行く>",
  "meaning": "<concise explanation>",
  "level": "<one of: N5, N4, N3, N2, N1>",
  "examples": ["<Japanese example with translation>", ...]
}

Rules:
- Decide if the query is vocab or grammar. Single words/phrases = vocab. Patterns like 〜ている, 〜方がいい = grammar.
- Provide 2-3 example sentences. Format: "Japanese text (English translation)"
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
    if (result.type === 'vocab') {
      result.word = result.word || query
      result.reading = result.reading || ''
      result.meaning = result.meaning || 'Unknown'
      result.level = result.level || 'N?'
      result.examples = Array.isArray(result.examples)
        ? result.examples
        : [result.examples].filter(Boolean)
    } else {
      result.name = result.name || result.structure || query
      result.meaning = result.meaning || 'Unknown'
      result.level = result.level || 'N?'
      result.examples = Array.isArray(result.examples)
        ? result.examples
        : [result.examples].filter(Boolean)
    }

    return res.status(200).json(result)
  } catch (err) {
    console.error('Lookup error', err)
    return res.status(500).json({
      error: 'Something went wrong. Please try again.',
    })
  }
}
