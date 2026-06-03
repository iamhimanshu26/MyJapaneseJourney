const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

const rateLimits = new Map()

export function checkRateLimit(ip, key, maxPerMinute) {
  const now = Date.now()
  const recordKey = `${key}:${ip || 'unknown'}`
  const current = rateLimits.get(recordKey) || { count: 0, resetAt: now + 60_000 }
  if (now > current.resetAt) {
    current.count = 0
    current.resetAt = now + 60_000
  }
  current.count += 1
  rateLimits.set(recordKey, current)
  return current.count <= maxPerMinute
}

export async function generateJson({ prompt, systemPrompt, maxOutputTokens = 2048, temperature = 0.2 }) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured')

  const response = await fetch(`${GEMINI_URL}?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature,
        maxOutputTokens,
        responseMimeType: 'application/json',
      },
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Gemini request failed: ${response.status} ${err}`)
  }

  const data = await response.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}'
  const normalized = String(text)
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
  const match = normalized.match(/\{[\s\S]*\}/)
  const jsonText = match ? match[0] : normalized
  return JSON.parse(jsonText)
}
