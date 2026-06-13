import { Buffer } from 'node:buffer'
import { appendTimelineEvent, ensureUserProfile, query, withTransaction } from '../server/lib/db.js'
import { getAuthContext, ensureAuthUserId } from '../server/lib/auth.js'
import { checkRateLimit, generateJson } from '../server/lib/gemini.js'
import { handleOptions, methodNotAllowed, parseJsonBody, setCors, toArray } from '../server/lib/http.js'

const MAX_RAW_TEXT_LENGTH = 120_000
const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024
const SOURCE_TYPES = new Set(['text', 'txt', 'pdf'])
const LESSON_STATUSES = new Set(['draft', 'processing', 'ready', 'completed', 'archived'])
const JLPT_LEVELS = new Set(['N5', 'N4', 'N3', 'N2', 'N1'])

const LESSON_CLEANUP_SYSTEM_PROMPT = `You are an enterprise Japanese lesson processor.
Return strict JSON only with this exact shape:
{
  "cleaned_text": "",
  "corrected_text": "",
  "rewritten_text": "",
  "romaji": "",
  "english_translation": "",
  "summary": "",
  "estimated_level": "N5",
  "vocabulary": [
    {
      "word": "",
      "reading": "",
      "romaji": "",
      "meaning_en": "",
      "jlpt_level": "N5",
      "part_of_speech": "",
      "example_jp": "",
      "example_en": ""
    }
  ],
  "grammar": [
    {
      "grammar_point": "",
      "meaning_en": "",
      "explanation": "",
      "jlpt_level": "N5",
      "example_jp": "",
      "example_en": ""
    }
  ],
  "kanji": [
    {
      "kanji": "",
      "reading": "",
      "meaning_en": "",
      "example_word": "",
      "jlpt_level": "N5"
    }
  ],
  "practice_questions": [
    {
      "question": "",
      "options": ["", "", "", ""],
      "answer": "",
      "explanation": ""
    }
  ]
}
Rules:
- cleaned_text: remove OCR noise and keep line structure.
- corrected_text: fix broken Japanese text and punctuation.
- rewritten_text: produce a natural study-friendly rewritten lesson.
- romaji and english_translation should cover the rewritten_text content.
- estimated_level must be N5/N4/N3/N2/N1.
- vocabulary max 80 entries, grammar max 40, kanji max 60, practice_questions max 20.
- JSON only.`

function normalizeSourceType(value) {
  const source = String(value || 'text').toLowerCase().trim()
  return SOURCE_TYPES.has(source) ? source : 'text'
}

function normalizeJlptLevel(value, fallback = 'N5') {
  const level = String(value || '').toUpperCase().trim()
  if (JLPT_LEVELS.has(level)) return level
  return fallback
}

function normalizeStatus(value, fallback = 'ready') {
  const status = String(value || '').toLowerCase().trim()
  if (LESSON_STATUSES.has(status)) return status
  return fallback
}

function normalizeCompletion(value, fallback = 0) {
  if (!Number.isFinite(Number(value))) return fallback
  return Math.max(0, Math.min(100, Math.round(Number(value))))
}

function normalizeText(value, maxLength = MAX_RAW_TEXT_LENGTH) {
  return String(value || '').replace(/\r\n/g, '\n').replace(/\u0000/g, '').trim().slice(0, maxLength)
}

function normalizeTags(input) {
  if (Array.isArray(input)) {
    return [...new Set(input.map((tag) => String(tag || '').trim()).filter(Boolean))]
  }
  if (typeof input === 'string') {
    return [...new Set(input.split(',').map((tag) => tag.trim()).filter(Boolean))]
  }
  return []
}

function toIsoDate(value) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

function normalizeVocabulary(items, fallbackLevel = 'N5') {
  return toArray(items)
    .filter((item) => item && typeof item === 'object')
    .map((item) => ({
      word: String(item.word || item.term || '').trim(),
      reading: String(item.reading || '').trim() || null,
      romaji: String(item.romaji || '').trim() || null,
      meaning_en: String(item.meaning_en || item.meaning || item.english || '').trim() || null,
      jlpt_level: normalizeJlptLevel(item.jlpt_level || item.level, fallbackLevel),
      part_of_speech: String(item.part_of_speech || item.partOfSpeech || '').trim() || null,
      example_jp: String(item.example_jp || item.example || '').trim() || null,
      example_en: String(item.example_en || '').trim() || null,
    }))
    .filter((item) => item.word)
}

