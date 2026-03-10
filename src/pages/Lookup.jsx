import { useState, useEffect, useRef, useMemo } from 'react'
import { motion } from 'framer-motion'
import { FuriganaText } from '../components/FuriganaText'
import { PageMeta } from '../components/PageMeta'
import { useDiscovered } from '../hooks/useDiscovered'
import { useToast } from '../context/ToastContext'
import { getLookupHistory, addToHistory, clearLookupHistory } from '../lib/lookupHistory'
import { VOCAB_BY_LEVEL } from '../data/vocab'
import { GRAMMAR_BY_LEVEL } from '../data/grammar'
import { getUserVocabByLevel, addVocab } from '../lib/userVocab'
import { getUserGrammarByLevel } from '../lib/userGrammar'

function getApiBase() {
  if (typeof window === 'undefined') return ''
  return window.location.origin
}

function getAllSuggestions() {
  const vocab = []
  for (const level of ['N5', 'N4', 'N3', 'N2', 'N1']) {
    const seed = VOCAB_BY_LEVEL[level] || []
    const user = getUserVocabByLevel()[level] || []
    for (const v of [...seed, ...user]) {
      vocab.push({ term: v.word, reading: v.reading, type: 'vocab' })
      if (v.reading) vocab.push({ term: v.reading, reading: v.reading, type: 'vocab' })
    }
  }
  const grammar = []
  for (const level of ['N5', 'N4', 'N3', 'N2', 'N1']) {
    const seed = GRAMMAR_BY_LEVEL[level] || []
    const user = getUserGrammarByLevel()[level] || []
    for (const g of [...seed, ...user]) {
      grammar.push({ term: g.name, type: 'grammar' })
    }
  }
  const history = getLookupHistory().map((h) => ({ term: h.query, type: 'history' }))
  return { vocab, grammar, history }
}

function getSuggestions(query, all, limit = 8) {
  const q = (query || '').trim().toLowerCase()
  if (!q || q.length < 1) return []
  const seen = new Set()
  const out = []
  const historyEntries = getLookupHistory()
  const add = (item) => {
    const key = `${item.term}|${item.type}`
    if (seen.has(key)) return
    seen.add(key)
    out.push(item)
    return out.length < limit
  }
  for (const h of all.history) {
    if (h.term.toLowerCase().includes(q) || h.term.includes(q)) {
      const entry = historyEntries.find((e) => e.query.toLowerCase() === h.term.toLowerCase())
      if (!add({ ...h, result: entry?.result })) return out
    }
  }
  for (const v of all.vocab) {
    if (v.term.toLowerCase().includes(q) || v.term.includes(q) || (v.reading && v.reading.includes(q))) {
      if (!add({ term: v.term, reading: v.reading, type: 'vocab' })) return out
    }
  }
  for (const g of all.grammar) {
    if (g.term.toLowerCase().includes(q) || g.term.includes(q)) {
      if (!add(g)) return out
    }
  }
  return out
}

