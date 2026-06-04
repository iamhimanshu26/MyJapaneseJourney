export function EmptyState({
  title = 'No data available',
  message = 'Start adding learning activity and this section will populate automatically.',
  actionLabel,
  onAction,
}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
      <p className="text-sm font-medium text-slate-800">{title}</p>
      <p className="mx-auto mt-2 max-w-lg text-sm text-slate-600">{message}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 inline-flex h-10 items-center rounded-lg border border-transparent bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
