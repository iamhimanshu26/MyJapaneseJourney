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

function extractJsonCandidate(text) {
  const normalized = String(text || '{}')
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
  const start = normalized.indexOf('{')
  if (start < 0) return normalized

  let depth = 0
  let end = -1
  for (let i = start; i < normalized.length; i += 1) {
    if (normalized[i] === '{') depth += 1
    if (normalized[i] === '}') {
      depth -= 1
      if (depth === 0) {
        end = i + 1
        break
      }
    }
  }

  if (end > start) return normalized.slice(start, end)

  const openCount = (normalized.match(/\{/g) || []).length
  const closeCount = (normalized.match(/\}/g) || []).length
  const missing = Math.max(0, openCount - closeCount)
  return normalized.slice(start) + '}'.repeat(missing)
}

function parseLooseJson(text) {
  const candidate = extractJsonCandidate(text)
  const cleaned = candidate
    .replace(/,(\s*[}\]])/g, '$1')
    .replace(/[\u0000-\u001f]/g, (char) => (char === '\n' || char === '\t' || char === '\r' ? char : ''))

  try {
    return JSON.parse(cleaned)
  } catch {
    const noComments = cleaned
      .replace(/\/\/[^\n]*/g, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
    return JSON.parse(noComments)
  }
}

async function requestGemini({ apiKey, prompt, systemPrompt, maxOutputTokens, temperature }) {
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
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}'
}

export async function generateJson({ prompt, systemPrompt, maxOutputTokens = 2048, temperature = 0.2 }) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured')

  const firstText = await requestGemini({
    apiKey,
    prompt,
    systemPrompt,
    maxOutputTokens,
    temperature,
  })

  try {
    return parseLooseJson(firstText)
  } catch (firstError) {
    const retryPrompt = `${prompt}\n\nReturn strict valid JSON only. Ensure all strings are properly quoted and escaped.`
    const secondText = await requestGemini({
      apiKey,
      prompt: retryPrompt,
      systemPrompt,
      maxOutputTokens,
      temperature: 0.1,
    })
    try {
      return parseLooseJson(secondText)
    } catch {
      throw firstError
    }
  }
}
