const STORAGE_KEY = 'my-japanese-journey-discovered'

export function getDiscovered() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveDiscovered(item) {
  const list = getDiscovered()
  const type = item.type || 'vocab'
  const exists = list.some((i) => {
    if (i.item_type !== type) return false
    if (type === 'grammar') return i.item_data?.name === item.name
    return i.item_data?.word === item.word
  })
  if (exists) return list
  const newItem = {
    id: crypto.randomUUID(),
    item_type: item.type || 'vocab',
    item_data: item,
    level: item.level || 'N5',
    saved_at: new Date().toISOString(),
  }
  list.unshift(newItem)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  return list
}

export function removeDiscovered(id) {
  const list = getDiscovered().filter((i) => i.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  return list
}

export function isSaved(item) {
  if (!item) return false
  const type = item.type || 'vocab'
  return getDiscovered().some((i) => {
    if (i.item_type !== type) return false
    if (type === 'grammar') return i.item_data?.name === item.name
    return i.item_data?.word === item.word
  })
}
