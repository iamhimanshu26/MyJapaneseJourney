export function SearchInput({ className = '', ...props }) {
  return (
    <input
      type="search"
      className={`h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 placeholder:text-slate-400 ${className}`.trim()}
      {...props}
    />
  )
}
