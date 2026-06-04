import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { FuriganaText } from '../components/FuriganaText'
import { PageMeta } from '../components/PageMeta'
import { useDiscovered } from '../hooks/useDiscovered'
import { useToast } from '../context/ToastContext'
import { addVocabBatch } from '../lib/userVocab'
import { addVerbBatch } from '../lib/userVerbs'
import { addGrammarBatch } from '../lib/userGrammar'
import { addKanjiBatch } from '../lib/userKanji'
import { isSingleKanji, isVerb } from '../lib/vocabClassifier'

function getApiBase() {
  if (typeof window === 'undefined') return ''
  return window.location.origin
}

export function LearnFromText() {
  const [file, setFile] = useState(null)
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState(null)
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
      setText(content.slice(0, 50000))
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
    const chunkSize = 6000
    const estimatedChunks = Math.ceil(content.length / chunkSize) || 1
    setLoadingProgress(estimatedChunks > 1 ? `Processing ${estimatedChunks} chunks…` : 'Extracting…')
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
      setLoadingProgress(null)
      if (data && ((data.vocab?.length || 0) + (data.grammar?.length || 0) + (data.kanji?.length || 0)) > 0) {
        performSaveAll(data)
      }
    } catch (err) {
      setError('Could not connect. Check your connection.')
      toast.error('Connection failed')
      setLoadingProgress(null)
    } finally {
      setLoading(false)
    }
  }

  const performSaveAll = useCallback(async (data) => {
    if (!data) return
    let vocabAdded = 0
    let verbAdded = 0
    let grammarAdded = 0
    let kanjiAdded = 0

    const rawVocab = (data.vocab || []).map((v) => ({
      word: v.word,
      reading: v.reading || '',
      meaning: v.meaning || '',
      level: v.level || 'N5',
      examples: v.examples || [],
      partOfSpeech: v.partOfSpeech,
    }))

    const vocabOnly = rawVocab.filter((v) => !isSingleKanji(v.word) && !isVerb(v))
    const verbsOnly = rawVocab.filter((v) => isVerb(v))
    const singleKanjiFromVocab = rawVocab.filter((v) => isSingleKanji(v.word))

    vocabAdded = addVocabBatch(vocabOnly)
    verbAdded = addVerbBatch(verbsOnly)

    // Save to Kanji: from kanji array + single-char from vocab
    const kanjiItems = [
      ...(data.kanji || []).map((k) => ({
        char: k.char,
        reading: k.reading || '',
        meaning: k.meaning || '',
        level: k.level || 'N5',
        onyomi: k.onyomi || '',
        kunyomi: k.kunyomi || '',
        onExamples: k.onExamples || [],
        kunExamples: k.kunExamples || [],
        examples: k.examples || [],
      })),
      ...singleKanjiFromVocab.map((v) => ({
        char: v.word,
        reading: v.reading,
        meaning: v.meaning,
        level: v.level,
        onyomi: '',
        kunyomi: '',
        onExamples: [],
        kunExamples: [],
        examples: [],
      })),
    ]
    kanjiAdded = addKanjiBatch(kanjiItems)

    // Save to Grammar
    grammarAdded = addGrammarBatch(
      (data.grammar || []).map((g) => ({
        name: g.name,
        structure: g.structure || '',
        meaning: g.meaning || '',
        level: g.level || 'N5',
        example: g.example || '',
      }))
    )

    // Save to Kanji
    kanjiAdded = addKanjiBatch(
      (data.kanji || []).map((k) => ({
        char: k.char,
        reading: k.reading || '',
        meaning: k.meaning || '',
        level: k.level || 'N5',
        onyomi: k.onyomi || '',
        kunyomi: k.kunyomi || '',
        onExamples: k.onExamples || [],
        kunExamples: k.kunExamples || [],
        examples: k.examples || [],
      }))
    )

    // Save all to My Discovered
    for (const v of data.vocab || []) {
      if (!v?.word) continue
      try {
        await save({ type: 'vocab', word: String(v.word), reading: String(v.reading || ''), meaning: String(v.meaning || ''), level: String(v.level || 'N5') })
      } catch (_) {}
    }
    for (const g of data.grammar || []) {
      if (!g?.name) continue
      try {
        await save({ type: 'grammar', name: String(g.name), structure: String(g.structure || ''), meaning: String(g.meaning || ''), level: String(g.level || 'N5'), examples: g.example ? [{ jp: String(g.example), en: '' }] : [] })
      } catch (_) {}
    }
    for (const k of data.kanji || []) {
      if (!k?.char) continue
      try {
        await save({ type: 'kanji', char: String(k.char), reading: String(k.reading || ''), meaning: String(k.meaning || ''), level: String(k.level || 'N5') })
      } catch (_) {}
    }

    const parts = []
    if (vocabAdded) parts.push(`${vocabAdded} to Vocab`)
    if (verbAdded) parts.push(`${verbAdded} to Verbs`)
    if (grammarAdded) parts.push(`${grammarAdded} to Grammar`)
    if (kanjiAdded) parts.push(`${kanjiAdded} to Kanji`)
    if (parts.length) toast.success(`Saved ${parts.join(', ')} and all to My Discovered`)
  }, [save, toast])

  async function handleSaveAll() {
    if (!result) return
    await performSaveAll(result)
  }

  const hasResult = result && ((result.vocab?.length || 0) + (result.grammar?.length || 0) + (result.kanji?.length || 0)) > 0
  const vocabCount = result?.vocab?.length || 0
  const grammarCount = result?.grammar?.length || 0
  const kanjiCount = result?.kanji?.length || 0

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <PageMeta title="Learn from your text" description="Upload or paste text to extract vocabulary and grammar. Save to My Discovered." />
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="mb-2 text-3xl font-semibold">Learn from your text</h1>
        <p className="mb-8 text-sm text-slate-600">
          Upload a .txt file or paste Japanese text. We&apos;ll extract vocabulary and grammar for you to save.
        </p>

        <div className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-600">Upload file (.txt)</span>
            <input
              type="file"
              accept=".txt,text/plain"
              onChange={handleFile}
              className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border file:border-amber-300 file:bg-amber-50 file:text-amber-800"
            />
          </label>
          <div>
            <span className="mb-2 block text-sm font-medium text-slate-600">Or paste text</span>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste your Japanese lesson, notes, or any text here..."
              className="h-40 w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
              disabled={loading}
            />
          </div>
        </div>

        <button
          onClick={handleExtract}
          disabled={loading || !text.trim()}
          className="mt-6 flex min-h-[40px] items-center justify-center gap-2 rounded-lg bg-amber-500 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-600 disabled:opacity-50"
        >
          {loading ? (
            <>
              <span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden />
              {loadingProgress || 'Extracting…'}
            </>
          ) : (
            'Extract vocab, grammar & kanji'
          )}
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
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h3 className="text-base font-medium text-slate-900">Found {vocabCount} words, {grammarCount} grammar, {kanjiCount} kanji</h3>
              <button
                onClick={handleSaveAll}
                className="text-sm font-medium text-amber-700 hover:text-amber-800"
              >
                Save again to Vocabulary, Grammar, Kanji & My Discovered
              </button>
            </div>
            <div className="space-y-4 max-h-[400px] overflow-y-auto">
              {vocabCount > 0 && (
                <div>
                  <h4 className="mb-2 text-sm font-medium text-slate-600">Vocabulary</h4>
                  <ul className="space-y-2">
                    {(result.vocab || []).slice(0, 20).map((v, i) => (
                      <li key={i} className="flex gap-2 text-sm">
                        <span style={{ fontFamily: 'var(--font-jp)' }}>
                          {v.reading ? <FuriganaText text={`${v.word}(${v.reading})`} /> : v.word}
                        </span>
                        <span className="text-slate-600">— {v.meaning}</span>
                      </li>
                    ))}
                    {vocabCount > 20 && (
                      <li className="text-slate-600">+ {vocabCount - 20} more</li>
                    )}
                  </ul>
                </div>
              )}
              {grammarCount > 0 && (
                <div>
                  <h4 className="mb-2 text-sm font-medium text-slate-600">Grammar</h4>
                  <ul className="space-y-2">
                    {(result.grammar || []).slice(0, 10).map((g, i) => (
                      <li key={i} className="text-sm">
                        <span className="font-medium">{g.name}</span>
                        <span className="text-slate-600"> — {g.meaning}</span>
                      </li>
                    ))}
                    {grammarCount > 10 && (
                      <li className="text-slate-600">+ {grammarCount - 10} more</li>
                    )}
                  </ul>
                </div>
              )}
              {kanjiCount > 0 && (
                <div>
                  <h4 className="mb-2 text-sm font-medium text-slate-600">Kanji</h4>
                  <ul className="space-y-2">
                    {(result.kanji || []).slice(0, 15).map((k, i) => (
                      <li key={i} className="flex gap-2 text-sm">
                        <span style={{ fontFamily: 'var(--font-jp)' }}>
                          {k.reading ? <FuriganaText text={`${k.char}(${k.reading})`} /> : k.char}
                        </span>
                        <span className="text-slate-600">— {k.meaning}</span>
                      </li>
                    ))}
                    {kanjiCount > 15 && (
                      <li className="text-slate-600">+ {kanjiCount - 15} more</li>
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
