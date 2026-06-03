export function EmptyState({
  title = 'No data available',
  message = 'Start adding learning activity and this section will populate automatically.',
  actionLabel,
  onAction,
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 p-8 text-center">
      <p className="text-sm font-semibold text-slate-100">{title}</p>
      <p className="mx-auto mt-2 max-w-lg text-sm text-slate-400">{message}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 rounded-lg bg-gradient-to-r from-blue-500 to-violet-500 px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
