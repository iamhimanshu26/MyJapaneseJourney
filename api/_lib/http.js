export function setCors(res, methods = 'GET, POST, PATCH, DELETE, OPTIONS') {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', methods)
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Auth-User-Id, X-Session-Token, X-User-Email, X-User-Name, Authorization')
}

export function handleOptions(req, res, methods) {
  setCors(res, methods)
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return true
  }
  return false
}

export function methodNotAllowed(req, res, allowed = []) {
  res.setHeader('Allow', allowed.join(', '))
  return res.status(405).json({ error: 'Method not allowed' })
}

export function parseJsonBody(req) {
  if (!req.body) return {}
  if (typeof req.body === 'string') return JSON.parse(req.body)
  return req.body
}

export function toArray(value) {
  if (!value) return []
  if (Array.isArray(value)) return value
  return [value]
}
