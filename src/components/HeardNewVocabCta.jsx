import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

export function HeardNewVocabCta({ compact = false }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={compact ? '' : 'mb-8'}
    >
      <Link
        to="/lookup"
        className={`group flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-amber-600/5 p-4 transition-all hover:border-amber-500/50 hover:from-amber-500/15 hover:to-amber-600/10 ${
          compact ? 'inline-flex' : 'block'
        }`}
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </span>
        <div>
          <span className="block font-semibold text-[var(--color-text)]">
            Heard New Vocab — Find Here more about it
          </span>
          <span className="block text-sm text-[var(--color-text-muted)]">
            Search any word or grammar • Get meaning, examples & JLPT level
          </span>
        </div>
        <svg className="ml-auto h-5 w-5 text-amber-500/60 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </Link>
    </motion.div>
  )
}
