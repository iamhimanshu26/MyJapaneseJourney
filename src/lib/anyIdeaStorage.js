const STORAGE_KEY = 'my-japanese-journey-any-ideas'

export function getIdeas() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function addIdea(idea) {
  const list = getIdeas()
  const entry = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2),
    raw: String(idea.raw || '').trim(),
    refined: String(idea.refined || '').trim(),
    summary: String(idea.summary || '').trim(),
    at: Date.now(),
  }
  if (!entry.raw && !entry.refined) return list
  list.unshift(entry)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 100)))
  return list
}

export function deleteIdea(id) {
  const list = getIdeas().filter((i) => i.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  return list
}
