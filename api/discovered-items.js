import { appendTimelineEvent, ensureUserProfile, query } from '../server/lib/db.js'
import { getAuthContext, ensureAuthUserId } from '../server/lib/auth.js'
import { handleOptions, methodNotAllowed, parseJsonBody, setCors, toArray } from '../server/lib/http.js'

const VALID_TYPES = new Set(['vocabulary', 'grammar', 'kanji', 'phrase'])
const VALID_STATUSES = new Set(['new', 'learning', 'weak', 'mastered', 'favorite'])
const SORT_MAP = {
  recent: 'created_at desc',
  alphabetical: 'word asc',
  jlpt: 'jlpt_level asc nulls last, word asc',
}
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
  'next_review_at',
  'ease_factor',
])

const CLUSTER_RULES = [
  { category: 'business', keywords: ['business', 'meeting', 'client', 'company', 'office', 'salary', 'project', 'interview'] },
  { category: 'technology', keywords: ['technology', 'system', 'software', 'code', 'api', 'database', 'ai', 'cloud'] },
  { category: 'travel', keywords: ['travel', 'airport', 'train', 'hotel', 'ticket', 'station'] },
  { category: 'daily-life', keywords: ['daily', 'home', 'family', 'food', 'shopping', 'routine'] },
]

function mergeUniqueTags(...tagSets) {
  return [...new Set(tagSets.flat().map((t) => String(t || '').trim().toLowerCase()).filter(Boolean))]
}

function detectClusterCategory(item) {
  const corpus = [
    item.word,
    item.meaning_en,
    item.part_of_speech,
    item.business_usage,
    ...(item.tags || []),
    ...(item.ai_tags || []),
  ]
    .join(' ')
    .toLowerCase()

  for (const rule of CLUSTER_RULES) {
    if (rule.keywords.some((keyword) => corpus.includes(keyword))) return rule.category
  }
  return item.type === 'grammar' ? 'grammar-patterns' : item.type === 'kanji' ? 'kanji-core' : 'general'
}

function inferAiTags(item) {
  const tags = []
  if (item.jlpt_level) tags.push(item.jlpt_level.toLowerCase())
  if (item.type) tags.push(item.type.toLowerCase())
  if (item.status) tags.push(item.status.toLowerCase())
  const lower = `${item.word || ''} ${item.meaning_en || ''} ${item.business_usage || ''}`.toLowerCase()
  if (lower.includes('interview') || lower.includes('面接')) tags.push('interview')
  if (lower.includes('business') || lower.includes('会社') || lower.includes('会議')) tags.push('business')
  if (lower.includes('technology') || lower.includes('技術') || lower.includes('system')) tags.push('technology')
  return mergeUniqueTags(tags)
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
  const word = String(source.word || source.name || source.char || source.phrase || '').trim()
  const normalized = {
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
    ai_tags: toArray(source.ai_tags || source.aiTags).map((t) => String(t).trim()).filter(Boolean),
    is_favorite: Boolean(source.is_favorite || source.isFavorite),
    status: normalizeStatus(source.status, source.is_favorite || source.isFavorite),
    next_review_at: source.next_review_at || null,
    ease_factor: Number.isFinite(Number(source.ease_factor)) ? Number(source.ease_factor) : 2.5,
  }
  normalized.ai_tags = mergeUniqueTags(normalized.ai_tags, inferAiTags(normalized))
  normalized.cluster_category = String(source.cluster_category || source.clusterCategory || '').trim() || detectClusterCategory(normalized)
  normalized.tags = mergeUniqueTags(normalized.tags)
  return normalized
}

function toCsv(items) {
  const headers = [
    'id', 'type', 'word', 'reading', 'meaning_en', 'jlpt_level', 'status',
    'cluster_category', 'tags', 'ai_tags', 'review_count', 'created_at',
  ]
  const esc = (value) => {
    const text = String(value ?? '')
    if (text.includes(',') || text.includes('"') || text.includes('\n')) return `"${text.replace(/"/g, '""')}"`
    return text
  }
  const lines = [headers.join(',')]
  for (const item of items) {
    lines.push(
      [
        item.id,
        item.type,
        item.word,
        item.reading,
        item.meaning_en,
        item.jlpt_level,
        item.status,
        item.cluster_category,
        (item.tags || []).join('|'),
        (item.ai_tags || []).join('|'),
        item.review_count,
        item.created_at,
      ].map(esc).join(',')
    )
  }
  return lines.join('\n')
}

