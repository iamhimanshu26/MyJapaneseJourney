import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { PageMeta } from '../components/PageMeta'
import { useDiscovered } from '../hooks/useDiscovered'
import { useAuth } from '../context/AuthContext'
import { apiRequest } from '../lib/apiClient'
import { SectionHeader } from '../components/shared/SectionHeader'
import { LoadingState } from '../components/shared/LoadingState'
import { EmptyState } from '../components/shared/EmptyState'
import { StatCard } from '../components/dashboard/StatCard'
import { ProgressCard } from '../components/dashboard/ProgressCard'
import { RecommendationCard } from '../components/dashboard/RecommendationCard'

export function Dashboard() {
  const { items, identity } = useDiscovered()
  const { user, profile, hasAuth } = useAuth()
  const [analytics, setAnalytics] = useState(null)
  const [intelligence, setIntelligence] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    async function loadData() {
      setLoading(true)
      setError('')
      try {
        const [analyticsData, intelligenceData] = await Promise.all([
          apiRequest('/api/analytics', { method: 'GET', identity }),
          apiRequest('/api/learning-intelligence', { method: 'GET', identity }),
        ])
        if (!mounted) return
        setAnalytics(analyticsData)
        setIntelligence(intelligenceData)
      } catch (err) {
        if (!mounted) return
        setError(err.message || 'Failed to load dashboard insights')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    loadData()
    return () => {
      mounted = false
    }
  }, [identity])

  const streak = useMemo(() => {
    const activity = analytics?.studyActivity || []
    if (!activity.length) return 0
    let count = 0
    const today = new Date()
    const daysSet = new Set(activity.map((item) => item.day))
    for (let i = 0; i < 30; i += 1) {
      const date = new Date(today)
      date.setDate(today.getDate() - i)
      const key = date.toISOString().slice(0, 10)
      if (daysSet.has(key)) count += 1
      else if (i > 0) break
    }
    return count
  }, [analytics])

  const weekChart = (analytics?.studyActivity || []).map((row) => ({
    day: row.day?.slice(5) || '',
    activity: Number(row.activity_count || 0),
  }))

  return (
    <div className="mx-auto max-w-7xl">
      <PageMeta title="Dashboard" description="Your Japanese learning hub. Vocabulary, grammar, and AI-powered lookup." />
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <SectionHeader
          title={user ? `Welcome back, ${user.loginId || 'Learner'}` : 'Welcome to Kotoba Seven'}
          subtitle="AI-powered Japanese Learning Intelligence Dashboard for JLPT/NAT readiness."
          actions={[
            <Link key="lookup" to="/lookup" className="rounded-lg bg-gradient-to-r from-blue-500 to-violet-500 px-4 py-2 text-sm font-semibold text-white">
              Start AI Lookup
            </Link>,
            <Link key="review" to="/review-mode" className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-200">
              Review Mode
            </Link>,
          ]}
        />

        {hasAuth && !user && (
          <p className="mb-4 text-sm text-slate-400">
            <Link to="/login" className="font-medium text-blue-400 hover:underline">Log in</Link>
            {' '}with your ID/password to sync your progress from Neon.
          </p>
        )}

        {loading ? (
          <LoadingState />
        ) : error ? (
          <EmptyState title="Dashboard unavailable" message={error} />
        ) : (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Current Japanese Level" value={profile?.current_level || analytics?.profile?.current_level || 'N5'} icon="🎌" />
              <StatCard label="Target Exam" value={`${analytics?.profile?.target_exam || 'JLPT'} ${analytics?.profile?.target_level || 'N3'}`} icon="🎯" />
              <StatCard label="Study Streak" value={`${streak} day${streak === 1 ? '' : 's'}`} hint="Based on last 30 days activity" icon="🔥" accent="from-orange-500 to-rose-500" />
              <StatCard label="Learning Readiness Score" value={`${intelligence?.metrics?.learningReadinessScore || 0}%`} hint="Composite preparedness indicator" icon="⚡" accent="from-emerald-500 to-cyan-500" />
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Total Vocabulary Discovered" value={items.filter((item) => item.type === 'vocabulary').length} icon="📘" />
              <StatCard label="Grammar Points Reviewed" value={items.filter((item) => item.type === 'grammar' && item.review_count > 0).length} icon="🧩" />
              <StatCard label="Kanji Learned" value={items.filter((item) => item.type === 'kanji').length} icon="漢" />
              <StatCard label="AI Lookups Performed" value={intelligence?.metrics?.aiLookups || 0} icon="🤖" />
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 lg:col-span-2">
                <h3 className="text-sm font-semibold uppercase tracking-[0.1em] text-slate-300">Weekly Progress</h3>
                {weekChart.length ? (
                  <div className="mt-4 h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={weekChart}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="day" stroke="#94a3b8" />
                        <YAxis stroke="#94a3b8" />
                        <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155' }} />
                        <Line type="monotone" dataKey="activity" stroke="#60a5fa" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-slate-400">No activity trend yet. Start a lookup or review session.</p>
                )}
              </div>
              <div className="space-y-4">
                <ProgressCard title="Vocabulary Mastery" value={intelligence?.metrics?.vocabularyMastery || 0} subtitle="Mastered vs total vocabulary" />
                <ProgressCard title="Grammar Mastery" value={intelligence?.metrics?.grammarMastery || 0} subtitle="Mastered grammar progress" />
                <ProgressCard title="Estimated N3 Readiness" value={intelligence?.metrics?.estimatedN3Readiness || 0} subtitle="Model-estimated exam readiness" />
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <RecommendationCard
                title="Weak Area Summary"
                actions={intelligence?.weakAreas || ['No weak areas detected']}
              />
              <RecommendationCard
                title="Recommended Study Actions"
                actions={intelligence?.recommendations || []}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { title: 'AI Word Intelligence', desc: 'Lookup with deep bilingual insights', path: '/lookup', icon: '🤖' },
                { title: 'My Discovered Knowledge Base', desc: 'Search, filter, and manage saved learning data', path: '/discovered', icon: '🧠' },
                { title: 'Dokkai Analyzer', desc: 'Analyze reading passages and auto-generate practice', path: '/dokkai-analyzer', icon: '📗' },
                { title: 'Interview Coach', desc: 'Prepare professional Japanese interview answers', path: '/interview-coach', icon: '💼' },
                { title: 'Analytics', desc: 'Track categories, trends, and readiness metrics', path: '/analytics', icon: '📈' },
                { title: 'Learning Intelligence', desc: 'See mastery, weak zones, and next actions', path: '/learning-intelligence', icon: '🎯' },
                { title: 'Learning Plan', desc: 'Follow a role-aware weekly study execution plan', path: '/learning-plan', icon: '🧭' },
              ].map((card) => (
                <Link
                  key={card.path}
                  to={card.path}
                  className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 transition hover:border-blue-400/50 hover:bg-slate-900"
                >
                  <span className="text-xl" aria-hidden>{card.icon}</span>
                  <h3 className="mt-2 text-base font-semibold text-slate-100">{card.title}</h3>
                  <p className="mt-1 text-sm text-slate-400">{card.desc}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}
