import { ensureUserProfile, query } from '../server/lib/db.js'
import { getAuthContext, ensureAuthUserId } from '../server/lib/auth.js'
import { handleOptions, methodNotAllowed, setCors } from '../server/lib/http.js'

function resolveRange(queryParams = {}) {
  const range = String(queryParams.range || '30d').toLowerCase()
  const now = new Date()
  if (range === 'custom') {
    const start = queryParams.start ? new Date(String(queryParams.start)) : new Date(now.getTime() - 30 * 86_400_000)
    const end = queryParams.end ? new Date(String(queryParams.end)) : now
    return { start, end, label: 'custom' }
  }
  const days = range === '7d' ? 7 : range === '90d' ? 90 : 30
  return { start: new Date(now.getTime() - days * 86_400_000), end: now, label: range }
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
    const { start, end, label } = resolveRange(req.query || {})
    const view = String(req.query?.view || 'weekly').toLowerCase()
    const bucket = view === 'monthly' ? 'week' : 'day'

    const [
      totals,
      byJlpt,
      grammarByLevel,
      studyActivity,
      discoveredTrend,
      weakest,
      strongest,
      monthly,
      aiUsageTrend,
      readinessTrend,
      interviewImprovement,
      dokkaiImprovement,
      lessonSummary,
      lessonCompletionTrend,
      lessonVocabularyTrend,
    ] = await Promise.all([
      query(
        `select
          count(*)::int as total_items,
          count(*) filter (where status = 'mastered')::int as mastered,
          count(*) filter (where status = 'weak')::int as weak,
          count(*) filter (where is_favorite = true)::int as favorites
         from discovered_items
         where user_id = $1`,
        [userId]
      ),
      query(
        `select coalesce(jlpt_level, 'Unknown') as level, count(*)::int as count
         from discovered_items
         where user_id = $1
         group by coalesce(jlpt_level, 'Unknown')
         order by level asc`,
        [userId]
      ),
      query(
        `select coalesce(jlpt_level, 'Unknown') as level,
                count(*)::int as total,
                count(*) filter (where status in ('learning','mastered'))::int as reviewed
         from discovered_items
         where user_id = $1 and type = 'grammar'
         group by coalesce(jlpt_level, 'Unknown')
         order by level asc`,
        [userId]
      ),
      query(
        `select to_char(date_trunc('${bucket}', created_at), 'YYYY-MM-DD') as day,
                count(*)::int as activity_count
         from learning_activity
         where user_id = $1
           and created_at >= $2
           and created_at <= $3
         group by date_trunc('${bucket}', created_at)
         order by day`,
        [userId, start.toISOString(), end.toISOString()]
      ),
      query(
        `select to_char(date_trunc('week', created_at), 'YYYY-MM-DD') as week,
                count(*)::int as discovered_count
         from discovered_items
         where user_id = $1
           and created_at >= $2
           and created_at <= $3
         group by date_trunc('week', created_at)
         order by week`,
        [userId, start.toISOString(), end.toISOString()]
      ),
      query(
        `select type,
                count(*)::int as item_count,
                count(*) filter (where status = 'weak')::int as weak_count
         from discovered_items
         where user_id = $1
         group by type
         order by weak_count desc, item_count desc
         limit 3`,
        [userId]
      ),
      query(
        `select type,
                count(*)::int as item_count,
                count(*) filter (where status = 'mastered')::int as mastered_count
         from discovered_items
         where user_id = $1
         group by type
         order by mastered_count desc, item_count desc
         limit 3`,
        [userId]
      ),
      query(
        `select
          count(*) filter (where created_at >= date_trunc('month', now()))::int as new_this_month,
          count(*) filter (where last_reviewed_at >= date_trunc('month', now()))::int as reviewed_this_month,
          count(*) filter (where status = 'mastered')::int as mastered_total
         from discovered_items
         where user_id = $1`,
        [userId]
      ),
      query(
        `select to_char(date_trunc('week', created_at), 'YYYY-MM-DD') as week,
                count(*)::int as lookup_count
         from ai_lookups
         where user_id = $1
           and created_at >= $2
           and created_at <= $3
         group by date_trunc('week', created_at)
         order by week`,
        [userId, start.toISOString(), end.toISOString()]
      ),
      query(
        `select to_char(plan_date, 'YYYY-MM-DD') as day,
                coalesce(round(avg(nullif(plan_payload->>'readinessScore', '')::numeric), 0)::int, 0) as readiness_score
         from study_plans
         where user_id = $1
           and plan_date >= $2::date
           and plan_date <= $3::date
         group by plan_date
         order by day`,
        [userId, start.toISOString().slice(0, 10), end.toISOString().slice(0, 10)]
      ),
      query(
        `select to_char(date_trunc('week', created_at), 'YYYY-MM-DD') as week,
                coalesce(round(avg(score), 0)::int, 0) as avg_score
         from interview_practice
         where user_id = $1
           and created_at >= $2
           and created_at <= $3
         group by date_trunc('week', created_at)
         order by week`,
        [userId, start.toISOString(), end.toISOString()]
      ),
      query(
        `select to_char(date_trunc('week', created_at), 'YYYY-MM-DD') as week,
                coalesce(round(avg(difficulty_score), 0)::int, 0) as avg_difficulty,
                coalesce(round(avg(summary_quality_score), 0)::int, 0) as avg_summary_quality
         from dokkai_analyses
         where user_id = $1
           and created_at >= $2
           and created_at <= $3
         group by date_trunc('week', created_at)
         order by week`,
        [userId, start.toISOString(), end.toISOString()]
      ),
      query(
        `select
          count(*)::int as total_lessons,
          count(*) filter (where status = 'completed')::int as completed_lessons,
          coalesce(round(avg(completion_percentage), 0)::int, 0) as avg_completion,
          max(created_at) as last_uploaded_at
         from lessons
         where user_id = $1`,
        [userId]
      ),
      query(
        `select to_char(date_trunc('week', coalesce(last_studied_at, created_at)), 'YYYY-MM-DD') as week,
                count(*) filter (where status = 'completed')::int as completed_count,
                count(*)::int as touched_count
         from lessons
         where user_id = $1
           and coalesce(last_studied_at, created_at) >= $2
           and coalesce(last_studied_at, created_at) <= $3
         group by date_trunc('week', coalesce(last_studied_at, created_at))
         order by week`,
        [userId, start.toISOString(), end.toISOString()]
      ),
      query(
        `select to_char(date_trunc('week', lv.created_at), 'YYYY-MM-DD') as week,
                count(*)::int as vocabulary_count
         from lesson_vocabulary lv
         where lv.user_id = $1
           and lv.created_at >= $2
           and lv.created_at <= $3
         group by date_trunc('week', lv.created_at)
         order by week`,
        [userId, start.toISOString(), end.toISOString()]
      ),
    ])

    const totalItems = totals.rows[0]?.total_items || 0
    const mastered = totals.rows[0]?.mastered || 0

    return res.status(200).json({
      profile,
      range: label,
      cards: {
        totalItems,
        mastered,
        weak: totals.rows[0]?.weak || 0,
        favorites: totals.rows[0]?.favorites || 0,
        masteryRate: totalItems > 0 ? Math.round((mastered / totalItems) * 100) : 0,
        totalLessons: lessonSummary.rows[0]?.total_lessons || 0,
        completedLessons: lessonSummary.rows[0]?.completed_lessons || 0,
        lessonCompletionRate: lessonSummary.rows[0]?.avg_completion || 0,
      },
      studyActivity: studyActivity.rows,
      vocabularyByJlpt: byJlpt.rows,
      grammarByLevel: grammarByLevel.rows.map((row) => ({
        level: row.level,
        reviewed: row.reviewed,
        pending: Math.max(0, row.total - row.reviewed),
      })),
      discoveredTrend: discoveredTrend.rows,
      weakestCategories: weakest.rows,
      strongestCategories: strongest.rows,
      monthlySummary: monthly.rows[0] || {
        new_this_month: 0,
        reviewed_this_month: 0,
        mastered_total: 0,
      },
      aiUsageTrend: aiUsageTrend.rows,
      readinessTrend: readinessTrend.rows,
      interviewImprovement: interviewImprovement.rows,
      dokkaiImprovement: dokkaiImprovement.rows,
      lessonSummary: lessonSummary.rows[0] || {
        total_lessons: 0,
        completed_lessons: 0,
        avg_completion: 0,
        last_uploaded_at: null,
      },
      lessonCompletionTrend: lessonCompletionTrend.rows,
      lessonVocabularyTrend: lessonVocabularyTrend.rows,
      monthlyReports: [
        {
          month: new Date().toISOString().slice(0, 7),
          mastered: mastered,
          newItems: monthly.rows[0]?.new_this_month || 0,
          reviewed: monthly.rows[0]?.reviewed_this_month || 0,
          readiness: readinessTrend.rows.at(-1)?.readiness_score || 0,
        },
      ],
    })
  } catch (error) {
    console.error('analytics error', error)
    return res.status(500).json({ error: 'Failed to fetch analytics' })
  }
}
