import { ensureUserProfile, query } from '../server/lib/db.js'
import { getAuthContext, ensureAuthUserId } from '../server/lib/auth.js'
import { handleOptions, methodNotAllowed, setCors } from '../server/lib/http.js'

function pct(part, total) {
  if (!total) return 0
  return Math.round((part / total) * 100)
}

async function resolveRole(authUserId) {
  if (!authUserId || authUserId.startsWith('guest:')) return 'guest'
  const roleResult = await query('select role from auth_users where id = $1 limit 1', [authUserId])
  return roleResult.rows[0]?.role || 'student'
}

async function buildLearningIntelligence(userId, profile, role) {
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
  ]
  if (role === 'employee' || role === 'admin') {
    recommendations.push('Practice business Japanese self-introduction')
  } else {
    recommendations.push('Use Dokkai Analyzer to extract and save 3 study items')
  }

  return {
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
    role,
    recentActivity: activities.rows,
  }
}

async function buildLearningPlan(userId, profile, role) {
  const [counts, weeklyReview, weeklyLookup] = await Promise.all([
    query(
      `select
        count(*) filter (where status = 'weak')::int as weak_items,
        count(*) filter (where status = 'learning')::int as learning_items,
        count(*) filter (where status = 'mastered')::int as mastered_items,
        count(*) filter (where type in ('vocabulary', 'phrase'))::int as vocab_items,
        count(*) filter (where type = 'grammar')::int as grammar_items,
        count(*) filter (where type = 'kanji')::int as kanji_items
       from discovered_items
       where user_id = $1`,
      [userId]
    ),
    query(
      `select count(*)::int as total
       from review_sessions
       where user_id = $1 and created_at >= now() - interval '7 day'`,
      [userId]
    ),
    query(
      `select count(*)::int as total
       from ai_lookups
       where user_id = $1 and created_at >= now() - interval '7 day'`,
      [userId]
    ),
  ])

  const snapshot = counts.rows[0] || {}
  const weeklyReviewCount = weeklyReview.rows[0]?.total || 0
  const weeklyLookupCount = weeklyLookup.rows[0]?.total || 0

  const nextActions = []
  const weakItems = Number(snapshot.weak_items || 0)
  const learningItems = Number(snapshot.learning_items || 0)
  const vocabItems = Number(snapshot.vocab_items || 0)
  const grammarItems = Number(snapshot.grammar_items || 0)
  const kanjiItems = Number(snapshot.kanji_items || 0)

  nextActions.push({
    title: 'Weak-item recovery sprint',
    description: weakItems > 0
      ? `Review ${Math.min(weakItems, 12)} weak items with spaced repetition.`
      : 'No weak backlog right now. Keep consistency with quick daily reviews.',
    priority: weakItems > 8 ? 'high' : weakItems > 0 ? 'medium' : 'low',
  })
  nextActions.push({
    title: 'Vocabulary growth block',
    description: `Discover + review ${Math.max(8, Math.ceil(vocabItems * 0.15))} vocabulary terms this week.`,
    priority: 'medium',
  })
  nextActions.push({
    title: 'Grammar consolidation',
    description: `Practice ${Math.max(5, Math.ceil(grammarItems * 0.2))} grammar points with example sentences.`,
    priority: learningItems > 10 ? 'high' : 'medium',
  })

  if (role === 'employee' || role === 'admin') {
    nextActions.push({
      title: 'Business Japanese drill',
      description: 'Complete one interview-coach simulation and refine polite/professional phrasing.',
      priority: 'medium',
    })
  } else {
    nextActions.push({
      title: 'Reading readiness',
      description: 'Run one Dokkai Analyzer session and save at least 3 extracted items.',
      priority: 'medium',
    })
  }

  const weeklyTargets = [
    { label: 'Review sessions', current: weeklyReviewCount, target: 18 },
    { label: 'AI lookups', current: weeklyLookupCount, target: 12 },
    { label: 'Kanji touchpoints', current: kanjiItems, target: Math.max(10, kanjiItems + 5) },
  ]

  return {
    profile,
    role,
    snapshot: {
      weakItems,
      learningItems,
      masteredItems: Number(snapshot.mastered_items || 0),
      vocabItems,
      grammarItems,
      kanjiItems,
    },
    weeklyTargets,
    nextActions,
  }
}

export default async function handler(req, res) {
  if (handleOptions(req, res, 'GET, OPTIONS')) return
  setCors(res, 'GET, OPTIONS')
  if (req.method !== 'GET') return methodNotAllowed(req, res, ['GET', 'OPTIONS'])

  const auth = getAuthContext(req)
  if (!ensureAuthUserId(auth, res)) return

  try {
    const profile = await ensureUserProfile(auth)
    const role = await resolveRole(auth.authUserId)
    const view = String(req.query?.view || '').toLowerCase()

    if (view === 'plan') {
      return res.status(200).json(await buildLearningPlan(profile.id, profile, role))
    }
    return res.status(200).json(await buildLearningIntelligence(profile.id, profile, role))
  } catch (error) {
    console.error('intelligence error', error)
    return res.status(500).json({ error: 'Failed to fetch intelligence data' })
  }
}