function normalizeGrammar(items, fallbackLevel = 'N5') {
  return toArray(items)
    .filter((item) => item && typeof item === 'object')
    .map((item) => ({
      grammar_point: String(item.grammar_point || item.name || item.pattern || '').trim(),
      meaning_en: String(item.meaning_en || item.meaning || '').trim() || null,
      explanation: String(item.explanation || item.structure || '').trim() || null,
      jlpt_level: normalizeJlptLevel(item.jlpt_level || item.level, fallbackLevel),
      example_jp: String(item.example_jp || item.example || '').trim() || null,
      example_en: String(item.example_en || '').trim() || null,
    }))
    .filter((item) => item.grammar_point)
}

function normalizeKanji(items, fallbackLevel = 'N5') {
  return toArray(items)
    .filter((item) => item && typeof item === 'object')
    .map((item) => ({
      kanji: String(item.kanji || item.char || '').trim(),
      reading: String(item.reading || '').trim() || null,
      meaning_en: String(item.meaning_en || item.meaning || '').trim() || null,
      example_word: String(item.example_word || item.example || '').trim() || null,
      jlpt_level: normalizeJlptLevel(item.jlpt_level || item.level, fallbackLevel),
    }))
    .filter((item) => item.kanji)
}

function normalizePracticeQuestions(items) {
  return toArray(items)
    .filter((item) => item && typeof item === 'object')
    .map((item) => ({
      question: String(item.question || '').trim(),
      options_json: toArray(item.options).map((option) => String(option || '').trim()).filter(Boolean),
      answer: String(item.answer || '').trim() || null,
      explanation: String(item.explanation || '').trim() || null,
    }))
    .filter((item) => item.question)
}

function buildFallbackProcessed(rawText, requestedLevel = 'N5') {
  const cleaned = normalizeText(rawText)
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
  return {
    cleaned_text: cleaned,
    corrected_text: cleaned,
    rewritten_text: cleaned,
    romaji: '',
    english_translation: '',
    summary: 'Fallback processing used because AI processing was unavailable.',
    estimated_level: normalizeJlptLevel(requestedLevel, 'N5'),
    vocabulary: [],
    grammar: [],
    kanji: [],
    practice_questions: [],
    fallback_used: true,
  }
}

async function processLessonWithAi({ rawText, title, requestedLevel, category }) {
  const prompt = JSON.stringify({
    title: String(title || '').trim() || 'Untitled Lesson',
    requested_level: normalizeJlptLevel(requestedLevel, 'N5'),
    category: String(category || '').trim() || 'general',
    raw_text: normalizeText(rawText),
  })

  let aiResult
  try {
    aiResult = await generateJson({
      systemPrompt: LESSON_CLEANUP_SYSTEM_PROMPT,
      prompt,
      maxOutputTokens: 8192,
      temperature: 0.25,
    })
  } catch {
    return buildFallbackProcessed(rawText, requestedLevel)
  }

  const estimatedLevel = normalizeJlptLevel(aiResult.estimated_level || requestedLevel, 'N5')
  return {
    cleaned_text: normalizeText(aiResult.cleaned_text || rawText),
    corrected_text: normalizeText(aiResult.corrected_text || aiResult.cleaned_text || rawText),
    rewritten_text: normalizeText(aiResult.rewritten_text || aiResult.corrected_text || rawText),
    romaji: normalizeText(aiResult.romaji || '', MAX_RAW_TEXT_LENGTH),
    english_translation: normalizeText(aiResult.english_translation || '', MAX_RAW_TEXT_LENGTH),
    summary: normalizeText(aiResult.summary || '', 2_000),
    estimated_level: estimatedLevel,
    vocabulary: normalizeVocabulary(aiResult.vocabulary, estimatedLevel),
    grammar: normalizeGrammar(aiResult.grammar, estimatedLevel),
    kanji: normalizeKanji(aiResult.kanji, estimatedLevel),
    practice_questions: normalizePracticeQuestions(aiResult.practice_questions),
    fallback_used: Boolean(aiResult.fallback_used),
  }
}

async function extractTextFromPdf(buffer) {
  const { default: pdfParse } = await import('pdf-parse')
  const parsed = await pdfParse(buffer)
  const text = normalizeText(parsed?.text || '', MAX_RAW_TEXT_LENGTH)
  if (!text || text.length < 30) {
    throw new Error('PDF extraction failed. If this is a scanned/image PDF, please copy-paste text manually for now.')
  }
  return text
}

function extractTextFromTxt(buffer) {
  const decoder = new TextDecoder('utf-8', { fatal: false })
  return normalizeText(decoder.decode(buffer), MAX_RAW_TEXT_LENGTH)
}

function decodeFilePayload(fileBase64) {
  const encoded = String(fileBase64 || '').replace(/^data:.*;base64,/, '')
  if (!encoded) return Buffer.alloc(0)
  return Buffer.from(encoded, 'base64')
}

