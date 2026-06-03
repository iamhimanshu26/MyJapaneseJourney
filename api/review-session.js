import { appendTimelineEvent, ensureUserProfile, query } from '../server/lib/db.js'
import { getAuthContext, ensureAuthUserId } from '../server/lib/auth.js'
import { handleOptions, methodNotAllowed, parseJsonBody, setCors } from '../server/lib/http.js'

const VALID_RESULTS = new Set(['again', 'hard', 'good', 'easy'])

function computeNextStatus(result, previousStatus, nextReviewCount) {
  if (result === 'again') return 'weak'
  if (result === 'hard') return 'learning'
  if (result === 'easy') return 'mastered'
  if (previousStatus === 'mastered') return 'mastered'
  return nextReviewCount >= 4 ? 'mastered' : 'learning'
}

function getIntervalDays(result, reviewCount) {
  if (result === 'again') return 1
  if (result === 'hard') return Math.max(1, Math.min(4, Math.floor(reviewCount / 2)))
  if (result === 'good') return Math.max(2, Math.min(10, Math.floor(reviewCount * 1.4)))
  return Math.max(4, Math.min(21, Math.floor(reviewCount * 2.2)))
}

export default async function handler(req, res) {
  if (handleOptions(req, res, 'POST, OPTIONS')) return
  setCors(res, 'POST, OPTIONS')
  if (req.method !== 'POST') return methodNotAllowed(req, res, ['POST', 'OPTIONS'])

  let body
  try {
    body = parseJsonBody(req)
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' })
  }

  const auth = getAuthContext(req, body)
  if (!ensureAuthUserId(auth, res)) return
  const itemId = String(body.itemId || '').trim()
  const result = String(body.result || '').toLowerCase()
  if (!itemId || !VALID_RESULTS.has(result)) {
    return res.status(400).json({ error: 'itemId and valid result are required' })
  }

  try {
    const profile = await ensureUserProfile(auth)
    const itemRes = await query(
      `select id, word, status, review_count, ease_factor
       from discovered_items
       where id = $1 and user_id = $2
       limit 1`,
      [itemId, profile.id]
    )

    const current = itemRes.rows[0]
    if (!current) return res.status(404).json({ error: 'Item not found' })

    const previousStatus = current.status || 'new'
    const nextReviewCount = Number(current.review_count || 0) + 1
    const nextStatus = computeNextStatus(result, previousStatus, nextReviewCount)

    const intervalDays = getIntervalDays(result, nextReviewCount)
    const nextReviewAt = new Date(Date.now() + intervalDays * 86_400_000).toISOString()
    const previousEase = Number(current.ease_factor || 2.5)
    const nextEase = Math.max(
      1.3,
      Math.min(
        3.2,
        previousEase + (result === 'again' ? -0.25 : result === 'hard' ? -0.1 : result === 'good' ? 0.05 : 0.12)
      )
    )

    const updated = await query(
      `update discovered_items
       set status = $1,
           review_count = $2,
           last_reviewed_at = now(),
           next_review_at = $3,
           ease_factor = $4,
           updated_at = now()
       where id = $5 and user_id = $6
       returning *`,
      [nextStatus, nextReviewCount, nextReviewAt, nextEase, itemId, profile.id]
    )

    await query(
      `insert into review_sessions (user_id, item_id, result, previous_status, new_status, created_at)
       values ($1, $2, $3, $4, $5, now())`,
      [profile.id, itemId, result, previousStatus, nextStatus]
    )

    await query(
      `insert into learning_activity (user_id, activity_type, item_id, score, metadata, created_at)
       values ($1, 'review', $2, $3, $4::jsonb, now())`,
      [
        profile.id,
        itemId,
        result === 'again' ? 30 : result === 'hard' ? 55 : result === 'good' ? 75 : 95,
        JSON.stringify({ result, previousStatus, nextStatus, intervalDays, nextReviewAt, nextEase }),
      ]
    )

    await appendTimelineEvent({
      userId: profile.id,
      activityType: 'review',
      title: `Reviewed ${updated.rows[0]?.word || 'item'}`,
      description: `Marked ${result.toUpperCase()} • next review in ${intervalDays} day${intervalDays > 1 ? 's' : ''}.`,
      metadata: { itemId, result, nextStatus, intervalDays },
    })

    return res.status(200).json({
      item: updated.rows[0],
      previousStatus,
      nextStatus,
      intervalDays,
      nextReviewAt,
      easeFactor: nextEase,
    })
  } catch (error) {
    console.error('review-session error', error)
    return res.status(500).json({ error: 'Failed to save review session' })
  }
}
