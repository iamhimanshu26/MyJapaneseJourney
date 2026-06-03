import { useMemo, useState } from 'react'
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

const LEVELS = ['ALL', 'N5', 'N4', 'N3', 'N2', 'N1']
const CATEGORIES = ['all', 'vocabulary', 'grammar', 'kanji', 'phrase']
const STATUSES = ['all', 'new', 'learning', 'weak', 'mastered', 'favorite']
const SORT_OPTIONS = ['recent', 'alphabetical', 'jlpt']

export function MyDiscovered() {
  const { items, loading, remove, update } = useDiscovered()
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [level, setLevel] = useState('ALL')
  const [category, setCategory] = useState('all')
  const [status, setStatus] = useState('all')
  const [sort, setSort] = useState('recent')
  const [view, setView] = useState('card')

  const filtered = useMemo(() => {
    let list = [...items]
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter((item) =>
        String(item.word || '').toLowerCase().includes(q) ||
        String(item.meaning_en || '').toLowerCase().includes(q) ||
        String(item.reading || '').toLowerCase().includes(q)
      )
    }
    if (level !== 'ALL') list = list.filter((item) => item.jlpt_level === level)
    if (category !== 'all') list = list.filter((item) => item.type === category)
    if (status !== 'all') list = list.filter((item) => item.status === status)
    if (sort === 'alphabetical') {
      list.sort((a, b) => String(a.word || '').localeCompare(String(b.word || '')))
    } else if (sort === 'jlpt') {
      list.sort((a, b) => String(a.jlpt_level || '').localeCompare(String(b.jlpt_level || '')))
    } else {
      list.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
    }
    return list
  }, [items, search, level, category, status, sort])

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

        <section className="mb-5 grid gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 lg:grid-cols-6">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search word, reading, meaning..."
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 lg:col-span-2"
          />
          <select value={level} onChange={(e) => setLevel(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100">
            {LEVELS.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100">
            {CATEGORIES.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100">
            {STATUSES.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100">
            {SORT_OPTIONS.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </section>

        <div className="mb-4 flex gap-2">
          <button
            type="button"
            onClick={() => setView('card')}
            className={`rounded-lg px-3 py-1.5 text-sm ${view === 'card' ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-200'}`}
          >
            Card View
          </button>
          <button
            type="button"
            onClick={() => setView('table')}
            className={`rounded-lg px-3 py-1.5 text-sm ${view === 'table' ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-200'}`}
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
            onAction={() => { window.location.href = '/lookup' }}
          />
        ) : null}

        {!loading && filtered.length && view === 'card' ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((item) => (
              <article key={item.id} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <JLPTBadge level={item.jlpt_level || 'N5'} />
                    <MasteryBadge status={item.status} />
                  </div>
                  <button type="button" onClick={() => toggleFavorite(item)} className="text-sm text-amber-300">
                    {item.is_favorite ? '★' : '☆'}
                  </button>
                </div>
                <p className="text-xl font-bold text-slate-100" style={{ fontFamily: 'var(--font-jp)' }}>{item.word}</p>
                <p className="text-xs text-slate-400">{item.reading || '-'}</p>
                <p className="mt-2 text-sm text-slate-200">{item.meaning_en || '-'}</p>
                <div className="mt-3 flex flex-wrap gap-1">
                  {(item.tags || []).map((tag) => (
                    <span key={tag} className="rounded bg-slate-800 px-2 py-0.5 text-[11px] text-slate-300">{tag}</span>
                  ))}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-400">
                  <p>Review count: {item.review_count || 0}</p>
                  <p>Last reviewed: {item.last_reviewed_at ? new Date(item.last_reviewed_at).toLocaleDateString() : '-'}</p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {['new', 'learning', 'weak', 'mastered'].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => handleStatus(item.id, value)}
                      className="rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-[11px] text-slate-200 hover:border-blue-400"
                    >
                      {value}
                    </button>
                  ))}
                  <button type="button" onClick={() => handleRemove(item.id)} className="rounded-md border border-rose-500/50 bg-rose-500/10 px-2 py-1 text-[11px] text-rose-300">
                    Remove
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : null}

        {!loading && filtered.length && view === 'table' ? (
          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/80">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-800 text-xs uppercase tracking-[0.08em] text-slate-400">
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
                  <tr key={item.id} className="border-b border-slate-800/60 text-slate-200">
                    <td className="px-3 py-3" style={{ fontFamily: 'var(--font-jp)' }}>{item.word}</td>
                    <td className="px-3 py-3">{item.reading || '-'}</td>
                    <td className="px-3 py-3">{item.meaning_en || '-'}</td>
                    <td className="px-3 py-3">{item.jlpt_level || '-'}</td>
                    <td className="px-3 py-3"><MasteryBadge status={item.status} /></td>
                    <td className="px-3 py-3">{item.review_count || 0}</td>
                    <td className="px-3 py-3">
                      <div className="flex gap-2">
                        <button type="button" onClick={() => handleStatus(item.id, 'learning')} className="text-xs text-blue-300 hover:underline">Review</button>
                        <button type="button" onClick={() => handleRemove(item.id)} className="text-xs text-rose-300 hover:underline">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </motion.div>
    </div>
  )
}
