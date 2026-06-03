import crypto from 'crypto'
import { ensureUserProfile, query } from '../server/lib/db.js'
import { requireSession } from '../server/lib/authSession.js'
import { handleOptions, methodNotAllowed, parseJsonBody, setCors } from '../server/lib/http.js'
import { createSessionToken, hashPassword, hashSessionToken, verifyPassword } from '../server/lib/security.js'

const LOGIN_ID_PATTERN = /^[a-zA-Z0-9_-]{3,40}$/
const ROLE_SET = new Set(['student', 'employee', 'admin'])

function normalizeRole(role) {
  const value = String(role || '').toLowerCase()
  if (ROLE_SET.has(value)) return value
  return 'student'
}

function guestResponse(guestId) {
  return {
    token: null,
    user: {
      id: guestId,
      loginId: guestId,
      role: 'guest',
      isGuest: true,
    },
    profile: {
      auth_user_id: guestId,
      current_level: 'N5',
      target_exam: 'JLPT',
      target_level: 'N3',
    },
    created: false,
  }
}

async function handleLogin(req, res, body) {
  const mode = String(body.mode || '').toLowerCase()
  if (mode === 'guest') {
    const guestId = String(body.guestId || `guest:${crypto.randomUUID?.() || Date.now()}`).trim()
    return res.status(200).json(guestResponse(guestId))
  }

  const loginId = String(body.loginId || '').trim()
  const password = String(body.password || '')
  const role = normalizeRole(body.role)

  if (!LOGIN_ID_PATTERN.test(loginId)) {
    return res.status(400).json({ error: 'Login ID must be 3-40 chars (letters, numbers, _ or -)' })
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' })
  }

  const existing = await query('select * from auth_users where login_id = $1 limit 1', [loginId])
  let user = existing.rows[0]
  let created = false

  if (!user) {
    const inserted = await query(
      `insert into auth_users (login_id, password_hash, role, updated_at)
       values ($1, $2, $3, now())
       returning *`,
      [loginId, hashPassword(password), role]
    )
    user = inserted.rows[0]
    created = true
  } else if (!verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }

  const sessionToken = createSessionToken()
  await query(
    `insert into auth_sessions (user_id, token_hash, expires_at)
     values ($1, $2, now() + interval '30 day')`,
    [user.id, hashSessionToken(sessionToken)]
  )

  const profile = await ensureUserProfile({
    authUserId: user.id,
    name: user.login_id,
    email: null,
    currentLevel: 'N5',
    targetExam: 'JLPT',
    targetLevel: 'N3',
  })

  return res.status(200).json({
    token: sessionToken,
    user: {
      id: user.id,
      loginId: user.login_id,
      role: user.role,
      isGuest: false,
    },
    profile,
    created,
  })
}

async function handleLogout(req, res) {
  const token = String(req.headers['x-session-token'] || req.headers.authorization?.replace(/^Bearer\s+/i, '') || '').trim()
  if (!token) return res.status(200).json({ success: true })

  await query(
    `update auth_sessions
     set revoked_at = now()
     where token_hash = $1`,
    [hashSessionToken(token)]
  )
  return res.status(200).json({ success: true })
}

async function handleMe(req, res) {
  const session = await requireSession(req)
  if (session.error) return res.status(session.status || 401).json({ error: session.error })
  return res.status(200).json({
    user: session.user,
    profile: session.profile,
  })
}

async function handleProfile(req, res, body) {
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
}

export default async function handler(req, res) {
  if (handleOptions(req, res, 'GET, POST, PATCH, OPTIONS')) return
  setCors(res, 'GET, POST, PATCH, OPTIONS')

  let body = {}
  if (req.method === 'POST' || req.method === 'PATCH') {
    try {
      body = parseJsonBody(req)
    } catch {
      return res.status(400).json({ error: 'Invalid JSON body' })
    }
  }

  try {
    if (req.method === 'GET') return await handleMe(req, res)
    if (req.method === 'POST') {
      if (String(body.action || '').toLowerCase() === 'logout') {
        return await handleLogout(req, res)
      }
      return await handleLogin(req, res, body)
    }
    if (req.method === 'PATCH') return await handleProfile(req, res, body)
    return methodNotAllowed(req, res, ['GET', 'POST', 'PATCH', 'OPTIONS'])
  } catch (error) {
    console.error('auth error', error)
    return res.status(500).json({ error: 'Authentication request failed' })
  }
}
