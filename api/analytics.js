import { query } from '../server/lib/db.js'
import { requireAuthorizedContext } from '../server/lib/authSession.js'
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

  const auth = await requireAuthorizedContext(req, res, { allowGuest: true })
  if (!auth) return

  try {
    const profile = auth.profile
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
      monthlyTrend,
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
        `with months as (
           select date_trunc('month', now()) - (interval '1 month' * gs) as month_start
           from generate_series(5, 0, -1) as gs
         ),
         discovered as (
           select date_trunc('month', created_at) as month_start, count(*)::int as new_items
           from discovered_items
           where user_id = $1
           group by 1
         ),
         reviewed as (
           select date_trunc('month', created_at) as month_start, count(*)::int as reviewed
           from review_sessions
           where user_id = $1
           group by 1
         ),
         lookups as (
           select date_trunc('month', created_at) as month_start, count(*)::int as ai_lookups
           from ai_lookups
           where user_id = $1
           group by 1
         ),
         readiness as (
           select date_trunc('month', plan_date::timestamp) as month_start,
                  coalesce(round(avg(nullif(plan_payload->>'readinessScore', '')::numeric), 0)::int, 0) as readiness
           from study_plans
           where user_id = $1
           group by 1
         ),
         mastered as (
           select date_trunc('month', updated_at) as month_start, count(*)::int as mastered
           from discovered_items
           where user_id = $1 and status = 'mastered'
           group by 1
         )
         select
           to_char(months.month_start, 'YYYY-MM') as month,
           coalesce(discovered.new_items, 0) as new_items,
           coalesce(reviewed.reviewed, 0) as reviewed,
           coalesce(lookups.ai_lookups, 0) as ai_lookups,
           coalesce(readiness.readiness, 0) as readiness,
           coalesce(mastered.mastered, 0) as mastered
         from months
         left join discovered on discovered.month_start = months.month_start
         left join reviewed on reviewed.month_start = months.month_start
         left join lookups on lookups.month_start = months.month_start
         left join readiness on readiness.month_start = months.month_start
         left join mastered on mastered.month_start = months.month_start
         order by months.month_start`,
        [userId]
      ),
    ])

    const totalItems = totals.rows[0]?.total_items || 0
    const mastered = totals.rows[0]?.mastered || 0

    const monthlyReports = (monthlyTrend.rows || []).map((row, index, arr) => {
      const prev = arr[index - 1]
      const readinessDelta = prev ? Number(row.readiness || 0) - Number(prev.readiness || 0) : 0
      const activityIndex = Number(row.reviewed || 0) + Number(row.new_items || 0) + Number(row.ai_lookups || 0)
      const momentum = readinessDelta >= 4
        ? 'accelerating'
        : readinessDelta <= -4
          ? 'declining'
          : activityIndex >= 30
            ? 'stable-high'
            : 'stable'
      const narrative = momentum === 'accelerating'
        ? 'Readiness is improving with strong monthly execution.'
        : momentum === 'declining'
          ? 'Readiness dipped; prioritize weak-item review and daily consistency.'
          : momentum === 'stable-high'
            ? 'High activity is sustaining progress; focus on quality and retention.'
            : 'Progress is steady but could improve with more review sessions.'
      return {
        month: row.month,
        mastered: Number(row.mastered || 0),
        newItems: Number(row.new_items || 0),
        reviewed: Number(row.reviewed || 0),
        aiLookups: Number(row.ai_lookups || 0),
        readiness: Number(row.readiness || 0),
        readinessDelta,
        momentum,
        narrative,
      }
    })

    return res.status(200).json({
      profile,
      range: label,
      cards: {
        totalItems,
        mastered,
        weak: totals.rows[0]?.weak || 0,
        favorites: totals.rows[0]?.favorites || 0,
        masteryRate: totalItems > 0 ? Math.round((mastered / totalItems) * 100) : 0,
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
      monthlyReports,
    })
  } catch (error) {
    console.error('analytics error', error)
    return res.status(500).json({ error: 'Failed to fetch analytics' })
  }
}
