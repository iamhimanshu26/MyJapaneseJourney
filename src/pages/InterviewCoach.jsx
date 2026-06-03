import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { PageMeta } from '../components/PageMeta'
import { SectionHeader } from '../components/shared/SectionHeader'
import { useDiscovered } from '../hooks/useDiscovered'
import { apiRequest } from '../lib/apiClient'
import { LoadingState } from '../components/shared/LoadingState'
import { useToast } from '../context/ToastContext'

const TOPICS = [
  'Self Introduction',
  'Reason for job change',
  'Strengths / weaknesses',
  'Project explanation',
  'Salary discussion',
  'Business Japanese phrases',
]

export function InterviewCoach() {
  const { identity } = useDiscovered()
  const [topic, setTopic] = useState(TOPICS[0])
  const [userAnswer, setUserAnswer] = useState('')
  const [result, setResult] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const data = await apiRequest('/api/interview-coach', { method: 'GET', identity })
        if (mounted) setHistory(data.items || [])
      } catch (_) {}
    })()
    return () => {
      mounted = false
    }
  }, [identity])

  async function handleGenerate() {
    setLoading(true)
    try {
      const data = await apiRequest('/api/interview-coach', {
        method: 'POST',
        identity,
        body: { topic, userAnswer },
      })
      setResult(data)
      setHistory((prev) => [{ ...data, created_at: new Date().toISOString() }, ...prev].slice(0, 12))
    } catch (err) {
      toast.error(err.message || 'Failed to generate interview guidance')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageMeta title="Interview Coach" description="AI Japanese interview coach for professional preparation." />
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <SectionHeader
          title="AI Interview Japanese Coach"
          subtitle="Generate polished interview responses with romaji, English meaning, simplified/professional variants, and feedback."
        />

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 lg:col-span-1">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">Topic</label>
            <select
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-blue-400 focus:outline-none"
            >
              {TOPICS.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
            <label className="mt-4 mb-2 block text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">Your answer (optional)</label>
            <textarea
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              placeholder="Write your current answer for AI feedback..."
              className="h-40 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-blue-400 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleGenerate}
              disabled={loading}
              className="mt-4 w-full rounded-lg bg-gradient-to-r from-blue-500 to-violet-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {loading ? 'Generating...' : 'Generate Interview Answer'}
            </button>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 lg:col-span-2">
            {loading ? <LoadingState title="Generating interview answer..." subtitle="Creating role-ready Japanese response with feedback." /> : null}
            {!loading && !result ? (
              <p className="text-sm text-slate-400">Select a topic and generate your AI interview response.</p>
            ) : null}
            {!loading && result ? (
              <div className="space-y-4 text-sm text-slate-200">
                <p><span className="font-semibold text-slate-100">Topic:</span> {result.topic}</p>
                <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-3">
                  <p className="text-xs uppercase tracking-[0.1em] text-slate-500">Japanese answer</p>
                  <p className="mt-1 text-base text-slate-100" style={{ fontFamily: 'var(--font-jp)' }}>{result.ai_answer_jp}</p>
                </div>
                <p><span className="font-semibold text-slate-100">Romaji:</span> {result.romaji || '-'}</p>
                <p><span className="font-semibold text-slate-100">English meaning:</span> {result.english_meaning || '-'}</p>
                <p><span className="font-semibold text-slate-100">Simpler version:</span> {result.simpler_version_jp || '-'}</p>
                <p><span className="font-semibold text-slate-100">Professional version:</span> {result.professional_version_jp || '-'}</p>
                <p><span className="font-semibold text-slate-100">Feedback:</span> {result.feedback || '-'}</p>
                <p><span className="font-semibold text-slate-100">Score:</span> {result.score ?? '-'}/100</p>
              </div>
            ) : null}
          </div>
        </div>

        {history.length ? (
          <section className="mt-5 rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
            <h3 className="text-sm font-semibold uppercase tracking-[0.1em] text-slate-300">Recent Interview Practice</h3>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {history.slice(0, 8).map((item, idx) => (
                <button
                  key={`${item.topic}-${item.created_at}-${idx}`}
                  type="button"
                  onClick={() => setResult(item)}
                  className="rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-left text-sm text-slate-200 hover:border-blue-400"
                >
                  <p className="font-medium text-slate-100">{item.topic}</p>
                  <p className="line-clamp-1 text-xs text-slate-400">{item.feedback || item.ai_answer_jp}</p>
                  <p className="mt-1 text-[11px] text-slate-500">{item.created_at ? new Date(item.created_at).toLocaleString() : ''}</p>
                </button>
              ))}
            </div>
          </section>
        ) : null}
      </motion.div>
    </div>
  )
}
