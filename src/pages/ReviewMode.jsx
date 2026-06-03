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
  const recentBoost = item.created_at && (Date.now() - new Date(item.created_at).getTime()) < 3 * 86_400_000 ? 25 : 0
  return (statusWeight[item.status] || 40) + reviewPenalty + recentBoost
}

export function ReviewMode() {
  const { items, loading, identity, update } = useDiscovered()
  const [index, setIndex] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const toast = useToast()

  const queue = useMemo(
    () => [...items].sort((a, b) => scoreItem(b) - scoreItem(a)),
    [items]
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
      })
      toast.success(`Marked as ${data.nextStatus}`)
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
        {loading ? <LoadingState /> : null}
        {!loading && !queue.length ? (
          <EmptyState title="No items to review" message="Save words or grammar from AI Lookup and return here to review." />
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