export function Lookup() {
  const [query, setQuery] = useState('')
  const [result, setResult] = useState(null)
  const [history, setHistory] = useState([])
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [activeIndex, setActiveIndex] = useState(-1)
  const { save, checkSaved } = useDiscovered()
  const toast = useToast()
  const inputRef = useRef(null)
  const suggestionsRef = useRef(null)

  const saved = result ? checkSaved(result) : false
  const allSuggestions = useMemo(() => getAllSuggestions(), [result])

  useEffect(() => {
    setHistory(getLookupHistory())
  }, [result])

  useEffect(() => {
    setSuggestions(getSuggestions(query, allSuggestions, 12))
  }, [query, allSuggestions])

  useEffect(() => {
    setActiveIndex(-1)
  }, [query])

  useEffect(() => {
    if (activeIndex >= 0 && suggestionsRef.current) {
      const el = suggestionsRef.current.querySelector(`#suggestion-${activeIndex}`)
      el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [activeIndex])

  useEffect(() => {
    function handleClickOutside(e) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target) && inputRef.current && !inputRef.current.contains(e.target)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleKeyDown(e) {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'Escape') setShowSuggestions(false)
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => (i < suggestions.length - 1 ? i + 1 : 0))
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1))
      return
    }
    if (e.key === 'Enter' && activeIndex >= 0 && suggestions[activeIndex]) {
      e.preventDefault()
      handleSuggestionClick(suggestions[activeIndex].term, suggestions[activeIndex].result)
      return
    }
    if (e.key === 'Escape') {
      setShowSuggestions(false)
      setActiveIndex(-1)
      inputRef.current?.blur()
    }
  }

  async function handleSave() {
    if (!result) return
    try {
      await save(result)
      if (result.type === 'vocab' && result.word) {
        addVocab({ word: result.word, reading: result.reading, meaning: result.meaning, level: result.level || 'N5' })
      }
      const level = result.level || 'N5'
      toast.success(result.type === 'vocab' ? `Saved to ${level} Vocabs` : 'Saved to My Discovered')
    } catch {
      toast.error('Could not save')
    }
  }

  async function handleSearch(e) {
    e?.preventDefault()
    const q = query.trim()
    if (!q) return
    setLoading(true)
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
      addToHistory(q, data)
      setHistory(getLookupHistory())
      await saveResult(data)
    } catch (err) {
      setError('Could not connect. Check your connection and try again.')
      toast.error('Connection failed')
    } finally {
      setLoading(false)
    }
  }

  function handleSuggestionClick(term, resultFromHistory) {
    setQuery(term)
    if (resultFromHistory) {
      setResult(resultFromHistory)
      // Auto-save when viewing from history/suggestions too
      saveResult(resultFromHistory)
    }
    setShowSuggestions(false)
    inputRef.current?.focus()
  }

  async function saveResult(data) {
    if (!data || (data.type !== 'vocab' && data.type !== 'grammar')) return
    try {
      await save(data)
      if (data.type === 'vocab' && data.word) {
        const level = data.level && ['N5', 'N4', 'N3', 'N2', 'N1'].includes(data.level) ? data.level : 'N5'
        const examples = (data.examples || []).slice(0, 3).map((ex) =>
          typeof ex === 'object' ? { jp: ex?.jp || '', en: ex?.en || '' } : { jp: String(ex), en: '' }
        )
        addVocab({ word: data.word, reading: data.reading, meaning: data.meaning, level, examples })
      }
    } catch (_) {}
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <PageMeta title="Heard New Vocab" description="Search any Japanese word or grammar. Get meaning, examples, and JLPT level." />
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

        <form onSubmit={handleSearch} className="mb-8 relative">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setShowSuggestions(true)
                }}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={handleKeyDown}
                placeholder="たぶん / tabun /  grammar..."
                className="w-full rounded-xl border border-slate-200 bg-[var(--color-bg-card)] px-4 py-3 text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]/60 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 shadow-sm"
                disabled={loading}
                aria-label="Search Japanese word or grammar"
                aria-autocomplete="list"
                aria-expanded={showSuggestions && suggestions.length > 0}
                aria-activedescendant={activeIndex >= 0 ? `suggestion-${activeIndex}` : undefined}
                aria-controls="lookup-suggestions"
              />
              {showSuggestions && suggestions.length > 0 && (
                <ul
                  id="lookup-suggestions"
                  ref={suggestionsRef}
                  className="absolute top-full left-0 right-0 mt-1 rounded-xl border border-slate-200 bg-white shadow-lg py-2 z-50 max-h-56 overflow-y-auto"
                  role="listbox"
                >
                  {suggestions.map((s, i) => (
                    <li
                      key={`${s.term}-${i}`}
                      id={`suggestion-${i}`}
                      role="option"
                      aria-selected={i === activeIndex}
                      tabIndex={-1}
                      onClick={() => handleSuggestionClick(s.term, s.result)}
                      onMouseEnter={() => setActiveIndex(i)}
                      className={`px-4 py-2.5 cursor-pointer text-[var(--color-text)] flex justify-between min-h-[44px] items-center ${i === activeIndex ? 'bg-amber-50' : 'hover:bg-amber-50/50'}`}
                    >
                      <span style={s.type === 'vocab' ? { fontFamily: 'var(--font-jp)' } : {}}>{s.term}</span>
                      {s.reading && <span className="text-sm text-[var(--color-text-muted)]">{s.reading}</span>}
                      {s.type === 'history' && <span className="text-xs text-amber-600">Recent</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="px-6 py-3 rounded-xl bg-amber-500 text-white font-semibold hover:bg-amber-600 disabled:opacity-50 transition-colors shrink-0"
            >
              {loading ? 'Searching…' : 'Search'}
            </button>
          </div>
        </form>

        {error && (
          <p className="mb-6 text-red-600 text-sm" role="alert">{error}</p>
        )}

        {/* Current result */}
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-slate-200 bg-[var(--color-bg-card)] p-6 shadow-sm mb-8"
          >
            <p className="text-xs text-[var(--color-text-muted)] mb-2">Current result</p>
            <div className="flex items-center justify-between mb-4">
              <span className="inline-flex px-3 py-1 rounded-lg bg-amber-100 text-amber-700 text-sm font-medium">
                {result.level}
              </span>
              {(result.type === 'vocab' || result.type === 'grammar') && (
                <button
                  onClick={handleSave}
                  disabled={saved}
                  className="text-sm font-medium text-amber-700 hover:text-amber-800 disabled:opacity-50"
                >
                  {result.type === 'vocab'
                    ? (saved ? `Saved to ${result.level || 'N5'} Vocabs` : `Save to ${result.level || 'N5'} Vocabs`)
                    : (saved ? 'Saved' : 'Save to My Discovered')}
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
              <ul className="space-y-3 examples-with-furigana">
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

        {/* Previous results (history) */}
        {history.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
                Previous searches
              </h3>
              <button
                onClick={() => { clearLookupHistory(); setHistory([]); setResult(null); setQuery(''); }}
                className="text-xs text-[var(--color-text-muted)] hover:text-red-600"
              >
                Clear history
              </button>
            </div>
            <div className="space-y-3">
              {history.filter((h) => h.query !== query.trim() || !result).slice(0, 10).map((h, i) => (
                <motion.div
                  key={`${h.query}-${h.at}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => {
                    setQuery(h.query)
                    setResult(h.result)
                    saveResult(h.result)
                  }}
                  className="rounded-xl border border-slate-200 bg-[var(--color-bg-card)] p-4 cursor-pointer hover:border-amber-300 hover:bg-amber-50/30 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium" style={{ fontFamily: 'var(--font-jp)' }}>
                        {h.result.type === 'vocab' && h.result.reading ? (
                          <FuriganaText text={`${h.result.word}(${h.result.reading})`} />
                        ) : (
                          h.result.type === 'grammar' ? h.result.name : h.result.word
                        )}
                      </p>
                      <p className="text-sm text-[var(--color-text-muted)]">{h.result.meaning}</p>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600">{h.result.level}</span>
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