async function replaceLessonChildren(client, lessonId, userId, processed) {
  const vocabulary = normalizeVocabulary(processed.vocabulary, processed.estimated_level)
  const grammar = normalizeGrammar(processed.grammar, processed.estimated_level)
  const kanji = normalizeKanji(processed.kanji, processed.estimated_level)
  const practice = normalizePracticeQuestions(processed.practice_questions)

  await client.query('delete from lesson_vocabulary where lesson_id = $1 and user_id = $2', [lessonId, userId])
  await client.query('delete from lesson_grammar where lesson_id = $1 and user_id = $2', [lessonId, userId])
  await client.query('delete from lesson_kanji where lesson_id = $1 and user_id = $2', [lessonId, userId])
  await client.query('delete from lesson_practice_questions where lesson_id = $1 and user_id = $2', [lessonId, userId])

  for (const item of vocabulary) {
    await client.query(
      `insert into lesson_vocabulary (
        lesson_id, user_id, word, reading, romaji, meaning_en, jlpt_level, part_of_speech, example_jp, example_en, created_at
      ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now())`,
      [lessonId, userId, item.word, item.reading, item.romaji, item.meaning_en, item.jlpt_level, item.part_of_speech, item.example_jp, item.example_en]
    )
  }
  for (const item of grammar) {
    await client.query(
      `insert into lesson_grammar (
        lesson_id, user_id, grammar_point, meaning_en, explanation, jlpt_level, example_jp, example_en, created_at
      ) values ($1, $2, $3, $4, $5, $6, $7, $8, now())`,
      [lessonId, userId, item.grammar_point, item.meaning_en, item.explanation, item.jlpt_level, item.example_jp, item.example_en]
    )
  }
  for (const item of kanji) {
    await client.query(
      `insert into lesson_kanji (
        lesson_id, user_id, kanji, reading, meaning_en, example_word, jlpt_level, created_at
      ) values ($1, $2, $3, $4, $5, $6, $7, now())`,
      [lessonId, userId, item.kanji, item.reading, item.meaning_en, item.example_word, item.jlpt_level]
    )
  }
  for (const item of practice) {
    await client.query(
      `insert into lesson_practice_questions (
        lesson_id, user_id, question, options_json, answer, explanation, created_at
      ) values ($1, $2, $3, $4::jsonb, $5, $6, now())`,
      [lessonId, userId, item.question, JSON.stringify(item.options_json), item.answer, item.explanation]
    )
  }

  return {
    vocabulary_count: vocabulary.length,
    grammar_count: grammar.length,
    kanji_count: kanji.length,
    practice_count: practice.length,
  }
}

async function createLessonRecord(profileId, payload) {
  return withTransaction(async (client) => {
    const inserted = await client.query(
      `insert into lessons (
        user_id, title, source_type, source_file_name, jlpt_level, category, tags, notes,
        raw_text, cleaned_text, corrected_text, rewritten_text, romaji, english_translation,
        summary, estimated_level, status, completion_percentage, created_at, updated_at, last_studied_at
      ) values (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12, $13, $14,
        $15, $16, $17, $18, now(), now(), $19
      )
      returning *`,
      [
        profileId,
        payload.title,
        payload.source_type,
        payload.source_file_name,
        payload.jlpt_level,
        payload.category,
        payload.tags,
        payload.notes,
        payload.raw_text,
        payload.cleaned_text,
        payload.corrected_text,
        payload.rewritten_text,
        payload.romaji,
        payload.english_translation,
        payload.summary,
        payload.estimated_level,
        payload.status,
        payload.completion_percentage,
        payload.last_studied_at,
      ]
    )
    const lesson = inserted.rows[0]
    const counts = await replaceLessonChildren(client, lesson.id, profileId, payload)
    await client.query(
      `insert into lesson_activity (lesson_id, user_id, activity_type, metadata, created_at)
       values ($1, $2, 'lesson_created', $3::jsonb, now())`,
      [lesson.id, profileId, JSON.stringify({ sourceType: payload.source_type, ...counts })]
    )
    return { lesson, counts }
  })
}

