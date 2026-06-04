export function ToggleSwitch({
  options = [],
  value,
  onChange,
  className = '',
  ariaLabel = 'Toggle',
}) {
  const safeOptions = Array.isArray(options) ? options.slice(0, 4) : []
  const activeIndex = Math.max(0, safeOptions.findIndex((item) => item.value === value))
  const itemWidth = safeOptions.length ? 100 / safeOptions.length : 100

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`relative inline-flex h-10 items-center rounded-lg border border-slate-300 bg-white p-1 ${className}`.trim()}
    >
      <span
        aria-hidden
        className="absolute top-1 bottom-1 rounded-md bg-[#edf2ff] transition-all duration-200"
        style={{
          left: `${activeIndex * itemWidth}%`,
          width: `${itemWidth}%`,
        }}
      />
      {safeOptions.map((item) => {
        const active = item.value === value
        return (
          <button
            key={item.value}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => onChange?.(item.value)}
            className={`relative z-10 h-8 px-3 text-sm font-medium transition ${active ? 'text-[#3b4bff]' : 'text-slate-600 hover:text-slate-800'}`}
            style={{ width: `${itemWidth}%` }}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
