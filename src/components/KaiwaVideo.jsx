import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FuriganaText } from './FuriganaText'

/** Anime-style boy character - short hair, collared shirt */
function BoyCharacter({ isSpeaking }) {
  return (
    <motion.div
      animate={{ scale: isSpeaking ? 1.05 : 1, y: isSpeaking ? -4 : 0 }}
      transition={{ duration: 0.25 }}
      className="relative w-20 h-24"
    >
      <svg viewBox="0 0 80 96" className="w-full h-full drop-shadow-lg">
        {/* Shoulders / collared shirt */}
        <path d="M15 75 Q20 85 40 88 Q60 85 65 75 L68 70 Q70 68 72 70 L75 72 Q78 70 80 72 L80 96 L0 96 L0 72 Q2 70 5 72 L8 70 Q10 68 12 70 Z" fill="#94a3b8" stroke="#64748b" strokeWidth="1" />
        {/* Shirt collar */}
        <path d="M35 72 L40 78 L45 72 Z" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="1" />
        {/* Neck */}
        <rect x="34" y="65" width="12" height="10" fill="#fde68a" stroke="#f59e0b" strokeWidth="0.5" rx="1" />
        {/* Face */}
        <ellipse cx="40" cy="42" rx="22" ry="24" fill="#fef3c7" stroke="#d97706" strokeWidth="1.5" />
        {/* Short tousled hair - boy style, on top of head */}
        <path d="M18 28 Q20 18 28 20 Q32 15 40 14 Q48 15 52 20 Q60 18 62 28 L62 42 Q58 48 40 50 Q22 48 18 42 Z" fill="#78716c" stroke="#57534e" strokeWidth="1" />
        {/* Bangs - forehead only */}
        <path d="M22 32 Q28 26 40 25 Q52 26 58 32 L55 36 Q50 34 45 35 L40 36 Q35 35 30 34 Q25 36 22 32 Z" fill="#78716c" stroke="#57534e" strokeWidth="0.5" />
        {/* Left eye - anime boy style */}
        <ellipse cx="30" cy="42" rx="5" ry="6" fill="white" stroke="#57534e" strokeWidth="0.8" />
        <ellipse cx="30" cy="43" rx="3" ry="4" fill="#292524" />
        <circle cx="31" cy="42" r="1" fill="white" opacity="0.9" />
        {/* Right eye */}
        <ellipse cx="50" cy="42" rx="5" ry="6" fill="white" stroke="#57534e" strokeWidth="0.8" />
        <ellipse cx="50" cy="43" rx="3" ry="4" fill="#292524" />
        <circle cx="51" cy="42" r="1" fill="white" opacity="0.9" />
        {/* Eyebrows - subtle */}
        <path d="M26 36 Q30 35 34 36" stroke="#57534e" strokeWidth="1.2" fill="none" />
        <path d="M46 36 Q50 35 54 36" stroke="#57534e" strokeWidth="1.2" fill="none" />
        {/* Mouth */}
        <path d="M36 52 Q40 54 44 52" stroke="#78716c" strokeWidth="1" fill="none" />
      </svg>
    </motion.div>
  )
}

