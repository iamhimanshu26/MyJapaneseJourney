import { appendTimelineEvent, ensureUserProfile, query } from '../server/lib/db.js'
import { requireAuthorizedContext } from '../server/lib/authSession.js'
import { checkRateLimit, generateJson } from '../server/lib/gemini.js'
import { handleOptions, methodNotAllowed, parseJsonBody, setCors } from '../server/lib/http.js'

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
  "score": 0,
  "vocabulary_score": 0,
  "grammar_score": 0,
  "fluency_score": 0,
  "business_score": 0
}
Rules:
- score is integer 0-100.
- sub-scores are integers 0-100.
- Answer should be practical for interview situations.
- Keep concise.
- JSON only.`

function buildFallbackInterview(topic, userAnswer, reason = '') {
  const shortReason = String(reason || '').replace(/\s+/g, ' ').slice(0, 160)
  const jp = `本日(ほんじつ)は自己紹介(じこしょうかい)の機会(きかい)をいただき、ありがとうございます。私は継続的(けいぞくてき)な改善(かいぜん)とチーム連携(れんけい)を強(つよ)みとして、貢献(こうけん)したいと考(かんが)えています。`
  return {
    topic,
    ai_answer_jp: jp,
    romaji: 'Honjitsu wa jikoshoukai no kikai o itadaki, arigatou gozaimasu. Watashi wa keizokuteki na kaizen to chiimu renkei o tsuyomi to shite, kouken shitai to kangaeteimasu.',
    english_meaning: 'Thank you for this opportunity. My strengths are continuous improvement and team collaboration, and I would like to contribute with those.',
    simpler_version_jp: '自己紹介の機会をありがとうございます。私は改善と協力を大切にして働きます。',
    professional_version_jp: jp,
    feedback: shortReason
      ? `AI quota/rate limit fallback used. Refine this answer once quota recovers. Original answer: ${userAnswer || 'N/A'}`
      : `Good structure. Add one concrete project example to strengthen impact. Original answer: ${userAnswer || 'N/A'}`,
    score: 72,
    vocabulary_score: 70,
    grammar_score: 68,
    fluency_score: 73,
    business_score: 75,
    fallback_used: Boolean(reason),
  }
}

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

  const auth = await requireAuthorizedContext(req, res, { allowGuest: true })
  if (!auth) return

  try {
    const profile = auth.profile || await ensureUserProfile(auth)

    if (req.method === 'GET') {
      const [history, aggregates] = await Promise.all([
        query(
          `select id, topic, user_answer, ai_answer_jp, romaji, english_meaning, simpler_version_jp, professional_version_jp,
                  feedback, score, vocabulary_score, grammar_score, fluency_score, business_score, created_at
         from interview_practice
         where user_id = $1
         order by created_at desc
         limit 12`,
          [profile.id]
        ),
        query(
          `select
              coalesce(round(avg(score))::int, 0) as avg_score,
              coalesce(round(avg(vocabulary_score))::int, 0) as avg_vocab,
              coalesce(round(avg(grammar_score))::int, 0) as avg_grammar,
              coalesce(round(avg(fluency_score))::int, 0) as avg_fluency,
              coalesce(round(avg(business_score))::int, 0) as avg_business
           from interview_practice
           where user_id = $1`,
          [profile.id]
        ),
      ])
      return res.status(200).json({ items: history.rows, progress: aggregates.rows[0] || null })
    }

    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.headers['x-real-ip'] || 'unknown'
    if (!checkRateLimit(ip, 'interview-coach', 20)) {
      return res.status(429).json({ error: 'Too many requests. Please try again shortly.' })
    }

    const topic = String(body.topic || '').trim()
    const userAnswer = String(body.userAnswer || '').trim()
    if (!topic) return res.status(400).json({ error: 'topic is required' })

    const prompt = `Topic: ${topic}\nUser answer (optional): ${userAnswer || 'N/A'}`

    let coached
    try {
      coached = await generateJson({
        systemPrompt: SYSTEM_PROMPT,
        prompt,
        maxOutputTokens: 2048,
        temperature: 0.4,
      })
    } catch (error) {
      coached = buildFallbackInterview(topic, userAnswer, String(error?.message || ''))
    }

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
      vocabulary_score: Number.isFinite(Number(coached.vocabulary_score)) ? Math.max(0, Math.min(100, Number(coached.vocabulary_score))) : 0,
      grammar_score: Number.isFinite(Number(coached.grammar_score)) ? Math.max(0, Math.min(100, Number(coached.grammar_score))) : 0,
      fluency_score: Number.isFinite(Number(coached.fluency_score)) ? Math.max(0, Math.min(100, Number(coached.fluency_score))) : 0,
      business_score: Number.isFinite(Number(coached.business_score)) ? Math.max(0, Math.min(100, Number(coached.business_score))) : 0,
      fallback_used: Boolean(coached.fallback_used),
    }

    await query(
      `insert into interview_practice
       (user_id, topic, user_answer, ai_answer_jp, romaji, english_meaning, simpler_version_jp, professional_version_jp,
        feedback, score, vocabulary_score, grammar_score, fluency_score, business_score, created_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, now())`,
      [
        profile.id,
        normalized.topic,
        normalized.user_answer,
        normalized.ai_answer_jp,
        normalized.romaji,
        normalized.english_meaning,
        normalized.simpler_version_jp,
        normalized.professional_version_jp,
        normalized.feedback,
        normalized.score,
        normalized.vocabulary_score,
        normalized.grammar_score,
        normalized.fluency_score,
        normalized.business_score,
      ]
    )

    await query(
      `insert into learning_activity (user_id, activity_type, score, metadata, created_at)
       values ($1, 'interview_practice', $2, $3::jsonb, now())`,
      [profile.id, normalized.score, JSON.stringify({ topic, vocabularyScore: normalized.vocabulary_score, grammarScore: normalized.grammar_score })]
    )

    await appendTimelineEvent({
      userId: profile.id,
      activityType: 'interview_practice',
      title: `Interview practice: ${topic}`,
      description: `Overall score ${normalized.score}/100`,
      metadata: {
        score: normalized.score,
        vocabularyScore: normalized.vocabulary_score,
        grammarScore: normalized.grammar_score,
        fluencyScore: normalized.fluency_score,
        businessScore: normalized.business_score,
      },
    })

    return res.status(200).json(normalized)
  } catch (error) {
    console.error('interview-coach error', error)
    return res.status(500).json({ error: 'Interview coach request failed' })
  }
}
