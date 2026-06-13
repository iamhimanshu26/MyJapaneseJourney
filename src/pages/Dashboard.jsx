import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { PageMeta } from '../components/PageMeta'
import { useDiscovered } from '../hooks/useDiscovered'
import { useAuth } from '../context/AuthContext'
import { apiRequest } from '../lib/apiClient'
import { useUiPreferences } from '../hooks/useUiPreferences'
import { SectionHeader } from '../components/shared/SectionHeader'
import { LoadingState } from '../components/shared/LoadingState'
import { EmptyState } from '../components/shared/EmptyState'
import { StatCard } from '../components/dashboard/StatCard'
import { ProgressCard } from '../components/dashboard/ProgressCard'
import { RecommendationCard } from '../components/dashboard/RecommendationCard'

export function Dashboard() {
  const { items, identity } = useDiscovered()
  const { user, profile, hasAuth } = useAuth()
  const { language } = useUiPreferences()
  const isJa = language === 'ja'
  const [analytics, setAnalytics] = useState(null)
  const [intelligence, setIntelligence] = useState(null)
  const [studyPlan, setStudyPlan] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [regeneratingPlan, setRegeneratingPlan] = useState(false)
  const [completingPlan, setCompletingPlan] = useState(false)
  const [showAllModules, setShowAllModules] = useState(false)

  useEffect(() => {
    let mounted = true
    async function loadData() {
      setLoading(true)
      setError('')
      try {
        const [analyticsData, intelligenceData] = await Promise.all([
          apiRequest('/api/analytics', { method: 'GET', identity }),
          apiRequest('/api/intelligence', { method: 'GET', identity }),
        ])
        if (!mounted) return
        setAnalytics(analyticsData)
        setIntelligence(intelligenceData)
        setStudyPlan(intelligenceData?.studyPlan || intelligenceData?.persistedPlan || null)
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

  const recommendationText = useMemo(() => {
    const vocab = Number(intelligence?.metrics?.vocabularyMastery || 0)
    const grammar = Number(intelligence?.metrics?.grammarMastery || 0)
    if (!intelligence) return ''
    if (vocab > grammar + 8) {
      return 'Your vocabulary mastery is stronger than grammar mastery. Focus on passive/causative forms and pattern accuracy.'
    }
    if (grammar > vocab + 8) {
      return 'Your grammar mastery is stronger than vocabulary retention. Focus on weak and newly discovered words.'
    }
    return 'Vocabulary and grammar are balanced. Maintain consistency with mixed review and one daily reading exercise.'
  }, [intelligence])

  async function handleRegeneratePlan() {
    setRegeneratingPlan(true)
    try {
      const payload = await apiRequest('/api/intelligence?view=plan&regenerate=1', { method: 'GET', identity })
      const nextPlan = payload.persistedPlan || payload.studyPlan || null
      setStudyPlan(nextPlan)
      setIntelligence((prev) => (prev ? { ...prev, studyPlan: nextPlan || prev.studyPlan } : prev))
    } catch (err) {
      setError(err.message || 'Could not regenerate study plan')
    } finally {
      setRegeneratingPlan(false)
    }
  }

  async function handleCompletePlan() {
    const planId = studyPlan?.id
    if (!planId) return
    setCompletingPlan(true)
    try {
      await apiRequest('/api/intelligence', {
        method: 'POST',
        identity,
        body: { action: 'plan-complete', planId },
      })
      setStudyPlan((prev) => (prev ? { ...prev, status: 'completed' } : prev))
    } catch (err) {
      setError(err.message || 'Could not mark plan as completed')
    } finally {
      setCompletingPlan(false)
    }
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageMeta title="Dashboard" description="Your Japanese learning hub. Vocabulary, grammar, and AI-powered lookup." />
      <div>
        <SectionHeader
          title={user
            ? (isJa ? `おかえりなさい、${user.loginId || '学習者'}さん` : `Welcome back, ${user.loginId || 'Learner'}`)
            : (isJa ? 'Kotoba Seven へようこそ' : 'Welcome to Kotoba Seven')}
          subtitle={isJa
            ? 'JLPT / NAT 対策のためのAI学習インテリジェンスダッシュボード。'
            : 'AI-powered Japanese Learning Intelligence Dashboard for JLPT/NAT readiness.'}
          actions={[
            <Link key="lookup" to="/lookup" className="inline-flex h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700">
              {isJa ? 'AI検索を開始' : 'Start AI Lookup'}
            </Link>,
            <Link key="review" to="/review-mode" className="inline-flex h-10 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50">
              {isJa ? '復習モード' : 'Review Mode'}
            </Link>,
          ]}
        />

        {hasAuth && !user && (
          <p className="mb-4 text-sm text-slate-400">
            <Link to="/login" className="font-medium text-blue-400 hover:underline">{isJa ? 'ログイン' : 'Log in'}</Link>
            {isJa ? 'してNeonの学習データを同期します。' : ' with your ID/password to sync your progress from Neon.'}
          </p>
        )}

        {loading ? (
          <LoadingState />
        ) : error ? (
          <EmptyState title="Dashboard unavailable" message={error} />
        ) : (
          <div className="space-y-4">
            {intelligence?.demoWorkspace && user?.isGuest ? (
              <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {intelligence.demoBanner || 'Using Demo Workspace – Sign In To Save Progress'}
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
              <StatCard label="Current Level" value={intelligence?.hero?.currentLevel || profile?.current_level || analytics?.profile?.current_level || 'N5'} icon="🎌" />
              <StatCard label="Target Exam" value={`${intelligence?.hero?.targetExam || analytics?.profile?.target_exam || 'JLPT'} ${intelligence?.hero?.targetLevel || analytics?.profile?.target_level || 'N3'}`} icon="🎯" />
              <StatCard label="Readiness Score" value={`${intelligence?.hero?.readinessScore || intelligence?.metrics?.learningReadinessScore || 0}%`} icon="⚡" accent="from-emerald-500 to-cyan-500" />
              <StatCard label="Learning Streak" value={`${intelligence?.hero?.studyStreak || streak} day${(intelligence?.hero?.studyStreak || streak) === 1 ? '' : 's'}`} hint="Based on recent learning activity" icon="🔥" accent="from-orange-500 to-rose-500" />
              <StatCard label="Daily Goal" value={`${intelligence?.hero?.dailyGoalMinutes || profile?.daily_goal_minutes || 25} min`} icon="⏱️" />
              <StatCard label="AI Lookups" value={intelligence?.metrics?.aiLookups || 0} icon="🤖" />
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Vocabulary" value={intelligence?.metrics?.totalVocabulary ?? items.filter((item) => item.type === 'vocabulary').length} icon="📘" />
              <StatCard label="Grammar" value={intelligence?.metrics?.totalGrammar ?? items.filter((item) => item.type === 'grammar').length} icon="🧩" />
              <StatCard label="Kanji" value={intelligence?.metrics?.totalKanji ?? items.filter((item) => item.type === 'kanji').length} icon="漢" />
              <StatCard label="Weak Backlog" value={analytics?.cards?.weak || 0} icon="🧪" />
              <StatCard label="Total Lessons" value={intelligence?.metrics?.totalLessons ?? analytics?.cards?.totalLessons ?? 0} icon="🗃️" />
              <StatCard label="Completed Lessons" value={intelligence?.metrics?.completedLessons ?? analytics?.cards?.completedLessons ?? 0} icon="✅" />
              <StatCard label="Lesson Completion" value={`${intelligence?.metrics?.lessonCompletion ?? analytics?.cards?.lessonCompletionRate ?? 0}%`} icon="📊" />
              <StatCard label="Latest Lesson" value={intelligence?.metrics?.recentLessonTitle || 'No lessons yet'} icon="📝" />
            </div>

            <div className="grid gap-3 lg:grid-cols-4">
              <div className="card-shell lg:col-span-2">
                <h3 className="text-base font-medium text-slate-900">Weekly Progress</h3>
                {weekChart.length ? (
                  <div className="mt-3 h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={weekChart}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                        <XAxis dataKey="day" stroke="#64748b" />
                        <YAxis stroke="#64748b" />
                        <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #cbd5e1' }} />
                        <Line type="monotone" dataKey="activity" stroke="#60a5fa" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="mt-3 flex h-64 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50">
                    <div className="mx-auto max-w-sm text-center">
                      <p className="text-base font-semibold text-slate-800">No activity recorded yet</p>
                      <p className="mt-1 text-sm text-slate-600">
                        Start one quick action to populate your weekly progress chart.
                      </p>
                      <div className="mt-3 flex justify-center gap-2">
                        <Link
                          to="/lookup"
                          className="inline-flex h-9 items-center rounded-lg bg-blue-600 px-3 text-xs font-medium text-white hover:bg-blue-700"
                        >
                          Start AI Lookup
                        </Link>
                        <Link
                          to="/review-mode"
                          className="inline-flex h-9 items-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-100"
                        >
                          Open Review Mode
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-4 lg:col-span-2">
                <ProgressCard title="Vocabulary Mastery" value={intelligence?.metrics?.vocabularyMastery || 0} subtitle="Mastered vs total vocabulary" />
                <ProgressCard title="Grammar Mastery" value={intelligence?.metrics?.grammarMastery || 0} subtitle="Mastered grammar progress" />
                <ProgressCard title="Estimated N3 Readiness" value={intelligence?.metrics?.estimatedN3Readiness || 0} subtitle="Model-estimated exam readiness" />
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-3">
              <section className="card-shell lg:col-span-2">
                <h3 className="text-base font-medium text-slate-900">{isJa ? '本日のAI学習プラン' : "Today's AI Study Plan"}</h3>
                {studyPlan ? (
                  <div className="mt-3 space-y-3 text-sm text-slate-700">
                    <p>
                      <span className="font-medium text-slate-900">Review:</span>{' '}
                      {(studyPlan.review || []).join(', ') || 'No review task'}
                    </p>
                    <p>
                      <span className="font-medium text-slate-900">Learn:</span>{' '}
                      {(studyPlan.learn || []).join(', ') || 'No learning task'}
                    </p>
                    <p>
                      <span className="font-medium text-slate-900">Practice:</span>{' '}
                      {(studyPlan.practice || []).join(', ') || 'No practice task'}
                    </p>
                    <p>
                      <span className="font-medium text-slate-900">Estimated Time:</span>{' '}
                      {studyPlan.estimatedMinutes || 25} minutes
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Link to="/review-mode" className="inline-flex h-8 items-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 hover:border-blue-400">
                        {isJa ? '復習を開始' : 'Start Review'}
                      </Link>
                      <Link to="/dokkai-analyzer" className="inline-flex h-8 items-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 hover:border-blue-400">
                        {isJa ? '読解を開く' : 'Open Dokkai'}
                      </Link>
                      <button
                        type="button"
                        onClick={handleRegeneratePlan}
                        disabled={regeneratingPlan}
                        className="inline-flex h-8 items-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 hover:border-violet-400 disabled:opacity-60"
                      >
                        {regeneratingPlan ? (isJa ? '再生成中...' : 'Regenerating...') : (isJa ? 'プラン再生成' : 'Regenerate Plan')}
                      </button>
                      <button
                        type="button"
                        onClick={handleCompletePlan}
                        disabled={completingPlan || studyPlan.status === 'completed'}
                        className="inline-flex h-8 items-center rounded-lg border border-emerald-300 bg-emerald-50 px-3 text-xs font-medium text-emerald-700 disabled:opacity-60"
                      >
                        {studyPlan.status === 'completed'
                          ? (isJa ? '完了済み' : 'Completed')
                          : completingPlan ? (isJa ? '保存中...' : 'Saving...') : (isJa ? '完了として記録' : 'Mark Completed')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-slate-500">{isJa ? 'まだプランがありません。再生成して作成してください。' : 'No plan generated yet. Use regenerate to create one.'}</p>
                )}
              </section>

              <section className="card-shell">
                <h3 className="text-base font-medium text-slate-900">{isJa ? 'AI推奨' : 'AI Recommendation'}</h3>
                <p className="mt-3 text-sm text-slate-700">{recommendationText}</p>
                <ul className="mt-3 space-y-2 text-sm text-slate-700">
                  {(intelligence?.recommendations || []).slice(0, 3).map((entry) => {
                    const label = typeof entry === 'string' ? entry : entry.label
                    const action = typeof entry === 'string' ? null : entry.action
                    return (
                      <li key={label}>
                        {action ? (
                          <Link to={action} className="text-blue-600 hover:underline">{label}</Link>
                        ) : label}
                      </li>
                    )
                  })}
                </ul>
              </section>

              <RecommendationCard
                title="Weak Area Summary"
                actions={intelligence?.weakAreas || ['No weak areas detected']}
              />
            </div>

            <section className="card-shell">
              <h3 className="text-base font-medium text-slate-900">{isJa ? 'アクティビティフィード' : 'Activity Feed'}</h3>
              <div className="mt-3 space-y-3">
                {(intelligence?.activityFeed || []).slice(0, 8).map((event, idx) => (
                  <div key={`${event.title}-${event.occurred_at}-${idx}`} className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-sm font-medium text-slate-900">{event.title || event.activity_type}</p>
                    <p className="text-xs text-slate-600">{event.description || 'Learning activity recorded'}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {event.occurred_at ? new Date(event.occurred_at).toLocaleString() : ''}
                    </p>
                  </div>
                ))}
                {!intelligence?.activityFeed?.length ? <p className="text-sm text-slate-500">{isJa ? '最近の学習アクティビティがありません。' : 'No recent timeline activity.'}</p> : null}
              </div>
              <div className="mt-3">
                <Link to="/learning-timeline" className="text-xs text-blue-600 hover:underline">{isJa ? '学習タイムラインを開く' : 'Open full learning timeline'}</Link>
              </div>
            </section>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { title: 'AI Word Intelligence', desc: 'Lookup with deep bilingual insights', path: '/lookup', icon: '🤖' },
                { title: 'My Discovered Knowledge Base', desc: 'Search, filter, and manage saved learning data', path: '/discovered', icon: '🧠' },
                { title: 'Dokkai Analyzer', desc: 'Analyze reading passages and auto-generate practice', path: '/dokkai-analyzer', icon: '📗' },
                { title: 'Interview Coach', desc: 'Prepare professional Japanese interview answers', path: '/interview-coach', icon: '💼' },
                { title: 'Analytics', desc: 'Track categories, trends, and readiness metrics', path: '/analytics', icon: '📈' },
                { title: 'Learning Intelligence', desc: 'See mastery, weak zones, and next actions', path: '/learning-intelligence', icon: '🎯' },
                { title: 'Learning Plan', desc: 'Follow a role-aware weekly study execution plan', path: '/learning-plan', icon: '🧭' },
                { title: 'Learning Timeline', desc: 'Chronological feed of your learning activity', path: '/learning-timeline', icon: '🕒' },
                { title: 'Knowledge Graph', desc: 'Visual relationships across words, kanji, and grammar', path: '/knowledge-graph', icon: '🕸️' },
                { title: 'Kotoba Sensei', desc: 'AI copilot for personalized daily guidance', path: '/kotoba-sensei', icon: '🧠' },
                { title: 'Lesson Library', desc: 'Upload and manage lessons from text, TXT, or PDF', path: '/lessons', icon: '🗃️' },
              ].slice(0, showAllModules ? 11 : 6).map((card) => (
                <Link
                  key={card.path}
                  to={card.path}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.06)] transition hover:border-blue-400/50"
                >
                  <span className="text-xl" aria-hidden>{card.icon}</span>
                  <h3 className="mt-2 text-base font-semibold text-slate-900">{card.title}</h3>
                  <p className="mt-1 text-sm text-slate-600">{card.desc}</p>
                </Link>
              ))}
            </div>
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowAllModules((prev) => !prev)}
                className="inline-flex h-9 items-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 hover:border-blue-400"
              >
                {showAllModules ? (isJa ? '簡易表示に戻す' : 'Show fewer modules') : (isJa ? 'すべて表示' : 'Show all modules')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
