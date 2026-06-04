import { appendTimelineEvent, ensureUserProfile, query } from '../server/lib/db.js'
import { requireAuthorizedContext } from '../server/lib/authSession.js'
import { checkRateLimit, generateJson } from '../server/lib/gemini.js'
import { handleOptions, methodNotAllowed, parseJsonBody, setCors } from '../server/lib/http.js'

const SYSTEM_PROMPT = `You are a Japanese reading-comprehension analyzer.
Return strict JSON only:
{
  "original_text": "...",
  "romaji": "...",
  "english_translation": "...",
  "estimated_jlpt_level": "N5|N4|N3|N2|N1",
  "summary": "...",
  "difficulty_score": 0,
  "reading_speed_wpm": 0,
  "summary_quality_score": 0,
  "vocabulary": [{"word":"", "reading":"", "meaning_en":"", "jlpt_level":""}],
  "kanji": [{"char":"", "reading":"", "meaning_en":""}],
  "grammar_points": [{"name":"", "meaning":"", "level":""}],
  "practice_questions": [{"question":"", "answer":""}]
}
Rules:
- Keep vocabulary max 20, kanji max 15, grammar max 10, questions max 5.
- Must include all keys.
- JSON only.`

function buildFallbackAnalysis(inputText, reason = '') {
  const shortReason = String(reason || '').replace(/\s+/g, ' ').slice(0, 160)
  return {
    original_text: inputText,
    romaji: '',
    english_translation: 'Translation unavailable due temporary AI quota/rate limit.',
    estimated_jlpt_level: 'N4',
    summary: shortReason
      ? `Fallback summary generated because AI request failed: ${shortReason}`
      : 'Fallback summary generated.',
    vocabulary: [],
    kanji: [],
    grammar_points: [],
    practice_questions: [],
    fallback_used: true,
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
      const history = await query(
        `select id, input_text, romaji, english_translation, summary, estimated_jlpt_level,
                difficulty_score, reading_speed_wpm, summary_quality_score,
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

    let analysis
    try {
      analysis = await generateJson({
        systemPrompt: SYSTEM_PROMPT,
        prompt: inputText,
        maxOutputTokens: 4096,
        temperature: 0.2,
      })
    } catch (error) {
      analysis = buildFallbackAnalysis(inputText, String(error?.message || ''))
    }

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
      fallback_used: Boolean(analysis.fallback_used),
    }
    const charCount = normalized.original_text.length
    const complexityIndex = (normalized.kanji.length * 2) + normalized.grammar_points.length + Math.floor(charCount / 120)
    const difficultyScore = Math.max(10, Math.min(100, Number(analysis.difficulty_score || complexityIndex * 4 || 40)))
    const readingSpeedWpm = Math.max(60, Math.min(240, Number(analysis.reading_speed_wpm || 210 - difficultyScore)))
    const summaryQualityScore = Math.max(50, Math.min(100, Number(analysis.summary_quality_score || 70 + normalized.practice_questions.length * 4)))
    const vocabularyDeck = normalized.vocabulary.slice(0, 15).map((item) => ({
      type: 'vocabulary',
      word: item.word,
      reading: item.reading,
      meaning_en: item.meaning_en,
      jlpt_level: item.jlpt_level || normalized.estimated_jlpt_level || 'N4',
    }))
    const grammarDeck = normalized.grammar_points.slice(0, 10).map((item) => ({
      type: 'grammar',
      word: item.name,
      meaning_en: item.meaning,
      jlpt_level: item.level || normalized.estimated_jlpt_level || 'N4',
    }))

    await query(
      `insert into dokkai_analyses (
        user_id, input_text, romaji, english_translation, summary, estimated_jlpt_level,
        difficulty_score, reading_speed_wpm, summary_quality_score,
        vocabulary_json, kanji_json, grammar_json, questions_json, created_at
      ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11::jsonb, $12::jsonb, $13::jsonb, now())`,
      [
        profile.id,
        normalized.original_text,
        normalized.romaji,
        normalized.english_translation,
        normalized.summary,
        normalized.estimated_jlpt_level,
        difficultyScore,
        readingSpeedWpm,
        summaryQualityScore,
        JSON.stringify(normalized.vocabulary),
        JSON.stringify(normalized.kanji),
        JSON.stringify(normalized.grammar_points),
        JSON.stringify(normalized.practice_questions),
      ]
    )

    await query(
      `insert into learning_activity (user_id, activity_type, score, metadata, created_at)
       values ($1, 'dokkai_analysis', null, $2::jsonb, now())`,
      [profile.id, JSON.stringify({ estimatedJlpt: normalized.estimated_jlpt_level, difficultyScore, summaryQualityScore })]
    )

    await appendTimelineEvent({
      userId: profile.id,
      activityType: 'dokkai_analysis',
      title: 'Completed a Dokkai analysis',
      description: `Difficulty ${difficultyScore}/100 • estimated ${normalized.estimated_jlpt_level}`,
      metadata: { difficultyScore, readingSpeedWpm, summaryQualityScore },
    })

    return res.status(200).json({
      ...normalized,
      difficulty_score: difficultyScore,
      reading_speed_wpm: readingSpeedWpm,
      summary_quality_score: summaryQualityScore,
      vocabulary_deck: vocabularyDeck,
      grammar_deck: grammarDeck,
    })
  } catch (error) {
    console.error('analyze-dokkai error', error)
    return res.status(500).json({ error: 'Dokkai analysis failed' })
  }
}
