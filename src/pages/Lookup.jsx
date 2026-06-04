import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useSearchParams } from 'react-router-dom'
import { PageMeta } from '../components/PageMeta'
import { SectionHeader } from '../components/shared/SectionHeader'
import { AIResultCard } from '../components/ai/AIResultCard'
import { useDiscovered } from '../hooks/useDiscovered'
import { useToast } from '../context/ToastContext'
import { apiRequest } from '../lib/apiClient'
import { ActionButton } from '../components/ui/ActionButton'
import { SearchInput } from '../components/ui/SearchInput'

export function Lookup() {
  const [searchParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [result, setResult] = useState(null)
  const [lookupHistory, setLookupHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [lastSavedId, setLastSavedId] = useState('')
  const { save, checkSaved, update, identity, items } = useDiscovered()
  const toast = useToast()
  const saved = useMemo(() => (result ? checkSaved(result) : false), [result, checkSaved])

  useEffect(() => {
    const initial = searchParams.get('q')
    if (initial && !query) setQuery(initial)
  }, [searchParams, query])

  useEffect(() => {
    const initial = searchParams.get('q')
    if (!initial || result || loading) return
    if (String(query || '').trim() === String(initial).trim()) {
      handleSearch()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, searchParams])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const data = await apiRequest('/api/ai-lookup', {
          method: 'GET',
          identity,
        })
        if (!mounted) return
        const mapped = (data.items || []).map((item) => ({
          query: item.query,
          result: item.response,
          at: item.created_at ? new Date(item.created_at).getTime() : Date.now(),
        }))
        setLookupHistory(mapped)
      } catch (_) {}
    })()
    return () => {
      mounted = false
    }
  }, [identity])

  async function handleSearch(e) {
    e?.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    setError('')
    setLastSavedId('')
    try {
      const data = await apiRequest('/api/ai-lookup', {
        method: 'POST',
        identity,
        body: { query },
      })
      setResult(data)
      setLookupHistory((prev) => [{ query, result: data, at: Date.now() }, ...prev.filter((item) => item.query !== query)].slice(0, 12))
    } catch (err) {
      setError(err.message || 'Lookup failed')
      toast.error('Connection failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!result) return
    try {
      const savedItem = await save({
        ...result,
        type: result.type,
      })
      if (savedItem?.id) {
        setLastSavedId(savedItem.id)
      }
      toast.success('Saved to My Discovered')
    } catch (err) {
      toast.error(err.message || 'Failed to save item')
    }
  }

  async function handleStatusChange(status) {
    if (!result) return
    try {
      let targetId = lastSavedId
      if (!targetId) {
        const matched = items.find((item) =>
          item.word === result.word &&
          String(item.type || '').toLowerCase() === String(result.type || '').toLowerCase()
        )
        targetId = matched?.id || ''
      }
      if (!targetId && !saved) {
        const savedItem = await save(result)
        targetId = savedItem?.id
        setLastSavedId(targetId || '')
      }
      if (targetId) {
        await update(targetId, {
          status,
          is_favorite: status === 'favorite',
        })
        toast.success(`Marked as ${status}`)
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update status')
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageMeta title="AI Word Intelligence" description="Enterprise AI lookup for Japanese words, grammar, and interview-friendly usage." />
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <SectionHeader
          title="Heard New Vocab / AI Word Intelligence"
          subtitle="Search any Japanese word or phrase to get full learning intelligence: reading, romaji, bilingual meaning, usage guidance, and save controls."
        />

        <form onSubmit={handleSearch} className="card-shell mb-6">
          <div className="flex flex-col gap-2 md:flex-row">
            <SearchInput
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="例: 進捗, お疲れ様です, tabun, 〜てしまう"
              className="h-10"
              disabled={loading}
            />
            <ActionButton
              type="submit"
              variant="primary"
              disabled={loading || !query.trim()}
            >
              {loading ? 'Generating...' : 'Analyze with AI'}
            </ActionButton>
          </div>
          {error ? <p className="mt-2 text-sm text-rose-600">{error}</p> : null}
        </form>

        {result ? (
          <AIResultCard
            result={result}
            saved={saved}
            onSave={handleSave}
            onStatusChange={handleStatusChange}
          />
        ) : null}

        {lookupHistory.length ? (
          <section className="card-shell mt-6">
            <h3 className="text-base font-medium text-slate-900">Recent AI lookups</h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {lookupHistory.map((item) => (
                <button
                  key={`${item.query}-${item.at}`}
                  type="button"
                  onClick={() => { setQuery(item.query); setResult(item.result) }}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-700 hover:border-blue-400"
                >
                  <p style={{ fontFamily: 'var(--font-jp)' }}>{item.result.word || item.query}</p>
                  <p className="mt-1 text-xs text-slate-500">{item.result.meaning_en}</p>
                </button>
              ))}
            </div>
          </section>
        ) : null}
      </motion.div>
    </div>
  )
}