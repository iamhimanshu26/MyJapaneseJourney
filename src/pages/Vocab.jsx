import { motion } from 'framer-motion'
import { HeardNewVocabCta } from '../components/HeardNewVocabCta'

const LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1']

export function Vocab() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold tracking-tight mb-2">Vocabulary</h1>
        <p className="text-[var(--color-text-muted)] mb-8">
          Practice flashcards and quizzes by JLPT level.
        </p>

        <HeardNewVocabCta compact />

        <div className="flex flex-wrap gap-3">
          {LEVELS.map((level, i) => (
            <motion.button
              key={level}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 + i * 0.03 }}
              className="px-5 py-2.5 rounded-xl border border-white/10 bg-[var(--color-bg-card)] font-medium text-[var(--color-text)] hover:border-amber-500/30 hover:bg-amber-500/10 transition-colors"
            >
              {level}
            </motion.button>
          ))}
        </div>
        <p className="mt-6 text-sm text-[var(--color-text-muted)]">
          Content loading soon — vocab module in development.
        </p>
      </motion.div>
    </div>
  )
}
