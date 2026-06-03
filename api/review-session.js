import { ensureUserProfile, query } from './_lib/db'
import { getAuthContext, ensureAuthUserId } from './_lib/auth'
import { handleOptions, methodNotAllowed, parseJsonBody, setCors } from './_lib/http'

const VALID_RESULTS = new Set(['again', 'hard', 'good', 'easy'])

function computeNextStatus(result, previousStatus, nextReviewCount) {
  if (result === 'again') return 'weak'
  if (result === 'hard') return 'learning'
  if (result === 'easy') return 'mastered'
  if (previousStatus === 'mastered') return 'mastered'
  return nextReviewCount >= 4 ? 'mastered' : 'learning'
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
      `select id, status, review_count
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

    const updated = await query(
      `update discovered_items
       set status = $1,
           review_count = $2,
           last_reviewed_at = now(),
           updated_at = now()
       where id = $3 and user_id = $4
       returning *`,
      [nextStatus, nextReviewCount, itemId, profile.id]
    )

    await query(
      `insert into review_sessions (user_id, item_id, result, previous_status, new_status, created_at)
       values ($1, $2, $3, $4, $5, now())`,
      [profile.id, itemId, result, previousStatus, nextStatus]
    )

    await query(
      `insert into learning_activity (user_id, activity_type, item_id, score, metadata, created_at)
       values ($1, 'review', $2, $3, $4::jsonb, now())`,
      [profile.id, itemId, result === 'again' ? 30 : result === 'hard' ? 55 : result === 'good' ? 75 : 95, JSON.stringify({ result, previousStatus, nextStatus })]
    )

    return res.status(200).json({ item: updated.rows[0], previousStatus, nextStatus })
  } catch (error) {
    console.error('review-session error', error)
    return res.status(500).json({ error: 'Failed to save review session' })
  }
}
