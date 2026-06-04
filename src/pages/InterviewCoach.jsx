import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { PageMeta } from '../components/PageMeta'
import { SectionHeader } from '../components/shared/SectionHeader'
import { useDiscovered } from '../hooks/useDiscovered'
import { apiRequest } from '../lib/apiClient'
import { LoadingState } from '../components/shared/LoadingState'
import { useToast } from '../context/ToastContext'
import { ActionButton } from '../components/ui/ActionButton'

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
  const [customTopic, setCustomTopic] = useState('')
  const [userAnswer, setUserAnswer] = useState('')
  const [result, setResult] = useState(null)
  const [history, setHistory] = useState([])
  const [progress, setProgress] = useState(null)
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const data = await apiRequest('/api/interview-coach', { method: 'GET', identity })
        if (mounted) setHistory(data.items || [])
        if (mounted) setProgress(data.progress || null)
      } catch (_) {}
    })()
    return () => {
      mounted = false
    }
  }, [identity])

  async function handleGenerate() {
    setLoading(true)
    try {
      const effectiveTopic = customTopic.trim() || topic
      const data = await apiRequest('/api/interview-coach', {
        method: 'POST',
        identity,
        body: { topic: effectiveTopic, userAnswer },
      })
      setResult(data)
      setHistory((prev) => [{ ...data, created_at: new Date().toISOString() }, ...prev].slice(0, 12))
      setProgress((prev) => {
        if (!prev) {
          return {
            avg_score: data.score,
            avg_vocab: data.vocabulary_score,
            avg_grammar: data.grammar_score,
            avg_fluency: data.fluency_score,
            avg_business: data.business_score,
          }
        }
        return {
          avg_score: Math.round((Number(prev.avg_score || 0) + Number(data.score || 0)) / 2),
          avg_vocab: Math.round((Number(prev.avg_vocab || 0) + Number(data.vocabulary_score || 0)) / 2),
          avg_grammar: Math.round((Number(prev.avg_grammar || 0) + Number(data.grammar_score || 0)) / 2),
          avg_fluency: Math.round((Number(prev.avg_fluency || 0) + Number(data.fluency_score || 0)) / 2),
          avg_business: Math.round((Number(prev.avg_business || 0) + Number(data.business_score || 0)) / 2),
        }
      })
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
          <div className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-1">
            <label className="mb-2 block text-xs text-slate-500">Topic</label>
            <select
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 focus:border-blue-400 focus:outline-none"
            >
              {TOPICS.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
            <label className="mb-2 mt-4 block text-xs text-slate-500">Your answer (optional)</label>
            <input
              value={customTopic}
              onChange={(e) => setCustomTopic(e.target.value)}
              placeholder="Optional custom interview topic"
              className="mb-2 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 focus:border-blue-400 focus:outline-none"
            />
            <textarea
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              placeholder="Write your current answer for AI feedback..."
              className="h-40 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-400 focus:outline-none"
            />
            <ActionButton type="button" onClick={handleGenerate} disabled={loading} variant="primary" className="mt-4 w-full">
              {loading ? 'Generating...' : 'Generate Interview Answer'}
            </ActionButton>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-2">
            {loading ? <LoadingState title="Generating interview answer..." subtitle="Creating role-ready Japanese response with feedback." /> : null}
            {!loading && !result ? (
              <p className="text-sm text-slate-600">Select a topic and generate your AI interview response.</p>
            ) : null}
            {!loading && result ? (
              <div className="space-y-4 text-sm text-slate-700">
                <p><span className="font-medium text-slate-900">Topic:</span> {result.topic}</p>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Japanese answer</p>
                  <p className="mt-1 text-sm text-slate-900" style={{ fontFamily: 'var(--font-jp)' }}>{result.ai_answer_jp}</p>
                </div>
                <p><span className="font-medium text-slate-900">Romaji:</span> {result.romaji || '-'}</p>
                <p><span className="font-medium text-slate-900">English meaning:</span> {result.english_meaning || '-'}</p>
                <p><span className="font-medium text-slate-900">Simpler version:</span> {result.simpler_version_jp || '-'}</p>
                <p><span className="font-medium text-slate-900">Professional version:</span> {result.professional_version_jp || '-'}</p>
                <p><span className="font-medium text-slate-900">Feedback:</span> {result.feedback || '-'}</p>
                <p><span className="font-medium text-slate-900">Score:</span> {result.score ?? '-'}/100</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <p><span className="font-medium text-slate-900">Vocabulary Score:</span> {result.vocabulary_score ?? '-'}/100</p>
                  <p><span className="font-medium text-slate-900">Grammar Score:</span> {result.grammar_score ?? '-'}/100</p>
                  <p><span className="font-medium text-slate-900">Fluency Score:</span> {result.fluency_score ?? '-'}/100</p>
                  <p><span className="font-medium text-slate-900">Business Japanese Score:</span> {result.business_score ?? '-'}/100</p>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {progress ? (
          <section className="mt-5 rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="text-base font-medium text-slate-900">Interview Progress Tracking</h3>
            <div className="mt-3 grid gap-3 text-sm text-slate-700 sm:grid-cols-5">
              <p>Overall: <strong>{progress.avg_score || 0}</strong></p>
              <p>Vocabulary: <strong>{progress.avg_vocab || 0}</strong></p>
              <p>Grammar: <strong>{progress.avg_grammar || 0}</strong></p>
              <p>Fluency: <strong>{progress.avg_fluency || 0}</strong></p>
              <p>Business: <strong>{progress.avg_business || 0}</strong></p>
            </div>
          </section>
        ) : null}

        {history.length ? (
          <section className="mt-5 rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="text-base font-medium text-slate-900">Recent Interview Practice</h3>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {history.slice(0, 8).map((item, idx) => (
                <button
                  key={`${item.topic}-${item.created_at}-${idx}`}
                  type="button"
                  onClick={() => setResult(item)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-700 hover:border-blue-400"
                >
                  <p className="font-medium text-slate-900">{item.topic}</p>
                  <p className="line-clamp-1 text-xs text-slate-500">{item.feedback || item.ai_answer_jp}</p>
                  <p className="mt-1 text-xs text-slate-500">{item.created_at ? new Date(item.created_at).toLocaleString() : ''}</p>
                </button>
              ))}
            </div>
          </section>
        ) : null}
      </motion.div>
    </div>
  )
}
