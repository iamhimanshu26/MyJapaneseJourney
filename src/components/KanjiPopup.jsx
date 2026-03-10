import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FuriganaText } from './FuriganaText'

export function KanjiPopup({ kanji, onClose }) {
  const [strokeIndex, setStrokeIndex] = useState(0)
  const examples = kanji?.examples || []
  const onExamples = kanji?.onExamples || []
  const kunExamples = kanji?.kunExamples || []
  const hasExamples = examples.length > 0 || onExamples.length > 0 || kunExamples.length > 0

  useEffect(() => {
    if (!kanji) return
    setStrokeIndex(0)
  }, [kanji])

  useEffect(() => {
    if (!kanji?.char) return
    const timer = setInterval(() => {
      setStrokeIndex((i) => (i + 1) % 4)
    }, 1500)
    return () => clearInterval(timer)
  }, [kanji?.char])

  if (!kanji) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-xl font-semibold text-stone-800">Kanji Details</h3>
            <button onClick={onClose} className="text-stone-400 hover:text-stone-600 text-2xl leading-none">
              ×
            </button>
          </div>

          <div className="flex items-start gap-6 mb-6">
            <div className="flex-shrink-0 w-32 h-32 rounded-xl bg-amber-50 border-2 border-amber-200 flex items-center justify-center">
              <span style={{ fontFamily: 'var(--font-jp)' }} className="text-7xl text-stone-800">
                {kanji.char}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-lg text-stone-600 mb-1">{kanji.meaning}</p>
              <p className="text-sm text-stone-500">
                {kanji.reading && <span>Reading: {kanji.reading}</span>}
              </p>
              <div className="mt-3 space-y-2">
                {kanji.onyomi && (
                  <p className="text-sm"><span className="font-medium text-amber-700">Onyomi (音読み):</span> {kanji.onyomi}</p>
                )}
                {kanji.kunyomi && (
                  <p className="text-sm"><span className="font-medium text-amber-700">Kunyomi (訓読み):</span> {kanji.kunyomi}</p>
                )}
              </div>
            </div>
          </div>

          {/* Stroke order - animated flip */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-stone-600 mb-2">書き方 (Kakikata) — Stroke order</h4>
            <div className="h-24 rounded-lg bg-stone-100 flex items-center justify-center overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={strokeIndex}
                  initial={{ opacity: 0, rotateY: -90 }}
                  animate={{ opacity: 1, rotateY: 0 }}
                  exit={{ opacity: 0, rotateY: 90 }}
                  transition={{ duration: 0.3 }}
                  className="flex items-center justify-center w-full h-full"
                >
                  <span style={{ fontFamily: 'var(--font-jp)' }} className="text-6xl text-stone-700">
                    {kanji.char}
                  </span>
                </motion.div>
              </AnimatePresence>
            </div>
            <p className="text-xs text-stone-400 mt-1">Automatically cycling display</p>
          </div>

          {/* Onyomi examples */}
          {onExamples.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-amber-700 mb-2">Onyomi examples</h4>
              <ul className="space-y-1">
                {onExamples.map((ex, i) => (
                  <li key={i} className="text-sm examples-with-furigana" style={{ fontFamily: 'var(--font-jp)' }}>
                    <FuriganaText text={ex.jp || ''} />{ex.en ? ` (${ex.en})` : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Kunyomi examples */}
          {kunExamples.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-amber-700 mb-2">Kunyomi examples</h4>
              <ul className="space-y-1">
                {kunExamples.map((ex, i) => (
                  <li key={i} className="text-sm examples-with-furigana" style={{ fontFamily: 'var(--font-jp)' }}>
                    <FuriganaText text={ex.jp || ''} />{ex.en ? ` (${ex.en})` : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* General examples */}
          {examples.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-stone-600 mb-2">Examples</h4>
              <ul className="space-y-1">
                {examples.map((ex, i) => (
                  <li key={i} className="text-sm examples-with-furigana" style={{ fontFamily: 'var(--font-jp)' }}>
                    {typeof ex === 'object' ? <><FuriganaText text={ex.jp || ''} />{ex.en ? ` (${ex.en})` : ''}</> : ex}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!hasExamples && !kanji.onyomi && !kanji.kunyomi && (
            <p className="text-sm text-stone-400">No additional examples. Re-extract with enhanced prompts for more data.</p>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
