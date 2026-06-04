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
    <div className="mx-auto w-full max-w-md">
      <p className="mb-2 text-sm text-slate-600">
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
              className="absolute inset-0 flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-6 shadow-lg"
              style={{ backfaceVisibility: 'hidden' }}
            >
              <p className="text-3xl font-semibold" style={{ fontFamily: 'var(--font-jp)' }}>
                {current.reading ? (
                  <FuriganaText text={`${current.word}(${current.reading})`} />
                ) : (
                  current.word
                )}
              </p>
              {!flipped && (
                <p className="absolute bottom-3 text-sm text-slate-500">Click to flip</p>
              )}
            </motion.div>
            <motion.div
              initial={{ rotateY: 180 }}
              animate={{ rotateY: flipped ? 0 : 180 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-amber-50 p-6 shadow-lg"
              style={{ backfaceVisibility: 'hidden' }}
            >
              <p className="mb-2 text-2xl font-semibold" style={{ fontFamily: 'var(--font-jp)' }}>
                {current.reading ? (
                  <FuriganaText text={`${current.word}(${current.reading})`} />
                ) : (
                  current.word
                )}
              </p>
              <p className="text-base font-medium text-slate-900">{current.meaning}</p>
            </motion.div>
          </div>
        </motion.div>
      </AnimatePresence>
      <div className="mt-6 flex justify-center gap-3">
        <button
          onClick={() => handleNext(false)}
          className="h-10 rounded-lg border border-slate-300 px-6 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Review again
        </button>
        <button
          onClick={() => handleNext(true)}
          className="h-10 rounded-lg bg-amber-500 px-6 text-sm font-medium text-white hover:bg-amber-600"
        >
          I know it
        </button>
      </div>
      {isLast && (
        <p className="mt-4 text-center text-sm text-slate-600">
          You've seen all {items.length} cards. Refresh to restart.
        </p>
      )}
    </div>
  )
}
