import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { HeardNewVocabCta } from '../components/HeardNewVocabCta'
import { PageMeta } from '../components/PageMeta'
import { FuriganaText } from '../components/FuriganaText'
import { GRAMMAR_BY_LEVEL } from '../data/grammar'
import { getUserGrammarByLevel } from '../lib/userGrammar'

const LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1']

function mergeGrammar(seed, user) {
  const seen = new Set()
  const out = []
  for (const item of [...(seed || []), ...(user || [])]) {
    const key = `${item.name}|${item.structure || ''}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(item)
  }
  return out
}

export function Grammar() {
  const [selectedLevel, setSelectedLevel] = useState('N5')

  const items = useMemo(() => {
    const seed = GRAMMAR_BY_LEVEL[selectedLevel] || []
    const user = getUserGrammarByLevel()[selectedLevel] || []
    return mergeGrammar(seed, user)
  }, [selectedLevel])

  return (
    <div className="mx-auto max-w-6xl">
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

        <div className="mb-6 flex flex-wrap gap-3">
          {LEVELS.map((level, i) => (
            <motion.button
              key={level}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 + i * 0.03 }}
              onClick={() => setSelectedLevel(level)}
              className={`rounded-xl border px-5 py-2.5 font-medium transition-colors ${
                selectedLevel === level
                  ? 'border-blue-400 bg-blue-500/15 text-blue-100'
                  : 'border-slate-700 bg-slate-900/80 text-slate-200 hover:border-blue-400'
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
                className="card-shell"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg font-bold text-slate-100" style={{ fontFamily: 'var(--font-jp)' }}>{g.name}</span>
                  <span className="rounded bg-blue-500/20 px-2 py-0.5 text-xs font-medium text-blue-200">
                    {g.level}
                  </span>
                </div>
                <p className="mb-2 font-mono text-sm text-slate-400">{g.structure}</p>
                <p className="mb-2 text-slate-200">{g.meaning}</p>
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
