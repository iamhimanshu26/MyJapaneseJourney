import { useState } from 'react'
import { motion } from 'framer-motion'
import { FuriganaText } from './FuriganaText'
import { KanjiStrokeAnimation } from './KanjiStrokeAnimation'

export function KanjiPopup({ kanji, onClose }) {
  const examples = kanji?.examples || []
  const onExamples = kanji?.onExamples || []
  const kunExamples = kanji?.kunExamples || []
  const hasExamples = examples.length > 0 || onExamples.length > 0 || kunExamples.length > 0

  if (!kanji) return null

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-labelledby="kanji-popup-title"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <h3 id="kanji-popup-title" className="text-xl font-semibold text-stone-800">Kanji Details</h3>
            <button
              onClick={onClose}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center text-stone-400 hover:text-stone-600 text-2xl leading-none rounded-lg hover:bg-stone-100 -m-2"
              aria-label="Close"
            >
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

          {/* Stroke order - KanjiVG animation */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-stone-600 mb-2">書き方 (Kakikata) — Stroke order</h4>
            <div className="h-28 rounded-lg bg-stone-50 border border-stone-200 flex items-center justify-center overflow-hidden">
              <KanjiStrokeAnimation char={kanji.char} className="w-full h-full" />
            </div>
            <p className="text-xs text-stone-400 mt-1">Strokes appear in order, then repeat</p>
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
