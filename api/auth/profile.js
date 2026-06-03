import { query } from '../_lib/db.js'
import { handleOptions, methodNotAllowed, parseJsonBody, setCors } from '../_lib/http.js'
import { requireSession } from '../_lib/authSession.js'

export default async function handler(req, res) {
  if (handleOptions(req, res, 'PATCH, OPTIONS')) return
  setCors(res, 'PATCH, OPTIONS')
  if (req.method !== 'PATCH') return methodNotAllowed(req, res, ['PATCH', 'OPTIONS'])

  let body = {}
  try {
    body = parseJsonBody(req)
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' })
  }

  try {
    const session = await requireSession(req)
    if (session.error) return res.status(session.status || 401).json({ error: session.error })

    const currentLevel = body.current_level ? String(body.current_level).toUpperCase() : null
    const targetLevel = body.target_level ? String(body.target_level).toUpperCase() : null
    const targetExam = body.target_exam ? String(body.target_exam).toUpperCase() : null
    const displayName = body.name ? String(body.name).slice(0, 120) : null

    const result = await query(
      `update user_profiles
       set current_level = coalesce($1, current_level),
           target_level = coalesce($2, target_level),
           target_exam = coalesce($3, target_exam),
           name = coalesce($4, name),
           updated_at = now()
       where auth_user_id = $5
       returning *`,
      [currentLevel, targetLevel, targetExam, displayName, session.user.id]
    )

    return res.status(200).json({ profile: result.rows[0] || session.profile })
  } catch (error) {
    console.error('auth/profile error', error)
    return res.status(500).json({ error: 'Failed to update profile' })
  }
}
