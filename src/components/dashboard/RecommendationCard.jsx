export function RecommendationCard({ title = 'Recommended actions', actions = [] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.06)]">
      <h3 className="text-base font-medium text-slate-900">{title}</h3>
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
