export function ActionButton({
  children,
  type = 'button',
  variant = 'secondary',
  className = '',
  disabled = false,
  ...props
}) {
  const base = 'inline-flex h-10 items-center justify-center rounded-lg border px-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60'
  const variants = {
    primary: 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
    danger: 'border-rose-600 bg-rose-600 text-white hover:bg-rose-700',
  }
  const style = variants[variant] || variants.secondary
  return (
    <button type={type} className={`${base} ${style} ${className}`.trim()} disabled={disabled} {...props}>
      {children}
    </button>
  )
}
