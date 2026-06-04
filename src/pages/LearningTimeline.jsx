import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { PageMeta } from '../components/PageMeta'
import { SectionHeader } from '../components/shared/SectionHeader'
import { LoadingState } from '../components/shared/LoadingState'
import { EmptyState } from '../components/shared/EmptyState'
import { useDiscovered } from '../hooks/useDiscovered'
import { apiRequest } from '../lib/apiClient'

export function LearningTimeline() {
  const { identity } = useDiscovered()
  const [items, setItems] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      setError('')
      try {
        const data = await apiRequest('/api/intelligence?view=timeline&limit=60', { method: 'GET', identity })
        if (mounted) setItems(data.items || [])
      } catch (err) {
        if (mounted) setError(err.message || 'Failed to load timeline')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [identity])

  const filtered = useMemo(() => {
    if (filter === 'all') return items
    return items.filter((item) => item.activity_type === filter)
  }, [filter, items])

  const activityTypes = useMemo(
    () => ['all', ...new Set(items.map((item) => item.activity_type).filter(Boolean))],
    [items]
  )

  return (
    <div className="mx-auto max-w-6xl">
      <PageMeta title="Learning Timeline" description="Chronological timeline of all learning events and milestones." />
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <SectionHeader
          title="Learning Timeline"
          subtitle="Track vocabulary, reviews, Dokkai, interview practice, AI lookups, and study plans in one chronological feed."
        />

        <div className="mb-4 flex items-center gap-2">
          <label htmlFor="timeline-filter" className="text-xs text-slate-500">Filter</label>
          <select
            id="timeline-filter"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800"
          >
            {activityTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        {loading ? <LoadingState title="Loading timeline..." subtitle="Collecting your recent learning events." /> : null}
        {!loading && error ? <EmptyState title="Timeline unavailable" message={error} /> : null}
        {!loading && !error && !filtered.length ? (
          <EmptyState title="No timeline events yet" message="Start with AI Lookup, Review Mode, or Dokkai to populate your timeline." />
        ) : null}

        {!loading && !error && filtered.length ? (
          <section className="space-y-3">
            {filtered.map((item) => (
              <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-slate-900">{item.title || item.activity_type}</p>
                  <span className="rounded-full border border-slate-300 bg-slate-100 px-2 py-1 text-xs text-slate-600">
                    {item.activity_type}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-700">{item.description || 'Learning event recorded.'}</p>
                <p className="mt-2 text-xs text-slate-500">
                  {item.occurred_at ? new Date(item.occurred_at).toLocaleString() : ''}
                </p>
              </article>
            ))}
          </section>
        ) : null}
      </motion.div>
    </div>
  )
}
