/**
 * User-added grammar (from Learn from your text) - persists to localStorage
 */
const STORAGE_KEY = 'my-japanese-journey-user-grammar'

const LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1']

function getAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function getUserGrammarByLevel() {
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
  return list.some((i) => i.name === item.name && (i.structure || '') === (item.structure || ''))
}

export function addGrammar(item) {
  const list = getAll()
  const entry = {
    id: `user-${crypto.randomUUID().slice(0, 8)}`,
    name: String(item.name || '').trim(),
    structure: String(item.structure || '').trim(),
    meaning: String(item.meaning || '').trim(),
    level: LEVELS.includes(item.level) ? item.level : 'N5',
    example: String(item.example || '').trim(),
  }
  if (!entry.name) return list
  if (isDuplicate(list, entry)) return list
  list.push(entry)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  return list
}

export function addGrammarBatch(items) {
  let added = 0
  for (const item of items) {
    if (!item?.name) continue
    const before = getAll().length
    addGrammar(item)
    if (getAll().length > before) added++
  }
  return added
}