async function loadLessonDetail(profileId, lessonId) {
  const [lessonResult, vocabulary, grammar, kanji, practice, activity] = await Promise.all([
    query(
      `select l.*,
              (select count(*)::int from lesson_vocabulary lv where lv.lesson_id = l.id) as vocabulary_count,
              (select count(*)::int from lesson_grammar lg where lg.lesson_id = l.id) as grammar_count,
              (select count(*)::int from lesson_kanji lk where lk.lesson_id = l.id) as kanji_count,
              (select count(*)::int from lesson_practice_questions lp where lp.lesson_id = l.id) as practice_count
       from lessons l
       where l.id = $1 and l.user_id = $2
       limit 1`,
      [lessonId, profileId]
    ),
    query('select * from lesson_vocabulary where lesson_id = $1 and user_id = $2 order by created_at asc', [lessonId, profileId]),
    query('select * from lesson_grammar where lesson_id = $1 and user_id = $2 order by created_at asc', [lessonId, profileId]),
    query('select * from lesson_kanji where lesson_id = $1 and user_id = $2 order by created_at asc', [lessonId, profileId]),
    query('select * from lesson_practice_questions where lesson_id = $1 and user_id = $2 order by created_at asc', [lessonId, profileId]),
    query('select * from lesson_activity where lesson_id = $1 and user_id = $2 order by created_at desc limit 30', [lessonId, profileId]),
  ])

  const lesson = lessonResult.rows[0]
  if (!lesson) return null
  return {
    lesson,
    vocabulary: vocabulary.rows,
    grammar: grammar.rows,
    kanji: kanji.rows,
    practice_questions: practice.rows,
    activity: activity.rows,
  }
}

async function saveLessonItemsToDiscovered({ profileId, lessonId, itemType, itemIds = [] }) {
  const tableMap = {
    vocabulary: {
      table: 'lesson_vocabulary',
      select: 'id, word, reading, romaji, meaning_en, jlpt_level, part_of_speech, example_jp, example_en',
      toInsert: (row) => ({
        type: 'vocabulary',
        word: row.word,
        reading: row.reading,
        romaji: row.romaji,
        meaning_en: row.meaning_en,
        jlpt_level: row.jlpt_level,
        part_of_speech: row.part_of_speech,
        example_jp: row.example_jp,
        example_en: row.example_en,
      }),
    },
    grammar: {
      table: 'lesson_grammar',
      select: 'id, grammar_point, meaning_en, explanation, jlpt_level, example_jp, example_en',
      toInsert: (row) => ({
        type: 'grammar',
        word: row.grammar_point,
        reading: null,
        romaji: null,
        meaning_en: row.meaning_en || row.explanation,
        jlpt_level: row.jlpt_level,
        part_of_speech: 'grammar',
        example_jp: row.example_jp,
        example_en: row.example_en,
      }),
    },
    kanji: {
      table: 'lesson_kanji',
      select: 'id, kanji, reading, meaning_en, example_word, jlpt_level',
      toInsert: (row) => ({
        type: 'kanji',
        word: row.kanji,
        reading: row.reading,
        romaji: null,
        meaning_en: row.meaning_en,
        jlpt_level: row.jlpt_level,
        part_of_speech: 'kanji',
        example_jp: row.example_word,
        example_en: null,
      }),
    },
  }
  const map = tableMap[itemType]
  if (!map) return { inserted: 0, duplicates: 0 }

  const conditions = ['lesson_id = $1', 'user_id = $2']
  const values = [lessonId, profileId]
  if (itemIds.length) {
    values.push(itemIds)
    conditions.push(`id = any($${values.length}::uuid[])`)
  }
  const sourceRows = await query(
    `select ${map.select}
     from ${map.table}
     where ${conditions.join(' and ')}`,
    values
  )

  let inserted = 0
  let duplicates = 0
  for (const row of sourceRows.rows) {
    const item = map.toInsert(row)
    const duplicate = await query(
      `select id
       from discovered_items
       where user_id = $1 and type = $2 and word = $3 and coalesce(reading, '') = coalesce($4, '')
       limit 1`,
      [profileId, item.type, item.word, item.reading]
    )
    if (duplicate.rows[0]) {
      duplicates += 1
      continue
    }
    await query(
      `insert into discovered_items (
        user_id, type, word, reading, romaji, meaning_en, jlpt_level, part_of_speech,
        example_jp, example_en, status, review_count, ease_factor, updated_at
      ) values (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10, 'new', 0, 2.5, now()
      )`,
      [profileId, item.type, item.word, item.reading, item.romaji, item.meaning_en, item.jlpt_level, item.part_of_speech, item.example_jp, item.example_en]
    )
    inserted += 1
  }
  return { inserted, duplicates, total: sourceRows.rows.length }
}

