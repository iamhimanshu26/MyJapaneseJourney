import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { PageMeta } from '../components/PageMeta'
import { SectionHeader } from '../components/shared/SectionHeader'
import { LoadingState } from '../components/shared/LoadingState'
import { EmptyState } from '../components/shared/EmptyState'
import { useDiscovered } from '../hooks/useDiscovered'
import { apiRequest } from '../lib/apiClient'
import { ActionButton } from '../components/ui/ActionButton'

const PRIORITY_STYLES = {
  high: 'border-rose-300 bg-rose-50 text-rose-700',
  medium: 'border-amber-300 bg-amber-50 text-amber-700',
  low: 'border-emerald-300 bg-emerald-50 text-emerald-700',
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
            <ActionButton key="regen" type="button" onClick={handleRegenerate} disabled={regenerating}>
              {regenerating ? 'Regenerating...' : 'Regenerate Plan'}
            </ActionButton>,
          ]}
        />

        {loading ? <LoadingState /> : null}
        {!loading && error ? <EmptyState title="Learning plan unavailable" message={error} /> : null}

        {!loading && !error && data ? (
          <div className="space-y-5">
            <section className="grid gap-4 md:grid-cols-4">
              <article className="card-shell">
                <p className="text-xs text-slate-500">Role</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{data.role}</p>
              </article>
              <article className="card-shell">
                <p className="text-xs text-slate-500">Weak backlog</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{data.snapshot.weakItems}</p>
              </article>
              <article className="card-shell">
                <p className="text-xs text-slate-500">Learning now</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{data.snapshot.learningItems}</p>
              </article>
              <article className="card-shell">
                <p className="text-xs text-slate-500">Mastered</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{data.snapshot.masteredItems}</p>
              </article>
            </section>

            <section className="card-shell">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-base font-medium text-slate-900">Today's Plan</h2>
                <span className="rounded-full border border-slate-300 bg-slate-100 px-2 py-1 text-xs text-slate-600">
                  {(data.persistedPlan?.status || 'pending').toUpperCase()}
                </span>
              </div>
              <div className="space-y-2 text-sm text-slate-700">
                <p><strong className="font-medium text-slate-900">Review:</strong> {(data.persistedPlan?.review || []).join(', ') || 'No review task'}</p>
                <p><strong className="font-medium text-slate-900">Learn:</strong> {(data.persistedPlan?.learn || []).join(', ') || 'No learning task'}</p>
                <p><strong className="font-medium text-slate-900">Practice:</strong> {(data.persistedPlan?.practice || []).join(', ') || 'No practice task'}</p>
                <p><strong className="font-medium text-slate-900">Estimated time:</strong> {data.persistedPlan?.estimatedMinutes || 25} minutes</p>
              </div>
            </section>

            <section className="card-shell">
              <h2 className="text-base font-medium text-slate-900">Weekly Targets</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {data.weeklyTargets.map((target) => {
                  const pct = Math.min(100, Math.round((target.current / Math.max(target.target, 1)) * 100))
                  return (
                    <article key={target.label} className="rounded-xl border border-slate-200 bg-white p-4">
                      <p className="text-base font-medium text-slate-900">{target.label}</p>
                      <p className="mt-1 text-xs text-slate-500">{target.current} / {target.target}</p>
                      <div className="mt-3 h-2 rounded-full bg-slate-200">
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
              <h2 className="text-base font-medium text-slate-900">Next Actions</h2>
              <div className="mt-4 space-y-3">
                {data.nextActions.map((action) => (
                  <article key={action.title} className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-base font-medium text-slate-900">{action.title}</h3>
                      <span className={`rounded-full border px-2 py-1 text-xs font-medium ${PRIORITY_STYLES[action.priority] || PRIORITY_STYLES.medium}`}>
                        {action.priority} priority
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-700">{action.description}</p>
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
