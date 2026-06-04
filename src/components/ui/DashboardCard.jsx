export function DashboardCard({ title, children, actions, className = '' }) {
  return (
    <section className={`rounded-xl border border-slate-200 bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.06)] ${className}`.trim()}>
      {(title || actions) ? (
        <header className="mb-3 flex items-center justify-between gap-3">
          {title ? <h3 className="text-base font-medium text-slate-900">{title}</h3> : <span />}
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </header>
      ) : null}
      <div>{children}</div>
    </section>
  )
}
