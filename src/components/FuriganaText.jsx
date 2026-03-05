/**
 * Renders Japanese text with furigana stacked ABOVE kanji.
 * Expects format: 漢字(読み) e.g. 地震(じしん)の警報(けいほう)が鳴(な)った
 * Uses flexbox to ensure reading is always above, never beside.
 */
export function FuriganaText({ text, className = '', style = {} }) {
  if (!text || typeof text !== 'string') return null

  const furiganaRegex = /([\u4e00-\u9fff々]+)\(([\u3040-\u309f\u30a0-\u30ffー・]+)\)/g

  const parts = []
  let lastIndex = 0
  let match

  while ((match = furiganaRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'plain', text: text.slice(lastIndex, match.index) })
    }
    parts.push({ type: 'ruby', kanji: match[1], reading: match[2] })
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'plain', text: text.slice(lastIndex) })
  }

  if (parts.length === 0) {
    return <span className={className} style={style}>{text}</span>
  }

  return (
    <span className={className} style={style} lang="ja">
      {parts.map((part, i) => {
        if (part.type === 'plain') {
          return <span key={i}>{part.text}</span>
        }
        return (
          <span key={i} className="inline-flex flex-col items-center leading-none">
            <span className="text-[0.45em] text-[var(--color-text-muted)] whitespace-nowrap">
              {part.reading}
            </span>
            <span className="leading-tight">{part.kanji}</span>
          </span>
        )
      })}
    </span>
  )
}
