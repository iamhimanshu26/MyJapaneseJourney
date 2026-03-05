/**
 * User-added vocabulary (from Learn from your text) - persists to localStorage
 */
const STORAGE_KEY = 'my-japanese-journey-user-vocab'

const LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1']

function getAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function getUserVocabByLevel() {
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
  return list.some(
    (i) => i.word === item.word && (i.reading || '') === (item.reading || '')
  )
}

export function addVocab(item) {
  const list = getAll()
  const entry = {
    word: String(item.word || '').trim(),
    reading: String(item.reading || '').trim(),
    meaning: String(item.meaning || '').trim(),
    level: LEVELS.includes(item.level) ? item.level : 'N5',
  }
  if (!entry.word) return list
  if (isDuplicate(list, entry)) return list
  list.push(entry)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  return list
}

export function addVocabBatch(items) {
  let added = 0
  for (const item of items) {
    if (!item?.word) continue
    const before = getAll().length
    addVocab(item)
    if (getAll().length > before) added++
  }
  return added
}
