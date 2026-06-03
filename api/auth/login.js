import crypto from 'crypto'
import { ensureUserProfile, query } from '../_lib/db.js'
import { handleOptions, methodNotAllowed, parseJsonBody, setCors } from '../_lib/http.js'
import { createSessionToken, hashPassword, hashSessionToken, verifyPassword } from '../_lib/security.js'

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

export default async function handler(req, res) {
  if (handleOptions(req, res, 'POST, OPTIONS')) return
  setCors(res, 'POST, OPTIONS')
  if (req.method !== 'POST') return methodNotAllowed(req, res, ['POST', 'OPTIONS'])

  let body = {}
  try {
    body = parseJsonBody(req)
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' })
  }

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

  try {
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
    } else {
      const valid = verifyPassword(password, user.password_hash)
      if (!valid) {
        return res.status(401).json({ error: 'Invalid credentials' })
      }
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
  } catch (error) {
    console.error('auth/login error', error)
    return res.status(500).json({ error: 'Login failed' })
  }
}
