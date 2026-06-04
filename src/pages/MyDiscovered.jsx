import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useDiscovered } from '../hooks/useDiscovered'
import { PageMeta } from '../components/PageMeta'
import { useToast } from '../context/ToastContext'
import { SectionHeader } from '../components/shared/SectionHeader'
import { LoadingState } from '../components/shared/LoadingState'
import { EmptyState } from '../components/shared/EmptyState'
import { MasteryBadge } from '../components/learning/MasteryBadge'
import { JLPTBadge } from '../components/learning/JLPTBadge'
import { ActionButton } from '../components/ui/ActionButton'
import { SearchInput } from '../components/ui/SearchInput'

const LEVELS = ['ALL', 'N5', 'N4', 'N3', 'N2', 'N1']
const CATEGORIES = ['all', 'vocabulary', 'grammar', 'kanji', 'phrase']
const STATUSES = ['all', 'new', 'learning', 'weak', 'mastered', 'favorite']
const SORT_OPTIONS = ['recent', 'alphabetical', 'jlpt']

export function MyDiscovered() {
  const { items, loading, remove, update, refresh, identity } = useDiscovered()
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [level, setLevel] = useState('ALL')
  const [category, setCategory] = useState('all')
  const [status, setStatus] = useState('all')
  const [sort, setSort] = useState('recent')
  const [view, setView] = useState('card')
  const [selectedIds, setSelectedIds] = useState([])
  const [bulkStatus, setBulkStatus] = useState('learning')
  const [clusters, setClusters] = useState([])
  const [showClusters, setShowClusters] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      refresh({
        search: search.trim(),
        jlpt: level !== 'ALL' ? level : '',
        type: category !== 'all' ? category : '',
        status: status !== 'all' ? status : '',
        sort,
      })
    }, 220)
    return () => clearTimeout(timer)
  }, [search, level, category, status, sort, refresh])

  const filtered = useMemo(() => [...items], [items])
  const groupedByLevel = useMemo(() => {
    const map = new Map()
    for (const item of filtered) {
      const lvl = item.jlpt_level || 'Unknown'
      if (!map.has(lvl)) map.set(lvl, [])
      map.get(lvl).push(item)
    }
    return [...map.entries()].sort((a, b) => String(a[0]).localeCompare(String(b[0])))
  }, [filtered])

  async function handleRemove(id) {
    try {
      await remove(id)
      toast.success('Removed from knowledge base')
    } catch (err) {
      toast.error(err.message || 'Could not remove item')
    }
  }

  async function handleStatus(id, value) {
    try {
      await update(id, {
        status: value,
        is_favorite: value === 'favorite',
      })
      toast.success(`Updated status to ${value}`)
    } catch (err) {
      toast.error(err.message || 'Could not update status')
    }
  }

  async function toggleFavorite(item) {
    try {
      await update(item.id, {
        is_favorite: !item.is_favorite,
        status: !item.is_favorite ? 'favorite' : item.status === 'favorite' ? 'learning' : item.status,
      })
      toast.success(item.is_favorite ? 'Removed from favorites' : 'Added to favorites')
    } catch (err) {
      toast.error(err.message || 'Could not update favorite')
    }
  }

  function toggleSelect(id) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  async function runBulkAction(action, payload = {}) {
    if (!selectedIds.length) {
      toast.info('Select at least one item first')
      return
    }
    setBusy(true)
    try {
      const response = await fetch('/api/discovered-items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-User-Id': identity.authUserId,
          ...(identity.sessionToken ? { 'X-Session-Token': identity.sessionToken } : {}),
        },
        body: JSON.stringify({ action, ids: selectedIds, ...payload }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || 'Bulk action failed')
      setSelectedIds([])
      await refresh({
        search: search.trim(),
        jlpt: level !== 'ALL' ? level : '',
        type: category !== 'all' ? category : '',
        status: status !== 'all' ? status : '',
        sort,
      })
      toast.success(`Bulk action completed on ${data.updated || data.reviewed || data.items?.length || 0} items`)
    } catch (err) {
      toast.error(err.message || 'Bulk action failed')
    } finally {
      setBusy(false)
    }
  }

  async function exportData(format) {
    try {
      const response = await fetch(`/api/discovered-items?mode=export&format=${encodeURIComponent(format)}&sort=${encodeURIComponent(sort)}&limit=1000`, {
        headers: {
          'X-Auth-User-Id': identity.authUserId,
          ...(identity.sessionToken ? { 'X-Session-Token': identity.sessionToken } : {}),
        },
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData?.error || 'Export failed')
      }
      if (format === 'csv') {
        const csv = await response.text()
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.download = 'my-discovered-export.csv'
        anchor.click()
        URL.revokeObjectURL(url)
      } else {
        const json = await response.json()
        const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.download = 'my-discovered-export.json'
        anchor.click()
        URL.revokeObjectURL(url)
      }
      toast.success(`Exported ${format.toUpperCase()} successfully`)
    } catch (err) {
      toast.error(err.message || 'Export failed')
    }
  }

  async function loadClusters() {
    try {
      const response = await fetch('/api/discovered-items?mode=clusters&limit=1000', {
        headers: {
          'X-Auth-User-Id': identity.authUserId,
          ...(identity.sessionToken ? { 'X-Session-Token': identity.sessionToken } : {}),
        },
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || 'Failed to load clusters')
      setClusters(data.clusters || [])
      setShowClusters(true)
    } catch (err) {
      toast.error(err.message || 'Failed to load clusters')
    }
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageMeta title="My Discovered Knowledge Base" description="Personal Japanese knowledge base with filters, statuses, and review controls." />
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <SectionHeader
          title="My Discovered Knowledge Base"
          subtitle="Search, filter, tag, and review your saved vocabulary, grammar, kanji, and phrases."
          actions={[
            <Link key="review" to="/review-mode" className="rounded-lg bg-gradient-to-r from-blue-500 to-violet-500 px-4 py-2 text-sm font-semibold text-white">
              Review Now
            </Link>,
          ]}
        />

        <section className="card-shell mb-4 grid gap-2 lg:grid-cols-6">
          <SearchInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search word, reading, meaning..."
            className="lg:col-span-2"
          />
          <select value={level} onChange={(e) => setLevel(e.target.value)} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800">
            {LEVELS.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800">
            {CATEGORIES.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800">
            {STATUSES.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800">
            {SORT_OPTIONS.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </section>

        <section className="card-shell mb-4">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs text-slate-600">Selected: <strong className="text-slate-900">{selectedIds.length}</strong></p>
            <select value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-800">
              {STATUSES.filter((s) => s !== 'all').map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <ActionButton type="button" onClick={() => runBulkAction('bulk-status', { status: bulkStatus })} disabled={busy} className="h-10 text-xs">
              Batch Status Update
            </ActionButton>
            <ActionButton type="button" onClick={() => runBulkAction('bulk-review')} disabled={busy} className="h-10 text-xs">
              Batch Review
            </ActionButton>
            <ActionButton type="button" onClick={() => runBulkAction('ai-tag')} disabled={busy} className="h-10 text-xs">
              AI Generate Tags
            </ActionButton>
            <ActionButton type="button" onClick={() => exportData('csv')} className="h-10 text-xs">
              Export CSV
            </ActionButton>
            <ActionButton type="button" onClick={() => exportData('json')} className="h-10 text-xs">
              Export JSON
            </ActionButton>
            <ActionButton type="button" onClick={loadClusters} className="h-10 text-xs">
              AI Clusters
            </ActionButton>
          </div>
        </section>

        {showClusters ? (
          <section className="card-shell mb-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-base font-medium text-slate-900">AI Vocabulary Clustering</h3>
              <button type="button" onClick={() => setShowClusters(false)} className="text-xs text-slate-600 hover:text-slate-800">Hide</button>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {clusters.map((cluster) => (
                <article key={cluster.cluster} className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="text-sm font-medium text-slate-900">{cluster.cluster}</p>
                  <p className="text-xs text-slate-500">{cluster.count} items</p>
                  <p className="mt-1 text-xs text-slate-600">
                    {(cluster.sample || []).slice(0, 3).map((item) => item.word).join(', ') || 'No sample'}
                  </p>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <div className="mb-4 flex gap-2">
          <button
            type="button"
            onClick={() => setView('card')}
            className={`inline-flex h-10 items-center rounded-lg px-3 text-sm ${view === 'card' ? 'bg-blue-600 text-white' : 'border border-slate-300 bg-white text-slate-700'}`}
          >
            Card View
          </button>
          <button
            type="button"
            onClick={() => setView('table')}
            className={`inline-flex h-10 items-center rounded-lg px-3 text-sm ${view === 'table' ? 'bg-blue-600 text-white' : 'border border-slate-300 bg-white text-slate-700'}`}
          >
            Table View
          </button>
        </div>

        {loading ? <LoadingState /> : null}
        {!loading && !filtered.length ? (
          <EmptyState
            title="No discovered items found"
            message="Start with AI Word Intelligence lookup and save words into your personal Japanese knowledge base."
            actionLabel="Go to AI Lookup"
            onAction={() => { window.location.assign('/lookup') }}
          />
        ) : null}

        {!loading && filtered.length && view === 'card' ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((item) => (
              <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.05)]">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggleSelect(item.id)} />
                    <JLPTBadge level={item.jlpt_level || 'N5'} />
                    <MasteryBadge status={item.status} />
                  </div>
                  <button type="button" onClick={() => toggleFavorite(item)} className="text-sm text-amber-500">
                    {item.is_favorite ? '★' : '☆'}
                  </button>
                </div>
                <p className="text-xl font-bold text-slate-900" style={{ fontFamily: 'var(--font-jp)' }}>{item.word}</p>
                <p className="text-xs text-slate-500">{item.reading || '-'}</p>
                <p className="mt-2 text-sm text-slate-700">{item.meaning_en || '-'}</p>
                <div className="mt-3 flex flex-wrap gap-1">
                  {(item.tags || []).map((tag) => (
                    <span key={tag} className="rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">{tag}</span>
                  ))}
                  {(item.ai_tags || []).map((tag) => (
                    <span key={`ai-${tag}`} className="rounded bg-blue-100 px-2 py-0.5 text-[11px] text-blue-700">#{tag}</span>
                  ))}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500">
                  <p>Review count: {item.review_count || 0}</p>
                  <p>Last reviewed: {item.last_reviewed_at ? new Date(item.last_reviewed_at).toLocaleDateString() : '-'}</p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {['new', 'learning', 'weak', 'mastered'].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => handleStatus(item.id, value)}
                      className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-700 hover:border-blue-400"
                    >
                      {value}
                    </button>
                  ))}
                  <button type="button" onClick={() => handleRemove(item.id)} className="rounded-md border border-rose-300 bg-rose-50 px-2 py-1 text-[11px] text-rose-700">
                    Remove
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : null}

        {!loading && filtered.length && view === 'table' ? (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase tracking-[0.08em] text-slate-500">
                <tr>
                  <th className="px-3 py-3">Word</th>
                  <th className="px-3 py-3">Reading</th>
                  <th className="px-3 py-3">Meaning</th>
                  <th className="px-3 py-3">JLPT</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Review</th>
                  <th className="px-3 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id} className="border-b border-slate-200 text-slate-700">
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggleSelect(item.id)} />
                        <span style={{ fontFamily: 'var(--font-jp)' }}>{item.word}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3">{item.reading || '-'}</td>
                    <td className="px-3 py-3">{item.meaning_en || '-'}</td>
                    <td className="px-3 py-3">{item.jlpt_level || '-'}</td>
                    <td className="px-3 py-3"><MasteryBadge status={item.status} /></td>
                    <td className="px-3 py-3">{item.review_count || 0}</td>
                    <td className="px-3 py-3">
                      <div className="flex gap-2">
                        <button type="button" onClick={() => handleStatus(item.id, 'learning')} className="text-xs text-blue-600 hover:underline">Review</button>
                        <button type="button" onClick={() => handleRemove(item.id)} className="text-xs text-rose-600 hover:underline">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {!loading && groupedByLevel.length ? (
          <section className="card-shell mt-4">
            <h3 className="text-base font-medium text-slate-900">JLPT Level Sections</h3>
            <div className="mt-3 space-y-2">
              {groupedByLevel.map(([lvl, list]) => (
                <p key={lvl} className="text-sm text-slate-700">
                  <span className="font-medium text-slate-900">{lvl}:</span> {list.length} items
                </p>
              ))}
            </div>
          </section>
        ) : null}
      </motion.div>
    </div>
  )
}