async function handleListLessons(req, res, profile) {
  const { q = '', jlpt = '', source_type = '', status = '', date_from = '', date_to = '', limit = '50', offset = '0' } = req.query || {}
  const filters = ['l.user_id = $1']
  const values = [profile.id]
  let idx = 2

  if (q) {
    filters.push(`(l.title ilike $${idx} or l.raw_text ilike $${idx} or coalesce(l.summary, '') ilike $${idx})`)
    values.push(`%${String(q).trim()}%`)
    idx += 1
  }
  if (jlpt && JLPT_LEVELS.has(String(jlpt).toUpperCase())) {
    filters.push(`l.jlpt_level = $${idx}`)
    values.push(String(jlpt).toUpperCase())
    idx += 1
  }
  const normalizedSource = normalizeSourceType(source_type || '')
  if (source_type && SOURCE_TYPES.has(normalizedSource)) {
    filters.push(`l.source_type = $${idx}`)
    values.push(normalizedSource)
    idx += 1
  }
  if (status && LESSON_STATUSES.has(String(status).toLowerCase())) {
    filters.push(`l.status = $${idx}`)
    values.push(String(status).toLowerCase())
    idx += 1
  }
  const fromIso = toIsoDate(date_from)
  if (fromIso) {
    filters.push(`l.created_at >= $${idx}`)
    values.push(fromIso)
    idx += 1
  }
  const toIso = toIsoDate(date_to)
  if (toIso) {
    filters.push(`l.created_at <= $${idx}`)
    values.push(toIso)
    idx += 1
  }

  const pageLimit = Math.max(1, Math.min(100, Number(limit) || 50))
  const pageOffset = Math.max(0, Number(offset) || 0)
  values.push(pageLimit, pageOffset)

  const result = await query(
    `select
      l.*,
      (select count(*)::int from lesson_vocabulary lv where lv.lesson_id = l.id) as vocabulary_count,
      (select count(*)::int from lesson_grammar lg where lg.lesson_id = l.id) as grammar_count,
      (select count(*)::int from lesson_kanji lk where lk.lesson_id = l.id) as kanji_count,
      (select max(la.created_at) from lesson_activity la where la.lesson_id = l.id and la.activity_type in ('lesson_opened', 'lesson_completed', 'review_session_generated')) as last_activity_at
     from lessons l
     where ${filters.join(' and ')}
     order by l.created_at desc
     limit $${values.length - 1} offset $${values.length}`,
    values
  )
  return res.status(200).json({ items: result.rows })
}

async function handleGetLesson(req, res, profile, lessonId) {
  const detail = await loadLessonDetail(profile.id, lessonId)
  if (!detail) return res.status(404).json({ error: 'Lesson not found' })
  await query(
    `insert into lesson_activity (lesson_id, user_id, activity_type, metadata, created_at)
     values ($1, $2, 'lesson_opened', $3::jsonb, now())`,
    [lessonId, profile.id, JSON.stringify({ openedAt: new Date().toISOString() })]
  )
  return res.status(200).json(detail)
}

async function handleCreateLesson(req, res, profile, body) {
  const metadata = body.lesson && typeof body.lesson === 'object' ? body.lesson : body
  const processed = body.processed && typeof body.processed === 'object' ? body.processed : {}
  const rawText = normalizeText(metadata.raw_text || processed.raw_text || metadata.text || '')
  if (!rawText) return res.status(400).json({ error: 'Lesson raw_text is required' })

  const payload = {
    title: normalizeText(metadata.title || 'Untitled Lesson', 180),
    source_type: normalizeSourceType(metadata.source_type || metadata.sourceType || 'text'),
    source_file_name: normalizeText(metadata.source_file_name || metadata.sourceFileName || '', 255) || null,
    jlpt_level: normalizeJlptLevel(metadata.jlpt_level || metadata.jlptLevel, 'N5'),
    category: normalizeText(metadata.category || 'General', 120) || null,
    tags: normalizeTags(metadata.tags),
    notes: normalizeText(metadata.notes || '', 2_000) || null,
    raw_text: rawText,
    cleaned_text: normalizeText(processed.cleaned_text || rawText),
    corrected_text: normalizeText(processed.corrected_text || processed.cleaned_text || rawText),
    rewritten_text: normalizeText(processed.rewritten_text || processed.corrected_text || rawText),
    romaji: normalizeText(processed.romaji || '', MAX_RAW_TEXT_LENGTH),
    english_translation: normalizeText(processed.english_translation || '', MAX_RAW_TEXT_LENGTH),
    summary: normalizeText(processed.summary || '', 2_000),
    estimated_level: normalizeJlptLevel(processed.estimated_level || metadata.jlpt_level, 'N5'),
    status: normalizeStatus(metadata.status, 'ready'),
    completion_percentage: normalizeCompletion(metadata.completion_percentage, 0),
    last_studied_at: toIsoDate(metadata.last_studied_at),
    vocabulary: normalizeVocabulary(processed.vocabulary, processed.estimated_level || metadata.jlpt_level || 'N5'),
    grammar: normalizeGrammar(processed.grammar, processed.estimated_level || metadata.jlpt_level || 'N5'),
    kanji: normalizeKanji(processed.kanji, processed.estimated_level || metadata.jlpt_level || 'N5'),
    practice_questions: normalizePracticeQuestions(processed.practice_questions),
  }

  const created = await createLessonRecord(profile.id, payload)
  await appendTimelineEvent({
    userId: profile.id,
    activityType: 'lesson_created',
    title: `Created lesson: ${payload.title}`,
    description: `${payload.source_type.toUpperCase()} lesson uploaded and processed.`,
    metadata: {
      lessonId: created.lesson.id,
      vocabularyCount: created.counts.vocabulary_count,
      grammarCount: created.counts.grammar_count,
      kanjiCount: created.counts.kanji_count,
    },
  })
  return res.status(201).json({ lesson: created.lesson, counts: created.counts })
}

