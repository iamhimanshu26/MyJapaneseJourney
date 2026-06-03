import { ensureUserProfile, query } from '../_lib/db'
import { getAuthContext, ensureAuthUserId } from '../_lib/auth'
import { handleOptions, methodNotAllowed, parseJsonBody, setCors, toArray } from '../_lib/http'

const UPDATABLE_FIELDS = new Set([
  'word',
  'reading',
  'romaji',
  'meaning_en',
  'meaning_hi',
  'jlpt_level',
  'part_of_speech',
  'example_jp',
  'example_romaji',
  'example_en',
  'business_usage',
  'common_mistake',
  'status',
  'is_favorite',
  'review_count',
  'last_reviewed_at',
])

export default async function handler(req, res) {
  if (handleOptions(req, res, 'PATCH, DELETE, OPTIONS')) return
  setCors(res, 'PATCH, DELETE, OPTIONS')

  const id = String(req.query?.id || '').trim()
  if (!id) return res.status(400).json({ error: 'Item id is required' })

  let body = {}
  if (req.method === 'PATCH') {
    try {
      body = parseJsonBody(req)
    } catch {
      return res.status(400).json({ error: 'Invalid JSON body' })
    }
  }

  const auth = getAuthContext(req, body)
  if (!ensureAuthUserId(auth, res)) return

  try {
    const profile = await ensureUserProfile(auth)

    if (req.method === 'DELETE') {
      const result = await query(
        'delete from discovered_items where id = $1 and user_id = $2 returning id',
        [id, profile.id]
      )
      if (!result.rows[0]) return res.status(404).json({ error: 'Item not found' })
      return res.status(200).json({ success: true, id })
    }

    if (req.method === 'PATCH') {
      const assignments = []
      const values = []

      for (const [key, value] of Object.entries(body || {})) {
        if (key === 'tags' || key === 'similar_words') continue
        if (!UPDATABLE_FIELDS.has(key)) continue
        values.push(value)
        assignments.push(`${key} = $${values.length}`)
      }

      if ('tags' in body) {
        values.push(toArray(body.tags).map((t) => String(t).trim()).filter(Boolean))
        assignments.push(`tags = $${values.length}`)
      }
      if ('similar_words' in body || 'similarWords' in body) {
        const list = toArray(body.similar_words || body.similarWords).map((t) => String(t).trim()).filter(Boolean)
        values.push(list)
        assignments.push(`similar_words = $${values.length}`)
      }

      if (assignments.length === 0) {
        return res.status(400).json({ error: 'No updatable fields provided' })
      }

      values.push(id, profile.id)
      const result = await query(
        `update discovered_items
         set ${assignments.join(', ')}, updated_at = now()
         where id = $${values.length - 1} and user_id = $${values.length}
         returning *`,
        values
      )

      if (!result.rows[0]) return res.status(404).json({ error: 'Item not found' })
      return res.status(200).json({ item: result.rows[0] })
    }

    return methodNotAllowed(req, res, ['PATCH', 'DELETE', 'OPTIONS'])
  } catch (error) {
    console.error('discovered item by id error', error)
    return res.status(500).json({ error: 'Failed to update item' })
  }
}
