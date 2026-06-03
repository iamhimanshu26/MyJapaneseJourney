import { handleOptions, methodNotAllowed, setCors } from '../_lib/http.js'
import { requireSession } from '../_lib/authSession.js'

export default async function handler(req, res) {
  if (handleOptions(req, res, 'GET, OPTIONS')) return
  setCors(res, 'GET, OPTIONS')
  if (req.method !== 'GET') return methodNotAllowed(req, res, ['GET', 'OPTIONS'])

  try {
    const session = await requireSession(req)
    if (session.error) return res.status(session.status || 401).json({ error: session.error })

    return res.status(200).json({
      user: session.user,
      profile: session.profile,
    })
  } catch (error) {
    console.error('auth/me error', error)
    return res.status(500).json({ error: 'Failed to fetch session' })
  }
}
