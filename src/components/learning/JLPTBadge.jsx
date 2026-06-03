export function JLPTBadge({ level = 'N5' }) {
  const normalized = String(level || 'N5').toUpperCase()
  const color =
    normalized === 'N1'
      ? 'from-violet-500 to-fuchsia-500'
      : normalized === 'N2'
        ? 'from-indigo-500 to-purple-500'
        : normalized === 'N3'
          ? 'from-blue-500 to-cyan-500'
          : normalized === 'N4'
            ? 'from-emerald-500 to-teal-500'
            : 'from-amber-500 to-orange-500'
  return (
    <span className={`rounded-md bg-gradient-to-r ${color} px-2 py-1 text-xs font-semibold text-white`}>
      {normalized}
    </span>
  )
}
