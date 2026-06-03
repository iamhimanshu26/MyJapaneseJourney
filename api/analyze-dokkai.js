import { ensureUserProfile, query } from './_lib/db.js'
import { getAuthContext, ensureAuthUserId } from './_lib/auth.js'
import { checkRateLimit, generateJson } from './_lib/gemini.js'
import { handleOptions, methodNotAllowed, parseJsonBody, setCors } from './_lib/http.js'

const SYSTEM_PROMPT = `You are a Japanese reading-comprehension analyzer.
Return strict JSON only:
{
  "original_text": "...",
  "romaji": "...",
  "english_translation": "...",
  "estimated_jlpt_level": "N5|N4|N3|N2|N1",
  "summary": "...",
  "vocabulary": [{"word":"", "reading":"", "meaning_en":"", "jlpt_level":""}],
  "kanji": [{"char":"", "reading":"", "meaning_en":""}],
  "grammar_points": [{"name":"", "meaning":"", "level":""}],
  "practice_questions": [{"question":"", "answer":""}]
}
Rules:
- Keep vocabulary max 20, kanji max 15, grammar max 10, questions max 5.
- Must include all keys.
- JSON only.`

export default async function handler(req, res) {
  if (handleOptions(req, res, 'GET, POST, OPTIONS')) return
  setCors(res, 'GET, POST, OPTIONS')
  if (!['GET', 'POST'].includes(req.method)) return methodNotAllowed(req, res, ['GET', 'POST', 'OPTIONS'])

  let body = {}
  if (req.method === 'POST') {
    try {
      body = parseJsonBody(req)
    } catch {
      return res.status(400).json({ error: 'Invalid JSON body' })
    }
  }

  const auth = getAuthContext(req, body || {})
  if (!ensureAuthUserId(auth, res)) return

  try {
    const profile = await ensureUserProfile(auth)

    if (req.method === 'GET') {
      const history = await query(
        `select id, input_text, romaji, english_translation, summary, estimated_jlpt_level,
                vocabulary_json, kanji_json, grammar_json, questions_json, created_at
         from dokkai_analyses
         where user_id = $1
         order by created_at desc
         limit 10`,
        [profile.id]
      )
      return res.status(200).json({ items: history.rows })
    }

    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.headers['x-real-ip'] || 'unknown'
    if (!checkRateLimit(ip, 'dokkai', 12)) {
      return res.status(429).json({ error: 'Too many requests. Please try again shortly.' })
    }

    const inputText = String(body.text || '').trim().slice(0, 10000)
    if (!inputText) return res.status(400).json({ error: 'text is required' })

    const analysis = await generateJson({
      systemPrompt: SYSTEM_PROMPT,
      prompt: inputText,
      maxOutputTokens: 4096,
      temperature: 0.2,
    })

    const normalized = {
      original_text: String(analysis.original_text || inputText),
      romaji: String(analysis.romaji || ''),
      english_translation: String(analysis.english_translation || ''),
      estimated_jlpt_level: String(analysis.estimated_jlpt_level || 'N4').toUpperCase(),
      summary: String(analysis.summary || ''),
      vocabulary: Array.isArray(analysis.vocabulary) ? analysis.vocabulary : [],
      kanji: Array.isArray(analysis.kanji) ? analysis.kanji : [],
      grammar_points: Array.isArray(analysis.grammar_points) ? analysis.grammar_points : [],
      practice_questions: Array.isArray(analysis.practice_questions) ? analysis.practice_questions : [],
    }

    await query(
      `insert into dokkai_analyses (
        user_id, input_text, romaji, english_translation, summary, estimated_jlpt_level,
        vocabulary_json, kanji_json, grammar_json, questions_json, created_at
      ) values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9::jsonb, $10::jsonb, now())`,
      [
        profile.id,
        normalized.original_text,
        normalized.romaji,
        normalized.english_translation,
        normalized.summary,
        normalized.estimated_jlpt_level,
        JSON.stringify(normalized.vocabulary),
        JSON.stringify(normalized.kanji),
        JSON.stringify(normalized.grammar_points),
        JSON.stringify(normalized.practice_questions),
      ]
    )

    await query(
      `insert into learning_activity (user_id, activity_type, score, metadata, created_at)
       values ($1, 'dokkai_analysis', null, $2::jsonb, now())`,
      [profile.id, JSON.stringify({ estimatedJlpt: normalized.estimated_jlpt_level })]
    )

    return res.status(200).json(normalized)
  } catch (error) {
    console.error('analyze-dokkai error', error)
    return res.status(500).json({ error: 'Dokkai analysis failed' })
  }
}
