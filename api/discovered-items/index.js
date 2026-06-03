import { ensureUserProfile, query } from '../_lib/db.js'
import { getAuthContext, ensureAuthUserId } from '../_lib/auth.js'
import { handleOptions, methodNotAllowed, parseJsonBody, setCors, toArray } from '../_lib/http.js'

const VALID_TYPES = new Set(['vocabulary', 'grammar', 'kanji', 'phrase'])
const VALID_STATUSES = new Set(['new', 'learning', 'weak', 'mastered', 'favorite'])
const SORT_MAP = {
  recent: 'created_at desc',
  alphabetical: 'word asc',
  jlpt: 'jlpt_level asc nulls last, word asc',
}

function normalizeType(type) {
  const raw = String(type || 'vocabulary').toLowerCase()
  if (raw === 'vocab') return 'vocabulary'
  if (VALID_TYPES.has(raw)) return raw
  return 'vocabulary'
}

function normalizeStatus(status, isFavorite) {
  const raw = String(status || '').toLowerCase()
  if (VALID_STATUSES.has(raw)) return raw
  if (isFavorite) return 'favorite'
  return 'new'
}

function normalizeItem(payload = {}) {
  const type = normalizeType(payload.type || payload.item_type)
  const source = payload.item_data && typeof payload.item_data === 'object' ? payload.item_data : payload
  const word = String(
    source.word ||
      source.name ||
      source.char ||
      source.phrase ||
      ''
  ).trim()

  return {
    type,
    word,
    reading: String(source.reading || '').trim() || null,
    romaji: String(source.romaji || '').trim() || null,
    meaning_en: String(source.meaning_en || source.meaning || '').trim() || null,
    meaning_hi: String(source.meaning_hi || '').trim() || null,
    jlpt_level: String(source.jlpt_level || source.level || '').trim() || null,
    part_of_speech: String(source.part_of_speech || source.partOfSpeech || '').trim() || null,
    example_jp: String(source.example_jp || source.examples?.[0]?.jp || '').trim() || null,
    example_romaji: String(source.example_romaji || source.examples?.[0]?.romaji || '').trim() || null,
    example_en: String(source.example_en || source.examples?.[0]?.en || '').trim() || null,
    business_usage: String(source.business_usage || '').trim() || null,
    similar_words: toArray(source.similar_words || source.similarWords).map((s) => String(s).trim()).filter(Boolean),
    common_mistake: String(source.common_mistake || source.commonMistake || '').trim() || null,
    tags: toArray(source.tags).map((t) => String(t).trim()).filter(Boolean),
    is_favorite: Boolean(source.is_favorite || source.isFavorite),
    status: normalizeStatus(source.status, source.is_favorite || source.isFavorite),
  }
}

export default async function handler(req, res) {
  if (handleOptions(req, res, 'GET, POST, OPTIONS')) return
  setCors(res, 'GET, POST, OPTIONS')

  let body = {}
  if (req.method === 'POST') {
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

    if (req.method === 'GET') {
      const { search = '', type = '', jlpt = '', status = '', sort = 'recent' } = req.query || {}
      const conditions = ['user_id = $1']
      const values = [profile.id]
      let idx = values.length + 1

      if (search) {
        conditions.push(`(word ilike $${idx} or coalesce(meaning_en, '') ilike $${idx})`)
        values.push(`%${String(search).trim()}%`)
        idx += 1
      }
      if (type) {
        conditions.push(`type = $${idx}`)
        values.push(normalizeType(type))
        idx += 1
      }
      if (jlpt) {
        conditions.push(`jlpt_level = $${idx}`)
        values.push(String(jlpt).trim())
        idx += 1
      }
      if (status && VALID_STATUSES.has(String(status).toLowerCase())) {
        conditions.push(`status = $${idx}`)
        values.push(String(status).toLowerCase())
        idx += 1
      }

      const order = SORT_MAP[String(sort)] || SORT_MAP.recent
      const result = await query(
        `select *
         from discovered_items
         where ${conditions.join(' and ')}
         order by ${order}`,
        values
      )

      return res.status(200).json({ items: result.rows, profile })
    }

    if (req.method === 'POST') {
      const payloads = Array.isArray(body.items) ? body.items : [body]
      const inserted = []

      for (const payload of payloads) {
        const item = normalizeItem(payload)
        if (!item.word) continue

        const duplicate = await query(
          `select id
           from discovered_items
           where user_id = $1 and type = $2 and word = $3 and coalesce(reading, '') = coalesce($4, '')
           limit 1`,
          [profile.id, item.type, item.word, item.reading]
        )

        if (duplicate.rows[0]) {
          inserted.push({ id: duplicate.rows[0].id, duplicate: true })
          continue
        }

        const created = await query(
          `insert into discovered_items (
            user_id, type, word, reading, romaji, meaning_en, meaning_hi, jlpt_level, part_of_speech,
            example_jp, example_romaji, example_en, business_usage, similar_words, common_mistake,
            tags, status, is_favorite, review_count, updated_at
          ) values (
            $1, $2, $3, $4, $5, $6, $7, $8, $9,
            $10, $11, $12, $13, $14, $15,
            $16, $17, $18, 0, now()
          )
          returning *`,
          [
            profile.id, item.type, item.word, item.reading, item.romaji, item.meaning_en, item.meaning_hi, item.jlpt_level,
            item.part_of_speech, item.example_jp, item.example_romaji, item.example_en, item.business_usage,
            item.similar_words, item.common_mistake, item.tags, item.status, item.is_favorite,
          ]
        )
        inserted.push(created.rows[0])
      }

      return res.status(200).json({ items: inserted, imported: Array.isArray(body.items) })
    }

    return methodNotAllowed(req, res, ['GET', 'POST', 'OPTIONS'])
  } catch (error) {
    console.error('discovered-items error', error)
    return res.status(500).json({ error: 'Failed to process discovered items request' })
  }
}
