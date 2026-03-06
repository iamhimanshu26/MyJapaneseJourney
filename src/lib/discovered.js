/**
 * Discovered items storage: Supabase (when auth configured) or localStorage fallback.
 */
import { supabase } from './supabase'

const STORAGE_KEY = 'my-japanese-journey-discovered'

// --- localStorage backend ---
function getFromLocalStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveToLocalStorage(item) {
  const list = getFromLocalStorage()
  const type = item.type || 'vocab'
  const exists = list.some((i) => {
    if (i.item_type !== type) return false
    if (type === 'grammar') return i.item_data?.name === item.name
    if (type === 'kanji') return i.item_data?.char === item.char
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

function removeFromLocalStorage(id) {
  const list = getFromLocalStorage().filter((i) => i.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  return list
}

function isSavedInLocalStorage(item) {
  if (!item) return false
  const type = item.type || 'vocab'
  return getFromLocalStorage().some((i) => {
    if (i.item_type !== type) return false
    if (type === 'grammar') return i.item_data?.name === item.name
    if (type === 'kanji') return i.item_data?.char === item.char
    return i.item_data?.word === item.word
  })
}

// --- Public API: use Supabase when available + user logged in ---
export function getDiscoveredSync(user) {
  if (user && supabase) return [] // Use async for Supabase; sync returns placeholder
  return getFromLocalStorage()
}

export function getDiscovered() {
  return getFromLocalStorage() // Always return localStorage for sync access; Supabase needs async
}

export async function fetchDiscovered(user) {
  if (!user || !supabase) return getFromLocalStorage()
  const { data, error } = await supabase
    .from('user_discovered')
    .select('*')
    .eq('user_id', user.id)
    .order('saved_at', { ascending: false })
  if (error) return []
  return data || []
}

export async function saveDiscovered(item, user) {
  if (user && supabase) {
    const { error } = await supabase.from('user_discovered').insert({
      user_id: user.id,
      item_type: item.type || 'vocab',
      item_data: item,
      level: item.level || 'N5',
    })
    if (!error) return true
  }
  saveToLocalStorage(item)
  return true
}

export async function removeDiscovered(id, user) {
  if (user && supabase) {
    const { error } = await supabase.from('user_discovered').delete().eq('id', id)
    if (!error) return
  }
  removeFromLocalStorage(id)
}

export function isSaved(item, user) {
  if (user && supabase) {
    // For Supabase we need to check async; caller can use isSavedLocal for instant check
    return false // Caller should refetch or pass from list
  }
  return isSavedInLocalStorage(item)
}

export function isSavedLocal(item) {
  return isSavedInLocalStorage(item)
}

export function saveDiscoveredLocal(item) {
  return saveToLocalStorage(item)
}
