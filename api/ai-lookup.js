import { ensureUserProfile, query } from './_lib/db'
import { getAuthContext, ensureAuthUserId } from './_lib/auth'
import { checkRateLimit, generateJson } from './_lib/gemini'
import { handleOptions, methodNotAllowed, parseJsonBody, setCors } from './_lib/http'

const SYSTEM_PROMPT = `You are an expert Japanese tutor for enterprise learning dashboards.
Return strict JSON only.

Schema:
{
  "type": "vocabulary|grammar|kanji|phrase",
  "word": "Japanese term",
  "reading": "hiragana reading",
  "romaji": "romaji",
  "meaning_en": "short English meaning",
  "meaning_hi": "short Hindi meaning if possible, else empty string",
  "jlpt_level": "N5|N4|N3|N2|N1",
  "part_of_speech": "noun/verb/etc",
  "formal_casual_usage": "formal/casual explanation",
  "business_usage": "business usage sentence or guidance",
  "similar_words": ["..."],
  "common_mistake": "common learner mistake",
  "example_jp": "single Japanese sentence",
  "example_romaji": "romaji sentence",
  "example_en": "English translation"
}

Rules:
- Keep concise.
- Always include every key.
- If unknown, use empty string.
- Estimate JLPT level realistically.
- Output valid JSON only.`

export default async function handler(req, res) {
  if (handleOptions(req, res, 'GET, POST, OPTIONS')) return
  setCors(res, 'GET, POST, OPTIONS')

  const body = req.method === 'POST'
    ? (() => {
        try {
          return parseJsonBody(req)
        } catch {
          return null
        }
      })()
    : {}

  if (req.method === 'POST' && !body) return res.status(400).json({ error: 'Invalid JSON body' })
  if (!['GET', 'POST'].includes(req.method)) return methodNotAllowed(req, res, ['GET', 'POST', 'OPTIONS'])

  const auth = getAuthContext(req, body || {})
  if (!ensureAuthUserId(auth, res)) return

  try {
    const profile = await ensureUserProfile(auth)

    if (req.method === 'GET') {
      const history = await query(
        `select id, query, response, lookup_type, created_at
         from ai_lookups
         where user_id = $1
         order by created_at desc
         limit 15`,
        [profile.id]
      )
      return res.status(200).json({ items: history.rows })
    }

    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.headers['x-real-ip'] || 'unknown'
    if (!checkRateLimit(ip, 'ai-lookup', 30)) {
      return res.status(429).json({ error: 'Too many requests. Please try again in a minute.' })
    }

    const lookupQuery = String(body.query || body.q || '').trim()
    if (!lookupQuery) return res.status(400).json({ error: 'query is required' })

    const result = await generateJson({
      systemPrompt: SYSTEM_PROMPT,
      prompt: lookupQuery,
      maxOutputTokens: 2048,
      temperature: 0.3,
    })

    const normalized = {
      type: String(result.type || 'vocabulary').toLowerCase(),
      word: String(result.word || lookupQuery).trim(),
      reading: String(result.reading || '').trim(),
      romaji: String(result.romaji || '').trim(),
      meaning_en: String(result.meaning_en || result.meaning || '').trim(),
      meaning_hi: String(result.meaning_hi || '').trim(),
      jlpt_level: String(result.jlpt_level || result.level || 'N5').trim().toUpperCase(),
      part_of_speech: String(result.part_of_speech || '').trim(),
      formal_casual_usage: String(result.formal_casual_usage || '').trim(),
      business_usage: String(result.business_usage || '').trim(),
      similar_words: Array.isArray(result.similar_words) ? result.similar_words.slice(0, 8) : [],
      common_mistake: String(result.common_mistake || '').trim(),
      example_jp: String(result.example_jp || '').trim(),
      example_romaji: String(result.example_romaji || '').trim(),
      example_en: String(result.example_en || '').trim(),
    }

    await query(
      `insert into ai_lookups (user_id, query, response, lookup_type, created_at)
       values ($1, $2, $3::jsonb, $4, now())`,
      [profile.id, lookupQuery, JSON.stringify(normalized), 'word-intelligence']
    )

    await query(
      `insert into learning_activity (user_id, activity_type, score, metadata, created_at)
       values ($1, 'ai_lookup', null, $2::jsonb, now())`,
      [profile.id, JSON.stringify({ query: lookupQuery, jlptLevel: normalized.jlpt_level })]
    )

    return res.status(200).json(normalized)
  } catch (error) {
    console.error('ai-lookup error', error)
    return res.status(500).json({ error: 'Lookup failed. Please try again.' })
  }
}
