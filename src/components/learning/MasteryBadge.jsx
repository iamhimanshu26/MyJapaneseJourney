const STATUS_STYLES = {
  new: 'bg-slate-100 text-slate-700',
  learning: 'bg-blue-100 text-blue-700',
  weak: 'bg-rose-100 text-rose-700',
  mastered: 'bg-emerald-100 text-emerald-700',
  favorite: 'bg-amber-100 text-amber-700',
}

export function MasteryBadge({ status = 'new' }) {
  const normalized = String(status || 'new').toLowerCase()
  return (
    <span className={`rounded-md px-2 py-1 text-xs font-medium ${STATUS_STYLES[normalized] || STATUS_STYLES.new}`}>
      {normalized}
    </span>
  )
}