/** Anime-style girl character - longer hair, softer features */
function GirlCharacter({ isSpeaking }) {
  return (
    <motion.div
      animate={{ scale: isSpeaking ? 1.05 : 1, y: isSpeaking ? -4 : 0 }}
      transition={{ duration: 0.25 }}
      className="relative w-20 h-24"
    >
      <svg viewBox="0 0 80 96" className="w-full h-full drop-shadow-lg">
        {/* Shoulders / blouse */}
        <path d="M15 75 Q20 85 40 88 Q60 85 65 75 L68 70 Q70 68 72 70 L75 72 Q78 70 80 72 L80 96 L0 96 L0 72 Q2 70 5 72 L8 70 Q10 68 12 70 Z" fill="#fbcfe8" stroke="#ec4899" strokeWidth="1" />
        {/* Neck */}
        <rect x="34" y="65" width="12" height="10" fill="#fce7f3" stroke="#f472b6" strokeWidth="0.5" rx="1" />
        {/* Long hair - flows down sides */}
        <path d="M58 25 L62 20 Q65 18 62 35 L60 55 L58 75 L55 96 L50 96 L48 70 L50 50 L52 30 Q50 22 58 25 Z" fill="#a16207" stroke="#854d0e" strokeWidth="1" />
        <path d="M22 25 L18 20 Q15 18 18 35 L20 55 L22 75 L25 96 L30 96 L32 70 L30 50 L28 30 Q30 22 22 25 Z" fill="#a16207" stroke="#854d0e" strokeWidth="1" />
        {/* Face */}
        <ellipse cx="40" cy="42" rx="22" ry="24" fill="#fef3c7" stroke="#f472b6" strokeWidth="1" />
        {/* Bangs / front hair - forehead only */}
        <path d="M18 30 Q22 18 40 16 Q58 18 62 30 L60 38 Q55 35 45 36 L40 37 Q35 36 25 35 Q20 38 18 30 Z" fill="#a16207" stroke="#854d0e" strokeWidth="0.5" />
        {/* Left eye - anime girl style, larger */}
        <ellipse cx="28" cy="42" rx="6" ry="7" fill="white" stroke="#78716c" strokeWidth="0.8" />
        <ellipse cx="28" cy="43" rx="4" ry="5" fill="#4f46e5" />
        <circle cx="29" cy="41" r="1.5" fill="white" opacity="0.95" />
        {/* Right eye */}
        <ellipse cx="52" cy="42" rx="6" ry="7" fill="white" stroke="#78716c" strokeWidth="0.8" />
        <ellipse cx="52" cy="43" rx="4" ry="5" fill="#4f46e5" />
        <circle cx="53" cy="41" r="1.5" fill="white" opacity="0.95" />
        {/* Eyebrows - softer, curved */}
        <path d="M24 36 Q28 34 32 37" stroke="#a16207" strokeWidth="1" fill="none" />
        <path d="M48 37 Q52 34 56 36" stroke="#a16207" strokeWidth="1" fill="none" />
        {/* Blush */}
        <ellipse cx="22" cy="50" rx="4" ry="2" fill="#fda4af" opacity="0.6" />
        <ellipse cx="58" cy="50" rx="4" ry="2" fill="#fda4af" opacity="0.6" />
        {/* Mouth - soft smile */}
        <path d="M34 54 Q40 58 46 54" stroke="#e11d48" strokeWidth="1" fill="none" />
      </svg>
    </motion.div>
  )
}

/**
 * Video-like Kaiwa Renshuu: manga-style animated characters with speech bubbles
 */
