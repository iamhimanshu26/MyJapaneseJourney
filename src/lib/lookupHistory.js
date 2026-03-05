/**
 * Search history for Heard New Vocab - stores previous results
 */
const STORAGE_KEY = 'my-japanese-journey-lookup-history'
const MAX_ITEMS = 50

export function getLookupHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function addToHistory(query, result) {
  if (!query?.trim() || !result) return
  const q = query.trim().toLowerCase()
  const list = getLookupHistory().filter((i) => i.query.toLowerCase() !== q)
  list.unshift({ query: query.trim(), result, at: Date.now() })
  const trimmed = list.slice(0, MAX_ITEMS)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
}

export function getHistoryQueries() {
  return getLookupHistory().map((i) => i.query)
}
