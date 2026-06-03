const STATUS_STYLES = {
  new: 'bg-slate-700 text-slate-200',
  learning: 'bg-blue-500/20 text-blue-300',
  weak: 'bg-rose-500/20 text-rose-300',
  mastered: 'bg-emerald-500/20 text-emerald-300',
  favorite: 'bg-amber-500/20 text-amber-300',
}

export function MasteryBadge({ status = 'new' }) {
  const normalized = String(status || 'new').toLowerCase()
  return (
    <span className={`rounded-md px-2 py-1 text-xs font-medium ${STATUS_STYLES[normalized] || STATUS_STYLES.new}`}>
      {normalized}
    </span>
  )
}
