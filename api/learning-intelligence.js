import { ensureUserProfile, query } from './_lib/db'
import { getAuthContext, ensureAuthUserId } from './_lib/auth'
import { handleOptions, methodNotAllowed, setCors } from './_lib/http'

function pct(part, total) {
  if (!total) return 0
  return Math.round((part / total) * 100)
}

export default async function handler(req, res) {
  if (handleOptions(req, res, 'GET, OPTIONS')) return
  setCors(res, 'GET, OPTIONS')
  if (req.method !== 'GET') return methodNotAllowed(req, res, ['GET', 'OPTIONS'])

  const auth = getAuthContext(req)
  if (!ensureAuthUserId(auth, res)) return

  try {
    const profile = await ensureUserProfile(auth)
    const userId = profile.id

    const [summary, lookups, activities] = await Promise.all([
      query(
        `select
          count(*)::int as total_items,
          count(*) filter (where type in ('vocabulary', 'phrase'))::int as vocab_total,
          count(*) filter (where type = 'grammar')::int as grammar_total,
          count(*) filter (where type = 'kanji')::int as kanji_total,
          count(*) filter (where status = 'mastered')::int as mastered_total,
          count(*) filter (where status in ('learning','mastered'))::int as reviewed_total,
          count(*) filter (where type in ('vocabulary', 'phrase') and status = 'mastered')::int as vocab_mastered,
          count(*) filter (where type = 'grammar' and status = 'mastered')::int as grammar_mastered,
          count(*) filter (where type = 'kanji' and status = 'mastered')::int as kanji_mastered,
          count(*) filter (where status = 'weak')::int as weak_count
         from discovered_items
         where user_id = $1`,
        [userId]
      ),
      query(
        `select count(*)::int as lookup_count
         from ai_lookups
         where user_id = $1`,
        [userId]
      ),
      query(
        `select activity_type, count(*)::int as count
         from learning_activity
         where user_id = $1
           and created_at >= now() - interval '14 day'
         group by activity_type`,
        [userId]
      ),
    ])

    const s = summary.rows[0] || {}
    const vocabMastery = pct(s.vocab_mastered || 0, s.vocab_total || 0)
    const grammarMastery = pct(s.grammar_mastered || 0, s.grammar_total || 0)
    const kanjiProgress = pct(s.kanji_mastered || 0, s.kanji_total || 0)
    const readingReadiness = Math.round((vocabMastery * 0.4) + (grammarMastery * 0.4) + (kanjiProgress * 0.2))
    const interviewReadiness = Math.min(100, Math.round((grammarMastery * 0.35) + (vocabMastery * 0.25) + ((lookups.rows[0]?.lookup_count || 0) * 2)))
    const n3Readiness = Math.round((readingReadiness * 0.55) + (interviewReadiness * 0.2) + (grammarMastery * 0.25))
    const learningReadinessScore = Math.round((n3Readiness * 0.7) + (Math.min(100, (s.reviewed_total || 0) * 4) * 0.3))

    const weakAreas = []
    if (vocabMastery < 55) weakAreas.push('Vocabulary retention below target')
    if (grammarMastery < 55) weakAreas.push('Grammar consistency needs reinforcement')
    if (kanjiProgress < 40) weakAreas.push('Kanji recall is lagging')
    if ((s.weak_count || 0) > 12) weakAreas.push('High weak-item backlog')
    if (weakAreas.length === 0) weakAreas.push('No critical weak area detected')

    const recommendations = [
      'Review 10 N3 grammar points',
      'Practice 15 weak vocabulary words',
      'Complete one reading passage',
      'Recheck recently discovered words',
      'Practice business Japanese self-introduction',
    ]

    return res.status(200).json({
      profile,
      metrics: {
        vocabularyMastery: vocabMastery,
        grammarMastery,
        kanjiProgress,
        readingReadiness,
        interviewReadiness,
        estimatedN3Readiness: n3Readiness,
        learningReadinessScore,
        aiLookups: lookups.rows[0]?.lookup_count || 0,
      },
      weakAreas,
      recommendations,
      recentActivity: activities.rows,
    })
  } catch (error) {
    console.error('learning-intelligence error', error)
    return res.status(500).json({ error: 'Failed to fetch learning intelligence' })
  }
}
