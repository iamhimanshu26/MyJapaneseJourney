import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { PageMeta } from '../components/PageMeta'
import { SectionHeader } from '../components/shared/SectionHeader'
import { useDiscovered } from '../hooks/useDiscovered'
import { apiRequest } from '../lib/apiClient'
import { LoadingState } from '../components/shared/LoadingState'
import { useToast } from '../context/ToastContext'

export function KotobaSensei() {
  const { identity } = useDiscovered()
  const toast = useToast()
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState(null)
  const [history, setHistory] = useState([])

  async function askSensei() {
    if (!question.trim()) return
    setLoading(true)
    try {
      const data = await apiRequest('/api/intelligence', {
        method: 'POST',
        identity,
        body: {
          action: 'copilot',
          question: question.trim(),
        },
      })
      const entry = {
        question: question.trim(),
        response: data,
        created_at: new Date().toISOString(),
      }
      setResponse(data)
      setHistory((prev) => [entry, ...prev].slice(0, 10))
      setQuestion('')
    } catch (err) {
      toast.error(err.message || 'Kotoba Sensei is unavailable right now')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageMeta title="Kotoba Sensei" description="AI learning copilot that connects all Japanese learning modules." />
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <SectionHeader
          title="Kotoba Sensei"
          subtitle="Your AI learning copilot for JLPT/NAT goals, weak areas, interview prep, and daily execution."
        />

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
          <p className="mb-2 text-sm text-slate-400">
            Example prompts: “I am preparing for N3”, “I have an interview next week”, “I struggle with grammar”.
          </p>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask Kotoba Sensei..."
            className="h-28 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          />
          <button
            type="button"
            onClick={askSensei}
            disabled={loading || !question.trim()}
            className="mt-3 rounded-lg bg-gradient-to-r from-blue-500 to-violet-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            Ask Kotoba Sensei
          </button>
        </div>

        {loading ? <div className="mt-4"><LoadingState title="Kotoba Sensei is thinking..." subtitle="Analyzing your learning profile and recommending next actions." /></div> : null}

        {response ? (
          <section className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
            <h3 className="text-sm font-semibold uppercase tracking-[0.1em] text-slate-300">Sensei Response</h3>
            <p className="mt-3 text-sm text-slate-200">{response.answer}</p>
            <p className="mt-2 text-xs text-slate-500">Confidence: {Math.round(Number(response.confidence || 0) * 100)}%</p>
            <div className="mt-4 space-y-2">
              {(response.recommendations || []).map((item) => (
                <article key={`${item.title}-${item.action}`} className="rounded-lg border border-slate-700 bg-slate-950/60 p-3">
                  <p className="text-sm font-medium text-slate-100">{item.title}</p>
                  <p className="text-xs text-slate-400">{item.detail}</p>
                  <Link to={item.action || '/'} className="mt-1 inline-block text-xs text-blue-300 hover:underline">
                    Open module
                  </Link>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {history.length ? (
          <section className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
            <h3 className="text-sm font-semibold uppercase tracking-[0.1em] text-slate-300">Recent Copilot Sessions</h3>
            <div className="mt-3 space-y-2">
              {history.map((item, idx) => (
                <button
                  key={`${item.created_at}-${idx}`}
                  type="button"
                  onClick={() => setResponse(item.response)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-left hover:border-blue-400"
                >
                  <p className="text-sm text-slate-100">{item.question}</p>
                  <p className="line-clamp-1 text-xs text-slate-400">{item.response?.answer}</p>
                </button>
              ))}
            </div>
          </section>
        ) : null}
      </motion.div>
    </div>
  )
}
