import { useEffect, useState } from 'react'

const KANJIVG_BASE = 'https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji'

function getKanjiHex(char) {
  const code = char?.codePointAt(0)
  if (code == null) return null
  return code.toString(16).padStart(5, '0')
}

/** Parse KanjiVG SVG to extract stroke paths in order (id containing -s1, -s2, ...) */
function parseStrokePaths(svgText) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(svgText, 'image/svg+xml')
  const paths = []
  const strokeRegex = /-s(\d+)(?:[^-]|$)/
  doc.querySelectorAll('path[id]').forEach((p) => {
    const m = String(p.id || '').match(strokeRegex)
    if (m) paths.push({ index: parseInt(m[1], 10), path: p })
  })
  paths.sort((a, b) => a.index - b.index)
  return paths.map((p) => ({
    d: p.path.getAttribute('d') || '',
  }))
}

export function KanjiStrokeAnimation({ char, className = '' }) {
  const [strokes, setStrokes] = useState([])
  const [visibleStrokes, setVisibleStrokes] = useState(0)
  const [error, setError] = useState(false)
  const hex = getKanjiHex(char)

  useEffect(() => {
    if (!char || !hex) return
    setError(false)
    setStrokes([])
    setVisibleStrokes(0)
    fetch(`${KANJIVG_BASE}/${hex}.svg`)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error('Not found'))))
      .then((svg) => {
        const paths = parseStrokePaths(svg)
        setStrokes(paths)
        setVisibleStrokes(0)
      })
      .catch(() => setError(true))
  }, [char, hex])

  useEffect(() => {
    if (strokes.length === 0) return
    const interval = setInterval(() => {
      setVisibleStrokes((n) => {
        if (n >= strokes.length) return 0
        return n + 1
      })
    }, 600)
    return () => clearInterval(interval)
  }, [strokes.length])

  if (error || !char) {
    return (
      <div className={`flex items-center justify-center bg-stone-100 rounded-lg ${className}`}>
        <span style={{ fontFamily: 'var(--font-jp)' }} className="text-5xl text-stone-600">
          {char}
        </span>
      </div>
    )
  }

  if (strokes.length === 0) {
    return (
      <div className={`flex items-center justify-center bg-stone-100 rounded-lg ${className}`}>
        <span style={{ fontFamily: 'var(--font-jp)' }} className="text-5xl text-stone-600 animate-pulse">
          {char}
        </span>
      </div>
    )
  }

  return (
    <svg
      viewBox="0 0 109 109"
      className={`block ${className}`}
      style={{ width: '100%', height: '100%', maxHeight: 120 }}
    >
      <g style={{ transform: 'scale(1)', transformOrigin: 'center' }}>
        {strokes.slice(0, visibleStrokes).map((s, i) => (
          <path
            key={i}
            d={s.d}
            style={{
              fill: 'none',
              stroke: '#1f2937',
              strokeWidth: 3,
              strokeLinecap: 'round',
              strokeLinejoin: 'round',
              animation: 'strokeAppear 0.4s ease-out forwards',
            }}
          />
        ))}
      </g>
    </svg>
  )
}
