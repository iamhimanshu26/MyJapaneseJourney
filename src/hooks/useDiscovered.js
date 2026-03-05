import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  fetchDiscovered,
  saveDiscovered,
  removeDiscovered as removeDiscoveredApi,
  getDiscovered,
  saveDiscoveredLocal,
  isSavedLocal,
} from '../lib/discovered'
import { supabase } from '../lib/supabase'

export function useDiscovered() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    if (user && supabase) {
      const data = await fetchDiscovered(user)
      setItems(data)
    } else {
      setItems(getDiscovered())
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    refresh()
  }, [refresh])

  const save = useCallback(async (item) => {
    await saveDiscovered(item, user)
    if (user && supabase) {
      await refresh()
    } else {
      saveDiscoveredLocal(item)
      setItems(getDiscovered())
    }
  }, [user, refresh])

  const remove = useCallback(async (id) => {
    await removeDiscoveredApi(id, user)
    if (user && supabase) {
      setItems((prev) => prev.filter((i) => i.id !== id))
    } else {
      setItems(getDiscovered())
    }
  }, [user])

  const checkSaved = useCallback((item) => {
    if (user && supabase) {
      return items.some((i) => {
        const d = i.item_data || {}
        const t = item.type || 'vocab'
        if (i.item_type !== t) return false
        if (t === 'grammar') return d.name === item.name
        return d.word === item.word
      })
    }
    return isSavedLocal(item)
  }, [user, items])

  return { items, loading, save, remove, refresh, checkSaved }
}
