import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { HeardNewVocabCta } from '../components/HeardNewVocabCta'
import { Flashcard } from '../components/Flashcard'
import { PageMeta } from '../components/PageMeta'
import { VOCAB_BY_LEVEL } from '../data/vocab'
import { getUserVocabByLevel } from '../lib/userVocab'

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

export function Vocab() {
  const [selectedLevel, setSelectedLevel] = useState('N5')
  const [mode, setMode] = useState('select') // 'select' | 'flashcards'

  const items = useMemo(() => {
    const seed = VOCAB_BY_LEVEL[selectedLevel] || []
    const user = getUserVocabByLevel()[selectedLevel] || []
    return mergeVocab(seed, user)
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
            {items.length > 0 ? (
              <div>
                <p className="text-sm text-[var(--color-text-muted)] mb-4">
                  {items.length} words in {selectedLevel}
                </p>
                <button
                  onClick={() => setMode('flashcards')}
                  className="px-6 py-3 rounded-xl bg-amber-500 text-white font-semibold hover:bg-amber-600"
                >
                  Start flashcards
                </button>
              </div>
            ) : (
              <p className="text-sm text-[var(--color-text-muted)]">
                No vocab for {selectedLevel} yet. More content coming soon.
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
