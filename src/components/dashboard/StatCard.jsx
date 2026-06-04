import { motion } from 'framer-motion'

export function StatCard({ label, value, hint, icon, accent = 'from-blue-500 to-violet-500' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.08)]"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
          {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
        </div>
        <div className={`rounded-lg bg-gradient-to-br ${accent} p-2 text-lg`} aria-hidden>
          {icon || '📊'}
        </div>
      </div>
    </motion.div>
  )
}
