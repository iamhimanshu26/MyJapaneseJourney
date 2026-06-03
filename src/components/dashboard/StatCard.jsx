import { motion } from 'framer-motion'

export function StatCard({ label, value, hint, icon, accent = 'from-blue-500 to-violet-500' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-lg shadow-slate-950/30"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-slate-400">{label}</p>
          <p className="mt-2 text-2xl font-bold text-slate-100">{value}</p>
          {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
        </div>
        <div className={`rounded-lg bg-gradient-to-br ${accent} p-2 text-lg`} aria-hidden>
          {icon || '📊'}
        </div>
      </div>
    </motion.div>
  )
}
