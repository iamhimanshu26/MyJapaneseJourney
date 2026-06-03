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

    const [
      totals,
      byJlpt,
      grammarByLevel,
      studyActivity,
      discoveredTrend,
      weakest,
      strongest,
      monthly,
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
        `select to_char(date_trunc('day', created_at), 'YYYY-MM-DD') as day,
                count(*)::int as activity_count
         from learning_activity
         where user_id = $1
           and created_at >= now() - interval '14 day'
         group by date_trunc('day', created_at)
         order by day`,
        [userId]
      ),
      query(
        `select to_char(date_trunc('week', created_at), 'YYYY-MM-DD') as week,
                count(*)::int as discovered_count
         from discovered_items
         where user_id = $1
           and created_at >= now() - interval '8 week'
         group by date_trunc('week', created_at)
         order by week`,
        [userId]
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
    ])

    const totalItems = totals.rows[0]?.total_items || 0
    const mastered = totals.rows[0]?.mastered || 0

    return res.status(200).json({
      profile,
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
    })
  } catch (error) {
    console.error('analytics error', error)
    return res.status(500).json({ error: 'Failed to fetch analytics' })
  }
}