async function handlePatchLesson(req, res, profile, lessonId, body) {
  const assignments = []
  const values = []
  function push(field, value) {
    values.push(value)
    assignments.push(`${field} = $${values.length}`)
  }

  if (body.title != null) push('title', normalizeText(body.title, 180))
  if (body.jlpt_level != null || body.jlptLevel != null) push('jlpt_level', normalizeJlptLevel(body.jlpt_level || body.jlptLevel, 'N5'))
  if (body.category != null) push('category', normalizeText(body.category, 120) || null)
  if (body.tags != null) push('tags', normalizeTags(body.tags))
  if (body.notes != null) push('notes', normalizeText(body.notes, 2_000) || null)
  if (body.status != null) push('status', normalizeStatus(body.status, 'ready'))
  if (body.completion_percentage != null) push('completion_percentage', normalizeCompletion(body.completion_percentage, 0))
  if (body.last_studied_at != null) push('last_studied_at', toIsoDate(body.last_studied_at))

  if (!assignments.length) return res.status(400).json({ error: 'No updatable lesson fields provided' })

  values.push(lessonId, profile.id)
  const result = await query(
    `update lessons
     set ${assignments.join(', ')}, updated_at = now()
     where id = $${values.length - 1} and user_id = $${values.length}
     returning *`,
    values
  )
  if (!result.rows[0]) return res.status(404).json({ error: 'Lesson not found' })

  await query(
    `insert into lesson_activity (lesson_id, user_id, activity_type, metadata, created_at)
     values ($1, $2, 'lesson_metadata_updated', $3::jsonb, now())`,
    [lessonId, profile.id, JSON.stringify({ updatedFields: assignments.length })]
  )

  return res.status(200).json({ lesson: result.rows[0] })
}

async function handleDeleteLesson(req, res, profile, lessonId) {
  const deleted = await query(
    `delete from lessons
     where id = $1 and user_id = $2
     returning id, title`,
    [lessonId, profile.id]
  )
  if (!deleted.rows[0]) return res.status(404).json({ error: 'Lesson not found' })
  await appendTimelineEvent({
    userId: profile.id,
    activityType: 'lesson_deleted',
    title: `Deleted lesson: ${deleted.rows[0].title || lessonId}`,
    description: 'Lesson removed from library.',
    metadata: { lessonId },
  })
  return res.status(200).json({ success: true, id: lessonId })
}

async function handleUploadText(req, res, profile, body) {
  const rawText = normalizeText(body.raw_text || body.text || '')
  if (!rawText) return res.status(400).json({ error: 'Empty text. Paste lesson content before continuing.' })
  if (rawText.length < 20) return res.status(400).json({ error: 'Text is too short to create a lesson.' })
  return res.status(200).json({
    source_type: normalizeSourceType(body.source_type || 'text'),
    extracted_text: rawText,
    char_count: rawText.length,
    preview: rawText.slice(0, 1000),
    profile_id: profile.id,
  })
}

