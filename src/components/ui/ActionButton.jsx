export function ActionButton({
  children,
  type = 'button',
  variant = 'secondary',
  className = '',
  disabled = false,
  icon,
  ...props
}) {
  const base = 'inline-flex h-10 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-60'
  const variants = {
    primary: 'border-transparent bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50',
    ghost: 'border-transparent bg-transparent text-slate-700 hover:bg-slate-100',
    subtle: 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100',
    danger: 'border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100',
  }
  const style = variants[variant] || variants.secondary
  return (
    <button type={type} className={`${base} ${style} ${className}`.trim()} disabled={disabled} {...props}>
      {icon ? <span aria-hidden>{icon}</span> : null}
      <span>{children}</span>
    </button>
  )
}
