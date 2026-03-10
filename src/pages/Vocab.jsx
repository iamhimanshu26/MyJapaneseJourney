import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HeardNewVocabCta } from '../components/HeardNewVocabCta'
import { Flashcard } from '../components/Flashcard'
import { PageMeta } from '../components/PageMeta'
import { FuriganaText } from '../components/FuriganaText'
import { VOCAB_BY_LEVEL } from '../data/vocab'
import { getUserVocabByLevel } from '../lib/userVocab'
import { getUserKanjiByLevel } from '../lib/userKanji'

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

function VocabItem({ item, index, type }) {
  const [expanded, setExpanded] = useState(false)
  const examples = item.examples || []
  const hasExamples = examples.length > 0

  return (
    <li className="border-b border-slate-100 last:border-b-0">
      <button
        type="button"
        onClick={() => hasExamples && setExpanded((e) => !e)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50/50 text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-400 w-6">#{index + 1}</span>
          <span style={{ fontFamily: 'var(--font-jp)' }} className="font-medium">
            {type === 'kanji' ? (
              item.reading ? <FuriganaText text={`${item.char}(${item.reading})`} /> : item.char
            ) : (
              item.reading ? <FuriganaText text={`${item.word}(${item.reading})`} /> : item.word
            )}
          </span>
          <span className="text-sm text-[var(--color-text-muted)]">{item.meaning}</span>
        </div>
        {hasExamples && (
          <span className="text-xs text-amber-600 shrink-0">{expanded ? '▲' : '▼'}</span>
        )}
      </button>
      <AnimatePresence>
        {expanded && hasExamples && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 pl-12 space-y-2 border-l-2 border-amber-200 ml-6">
              {(examples).slice(0, 2).map((ex, i) => (
                <p key={i} className="text-sm text-[var(--color-text-muted)] examples-with-furigana" style={{ fontFamily: 'var(--font-jp)' }}>
                  {typeof ex === 'object' ? <><FuriganaText text={ex.jp || ''} />{ex.en ? ` (${ex.en})` : ''}</> : ex}
                </p>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  )
}

export function Vocab() {
  const [selectedLevel, setSelectedLevel] = useState(null)
  const [mode, setMode] = useState('select') // 'select' | 'flashcards'
  const [activeTab, setActiveTab] = useState('vocabs') // 'vocabs' | 'kanji'

  const items = useMemo(() => {
    if (!selectedLevel) return []
    const seed = VOCAB_BY_LEVEL[selectedLevel] || []
    const user = getUserVocabByLevel()[selectedLevel] || []
    return mergeVocab(seed, user)
  }, [selectedLevel])

  const kanjiItems = useMemo(() => {
    if (!selectedLevel) return []
    return getUserKanjiByLevel()[selectedLevel] || []
  }, [selectedLevel])

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <PageMeta title="Vocabulary" description="Practice JLPT vocabulary with flashcards. N5 to N1." />
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold tracking-tight mb-2">Vocabulary</h1>
        <p className="text-[var(--color-text-muted)] mb-8">
          Practice flashcards by JLPT level.
        </p>

        <HeardNewVocabCta compact />

        {mode === 'select' ? (
          <>
            <div className="flex flex-wrap gap-3 mb-6">
              {LEVELS.map((level, i) => (
                <motion.button
                  key={level}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 + i * 0.03 }}
                  onClick={() => setSelectedLevel(level)}
                  className={`px-5 py-2.5 rounded-xl border font-medium transition-colors shadow-sm ${
                    selectedLevel === level
                      ? 'border-amber-400 bg-amber-50 text-amber-800'
                      : 'border-slate-200 bg-[var(--color-bg-card)] hover:border-amber-300 hover:bg-amber-50'
                  }`}
                >
                  {level}
                </motion.button>
              ))}
            </div>
            {selectedLevel ? (
              <>
                {/* Tabs: Kanji | Vocabs */}
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => setActiveTab('kanji')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'kanji' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  >
                    Kanji
                  </button>
                  <button
                    onClick={() => setActiveTab('vocabs')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'vocabs' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  >
                    Vocabs
                  </button>
                </div>

                {activeTab === 'vocabs' ? (
                  items.length > 0 ? (
                    <div>
                      <div className="mb-6">
                        <h2 className="text-xl font-semibold mb-4">My {selectedLevel} vocabs (in order)</h2>
                        <div className="rounded-xl border border-slate-200 bg-[var(--color-bg-card)] overflow-hidden">
                          <ul>
                            {items.map((v, i) => (
                              <VocabItem key={`${v.word}-${v.reading || ''}-${i}`} item={v} index={i} type="vocab" />
                            ))}
                          </ul>
                        </div>
                      </div>
                      <p className="text-sm text-[var(--color-text-muted)] mb-4">{items.length} words in {selectedLevel}</p>
                      <button onClick={() => setMode('flashcards')} className="px-6 py-3 rounded-xl bg-amber-500 text-white font-semibold hover:bg-amber-600">
                        Start flashcards
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-[var(--color-text-muted)]">No vocab for {selectedLevel} yet. Search or extract to add words.</p>
                  )
                ) : (
                  kanjiItems.length > 0 ? (
                    <div className="mb-6">
                      <h2 className="text-xl font-semibold mb-4">My {selectedLevel} kanji (in order)</h2>
                      <div className="rounded-xl border border-slate-200 bg-[var(--color-bg-card)] overflow-hidden">
                        <ul>
                          {kanjiItems.map((k, i) => (
                            <VocabItem key={`${k.char}-${i}`} item={k} index={i} type="kanji" />
                          ))}
                        </ul>
                      </div>
                      <p className="text-sm text-[var(--color-text-muted)]">{kanjiItems.length} kanji in {selectedLevel}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-[var(--color-text-muted)]">No kanji for {selectedLevel} yet. Extract from text to add kanji.</p>
                  )
                )}
              </>
            ) : (
              <p className="text-sm text-[var(--color-text-muted)] py-4">
                Click a level above to see your vocab.
              </p>
            )}
          </>
        ) : (
          <div>
            <button
              onClick={() => setMode('select')}
              className="mb-4 text-sm text-amber-600 hover:underline"
            >
              ← Back to level select
            </button>
            <Flashcard items={items} />
          </div>
        )}
      </motion.div>
    </div>
  )
}
