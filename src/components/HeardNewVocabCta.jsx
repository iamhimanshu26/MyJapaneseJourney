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
        className={`group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_26px_rgba(15,23,42,0.08)] transition-all hover:border-blue-400 ${
          compact ? 'inline-flex' : 'block'
        }`}
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </span>
        <div>
          <span className="block font-semibold text-slate-900">
            Heard New Vocab / AI Word Intelligence
          </span>
          <span className="block text-sm text-slate-600">
            Search any word or grammar • Get bilingual intelligence, usage, and save controls
          </span>
        </div>
        <svg className="ml-auto h-5 w-5 text-blue-500 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </Link>
    </motion.div>
  )
}