async function handleUploadFile(req, res, body) {
  const fileName = normalizeText(body.file_name || body.fileName || '', 255)
  const fileType = String(body.file_type || body.fileType || '').toLowerCase().trim()
  const fileData = body.file_base64 || body.fileData || ''
  if (!fileName || !fileData) {
    return res.status(400).json({ error: 'Missing file payload. Please upload TXT or PDF again.' })
  }

  let sourceType = normalizeSourceType(fileType)
  if (!fileType) {
    if (fileName.toLowerCase().endsWith('.txt')) sourceType = 'txt'
    if (fileName.toLowerCase().endsWith('.pdf')) sourceType = 'pdf'
  }
  if (!SOURCE_TYPES.has(sourceType) || sourceType === 'text') {
    return res.status(400).json({ error: 'Unsupported file type. Only TXT and PDF are supported.' })
  }

  const buffer = decodeFilePayload(fileData)
  if (!buffer.length) return res.status(400).json({ error: 'Uploaded file is empty.' })
  if (buffer.length > MAX_UPLOAD_SIZE_BYTES) {
    return res.status(400).json({ error: 'File is too large. Please upload a file smaller than 5MB.' })
  }

  let extractedText = ''
  if (sourceType === 'txt') {
    extractedText = extractTextFromTxt(buffer)
  } else if (sourceType === 'pdf') {
    try {
      extractedText = await extractTextFromPdf(buffer)
    } catch (error) {
      return res.status(422).json({ error: error.message || 'PDF extraction failed. Please paste text manually.' })
    }
  }

  if (!extractedText) {
    return res.status(422).json({ error: 'Could not extract lesson text. Please paste manually for now.' })
  }

  return res.status(200).json({
    source_type: sourceType,
    file_name: fileName,
    extracted_text: extractedText,
    char_count: extractedText.length,
    preview: extractedText.slice(0, 1200),
  })
}

async function handleProcessAi(req, res, body) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.headers['x-real-ip'] || 'unknown'
  if (!checkRateLimit(ip, 'lesson-process-ai', 8)) {
    return res.status(429).json({ error: 'Too many processing requests. Please retry shortly.' })
  }
  const rawText = normalizeText(body.raw_text || body.text || '')
  if (!rawText) return res.status(400).json({ error: 'Text is required for AI processing.' })
  const processed = await processLessonWithAi({
    rawText,
    title: body.title,
    requestedLevel: body.jlpt_level || body.jlptLevel,
    category: body.category,
  })
  return res.status(200).json({
    raw_text: rawText,
    ...processed,
    counts: {
      vocabulary: processed.vocabulary.length,
      grammar: processed.grammar.length,
      kanji: processed.kanji.length,
      practice_questions: processed.practice_questions.length,
    },
  })
}

async function handleReprocess(req, res, profile, body) {
  const lessonId = String(body.lesson_id || body.lessonId || body.id || '').trim()
  if (!lessonId) return res.status(400).json({ error: 'lesson_id is required' })

  const lessonResult = await query('select * from lessons where id = $1 and user_id = $2 limit 1', [lessonId, profile.id])
  const lesson = lessonResult.rows[0]
  if (!lesson) return res.status(404).json({ error: 'Lesson not found' })

  const rawText = normalizeText(body.raw_text || lesson.raw_text || '')
  if (!rawText) return res.status(400).json({ error: 'Lesson has no raw text to reprocess.' })

  const processed = await processLessonWithAi({
    rawText,
    title: lesson.title,
    requestedLevel: lesson.jlpt_level || lesson.estimated_level || 'N5',
    category: lesson.category || '',
  })

  const updated = await withTransaction(async (client) => {
    const lessonUpdate = await client.query(
      `update lessons
       set raw_text = $1,
           cleaned_text = $2,
           corrected_text = $3,
           rewritten_text = $4,
           romaji = $5,
           english_translation = $6,
           summary = $7,
           estimated_level = $8,
           status = 'ready',
           updated_at = now()
       where id = $9 and user_id = $10
       returning *`,
      [
        rawText,
        processed.cleaned_text,
        processed.corrected_text,
        processed.rewritten_text,
        processed.romaji,
        processed.english_translation,
        processed.summary,
        processed.estimated_level,
        lessonId,
        profile.id,
      ]
    )
    const counts = await replaceLessonChildren(client, lessonId, profile.id, processed)
    await client.query(
      `insert into lesson_activity (lesson_id, user_id, activity_type, metadata, created_at)
       values ($1, $2, 'lesson_reprocessed', $3::jsonb, now())`,
      [lessonId, profile.id, JSON.stringify(counts)]
    )
    return { lesson: lessonUpdate.rows[0], counts }
  })

  await appendTimelineEvent({
    userId: profile.id,
    activityType: 'lesson_reprocessed',
    title: `Reprocessed lesson: ${updated.lesson.title}`,
    description: 'Lesson content refreshed with AI cleanup.',
    metadata: { lessonId },
  })

  return res.status(200).json({ ...updated, processed })
}

