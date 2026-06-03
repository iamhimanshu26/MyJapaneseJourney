export function LoadingState({ title = 'Loading data...', subtitle = 'Please wait while we fetch your learning insights.' }) {
  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-8 text-center">
      <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
      <p className="text-sm font-semibold text-slate-100">{title}</p>
      <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
    </div>
  )
}
