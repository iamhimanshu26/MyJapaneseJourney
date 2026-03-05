import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { FuriganaText } from '../components/FuriganaText'
import { PageMeta } from '../components/PageMeta'
import { useDiscovered } from '../hooks/useDiscovered'
import { useToast } from '../context/ToastContext'

function getApiBase() {
  if (typeof window === 'undefined') return ''
  return window.location.origin
}

export function LearnFromText() {
  const [file, setFile] = useState(null)
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const { save } = useDiscovered()
  const toast = useToast()

  const handleFile = useCallback((e) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setError(null)
    setResult(null)
    const reader = new FileReader()
    reader.onload = () => {
      const content = String(reader.result || '')
      setText(content.slice(0, 30000))
    }
    reader.onerror = () => {
      setError('Could not read file')
      setText('')
    }
    if (f.type === 'text/plain' || f.name.endsWith('.txt')) {
      reader.readAsText(f, 'UTF-8')
    } else {
      reader.readAsText(f)
    }
  }, [])

  async function handleExtract() {
    const content = text.trim()
    if (!content) {
      setError('Paste or upload some text first')
      return
    }
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch(`${getApiBase()}/api/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: content }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data?.error || 'Extraction failed')
        return
      }
      setResult(data)
    } catch (err) {
      setError('Could not connect. Check your connection.')
      toast.error('Connection failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveAll() {
    if (!result) return
    let saved = 0
    for (const v of result.vocab || []) {
      if (!v?.word) continue
      try {
        await save({
          type: 'vocab',
          word: String(v.word),
          reading: String(v.reading || ''),
          meaning: String(v.meaning || ''),
          level: String(v.level || 'N5'),
        })
        saved++
      } catch (_) {}
    }
    for (const g of result.grammar || []) {
      if (!g?.name) continue
      try {
        await save({
          type: 'grammar',
          name: String(g.name),
          structure: String(g.structure || ''),
          meaning: String(g.meaning || ''),
          level: String(g.level || 'N5'),
          examples: g.example ? [{ jp: String(g.example), en: '' }] : [],
        })
        saved++
      } catch (_) {}
    }
    toast.success(`Saved ${saved} items to My Discovered`)
  }

  const hasResult = result && ((result.vocab?.length || 0) + (result.grammar?.length || 0)) > 0
  const vocabCount = result?.vocab?.length || 0
  const grammarCount = result?.grammar?.length || 0

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <PageMeta title="Learn from your text" description="Upload or paste text to extract vocabulary and grammar. Save to My Discovered." />
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold tracking-tight mb-2">Learn from your text</h1>
        <p className="text-[var(--color-text-muted)] mb-8">
          Upload a .txt file or paste Japanese text. We&apos;ll extract vocabulary and grammar for you to save.
        </p>

        <div className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-[var(--color-text-muted)] mb-2 block">Upload file (.txt)</span>
            <input
              type="file"
              accept=".txt,text/plain"
              onChange={handleFile}
              className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border file:border-amber-300 file:bg-amber-50 file:text-amber-800"
            />
          </label>
          <div>
            <span className="text-sm font-medium text-[var(--color-text-muted)] mb-2 block">Or paste text</span>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste your Japanese lesson, notes, or any text here..."
              className="w-full h-40 rounded-xl border border-slate-200 bg-[var(--color-bg-card)] px-4 py-3 text-[var(--color-text)] resize-none focus:outline-none focus:ring-2 focus:ring-amber-400"
              disabled={loading}
            />
          </div>
        </div>

        <button
          onClick={handleExtract}
          disabled={loading || !text.trim()}
          className="mt-6 px-6 py-3 rounded-xl bg-amber-500 text-white font-semibold hover:bg-amber-600 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Extracting…' : 'Extract vocab & grammar'}
        </button>

        {error && (
          <p className="mt-4 text-red-600 text-sm" role="alert">{error}</p>
        )}

        {hasResult && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 rounded-2xl border border-slate-200 bg-[var(--color-bg-card)] p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Found {vocabCount} words, {grammarCount} grammar</h3>
              <button
                onClick={handleSaveAll}
                className="text-sm font-medium text-amber-700 hover:text-amber-800"
              >
                Save all to My Discovered
              </button>
            </div>
            <div className="space-y-4 max-h-[400px] overflow-y-auto">
              {vocabCount > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-[var(--color-text-muted)] mb-2">Vocabulary</h4>
                  <ul className="space-y-2">
                    {(result.vocab || []).slice(0, 20).map((v, i) => (
                      <li key={i} className="flex gap-2 text-sm">
                        <span style={{ fontFamily: 'var(--font-jp)' }}>
                          {v.reading ? <FuriganaText text={`${v.word}(${v.reading})`} /> : v.word}
                        </span>
                        <span className="text-[var(--color-text-muted)]">— {v.meaning}</span>
                      </li>
                    ))}
                    {vocabCount > 20 && (
                      <li className="text-[var(--color-text-muted)]">+ {vocabCount - 20} more</li>
                    )}
                  </ul>
                </div>
              )}
              {grammarCount > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-[var(--color-text-muted)] mb-2">Grammar</h4>
                  <ul className="space-y-2">
                    {(result.grammar || []).slice(0, 10).map((g, i) => (
                      <li key={i} className="text-sm">
                        <span className="font-medium">{g.name}</span>
                        <span className="text-[var(--color-text-muted)]"> — {g.meaning}</span>
                      </li>
                    ))}
                    {grammarCount > 10 && (
                      <li className="text-[var(--color-text-muted)]">+ {grammarCount - 10} more</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
