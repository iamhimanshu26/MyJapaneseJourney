export function RecommendationCard({ title = 'Recommended actions', actions = [] }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
      <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-300">{title}</h3>
      <ul className="mt-3 space-y-2">
        {actions.map((action) => (
          <li key={action} className="flex items-start gap-2 text-sm text-slate-200">
            <span className="mt-1 h-2 w-2 rounded-full bg-blue-400" />
            <span>{action}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
