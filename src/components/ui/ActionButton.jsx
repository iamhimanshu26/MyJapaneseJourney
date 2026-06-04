const BASE =
  'inline-flex h-10 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-60'

const VARIANTS = {
  primary: 'border-transparent bg-blue-600 text-white hover:bg-blue-700',
  secondary: 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50',
  ghost: 'border-transparent bg-transparent text-slate-700 hover:bg-slate-100',
  subtle: 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100',
  danger: 'border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100',
}

export function ActionButton({
  children,
  variant = 'secondary',
  className = '',
  icon,
  type = 'button',
  ...props
}) {
  const style = VARIANTS[variant] || VARIANTS.secondary
  return (
    <button type={type} className={`${BASE} ${style} ${className}`.trim()} {...props}>
      {icon ? <span aria-hidden>{icon}</span> : null}
      <span>{children}</span>
    </button>
  )
}
