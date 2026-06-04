import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { PageMeta } from '../components/PageMeta'
import { SectionHeader } from '../components/shared/SectionHeader'
import { EmptyState } from '../components/shared/EmptyState'
import { LoadingState } from '../components/shared/LoadingState'
import { ReviewCard } from '../components/learning/ReviewCard'
import { useDiscovered } from '../hooks/useDiscovered'
import { apiRequest } from '../lib/apiClient'
import { useToast } from '../context/ToastContext'

function scoreItem(item) {
  const statusWeight = {
    weak: 100,
    new: 80,
    learning: 60,
    favorite: 50,
    mastered: 10,
  }
  const reviewPenalty = Math.max(0, 12 - Number(item.review_count || 0))
  const dueAt = item.next_review_at ? new Date(item.next_review_at).getTime() : null
  const overdueBoost = dueAt && dueAt < Date.now() ? 28 : 0
  const recentBoost = item.created_at && (Date.now() - new Date(item.created_at).getTime()) < 3 * 86_400_000 ? 25 : 0
  return (statusWeight[item.status] || 40) + reviewPenalty + recentBoost + overdueBoost
}

function isDueForReview(item) {
  if (!item?.next_review_at) return true
  const dueTs = new Date(item.next_review_at).getTime()
  if (Number.isNaN(dueTs)) return true
  return dueTs <= Date.now()
}

export function ReviewMode() {
  const { items, loading, identity, update } = useDiscovered()
  const [filterStatus, setFilterStatus] = useState('all')
  const [index, setIndex] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [sessionStats, setSessionStats] = useState({
    attempts: 0,
    success: 0,
    retentionScore: 0,
    streak: 0,
  })
  const toast = useToast()

  const queue = useMemo(
    () => [...items]
      .filter((item) => (filterStatus === 'all' ? true : item.status === filterStatus))
      .filter((item) => isDueForReview(item))
      .sort((a, b) => scoreItem(b) - scoreItem(a)),
    [items, filterStatus]
  )

  const current = queue[index]

  async function handleRate(result) {
    if (!current || submitting) return
    setSubmitting(true)
    try {
      const data = await apiRequest('/api/review-session', {
        method: 'POST',
        identity,
        body: { itemId: current.id, result },
      })
      await update(current.id, {
        status: data.nextStatus,
        review_count: (current.review_count || 0) + 1,
        last_reviewed_at: new Date().toISOString(),
        next_review_at: data.nextReviewAt,
        ease_factor: data.easeFactor,
      })
      toast.success(`Marked as ${data.nextStatus}`)
      setSessionStats((prev) => {
        const attempts = prev.attempts + 1
        const successDelta = result === 'good' || result === 'easy' ? 1 : 0
        const success = prev.success + successDelta
        const streak = successDelta ? prev.streak + 1 : 0
        const retentionScore = Math.round((success / Math.max(1, attempts)) * 100)
        return { attempts, success, retentionScore, streak }
      })
      setIndex((prev) => (prev + 1 < queue.length ? prev + 1 : 0))
    } catch (err) {
      toast.error(err.message || 'Could not save review result')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageMeta title="Review Mode" description="Spaced repetition review for vocabulary and grammar." />
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <SectionHeader
          title="Review Mode"
          subtitle="Weak and recent items are prioritized using a lightweight spaced repetition flow."
        />
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <label htmlFor="review-status-filter" className="text-xs uppercase tracking-[0.1em] text-slate-400">Filter</label>
          <select
            id="review-status-filter"
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value)
              setIndex(0)
            }}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
          >
            <option value="all">all</option>
            <option value="weak">weak</option>
            <option value="learning">learning</option>
            <option value="new">new</option>
            <option value="favorite">favorite</option>
          </select>
        </div>

        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3 text-sm text-slate-300">
            Success rate: <strong className="text-slate-100">{sessionStats.attempts ? Math.round((sessionStats.success / sessionStats.attempts) * 100) : 0}%</strong>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3 text-sm text-slate-300">
            Retention rate: <strong className="text-slate-100">{sessionStats.retentionScore}%</strong>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3 text-sm text-slate-300">
            Review streak: <strong className="text-slate-100">{sessionStats.streak}</strong>
          </div>
        </div>
        {loading ? <LoadingState /> : null}
        {!loading && !queue.length ? (
          <EmptyState title="No due items to review" message="Your review queue is clear for now. Come back when next_review_at becomes due, or add more items." />
        ) : null}
        {!loading && current ? (
          <div className="space-y-3">
            <p className="text-sm text-slate-400">
              Card {index + 1} of {queue.length}
            </p>
            <ReviewCard item={current} onRate={handleRate} />
            {submitting ? <p className="text-xs text-slate-500">Saving review session...</p> : null}
          </div>
        ) : null}
      </motion.div>
    </div>
  )
}
