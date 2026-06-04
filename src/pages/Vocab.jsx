import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HeardNewVocabCta } from '../components/HeardNewVocabCta'
import { Flashcard } from '../components/Flashcard'
import { PageMeta } from '../components/PageMeta'
import { FuriganaText } from '../components/FuriganaText'
import { KanjiPopup } from '../components/KanjiPopup'
import { KanjiThumbnail } from '../components/KanjiThumbnail'
import { VOCAB_BY_LEVEL } from '../data/vocab'
import { getUserVocabByLevel } from '../lib/userVocab'
import { getUserVerbsByLevel } from '../lib/userVerbs'
import { getUserKanjiByLevel, updateKanji } from '../lib/userKanji'
import { isSingleKanji, isVerb } from '../lib/vocabClassifier'
import { sortKanjiByLearningOrder } from '../data/kanjiOrder'
import { useToast } from '../context/ToastContext'

const LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1']

function mergeVocab(seed, user) {
  const seen = new Set()
  const out = []
  for (const item of [...(seed || []), ...(user || [])]) {
    const key = `${item.word}|${item.reading || ''}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(item)
  }
  return out
}

function VocabItem({ item, index, type, onKanjiClick }) {
  const [expanded, setExpanded] = useState(false)
  const examples = item.examples || []
  const onExamples = (type === 'kanji' && item.onExamples) || []
  const kunExamples = (type === 'kanji' && item.kunExamples) || []
  const allExamples = type === 'vocab' ? examples : [...onExamples, ...kunExamples, ...examples].slice(0, 5)

  const handleClick = () => {
    if (type === 'kanji' && onKanjiClick) {
      onKanjiClick(item)
      return
    }
    setExpanded((e) => !e)
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.03 }}
      className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900/80 transition-all hover:border-blue-400 hover:shadow-md"
    >
      <button
        type="button"
        onClick={handleClick}
        className="w-full text-left flex items-center justify-between px-4 py-3 hover:bg-slate-800/70"
      >
        <div className="flex items-center gap-3">
          {type === 'kanji' ? (
            <KanjiThumbnail char={item.char} />
          ) : (
            <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg border border-blue-400/40 bg-blue-500/10">
              <span style={{ fontFamily: 'var(--font-jp)' }} className="text-2xl font-bold text-slate-100">
                {item.word}
              </span>
            </span>
          )}
          <div>
            <span style={{ fontFamily: 'var(--font-jp)' }} className="block font-medium text-slate-100">
              {type === 'kanji' ? (
                item.reading ? <FuriganaText text={`${item.char}(${item.reading})`} /> : item.char
              ) : (
                item.reading ? <FuriganaText text={`${item.word}(${item.reading})`} /> : item.word
              )}
            </span>
            <span className="text-sm text-slate-400">{item.meaning}</span>
          </div>
        </div>
        <span className="shrink-0 text-lg font-medium text-blue-300" title={type === 'kanji' ? 'Click for details' : 'Click to expand examples'}>
          {type === 'kanji' && onKanjiClick ? '▶' : (expanded ? '▲' : '▼')}
        </span>
      </button>
      {type !== 'kanji' && (
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-slate-700"
            >
              <div className="space-y-2 bg-slate-950/60 px-4 py-3 pl-16">
                {allExamples.length > 0 ? (
                  allExamples.slice(0, 3).map((ex, i) => (
                    <p key={i} className="text-sm text-[var(--color-text-muted)] examples-with-furigana" style={{ fontFamily: 'var(--font-jp)' }}>
                      {typeof ex === 'object' ? <><FuriganaText text={ex.jp || ''} />{ex.en ? ` (${ex.en})` : ''}</> : ex}
                    </p>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">No examples yet. Save from Lookup for examples.</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </motion.div>
  )
}

export function Vocab() {
  const [selectedLevel, setSelectedLevel] = useState(null)
  const [mode, setMode] = useState('select')
  const [activeTab, setActiveTab] = useState('vocabs')
  const [selectedKanji, setSelectedKanji] = useState(null)
  const [enriching, setEnriching] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const toast = useToast()

  const vocabItems = useMemo(() => {
    if (!selectedLevel) return []
    const seed = (VOCAB_BY_LEVEL[selectedLevel] || []).filter((v) => !isSingleKanji(v.word) && !isVerb(v))
    const user = (getUserVocabByLevel()[selectedLevel] || []).filter((v) => !isSingleKanji(v.word) && !isVerb(v))
    return mergeVocab(seed, user)
  }, [selectedLevel])

  const verbItems = useMemo(() => {
    if (!selectedLevel) return []
    const seed = (VOCAB_BY_LEVEL[selectedLevel] || []).filter((v) => isVerb(v))
    const user = getUserVerbsByLevel()[selectedLevel] || []
    return mergeVocab(seed, user)
  }, [selectedLevel])

  const kanjiItems = useMemo(() => {
    if (!selectedLevel) return []
    void refreshKey
    const seedKanji = (VOCAB_BY_LEVEL[selectedLevel] || [])
      .filter((v) => isSingleKanji(v.word))
      .map((v) => ({ char: v.word, reading: v.reading, meaning: v.meaning, level: v.level }))
    const userKanji = getUserKanjiByLevel()[selectedLevel] || []
    const merged = []
    const seen = new Set()
    for (const k of [...seedKanji, ...userKanji]) {
      if (k.char && !seen.has(k.char)) {
        seen.add(k.char)
        merged.push(k)
      }
    }
    return sortKanjiByLearningOrder(merged)
  }, [selectedLevel, refreshKey])

  const kanjiNeedingEnrichment = useMemo(
    () => kanjiItems.filter((k) => !k.onyomi && !k.kunyomi && (!k.onExamples?.length) && (!k.kunExamples?.length)),
    [kanjiItems]
  )

  async function handleEnrichKanji() {
    if (kanjiNeedingEnrichment.length === 0) {
      toast.success('All kanji already have readings and examples.')
      return
    }
    setEnriching(true)
    let done = 0
    for (const k of kanjiNeedingEnrichment.slice(0, 10)) {
      try {
        const res = await fetch(`${typeof window !== 'undefined' ? window.location.origin : ''}/api/enrichKanji`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ char: k.char }),
        })
        const data = await res.json()
        if (res.ok && data.onyomi) {
          updateKanji(k.char, {
            onyomi: data.onyomi,
            kunyomi: data.kunyomi,
            onExamples: data.onExamples || [],
            kunExamples: data.kunExamples || [],
          })
          done++
        }
        await new Promise((r) => setTimeout(r, 500))
      } catch {
        // Ignore failed enrichment for individual kanji and continue batch.
      }
    }
    setEnriching(false)
    if (done > 0) setRefreshKey((k) => k + 1)
    toast.success(done > 0 ? `Enriched ${done} kanji with readings and examples` : 'Could not enrich. Try again.')
    if (done > 0) setSelectedKanji(null)
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageMeta title="Vocabulary" description="Practice JLPT vocabulary with flashcards. N5 to N1." />
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="mb-2 text-3xl font-bold tracking-tight">Vocabulary</h1>
        <p className="mb-8 text-slate-400">Practice flashcards by JLPT level.</p>

        <HeardNewVocabCta compact />

        {mode === 'select' ? (
          <>
            <div className="mb-6 flex flex-wrap gap-3">
              {LEVELS.map((level, i) => (
                <motion.button
                  key={level}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 + i * 0.03 }}
                  onClick={() => setSelectedLevel(level)}
                  className={`rounded-xl border px-5 py-2.5 font-medium transition-colors ${
                    selectedLevel === level ? 'border-blue-400 bg-blue-500/15 text-blue-100' : 'border-slate-700 bg-slate-900/80 text-slate-200 hover:border-blue-400'
                  }`}
                >
                  {level}
                </motion.button>
              ))}
            </div>

            {selectedLevel ? (
              <>
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => setActiveTab('kanji')}
                    className={`rounded-lg px-4 py-2 font-medium transition-colors ${activeTab === 'kanji' ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'}`}
                  >
                    Kanji
                  </button>
                  <button
                    onClick={() => setActiveTab('vocabs')}
                    className={`rounded-lg px-4 py-2 font-medium transition-colors ${activeTab === 'vocabs' ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'}`}
                  >
                    Vocab
                  </button>
                  <button
                    onClick={() => setActiveTab('verbs')}
                    className={`rounded-lg px-4 py-2 font-medium transition-colors ${activeTab === 'verbs' ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'}`}
                  >
                    Verbs
                  </button>
                </div>

                {activeTab === 'vocabs' ? (
                  vocabItems.length > 0 ? (
                    <div>
                      <p className="mb-4 text-lg font-semibold text-slate-200">{vocabItems.length} words in {selectedLevel}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
                        {vocabItems.map((v, i) => (
                          <VocabItem key={`${v.word}-${v.reading || ''}-${i}`} item={v} index={i} type="vocab" />
                        ))}
                      </div>
                      <button onClick={() => { setMode('flashcards'); }} className="rounded-xl bg-blue-500 px-6 py-3 font-semibold text-white hover:bg-blue-600">
                        Start flashcards
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-[var(--color-text-muted)]">No vocab for {selectedLevel} yet. Words (not single kanji) go here. Search or extract to add.</p>
                  )
                ) : activeTab === 'verbs' ? (
                  verbItems.length > 0 ? (
                    <div>
                      <p className="mb-4 text-lg font-semibold text-slate-200">{verbItems.length} verbs in {selectedLevel}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
                        {verbItems.map((v, i) => (
                          <VocabItem key={`${v.word}-${v.reading || ''}-${i}`} item={v} index={i} type="vocab" />
                        ))}
                      </div>
                      <button onClick={() => { setMode('flashcards'); }} className="rounded-xl bg-blue-500 px-6 py-3 font-semibold text-white hover:bg-blue-600">
                        Start flashcards
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-[var(--color-text-muted)]">No verbs for {selectedLevel} yet. Save verbs like 来る, する from Lookup.</p>
                  )
                ) : (
                  kanjiItems.length > 0 ? (
                    <div>
                      <div className="flex flex-wrap items-center gap-3 mb-4">
                        <p className="text-lg font-semibold text-slate-200">{kanjiItems.length} Kanji in {selectedLevel}</p>
                        {kanjiNeedingEnrichment.length > 0 && (
                          <button
                            onClick={handleEnrichKanji}
                            disabled={enriching}
                            className="text-sm px-3 py-1.5 rounded-lg bg-amber-100 text-amber-800 hover:bg-amber-200 disabled:opacity-50 transition-colors"
                          >
                            {enriching ? 'Enriching…' : `Add readings to ${kanjiNeedingEnrichment.length} kanji`}
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-6" role="list">
                        {kanjiItems.map((k, i) => (
                          <VocabItem key={`${k.char}-${i}`} item={k} index={i} type="kanji" onKanjiClick={setSelectedKanji} />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-[var(--color-text-muted)]">No kanji for {selectedLevel} yet. Extract from text to add kanji.</p>
                  )
                )}
              </>
            ) : (
              <p className="text-sm text-[var(--color-text-muted)] py-4">Click a level above to see your vocab.</p>
            )}
          </>
        ) : (
          <div>
            <button onClick={() => setMode('select')} className="mb-4 text-sm text-amber-600 hover:underline">
              ← Back to level select
            </button>
            <Flashcard items={activeTab === 'verbs' ? verbItems : activeTab === 'vocabs' ? vocabItems : []} />
          </div>
        )}
      </motion.div>

      <AnimatePresence mode="wait">
        {selectedKanji && (
          <KanjiPopup key={selectedKanji.char} kanji={selectedKanji} onClose={() => setSelectedKanji(null)} />
        )}
      </AnimatePresence>
    </div>
  )
}
