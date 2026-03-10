/**
 * User-added kanji (from Learn from your text) - persists to localStorage
 */
const STORAGE_KEY = 'my-japanese-journey-user-kanji'
const LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1']

function getAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function getUserKanjiByLevel() {
  const list = getAll()
  const byLevel = { N5: [], N4: [], N3: [], N2: [], N1: [] }
  for (const item of list) {
    const level = LEVELS.includes(item.level) ? item.level : 'N5'
    if (!byLevel[level]) byLevel[level] = []
    byLevel[level].push(item)
  }
  return byLevel
}

/** Returns all user kanji in the order they were saved. */
export function getUserKanjiInOrder() {
  return getAll()
}

function isDuplicate(list, item) {
  return list.some((i) => i.char === item.char)
}

export function addKanji(item) {
  const list = getAll()
  const entry = {
    char: String(item.char || '').trim(),
    reading: String(item.reading || '').trim(),
    meaning: String(item.meaning || '').trim(),
    level: LEVELS.includes(item.level) ? item.level : 'N5',
    onyomi: String(item.onyomi || '').trim(),
    kunyomi: String(item.kunyomi || '').trim(),
    onExamples: Array.isArray(item.onExamples) ? item.onExamples.slice(0, 3) : [],
    kunExamples: Array.isArray(item.kunExamples) ? item.kunExamples.slice(0, 3) : [],
    examples: Array.isArray(item.examples) ? item.examples.slice(0, 3) : [],
  }
  if (!entry.char) return list
  if (isDuplicate(list, entry)) return list
  list.push(entry)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  return list
}

export function addKanjiBatch(items) {
  let added = 0
  for (const item of items) {
    if (!item?.char) continue
    const before = getAll().length
    addKanji(item)
    if (getAll().length > before) added++
  }
  return added
}

/** Update existing kanji with enriched data (onyomi, kunyomi, examples). Keeps existing values if new ones are empty. */
export function updateKanji(char, updates) {
  const list = getAll()
  const idx = list.findIndex((i) => i.char === char)
  if (idx < 0) return list
  const existing = list[idx]
  list[idx] = {
    ...existing,
    onyomi: (updates.onyomi || existing.onyomi || '').trim(),
    kunyomi: (updates.kunyomi || existing.kunyomi || '').trim(),
    onExamples: Array.isArray(updates.onExamples) && updates.onExamples.length > 0 ? updates.onExamples.slice(0, 3) : (existing.onExamples || []),
    kunExamples: Array.isArray(updates.kunExamples) && updates.kunExamples.length > 0 ? updates.kunExamples.slice(0, 3) : (existing.kunExamples || []),
    examples: Array.isArray(updates.examples) && updates.examples.length > 0 ? updates.examples.slice(0, 3) : (existing.examples || []),
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  return list
}
