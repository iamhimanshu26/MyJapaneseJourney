import { useState } from 'react'
import { motion } from 'framer-motion'
import { FuriganaText } from '../components/FuriganaText'

function getApiBase() {
  if (typeof window === 'undefined') return ''
  return window.location.origin
}

export function Lookup() {
  const [query, setQuery] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleSearch(e) {
    e.preventDefault()
    const q = query.trim()
    if (!q) return
    setLoading(true)
    setResult(null)
    setError(null)
    try {
      const res = await fetch(`${getApiBase()}/api/lookup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data?.error || 'Lookup failed. Try again.')
        return
      }
      setResult(data)
    } catch (err) {
      setError('Could not connect. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          Heard New Vocab — Find Here more about it
        </h1>
        <p className="text-[var(--color-text-muted)] mb-8">
          Search any Japanese word or grammar. Get meaning, example sentences, and JLPT level.
        </p>

        <form onSubmit={handleSearch} className="mb-8">
          <div className="flex gap-3">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="たぶん / tabun /  grammar..."
              className="flex-1 rounded-xl border border-slate-200 bg-[var(--color-bg-card)] px-4 py-3 text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]/60 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 shadow-sm"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="px-6 py-3 rounded-xl bg-amber-500 text-white font-semibold hover:bg-amber-600 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Searching…' : 'Search'}
            </button>
          </div>
        </form>

        {error && (
          <p className="mb-6 text-red-600 text-sm">{error}</p>
        )}
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-slate-200 bg-[var(--color-bg-card)] p-6 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="inline-flex px-3 py-1 rounded-lg bg-amber-100 text-amber-700 text-sm font-medium">
                {result.level}
              </span>
              {(result.type === 'vocab' || result.type === 'grammar') && (
                <button className="text-sm font-medium text-amber-700 hover:text-amber-800">
                  Save to My Discovered
                </button>
              )}
            </div>
            <h2 className="text-2xl font-bold text-[var(--color-text)] mb-1" style={{ fontFamily: 'var(--font-jp)' }}>
              {result.type === 'vocab' && result.reading ? (
                <FuriganaText
                  text={`${result.word}(${result.reading})`}
                  className="font-bold"
                  style={{ fontFamily: 'var(--font-jp)' }}
                />
              ) : (
                result.type === 'grammar' ? result.name : result.word
              )}
            </h2>
            {result.type === 'grammar' && result.structure && (
              <p className="text-[var(--color-text-muted)] mb-4 font-mono text-sm">{result.structure}</p>
            )}
            <p className="text-[var(--color-text)]">{result.meaning}</p>
            <div className="mt-4 pt-4 border-t border-slate-200">
              <p className="text-sm font-medium text-[var(--color-text-muted)] mb-2">Examples</p>
              <ul className="space-y-2">
                {(result.examples || []).map((ex, i) => (
                  <li key={i} className="text-[var(--color-text)]" style={{ fontFamily: 'var(--font-jp)' }}>
                    {typeof ex === 'object' && ex?.jp ? (
                      <>
                        <FuriganaText text={ex.jp} />{ex.en ? ` (${ex.en})` : ''}
                      </>
                    ) : (
                      ex
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
