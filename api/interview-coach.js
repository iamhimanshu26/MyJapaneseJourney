import { ensureUserProfile, query } from './_lib/db'
import { getAuthContext, ensureAuthUserId } from './_lib/auth'
import { checkRateLimit, generateJson } from './_lib/gemini'
import { handleOptions, methodNotAllowed, parseJsonBody, setCors } from './_lib/http'

const SYSTEM_PROMPT = `You are a Japanese interview coach for non-native professionals.
Return strict JSON only:
{
  "topic": "",
  "ai_answer_jp": "",
  "romaji": "",
  "english_meaning": "",
  "simpler_version_jp": "",
  "professional_version_jp": "",
  "feedback": "",
  "score": 0
}
Rules:
- score is integer 0-100.
- Answer should be practical for interview situations.
- Keep concise.
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
        `select id, topic, user_answer, ai_answer_jp, romaji, english_meaning, feedback, score, created_at
         from interview_practice
         where user_id = $1
         order by created_at desc
         limit 12`,
        [profile.id]
      )
      return res.status(200).json({ items: history.rows })
    }

    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.headers['x-real-ip'] || 'unknown'
    if (!checkRateLimit(ip, 'interview-coach', 20)) {
      return res.status(429).json({ error: 'Too many requests. Please try again shortly.' })
    }

    const topic = String(body.topic || '').trim()
    const userAnswer = String(body.userAnswer || '').trim()
    if (!topic) return res.status(400).json({ error: 'topic is required' })

    const prompt = `Topic: ${topic}\nUser answer (optional): ${userAnswer || 'N/A'}`

    const coached = await generateJson({
      systemPrompt: SYSTEM_PROMPT,
      prompt,
      maxOutputTokens: 2048,
      temperature: 0.4,
    })

    const normalized = {
      topic,
      user_answer: userAnswer,
      ai_answer_jp: String(coached.ai_answer_jp || ''),
      romaji: String(coached.romaji || ''),
      english_meaning: String(coached.english_meaning || ''),
      simpler_version_jp: String(coached.simpler_version_jp || ''),
      professional_version_jp: String(coached.professional_version_jp || ''),
      feedback: String(coached.feedback || ''),
      score: Number.isFinite(Number(coached.score)) ? Math.max(0, Math.min(100, Number(coached.score))) : 0,
    }

    await query(
      `insert into interview_practice
       (user_id, topic, user_answer, ai_answer_jp, romaji, english_meaning, feedback, score, created_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, now())`,
      [
        profile.id,
        normalized.topic,
        normalized.user_answer,
        normalized.ai_answer_jp,
        normalized.romaji,
        normalized.english_meaning,
        normalized.feedback,
        normalized.score,
      ]
    )

    await query(
      `insert into learning_activity (user_id, activity_type, score, metadata, created_at)
       values ($1, 'interview_practice', $2, $3::jsonb, now())`,
      [profile.id, normalized.score, JSON.stringify({ topic })]
    )

    return res.status(200).json(normalized)
  } catch (error) {
    console.error('interview-coach error', error)
    return res.status(500).json({ error: 'Interview coach request failed' })
  }
}
