export function RecommendationCard({ title = 'Recommended actions', actions = [] }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
      <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-600">{title}</h3>
      <ul className="mt-3 space-y-2">
        {actions.map((action) => (
          <li key={action} className="flex items-start gap-2 text-sm text-slate-700">
            <span className="mt-1 h-2 w-2 rounded-full bg-blue-400" />
            <span>{action}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
