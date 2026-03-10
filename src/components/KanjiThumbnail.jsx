import { useState } from 'react'

const KANJIVG_BASE = 'https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji'

function getKanjiHex(char) {
  const code = char?.codePointAt(0)
  if (code == null) return null
  return code.toString(16).padStart(5, '0')
}

/** Small KanjiVG SVG thumbnail for kanji cards - fallback to character if load fails */
export function KanjiThumbnail({ char, className = '' }) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)
  const hex = getKanjiHex(char)

  if (!char) return null
  if (error) {
    return (
      <span className={`inline-flex items-center justify-center bg-amber-50 border border-amber-100 rounded-lg w-12 h-12 shrink-0 ${className}`}>
        <span style={{ fontFamily: 'var(--font-jp)' }} className="text-2xl font-bold text-stone-700">{char}</span>
      </span>
    )
  }

  return (
    <span className={`relative inline-flex items-center justify-center overflow-hidden bg-amber-50 border border-amber-100 rounded-lg w-12 h-12 shrink-0 ${className}`}>
      <img
        src={`${KANJIVG_BASE}/${hex}.svg`}
        alt=""
        className={`w-full h-full object-contain p-1 ${loaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-200`}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        loading="lazy"
      />
      {(!loaded || error) && (
        <span style={{ fontFamily: 'var(--font-jp)' }} className="absolute text-2xl font-bold text-stone-700">
          {char}
        </span>
      )}
    </span>
  )
}
