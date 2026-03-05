import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FuriganaText } from './FuriganaText'

export function Flashcard({ items, onKnow, onReview }) {
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)

  if (!items?.length) return null

  const current = items[index]
  const isLast = index >= items.length - 1

  function handleNext(knew) {
    if (knew && onKnow) onKnow(current)
    if (onReview) onReview(current)
    if (isLast) return
    setIndex((i) => i + 1)
    setFlipped(false)
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <p className="text-sm text-[var(--color-text-muted)] mb-2">
        Card {index + 1} of {items.length}
      </p>
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="min-h-[200px] perspective-1000"
        >
          <div
            onClick={() => setFlipped(!flipped)}
            className="relative w-full h-[200px] cursor-pointer"
          >
            <motion.div
              animate={{ rotateY: flipped ? 180 : 0 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0 rounded-2xl border border-slate-200 bg-white shadow-lg flex items-center justify-center p-6"
              style={{ backfaceVisibility: 'hidden' }}
            >
              <p className="text-3xl font-bold" style={{ fontFamily: 'var(--font-jp)' }}>
                {current.reading ? (
                  <FuriganaText text={`${current.word}(${current.reading})`} />
                ) : (
                  current.word
                )}
              </p>
              {!flipped && (
                <p className="absolute bottom-3 text-sm text-[var(--color-text-muted)]">Click to flip</p>
              )}
            </motion.div>
            <motion.div
              initial={{ rotateY: 180 }}
              animate={{ rotateY: flipped ? 0 : 180 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0 rounded-2xl border border-slate-200 bg-amber-50 shadow-lg flex flex-col items-center justify-center p-6"
              style={{ backfaceVisibility: 'hidden' }}
            >
              <p className="text-2xl font-bold mb-2" style={{ fontFamily: 'var(--font-jp)' }}>
                {current.reading ? (
                  <FuriganaText text={`${current.word}(${current.reading})`} />
                ) : (
                  current.word
                )}
              </p>
              <p className="text-xl font-semibold text-[var(--color-text)]">{current.meaning}</p>
            </motion.div>
          </div>
        </motion.div>
      </AnimatePresence>
      <div className="flex gap-3 mt-6 justify-center">
        <button
          onClick={() => handleNext(false)}
          className="px-6 py-3 rounded-xl border border-slate-300 text-slate-600 font-medium hover:bg-slate-50"
        >
          Review again
        </button>
        <button
          onClick={() => handleNext(true)}
          className="px-6 py-3 rounded-xl bg-amber-500 text-white font-semibold hover:bg-amber-600"
        >
          I know it
        </button>
      </div>
      {isLast && (
        <p className="mt-4 text-center text-sm text-[var(--color-text-muted)]">
          You've seen all {items.length} cards. Refresh to restart.
        </p>
      )}
    </div>
  )
}
