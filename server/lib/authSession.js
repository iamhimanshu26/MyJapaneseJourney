import { query, ensureUserProfile } from './db.js'
import { hashSessionToken } from './security.js'

const ID_PATTERN = /^[a-zA-Z0-9:_-]{6,128}$/

function sanitize(value) {
  if (typeof value !== 'string') return ''
  const trimmed = value.trim()
  if (!ID_PATTERN.test(trimmed)) return ''
  return trimmed
}

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

function readHeaderIdentity(req) {
  return sanitize(req.headers['x-auth-user-id'] || req.headers['x-user-id'] || '')
}

export async function requireAuthorizedContext(req, res, { allowGuest = true } = {}) {
  const headerIdentity = readHeaderIdentity(req)
  const session = await requireSession(req)

  if (!session.error) {
    if (headerIdentity && headerIdentity !== session.user.id) {
      res.status(403).json({ error: 'Identity mismatch for authenticated session' })
      return null
    }
    return {
      authUserId: session.user.id,
      email: null,
      name: session.user.loginId,
      user: session.user,
      profile: session.profile,
      isGuest: false,
      sessionToken: session.sessionToken,
    }
  }

  if (!allowGuest) {
    res.status(session.status || 401).json({ error: session.error || 'Authentication required' })
    return null
  }

  if (!headerIdentity || !headerIdentity.startsWith('guest:')) {
    res.status(401).json({ error: 'Missing valid session token' })
    return null
  }

  const profile = await ensureUserProfile({
    authUserId: headerIdentity,
    email: null,
    name: 'Guest',
  })

  return {
    authUserId: headerIdentity,
    email: null,
    name: 'Guest',
    user: {
      id: headerIdentity,
      loginId: 'Guest',
      role: 'guest',
      isGuest: true,
    },
    profile,
    isGuest: true,
    sessionToken: null,
  }
}
