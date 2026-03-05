import { useState } from 'react'
import { motion } from 'framer-motion'
import { HeardNewVocabCta } from '../components/HeardNewVocabCta'
import { PageMeta } from '../components/PageMeta'
import { FuriganaText } from '../components/FuriganaText'
import { GRAMMAR_BY_LEVEL } from '../data/grammar'

const LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1']

export function Grammar() {
  const [selectedLevel, setSelectedLevel] = useState('N5')

  const items = GRAMMAR_BY_LEVEL[selectedLevel] || []

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <PageMeta title="Grammar" description="Learn JLPT grammar patterns and explanations. N5 to N1." />
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold tracking-tight mb-2">Grammar</h1>
        <p className="text-[var(--color-text-muted)] mb-8">
          Learn grammar points by JLPT level.
        </p>

        <HeardNewVocabCta compact />

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

        <div className="space-y-4">
          {items.length > 0 ? (
            items.map((g, i) => (
              <motion.div
                key={g.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-xl border border-slate-200 bg-[var(--color-bg-card)] p-5 shadow-sm"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg font-bold" style={{ fontFamily: 'var(--font-jp)' }}>{g.name}</span>
                  <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-700 text-xs font-medium">
                    {g.level}
                  </span>
                </div>
                <p className="text-sm text-[var(--color-text-muted)] font-mono mb-2">{g.structure}</p>
                <p className="text-[var(--color-text)] mb-2">{g.meaning}</p>
                <p className="text-sm examples-with-furigana" style={{ fontFamily: 'var(--font-jp)' }}>
                  <FuriganaText text={g.example} />
                </p>
              </motion.div>
            ))
          ) : (
            <p className="text-sm text-[var(--color-text-muted)]">
              No grammar for {selectedLevel} yet. More content coming soon.
            </p>
          )}
        </div>
      </motion.div>
    </div>
  )
}
