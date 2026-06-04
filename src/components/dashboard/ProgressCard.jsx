export function ProgressCard({ title, value, subtitle }) {
  const safeValue = Math.max(0, Math.min(100, Number(value) || 0))
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        <span className="text-sm font-bold text-blue-600">{safeValue}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500 transition-all"
          style={{ width: `${safeValue}%` }}
        />
      </div>
      {subtitle ? <p className="mt-2 text-xs text-slate-500">{subtitle}</p> : null}
    </div>
  )
}
