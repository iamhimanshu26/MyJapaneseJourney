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
