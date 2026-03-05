import { motion } from 'framer-motion'

const LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1']

export function MyDiscovered() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold tracking-tight mb-2">My Discovered</h1>
        <p className="text-[var(--color-text-muted)] mb-8">
          Words and grammar you looked up, organized by JLPT level.
        </p>

        <div className="space-y-6">
          {LEVELS.map((level) => (
            <div key={level}>
              <h2 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-3">
                My {level} words
              </h2>
              <div className="rounded-xl border border-white/5 bg-[var(--color-bg-card)] p-4">
                <p className="text-sm text-[var(--color-text-muted)]">
                  No words saved yet. Use &quot;Heard New Vocab — Find Here&quot; to look up and save words.
                </p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
