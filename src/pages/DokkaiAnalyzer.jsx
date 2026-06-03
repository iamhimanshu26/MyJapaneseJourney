import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { PageMeta } from '../components/PageMeta'
import { SectionHeader } from '../components/shared/SectionHeader'
import { LoadingState } from '../components/shared/LoadingState'
import { DokkaiResult } from '../components/ai/DokkaiResult'
import { useDiscovered } from '../hooks/useDiscovered'
import { apiRequest } from '../lib/apiClient'
import { useToast } from '../context/ToastContext'

export function DokkaiAnalyzer() {
  const { identity, save } = useDiscovered()
  const [text, setText] = useState('')
  const [analysis, setAnalysis] = useState(null)
  const [history, setHistory] = useState([])
  const [quizOpen, setQuizOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const data = await apiRequest('/api/analyze-dokkai', { method: 'GET', identity })
        if (mounted) setHistory(data.items || [])
      } catch (_) {}
    })()
    return () => {
      mounted = false
    }
  }, [identity])

  async function handleAnalyze() {
    if (!text.trim()) return
    setLoading(true)
    try {
      const data = await apiRequest('/api/analyze-dokkai', {
        method: 'POST',
        identity,
        body: { text },
      })
      setAnalysis(data)
      setHistory((prev) => [{ ...data, created_at: new Date().toISOString() }, ...prev].slice(0, 10))
    } catch (err) {
      toast.error(err.message || 'Failed to analyze reading passage')
    } finally {
      setLoading(false)
    }
  }

  async function saveVocabulary() {
    if (!analysis?.vocabulary?.length) return
    for (const word of analysis.vocabulary) {
      await save({
        type: 'vocabulary',
        word: word.word,
        reading: word.reading,
        meaning_en: word.meaning_en,
        jlpt_level: word.jlpt_level || analysis.estimated_jlpt_level || 'N4',
        status: 'new',
      })
    }
    toast.success('Vocabulary saved to My Discovered')
  }

  async function saveGrammar() {
    if (!analysis?.grammar_points?.length) return
    for (const grammar of analysis.grammar_points) {
      await save({
        type: 'grammar',
        word: grammar.name,
        meaning_en: grammar.meaning,
        jlpt_level: grammar.level || analysis.estimated_jlpt_level || 'N4',
        status: 'new',
      })
    }
    toast.success('Grammar points saved to My Discovered')
  }

  async function saveKanji() {
    if (!analysis?.kanji?.length) return
    for (const kanji of analysis.kanji) {
      await save({
        type: 'kanji',
        word: kanji.char,
        reading: kanji.reading,
        meaning_en: kanji.meaning_en,
        jlpt_level: analysis.estimated_jlpt_level || 'N4',
        status: 'new',
      })
    }
    toast.success('Kanji saved to My Discovered')
  }

  async function saveAllExtracted() {
    await saveVocabulary()
    await saveGrammar()
    await saveKanji()
    toast.success('All extracted decks saved')
  }

  function copyAnalysis() {
    if (!analysis) return
    const content = JSON.stringify(analysis, null, 2)
    navigator.clipboard.writeText(content)
    toast.success('Analysis copied to clipboard')
  }

  function generateQuiz() {
    if (!analysis?.practice_questions?.length) return
    setQuizOpen(true)
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageMeta title="Dokkai Analyzer" description="AI analysis for Japanese reading passages with vocabulary and grammar extraction." />
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <SectionHeader
          title="Dokkai Analyzer"
          subtitle="Paste Japanese text and get translation, extracted vocabulary/grammar, JLPT estimate, and practice questions."
        />

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste Japanese reading text here..."
            className="h-48 w-full rounded-xl border border-slate-700 bg-slate-950/70 p-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={loading || !text.trim()}
            className="mt-4 rounded-lg bg-gradient-to-r from-blue-500 to-violet-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {loading ? 'Analyzing...' : 'Analyze Dokkai Text'}
          </button>
        </div>

        {loading ? <div className="mt-4"><LoadingState title="Analyzing text..." subtitle="Generating structured dokkai insights." /></div> : null}
        {analysis ? (
          <div className="mt-5">
            <DokkaiResult
              analysis={analysis}
              onSaveVocabulary={saveVocabulary}
              onSaveGrammar={saveGrammar}
              onSaveKanji={saveKanji}
              onSaveAll={saveAllExtracted}
              onCopy={copyAnalysis}
              onGenerateQuiz={generateQuiz}
            />
          </div>
        ) : null}

        {quizOpen && analysis?.practice_questions?.length ? (
          <section className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-[0.1em] text-slate-300">Generated Practice Quiz</h3>
              <button type="button" onClick={() => setQuizOpen(false)} className="text-xs text-slate-400 hover:text-slate-200">Close</button>
            </div>
            <ol className="space-y-3 text-sm text-slate-200">
              {analysis.practice_questions.map((item, idx) => (
                <li key={`${item.question}-${idx}`} className="rounded-lg border border-slate-700 bg-slate-950/60 p-3">
                  <p>{idx + 1}. {item.question}</p>
                  <p className="mt-1 text-xs text-slate-400">Answer: {item.answer}</p>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        {history.length ? (
          <section className="mt-5 rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
            <h3 className="text-sm font-semibold uppercase tracking-[0.1em] text-slate-300">Recent Dokkai Analyses</h3>
            <div className="mt-3 space-y-2">
              {history.slice(0, 6).map((item, idx) => (
                <button
                  key={`${item.created_at}-${idx}`}
                  type="button"
                  onClick={() => setAnalysis({
                    original_text: item.input_text || item.original_text,
                    romaji: item.romaji,
                    english_translation: item.english_translation,
                    summary: item.summary,
                    estimated_jlpt_level: item.estimated_jlpt_level,
                    difficulty_score: item.difficulty_score,
                    reading_speed_wpm: item.reading_speed_wpm,
                    summary_quality_score: item.summary_quality_score,
                    vocabulary: item.vocabulary || item.vocabulary_json || [],
                    kanji: item.kanji || item.kanji_json || [],
                    grammar_points: item.grammar_points || item.grammar_json || [],
                    practice_questions: item.practice_questions || item.questions_json || [],
                  })}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-left text-sm text-slate-200 hover:border-blue-400"
                >
                  <p className="line-clamp-1">{item.summary || item.input_text || 'Dokkai analysis'}</p>
                  <p className="text-xs text-slate-500">{(item.estimated_jlpt_level || 'N4')} • {item.created_at ? new Date(item.created_at).toLocaleString() : ''}</p>
                </button>
              ))}
            </div>
          </section>
        ) : null}
      </motion.div>
    </div>
  )
}