export default async function handler(req, res) {
  if (handleOptions(req, res, 'GET, POST, PATCH, DELETE, OPTIONS')) return
  setCors(res, 'GET, POST, PATCH, DELETE, OPTIONS')

  let body = {}
  if (req.method !== 'GET' && req.method !== 'DELETE') {
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
      const { search = '', type = '', jlpt = '', status = '', sort = 'recent', mode = '', format = 'json', limit = '500', offset = '0' } = req.query || {}
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
      const pageLimit = Math.max(1, Math.min(1000, Number(limit) || 500))
      const pageOffset = Math.max(0, Number(offset) || 0)
      const result = await query(
        `select * from discovered_items where ${conditions.join(' and ')} order by ${order} limit $${idx} offset $${idx + 1}`,
        [...values, pageLimit, pageOffset]
      )
      if (String(mode).toLowerCase() === 'export') {
        if (String(format).toLowerCase() === 'csv') {
          const csv = toCsv(result.rows)
          res.setHeader('Content-Type', 'text/csv; charset=utf-8')
          res.setHeader('Content-Disposition', 'attachment; filename="my-discovered-export.csv"')
          return res.status(200).send(csv)
        }
        return res.status(200).json({ profile, exported_at: new Date().toISOString(), items: result.rows })
      }
      if (String(mode).toLowerCase() === 'clusters') {
        const clusterMap = new Map()
        for (const item of result.rows) {
          const key = item.cluster_category || detectClusterCategory(item)
          if (!clusterMap.has(key)) clusterMap.set(key, [])
          clusterMap.get(key).push(item)
        }
        const clusters = [...clusterMap.entries()].map(([cluster, clusterItems]) => ({
          cluster,
          count: clusterItems.length,
          sample: clusterItems.slice(0, 5),
        }))
        return res.status(200).json({ profile, clusters })
      }
      return res.status(200).json({ items: result.rows, profile })
    }

    if (req.method === 'POST') {
      const action = String(body.action || '').toLowerCase()
      if (action === 'bulk-status') {
        const ids = toArray(body.ids).map((id) => String(id).trim()).filter(Boolean)
        const nextStatus = normalizeStatus(body.status, false)
        if (!ids.length) return res.status(400).json({ error: 'ids are required for bulk status update' })
        const result = await query(
          `update discovered_items
           set status = $1,
               updated_at = now()
           where user_id = $2 and id = any($3::uuid[])
           returning *`,
          [nextStatus, profile.id, ids]
        )
        await appendTimelineEvent({
          userId: profile.id,
          activityType: 'bulk_status_update',
          title: 'Batch status update completed',
          description: `Updated ${result.rows.length} items to ${nextStatus}.`,
          metadata: { idsCount: ids.length, status: nextStatus },
        })
        return res.status(200).json({ items: result.rows, updated: result.rows.length })
      }
      if (action === 'bulk-review') {
        const ids = toArray(body.ids).map((id) => String(id).trim()).filter(Boolean)
        if (!ids.length) return res.status(400).json({ error: 'ids are required for bulk review' })
        const result = await query(
          `update discovered_items
           set status = case when status = 'mastered' then status else 'learning' end,
               review_count = review_count + 1,
               last_reviewed_at = now(),
               updated_at = now()
           where user_id = $1 and id = any($2::uuid[])
           returning *`,
          [profile.id, ids]
        )
        await appendTimelineEvent({
          userId: profile.id,
          activityType: 'batch_review',
          title: 'Batch review completed',
          description: `Reviewed ${result.rows.length} saved items in bulk mode.`,
          metadata: { idsCount: ids.length },
        })
        return res.status(200).json({ items: result.rows, reviewed: result.rows.length })
      }
      if (action === 'ai-tag') {
        const ids = toArray(body.ids).map((id) => String(id).trim()).filter(Boolean)
        if (!ids.length) return res.status(400).json({ error: 'ids are required for AI tagging' })
        const current = await query(
          `select *
           from discovered_items
           where user_id = $1 and id = any($2::uuid[])`,
          [profile.id, ids]
        )
        const updated = []
        for (const item of current.rows) {
          const inferred = inferAiTags(item)
          const tags = mergeUniqueTags(item.tags || [], inferred)
          const aiTags = mergeUniqueTags(item.ai_tags || [], inferred)
          const clusterCategory = detectClusterCategory({ ...item, tags, ai_tags: aiTags })
          const result = await query(
            `update discovered_items
             set tags = $1,
                 ai_tags = $2,
                 cluster_category = $3,
                 updated_at = now()
             where id = $4 and user_id = $5
             returning *`,
            [tags, aiTags, clusterCategory, item.id, profile.id]
          )
          if (result.rows[0]) updated.push(result.rows[0])
        }
        await appendTimelineEvent({
          userId: profile.id,
          activityType: 'ai_tagging',
          title: 'AI tag generation completed',
          description: `Generated AI tags for ${updated.length} items.`,
          metadata: { idsCount: ids.length },
        })
        return res.status(200).json({ items: updated, updated: updated.length })
      }

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
            tags, ai_tags, cluster_category, status, is_favorite, review_count, next_review_at, ease_factor, updated_at
          ) values (
            $1, $2, $3, $4, $5, $6, $7, $8, $9,
            $10, $11, $12, $13, $14, $15,
            $16, $17, $18, $19, $20, 0, $21, $22, now()
          )
          returning *`,
          [
            profile.id, item.type, item.word, item.reading, item.romaji, item.meaning_en, item.meaning_hi, item.jlpt_level,
            item.part_of_speech, item.example_jp, item.example_romaji, item.example_en, item.business_usage,
            item.similar_words, item.common_mistake, item.tags, item.ai_tags, item.cluster_category, item.status, item.is_favorite,
            item.next_review_at, item.ease_factor,
          ]
        )
        inserted.push(created.rows[0])
      }

      if (inserted.length) {
        await appendTimelineEvent({
          userId: profile.id,
          activityType: 'discovered_save',
          title: 'Saved new discovered items',
          description: `Added ${inserted.length} item${inserted.length > 1 ? 's' : ''} to your knowledge base.`,
          metadata: { count: inserted.length },
        })
      }

      return res.status(200).json({ items: inserted, imported: Array.isArray(body.items) })
    }

    const id = String(req.query?.id || body.id || '').trim()
    if (!id) return res.status(400).json({ error: 'Item id is required' })

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
      if ('ai_tags' in body || 'aiTags' in body) {
        const list = toArray(body.ai_tags || body.aiTags).map((t) => String(t).trim()).filter(Boolean)
        values.push(mergeUniqueTags(list))
        assignments.push(`ai_tags = $${values.length}`)
      }
      if ('cluster_category' in body || 'clusterCategory' in body) {
        values.push(String(body.cluster_category || body.clusterCategory || '').trim() || null)
        assignments.push(`cluster_category = $${values.length}`)
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

    return methodNotAllowed(req, res, ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'])
  } catch (error) {
    console.error('discovered-items error', error)
    return res.status(500).json({ error: 'Failed to process discovered items request' })
  }
}