export function KaiwaVideo({ conversations = [] }) {
  const [playing, setPlaying] = useState(false)
  const [index, setIndex] = useState(0)
  const [speaking, setSpeaking] = useState(false)

  const current = conversations[index]
  const isLast = index >= conversations.length - 1
  const leftSpeaker = index % 2 === 0
  const rightSpeaker = index % 2 === 1

  const speak = useCallback((text) => {
    if (!('speechSynthesis' in window) || !text) return
    window.speechSynthesis.cancel()
    const parts = String(text).split(/[、。]/).filter(Boolean)
    if (parts.length === 0) return
    setSpeaking(true)
    const u = new SpeechSynthesisUtterance(parts[0])
    u.lang = 'ja-JP'
    u.rate = 0.8
    u.onend = () => setSpeaking(false)
    window.speechSynthesis.speak(u)
  }, [])

  useEffect(() => {
    if (!playing || !current) return
    speak(current.text)
  }, [playing, index, current?.text, speak])

  useEffect(() => {
    if (!playing || speaking) return
    const t = setTimeout(() => {
      if (isLast) {
        setPlaying(false)
      } else {
        setIndex((i) => i + 1)
      }
    }, 2500)
    return () => clearTimeout(t)
  }, [playing, speaking, isLast])

  function handlePlay() {
    if (conversations.length === 0) return
    if (isLast && index === conversations.length - 1) {
      setIndex(0)
    }
    setPlaying(true)
  }

  function handlePause() {
    setPlaying(false)
    window.speechSynthesis.cancel()
  }

  function handlePrev() {
    if (index > 0) {
      setIndex((i) => i - 1)
      setPlaying(false)
    }
  }

  function handleNext() {
    if (index < conversations.length - 1) {
      setIndex((i) => i + 1)
      setPlaying(false)
    }
  }

  if (conversations.length === 0) return null

  return (
    <div className="rounded-xl overflow-hidden border border-stone-200/80 bg-stone-50/50 relative">
      {/* Stage: refined backdrop */}
      <div className="relative aspect-video min-h-[280px] bg-gradient-to-b from-stone-100 to-stone-200/50 flex items-end justify-center gap-12 pb-6 px-8">
        {/* Left character - boy */}
        <motion.div
          animate={{ scale: leftSpeaker && current ? 1.02 : 1 }}
          transition={{ duration: 0.2 }}
          className={`flex flex-col items-center gap-2 z-10 ${leftSpeaker && current ? 'ring-2 ring-stone-400 ring-offset-2 rounded-2xl' : ''}`}
        >
          <BoyCharacter isSpeaking={leftSpeaker && current} />
          <span className="text-xs font-medium text-stone-600 bg-white/90 px-2.5 py-1 rounded-md shadow-sm">
            {leftSpeaker ? current?.name : (conversations[index - 1] || {})?.name || conversations[0]?.name || 'Boy'}
          </span>
        </motion.div>

        {/* Right character - girl */}
        <motion.div
          animate={{ scale: rightSpeaker && current ? 1.02 : 1 }}
          transition={{ duration: 0.2 }}
          className={`flex flex-col items-center gap-2 z-10 ${rightSpeaker && current ? 'ring-2 ring-stone-400 ring-offset-2 rounded-2xl' : ''}`}
        >
          <GirlCharacter isSpeaking={rightSpeaker && current} />
          <span className="text-xs font-medium text-stone-600 bg-white/90 px-2.5 py-1 rounded-md shadow-sm">
            {rightSpeaker ? current?.name : (conversations[index - 1] || {})?.name || conversations[1]?.name || 'Girl'}
          </span>
        </motion.div>
      </div>

      {/* Manga-style speech bubble */}
      <AnimatePresence mode="wait">
        {current && (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -6 }}
            transition={{ duration: 0.2 }}
            className={`absolute z-20 max-w-[85%] ${leftSpeaker ? 'left-[12%]' : 'right-[12%] left-auto'} top-[18%]`}
          >
            <div
              onClick={() => speak(current.text)}
              className={`
                relative rounded-xl bg-white px-5 py-4 shadow-md cursor-pointer
                border border-stone-200/80 hover:border-stone-300 hover:shadow-lg transition-all
                before:content-[''] before:absolute before:w-0 before:h-0
                before:border-l-[10px] before:border-l-transparent before:border-r-[10px] before:border-r-transparent
                before:border-t-[14px] before:border-t-white before:-bottom-3
                ${leftSpeaker ? 'before:left-8' : 'before:right-8 before:left-auto'}
              `}
            >
              <p className="text-lg mb-1 examples-with-furigana" style={{ fontFamily: 'var(--font-jp)' }}>
                <FuriganaText text={(current.textFurigana || current.text || '').replace(/\s/g, '')} />
              </p>
              <p className="text-sm text-stone-500">{current.en}</p>
              {speaking && (
                <motion.span
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                  className="text-stone-400 text-xs mt-2 block"
                >
                  再生中...
                </motion.span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls - refined */}
      <div className="bg-white border-t border-stone-200/80 px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={playing ? handlePause : handlePlay}
            className="w-10 h-10 rounded-full bg-stone-900 flex items-center justify-center text-white hover:bg-stone-800 transition-colors"
            aria-label={playing ? 'Pause' : 'Play'}
          >
            {playing ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
            ) : (
              <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
            )}
          </button>
          <button
            onClick={handlePrev}
            disabled={index === 0}
            className="w-9 h-9 rounded-full bg-stone-100 flex items-center justify-center text-stone-600 hover:bg-stone-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Previous"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" /></svg>
          </button>
          <button
            onClick={handleNext}
            disabled={isLast}
            className="w-9 h-9 rounded-full bg-stone-100 flex items-center justify-center text-stone-600 hover:bg-stone-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Next"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zm2-6l4.5 3V9L8 12zm11-6v12h2V6h-2z" /></svg>
          </button>
        </div>
        <span className="text-stone-400 text-sm tabular-nums">
          {index + 1} / {conversations.length}
        </span>
      </div>
    </div>
  )
}
