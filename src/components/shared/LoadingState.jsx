export function LoadingState({ title = 'Loading data...', subtitle = 'Please wait while we fetch your learning insights.' }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-[0_8px_20px_rgba(15,23,42,0.06)]">
      <div className="mx-auto mb-3 h-9 w-9 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
      <p className="text-sm font-medium text-slate-800">{title}</p>
      <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
    </div>
  )
}
