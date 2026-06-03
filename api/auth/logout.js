import { query } from '../_lib/db.js'
import { handleOptions, methodNotAllowed, setCors } from '../_lib/http.js'
import { hashSessionToken } from '../_lib/security.js'

function readSessionToken(req) {
  return String(req.headers['x-session-token'] || req.headers.authorization?.replace(/^Bearer\s+/i, '') || '').trim()
}

export default async function handler(req, res) {
  if (handleOptions(req, res, 'POST, OPTIONS')) return
  setCors(res, 'POST, OPTIONS')
  if (req.method !== 'POST') return methodNotAllowed(req, res, ['POST', 'OPTIONS'])

  const token = readSessionToken(req)
  if (!token) return res.status(200).json({ success: true })

  try {
    await query(
      `update auth_sessions
       set revoked_at = now()
       where token_hash = $1`,
      [hashSessionToken(token)]
    )
    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('auth/logout error', error)
    return res.status(500).json({ error: 'Logout failed' })
  }
}
