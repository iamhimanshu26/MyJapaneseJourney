import { useEffect, useMemo, useState, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { apiRequest } from '../lib/apiClient'
import { getUserIdentity } from '../lib/userIdentity'

const LEGACY_DISCOVERED_KEY = 'my-japanese-journey-discovered'
const LEGACY_VOCAB_KEY = 'my-japanese-journey-user-vocab'
const LEGACY_GRAMMAR_KEY = 'my-japanese-journey-user-grammar'
const LEGACY_KANJI_KEY = 'my-japanese-journey-user-kanji'

function normalizeType(type) {
  const value = String(type || '').toLowerCase()
  if (value === 'vocab' || value === 'vocabulary') return 'vocabulary'
  if (value === 'kanji') return 'kanji'
  if (value === 'grammar') return 'grammar'
  if (value === 'phrase') return 'phrase'
  return 'vocabulary'
}

function toPayload(item = {}) {
  const source = item.item_data && typeof item.item_data === 'object' ? item.item_data : item
  const type = normalizeType(source.type || item.item_type || item.type)
  return {
    type,
    word: source.word || source.name || source.char || source.phrase || '',
    reading: source.reading || '',
    romaji: source.romaji || '',
    meaning_en: source.meaning_en || source.meaning || '',
    meaning_hi: source.meaning_hi || '',
    jlpt_level: source.jlpt_level || source.level || item.level || 'N5',
    part_of_speech: source.part_of_speech || source.partOfSpeech || '',
    example_jp: source.example_jp || source.examples?.[0]?.jp || '',
    example_romaji: source.example_romaji || source.examples?.[0]?.romaji || '',
    example_en: source.example_en || source.examples?.[0]?.en || '',
    business_usage: source.business_usage || '',
    similar_words: source.similar_words || source.similarWords || [],
    common_mistake: source.common_mistake || source.commonMistake || '',
    tags: source.tags || [],
    status: source.status || item.status || 'new',
    is_favorite: Boolean(source.is_favorite || source.isFavorite || item.is_favorite),
  }
}

function safeParseStorage(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function collectLegacyItems() {
  const discovered = safeParseStorage(LEGACY_DISCOVERED_KEY).map((item) => toPayload(item))
  const vocab = safeParseStorage(LEGACY_VOCAB_KEY).map((item) => toPayload({ ...item, type: 'vocabulary' }))
  const grammar = safeParseStorage(LEGACY_GRAMMAR_KEY).map((item) => toPayload({ ...item, type: 'grammar' }))
  const kanji = safeParseStorage(LEGACY_KANJI_KEY).map((item) => toPayload({ ...item, type: 'kanji' }))
  return [...discovered, ...vocab, ...grammar, ...kanji].filter((item) => item.word)
}

function fallbackLoad() {
  return safeParseStorage(LEGACY_DISCOVERED_KEY).map((item) => {
    const payload = toPayload(item)
    return {
      id: item.id || crypto.randomUUID(),
      ...payload,
      created_at: item.saved_at || new Date().toISOString(),
      updated_at: item.saved_at || new Date().toISOString(),
      review_count: 0,
      last_reviewed_at: null,
    }
  })
}

function fallbackSave(item) {
  const current = safeParseStorage(LEGACY_DISCOVERED_KEY)
  const payload = toPayload(item)
  const record = {
    id: crypto.randomUUID(),
    item_type: payload.type,
    item_data: {
      word: payload.word,
      reading: payload.reading,
      meaning: payload.meaning_en,
      level: payload.jlpt_level,
    },
    level: payload.jlpt_level || 'N5',
    saved_at: new Date().toISOString(),
  }
  current.unshift(record)
  localStorage.setItem(LEGACY_DISCOVERED_KEY, JSON.stringify(current))
  return record
}

function fallbackRemove(id) {
  const next = safeParseStorage(LEGACY_DISCOVERED_KEY).filter((item) => item.id !== id)
  localStorage.setItem(LEGACY_DISCOVERED_KEY, JSON.stringify(next))
}

export function useDiscovered() {
  const { user } = useAuth()
  const identity = useMemo(() => getUserIdentity(user), [user])
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiRequest('/api/discovered-items?sort=recent', {
        method: 'GET',
        identity,
      })
      setItems(data.items || [])
    } catch (err) {
      setError(err.message || 'Failed to load discovered items')
      setItems(fallbackLoad())
    } finally {
      setLoading(false)
    }
  }, [identity])

  useEffect(() => {
    refresh()
  }, [refresh])

  const save = useCallback(async (item) => {
    const payload = toPayload(item)
    try {
      const data = await apiRequest('/api/discovered-items', {
        method: 'POST',
        identity,
        body: payload,
      })
      const created = data.items?.[0]
      if (created && !created.duplicate) {
        setItems((prev) => [created, ...prev])
      }
      return created
    } catch (error) {
      const local = fallbackSave(payload)
      setItems((prev) => [{
        id: local.id,
        ...payload,
        created_at: local.saved_at,
        updated_at: local.saved_at,
        review_count: 0,
        last_reviewed_at: null,
      }, ...prev])
      throw error
    }
  }, [identity])

  const remove = useCallback(async (id) => {
    try {
      await apiRequest(`/api/discovered-items?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        identity,
      })
    } catch {
      fallbackRemove(id)
    }
    setItems((prev) => prev.filter((item) => item.id !== id))
  }, [identity])

  const update = useCallback(async (id, patch) => {
    try {
      const data = await apiRequest(`/api/discovered-items?id=${encodeURIComponent(id)}`, {
        method: 'PATCH',
        identity,
        body: patch,
      })
      setItems((prev) => prev.map((item) => (item.id === id ? data.item : item)))
      return data.item
    } catch (error) {
      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)))
      throw error
    }
  }, [identity])

  const checkSaved = useCallback((item) => {
    const payload = toPayload(item)
    if (!payload.word) return false
    return items.some((saved) => {
      const sameType = normalizeType(saved.type) === normalizeType(payload.type)
      const sameWord = String(saved.word || '').trim() === String(payload.word || '').trim()
      const sameReading = String(saved.reading || '').trim() === String(payload.reading || '').trim()
      return sameType && sameWord && sameReading
    })
  }, [items])

  const importLocalToNeon = useCallback(async () => {
    const legacyItems = collectLegacyItems()
    if (legacyItems.length === 0) return { imported: 0 }
    const data = await apiRequest('/api/discovered-items', {
      method: 'POST',
      identity,
      body: { items: legacyItems },
    })
    await refresh()
    return { imported: data.items?.length || 0 }
  }, [identity, refresh])

  const profileMetrics = useMemo(() => {
    const total = items.length
    const mastered = items.filter((item) => item.status === 'mastered').length
    const weak = items.filter((item) => item.status === 'weak').length
    const aiLookups = items.filter((item) => item.created_at && new Date(item.created_at).getTime() > Date.now() - 7 * 86_400_000).length
    return { total, mastered, weak, aiLookups }
  }, [items])

  return {
    items,
    loading,
    error,
    save,
    remove,
    update,
    refresh,
    checkSaved,
    importLocalToNeon,
    profileMetrics,
    identity,
  }
}
