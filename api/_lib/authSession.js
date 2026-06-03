import { query, ensureUserProfile } from './db.js'
import { hashSessionToken } from './security.js'

function readSessionToken(req) {
  const headerToken = req.headers['x-session-token'] || req.headers.authorization?.replace(/^Bearer\s+/i, '')
  return String(headerToken || '').trim()
}

export async function requireSession(req) {
  const token = readSessionToken(req)
  if (!token) {
    return { error: 'Missing session token', status: 401 }
  }

  const tokenHash = hashSessionToken(token)
  const result = await query(
    `select s.id as session_id, s.user_id, s.expires_at, s.revoked_at,
            u.login_id, u.role
     from auth_sessions s
     join auth_users u on u.id = s.user_id
     where s.token_hash = $1
     limit 1`,
    [tokenHash]
  )

  const session = result.rows[0]
  if (!session) return { error: 'Invalid session', status: 401 }
  if (session.revoked_at) return { error: 'Session revoked', status: 401 }
  if (new Date(session.expires_at).getTime() <= Date.now()) return { error: 'Session expired', status: 401 }

  const profile = await ensureUserProfile({
    authUserId: session.user_id,
    name: session.login_id,
    email: null,
  })

  return {
    sessionToken: token,
    sessionId: session.session_id,
    user: {
      id: session.user_id,
      loginId: session.login_id,
      role: session.role,
      isGuest: false,
    },
    profile,
    status: 200,
  }
}
