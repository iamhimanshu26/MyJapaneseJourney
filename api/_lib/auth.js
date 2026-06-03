const ID_PATTERN = /^[a-zA-Z0-9:_-]{6,128}$/

function sanitize(value) {
  if (typeof value !== 'string') return ''
  const trimmed = value.trim()
  if (!ID_PATTERN.test(trimmed)) return ''
  return trimmed
}

export function getAuthContext(req, body = {}) {
  const authUserId = sanitize(
    req.headers['x-auth-user-id'] ||
      req.headers['x-user-id'] ||
      body.authUserId ||
      body.userId ||
      req.query?.authUserId ||
      req.query?.userId
  )
  const email = typeof (req.headers['x-user-email'] || body.email || req.query?.email) === 'string'
    ? (req.headers['x-user-email'] || body.email || req.query?.email).trim().slice(0, 200)
    : null
  const name = typeof (req.headers['x-user-name'] || body.name || req.query?.name) === 'string'
    ? (req.headers['x-user-name'] || body.name || req.query?.name).trim().slice(0, 120)
    : null

  return { authUserId, email: email || null, name: name || null }
}

export function ensureAuthUserId(ctx, res) {
  if (ctx.authUserId) return true
  res.status(401).json({ error: 'Missing user identity' })
  return false
}