async function handleCompleteLesson(res, profile, body) {
  const lessonId = String(body.lesson_id || body.lessonId || body.id || '').trim()
  if (!lessonId) return res.status(400).json({ error: 'lesson_id is required' })
  const updated = await query(
    `update lessons
     set status = 'completed',
         completion_percentage = 100,
         last_studied_at = now(),
         updated_at = now()
     where id = $1 and user_id = $2
     returning *`,
    [lessonId, profile.id]
  )
  if (!updated.rows[0]) return res.status(404).json({ error: 'Lesson not found' })
  await query(
    `insert into lesson_activity (lesson_id, user_id, activity_type, metadata, created_at)
     values ($1, $2, 'lesson_completed', $3::jsonb, now())`,
    [lessonId, profile.id, JSON.stringify({ completion: 100 })]
  )
  await appendTimelineEvent({
    userId: profile.id,
    activityType: 'lesson_completed',
    title: `Completed lesson: ${updated.rows[0].title}`,
    description: 'Lesson marked complete.',
    metadata: { lessonId },
  })
  return res.status(200).json({ lesson: updated.rows[0] })
}

async function handleSaveLessonItems(res, profile, body, itemType) {
  const lessonId = String(body.lesson_id || body.lessonId || body.id || '').trim()
  if (!lessonId) return res.status(400).json({ error: 'lesson_id is required' })
  const itemIds = toArray(body.item_ids || body.itemIds).map((id) => String(id).trim()).filter(Boolean)
  const result = await saveLessonItemsToDiscovered({
    profileId: profile.id,
    lessonId,
    itemType,
    itemIds,
  })
  await query(
    `insert into lesson_activity (lesson_id, user_id, activity_type, metadata, created_at)
     values ($1, $2, $3, $4::jsonb, now())`,
    [lessonId, profile.id, `saved_${itemType}`, JSON.stringify(result)]
  )
  return res.status(200).json(result)
}

async function handleGenerateReview(res, profile, body) {
  const lessonId = String(body.lesson_id || body.lessonId || body.id || '').trim()
  if (!lessonId) return res.status(400).json({ error: 'lesson_id is required' })
  const vocab = await saveLessonItemsToDiscovered({ profileId: profile.id, lessonId, itemType: 'vocabulary' })
  const grammar = await saveLessonItemsToDiscovered({ profileId: profile.id, lessonId, itemType: 'grammar' })
  const kanji = await saveLessonItemsToDiscovered({ profileId: profile.id, lessonId, itemType: 'kanji' })
  const totalInserted = vocab.inserted + grammar.inserted + kanji.inserted
  await query(
    `insert into lesson_activity (lesson_id, user_id, activity_type, metadata, created_at)
     values ($1, $2, 'review_session_generated', $3::jsonb, now())`,
    [lessonId, profile.id, JSON.stringify({ totalInserted, vocab, grammar, kanji })]
  )
  return res.status(200).json({ success: true, total_inserted: totalInserted, vocab, grammar, kanji })
}

export default async function handler(req, res) {
  if (handleOptions(req, res, 'GET, POST, PATCH, DELETE, OPTIONS')) return
  setCors(res, 'GET, POST, PATCH, DELETE, OPTIONS')

  let body = {}
  if (req.method === 'POST' || req.method === 'PATCH') {
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
    const lessonId = String(req.query?.id || body.id || '').trim()

    if (req.method === 'GET') {
      if (lessonId) return await handleGetLesson(req, res, profile, lessonId)
      return await handleListLessons(req, res, profile)
    }

    if (req.method === 'POST') {
      const action = String(req.query?.action || body.action || '').toLowerCase().trim()
      if (action === 'upload-text') return await handleUploadText(req, res, profile, body)
      if (action === 'upload-file') return await handleUploadFile(req, res, body)
      if (action === 'process-ai') return await handleProcessAi(req, res, body)
      if (action === 'reprocess') return await handleReprocess(req, res, profile, body)
      if (action === 'complete') return await handleCompleteLesson(res, profile, body)
      if (action === 'save-vocabulary') return await handleSaveLessonItems(res, profile, body, 'vocabulary')
      if (action === 'save-grammar') return await handleSaveLessonItems(res, profile, body, 'grammar')
      if (action === 'save-kanji') return await handleSaveLessonItems(res, profile, body, 'kanji')
      if (action === 'generate-review') return await handleGenerateReview(res, profile, body)
      return await handleCreateLesson(req, res, profile, body)
    }

    if (req.method === 'PATCH') {
      if (!lessonId) return res.status(400).json({ error: 'Lesson id is required' })
      return await handlePatchLesson(req, res, profile, lessonId, body)
    }

    if (req.method === 'DELETE') {
      if (!lessonId) return res.status(400).json({ error: 'Lesson id is required' })
      return await handleDeleteLesson(req, res, profile, lessonId)
    }

    return methodNotAllowed(req, res, ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'])
  } catch (error) {
    console.error('lessons error', error)
    return res.status(500).json({ error: 'Lesson request failed' })
  }
}
