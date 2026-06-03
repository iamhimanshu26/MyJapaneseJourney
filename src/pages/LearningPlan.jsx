import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { PageMeta } from '../components/PageMeta'
import { SectionHeader } from '../components/shared/SectionHeader'
import { LoadingState } from '../components/shared/LoadingState'
import { EmptyState } from '../components/shared/EmptyState'
import { useDiscovered } from '../hooks/useDiscovered'
import { apiRequest } from '../lib/apiClient'

const PRIORITY_STYLES = {
  high: 'border-rose-500/50 bg-rose-500/10 text-rose-200',
  medium: 'border-amber-500/50 bg-amber-500/10 text-amber-200',
  low: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-200',
}

export function LearningPlan() {
  const { identity } = useDiscovered()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [regenerating, setRegenerating] = useState(false)

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      setError('')
      try {
        const response = await apiRequest('/api/intelligence?view=plan', { method: 'GET', identity })
        if (mounted) setData(response)
      } catch (err) {
        if (mounted) setError(err.message || 'Failed to load learning plan')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [identity])

  async function handleRegenerate() {
    setRegenerating(true)
    try {
      const response = await apiRequest('/api/intelligence?view=plan&regenerate=1', { method: 'GET', identity })
      setData(response)
    } catch (err) {
      setError(err.message || 'Failed to regenerate learning plan')
    } finally {
      setRegenerating(false)
    }
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageMeta title="Learning Plan" description="Role-aware weekly learning plan and execution checklist." />
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <SectionHeader
          title="Smart Learning Plan"
          subtitle="Weekly plan generated from your progress, weak items, and role."
          actions={[
            <button
              key="regen"
              type="button"
              onClick={handleRegenerate}
              disabled={regenerating}
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-100 disabled:opacity-60"
            >
              {regenerating ? 'Regenerating...' : 'Regenerate Plan'}
            </button>,
          ]}
        />

        {loading ? <LoadingState /> : null}
        {!loading && error ? <EmptyState title="Learning plan unavailable" message={error} /> : null}

        {!loading && !error && data ? (
          <div className="space-y-5">
            <section className="grid gap-4 md:grid-cols-4">
              <article className="card-shell">
                <p className="text-xs uppercase tracking-wide text-slate-400">Role</p>
                <p className="mt-2 text-lg font-semibold text-slate-100">{data.role}</p>
              </article>
              <article className="card-shell">
                <p className="text-xs uppercase tracking-wide text-slate-400">Weak backlog</p>
                <p className="mt-2 text-lg font-semibold text-slate-100">{data.snapshot.weakItems}</p>
              </article>
              <article className="card-shell">
                <p className="text-xs uppercase tracking-wide text-slate-400">Learning now</p>
                <p className="mt-2 text-lg font-semibold text-slate-100">{data.snapshot.learningItems}</p>
              </article>
              <article className="card-shell">
                <p className="text-xs uppercase tracking-wide text-slate-400">Mastered</p>
                <p className="mt-2 text-lg font-semibold text-slate-100">{data.snapshot.masteredItems}</p>
              </article>
            </section>

            <section className="card-shell">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Today's Plan</h2>
                <span className="rounded-full border border-slate-700 bg-slate-800 px-2 py-1 text-[11px] text-slate-300">
                  {(data.persistedPlan?.status || 'pending').toUpperCase()}
                </span>
              </div>
              <div className="space-y-2 text-sm text-slate-300">
                <p><strong className="text-slate-100">Review:</strong> {(data.persistedPlan?.review || []).join(', ') || 'No review task'}</p>
                <p><strong className="text-slate-100">Learn:</strong> {(data.persistedPlan?.learn || []).join(', ') || 'No learning task'}</p>
                <p><strong className="text-slate-100">Practice:</strong> {(data.persistedPlan?.practice || []).join(', ') || 'No practice task'}</p>
                <p><strong className="text-slate-100">Estimated time:</strong> {data.persistedPlan?.estimatedMinutes || 25} minutes</p>
              </div>
            </section>

            <section className="card-shell">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Weekly Targets</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {data.weeklyTargets.map((target) => {
                  const pct = Math.min(100, Math.round((target.current / Math.max(target.target, 1)) * 100))
                  return (
                    <article key={target.label} className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
                      <p className="text-sm font-medium text-slate-100">{target.label}</p>
                      <p className="mt-1 text-xs text-slate-400">{target.current} / {target.target}</p>
                      <div className="mt-3 h-2 rounded-full bg-slate-700">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </article>
                  )
                })}
              </div>
            </section>

            <section className="card-shell">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Next Actions</h2>
              <div className="mt-4 space-y-3">
                {data.nextActions.map((action) => (
                  <article key={action.title} className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-slate-100">{action.title}</h3>
                      <span className={`rounded-full border px-2 py-1 text-xs font-medium ${PRIORITY_STYLES[action.priority] || PRIORITY_STYLES.medium}`}>
                        {action.priority} priority
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-300">{action.description}</p>
                  </article>
                ))}
              </div>
            </section>
          </div>
        ) : null}
      </motion.div>
    </div>
  )
}
