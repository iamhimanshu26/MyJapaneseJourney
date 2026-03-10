import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { PageMeta } from '../components/PageMeta'
import { useToast } from '../context/ToastContext'
import { getIdeas, addIdea, deleteIdea } from '../lib/anyIdeaStorage'

function getApiBase() {
  if (typeof window === 'undefined') return ''
  return window.location.origin
}

export function AnyIdea() {
  const [rawInput, setRawInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [ideas, setIdeas] = useState(getIdeas())
  const toast = useToast()

  const refreshIdeas = useCallback(() => setIdeas(getIdeas()), [])

  async function handleRefine() {
    const text = rawInput.trim()
    if (!text) {
      toast.error('Write something first')
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`${getApiBase()}/api/refineIdea`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea: text }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data?.error || 'Could not refine')
        return
      }
      addIdea({ raw: text, refined: data.refined, summary: data.summary })
      refreshIdeas()
      setRawInput('')
      toast.success('Idea refined and saved')
    } catch {
      toast.error('Connection failed')
    } finally {
      setLoading(false)
    }
  }

  function handleQuickSave() {
    const text = rawInput.trim()
    if (!text) {
      toast.error('Write something first')
      return
    }
    addIdea({ raw: text, refined: '', summary: '' })
    refreshIdeas()
    setRawInput('')
    toast.success('Idea saved')
  }

  function handleDelete(id) {
    deleteIdea(id)
    refreshIdeas()
    toast.success('Idea removed')
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <PageMeta title="Any Idea!" description="Capture and refine ideas with AI. Implement them across your app." />
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold tracking-tight mb-2">Any Idea!</h1>
        <p className="text-[var(--color-text-muted)] mb-8">
          Stuck on a feature? Suddenly remember something for another tab? Jot it down here—with or without details. AI will help optimize it so you can implement it.
        </p>

        <div className="rounded-2xl border border-slate-200 bg-[var(--color-bg-card)] p-6 shadow-sm mb-8">
          <label htmlFor="idea-input" className="block text-sm font-medium text-[var(--color-text-muted)] mb-2">
            Your idea (rough notes are fine)
          </label>
          <textarea
            id="idea-input"
            value={rawInput}
            onChange={(e) => setRawInput(e.target.value)}
            placeholder="e.g. Add a quiz mode for verbs... or just: quiz for verbs"
            className="w-full h-32 rounded-xl border border-slate-200 bg-[var(--color-bg)] px-4 py-3 text-[var(--color-text)] resize-none focus:outline-none focus:ring-2 focus:ring-amber-400"
            disabled={loading}
          />
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleRefine}
              disabled={loading || !rawInput.trim()}
              className="px-5 py-2.5 rounded-xl bg-amber-500 text-white font-semibold hover:bg-amber-600 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {loading ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden />
                  Refining…
                </>
              ) : (
                '✨ Refine with AI'
              )}
            </button>
            <button
              onClick={handleQuickSave}
              disabled={loading || !rawInput.trim()}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium disabled:opacity-50 transition-colors"
            >
              Save without refining
            </button>
          </div>
        </div>

        {ideas.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-stone-700 mb-4">Saved ideas</h2>
            <div className="space-y-4">
              {ideas.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-slate-200 bg-[var(--color-bg-card)] p-4 hover:border-amber-200 transition-colors"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0 flex-1">
                      {item.refined ? (
                        <>
                          {item.summary && (
                            <p className="text-sm font-medium text-amber-700 mb-1">{item.summary}</p>
                          )}
                          <p className="text-[var(--color-text)] whitespace-pre-wrap">{item.refined}</p>
                          {item.raw && item.raw !== item.refined && (
                            <p className="text-xs text-[var(--color-text-muted)] mt-2 pt-2 border-t border-slate-100">
                              Original: {item.raw.slice(0, 100)}{item.raw.length > 100 ? '…' : ''}
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-[var(--color-text)] whitespace-pre-wrap">{item.raw}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-slate-400 hover:text-red-600 text-sm shrink-0"
                      aria-label="Delete"
                    >
                      ×
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}
