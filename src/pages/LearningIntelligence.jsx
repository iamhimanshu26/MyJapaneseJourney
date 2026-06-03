import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts'
import { PageMeta } from '../components/PageMeta'
import { SectionHeader } from '../components/shared/SectionHeader'
import { LoadingState } from '../components/shared/LoadingState'
import { EmptyState } from '../components/shared/EmptyState'
import { ProgressCard } from '../components/dashboard/ProgressCard'
import { RecommendationCard } from '../components/dashboard/RecommendationCard'
import { useDiscovered } from '../hooks/useDiscovered'
import { apiRequest } from '../lib/apiClient'

export function LearningIntelligence() {
  const { identity } = useDiscovered()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      setError('')
      try {
        const response = await apiRequest('/api/learning-intelligence', { method: 'GET', identity })
        if (mounted) setData(response)
      } catch (err) {
        if (mounted) setError(err.message || 'Failed to load learning intelligence')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [identity])

  const chartData = data
    ? [
      { metric: 'Vocab', score: data.metrics.vocabularyMastery },
      { metric: 'Grammar', score: data.metrics.grammarMastery },
      { metric: 'Kanji', score: data.metrics.kanjiProgress },
      { metric: 'Reading', score: data.metrics.readingReadiness },
      { metric: 'Interview', score: data.metrics.interviewReadiness },
      { metric: 'N3 Ready', score: data.metrics.estimatedN3Readiness },
    ]
    : []

  return (
    <div className="mx-auto max-w-7xl">
      <PageMeta title="Learning Intelligence" description="Mastery analytics, weak areas, and AI recommendations." />
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <SectionHeader
          title="Learning Intelligence"
          subtitle="AI-driven mastery analysis for JLPT/NAT preparation."
        />
        {!loading && !error && data ? (
          <p className="mb-4 inline-flex rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1 text-xs font-medium text-slate-300">
            Role context: {data.role || 'guest'}
          </p>
        ) : null}

        {loading ? <LoadingState /> : null}
        {!loading && error ? <EmptyState title="Unable to load insights" message={error} /> : null}
        {!loading && !error && data ? (
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <ProgressCard title="Vocabulary Mastery" value={data.metrics.vocabularyMastery} subtitle="Current retention strength" />
              <ProgressCard title="Grammar Mastery" value={data.metrics.grammarMastery} subtitle="Pattern understanding" />
              <ProgressCard title="Kanji Progress" value={data.metrics.kanjiProgress} subtitle="Character recognition coverage" />
              <ProgressCard title="Reading Readiness" value={data.metrics.readingReadiness} subtitle="Comprehension preparedness" />
              <ProgressCard title="Interview Readiness" value={data.metrics.interviewReadiness} subtitle="Professional communication level" />
              <ProgressCard title="Estimated N3 Readiness" value={data.metrics.estimatedN3Readiness} subtitle="Projected exam readiness" />
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 lg:col-span-2">
                <h3 className="text-sm font-semibold uppercase tracking-[0.1em] text-slate-300">Mastery Breakdown</h3>
                <div className="mt-4 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="metric" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155' }} />
                      <Bar dataKey="score" fill="#60a5fa" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <RecommendationCard title="Weak Areas" actions={data.weakAreas || []} />
            </div>

            <RecommendationCard title="AI Recommended Next Actions" actions={data.recommendations || []} />
          </div>
        ) : null}
      </motion.div>
    </div>
  )
}
