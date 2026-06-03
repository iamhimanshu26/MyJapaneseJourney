import { ensureUserProfile, query } from './_lib/db.js'
import { getAuthContext, ensureAuthUserId } from './_lib/auth.js'
import { handleOptions, methodNotAllowed, setCors } from './_lib/http.js'

export default async function handler(req, res) {
  if (handleOptions(req, res, 'GET, OPTIONS')) return
  setCors(res, 'GET, OPTIONS')
  if (req.method !== 'GET') return methodNotAllowed(req, res, ['GET', 'OPTIONS'])

  const auth = getAuthContext(req)
  if (!ensureAuthUserId(auth, res)) return

  try {
    const profile = await ensureUserProfile(auth)
    const userId = profile.id

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

    let role = 'guest'
    if (!auth.authUserId.startsWith('guest:')) {
      const roleResult = await query('select role from auth_users where id = $1 limit 1', [auth.authUserId])
      role = roleResult.rows[0]?.role || 'student'
    }

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

    return res.status(200).json({
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
    })
  } catch (error) {
    console.error('learning-plan error', error)
    return res.status(500).json({ error: 'Failed to build learning plan' })
  }
}
