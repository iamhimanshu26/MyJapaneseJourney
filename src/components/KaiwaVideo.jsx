import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FuriganaText } from './FuriganaText'

/** Manga-style character avatar (simple anime face) */
function MangaCharacter({ variant = 'amber', isSpeaking }) {
  const isLeft = variant === 'amber'
  return (
    <motion.div
      animate={{ scale: isSpeaking ? 1.05 : 1, y: isSpeaking ? -4 : 0 }}
      transition={{ duration: 0.25 }}
      className="relative"
    >
      {/* Body / shoulders */}
      <div className={`w-24 h-28 rounded-t-[40%] ${isLeft ? 'bg-amber-100' : 'bg-pink-100'} border-4 ${isLeft ? 'border-amber-300' : 'border-pink-300'} shadow-lg`}>
        {/* Face */}
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full bg-white border-2 border-slate-300 shadow-inner flex items-center justify-center overflow-hidden">
          {/* Eyes */}
          <div className="flex gap-3 -mt-2">
            <div className={`w-3 h-3 rounded-full ${isLeft ? 'bg-amber-700' : 'bg-pink-700'}`} />
            <div className={`w-3 h-3 rounded-full ${isLeft ? 'bg-amber-700' : 'bg-pink-700'}`} />
          </div>
          {/* Blush */}
          <div className={`absolute bottom-3 left-2 w-2 h-1 rounded-full ${isLeft ? 'bg-amber-300/60' : 'bg-pink-300/60'}`} />
          <div className={`absolute bottom-3 right-2 w-2 h-1 rounded-full ${isLeft ? 'bg-amber-300/60' : 'bg-pink-300/60'}`} />
        </div>
      </div>
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
    <div className="rounded-2xl overflow-hidden border-2 border-slate-200 bg-slate-100 relative">
      {/* Video-like header */}
      <div className="bg-slate-800 px-4 py-2 flex items-center gap-2">
        <span className="text-red-500 text-sm">●</span>
        <span className="text-slate-400 text-sm">会話練習 — Kaiwa Renshuu</span>
      </div>

      {/* Stage: light manga-style backdrop with visible characters */}
      <div className="relative aspect-video min-h-[280px] bg-gradient-to-b from-amber-50/80 via-slate-50 to-pink-50/80 flex items-end justify-center gap-12 pb-6 px-8">
        {/* Decorative manga elements - subtle panel lines */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-0 left-0 right-0 h-px bg-slate-300" />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-slate-300" />
        </div>

        {/* Left character - manga style */}
        <motion.div
          animate={{ scale: leftSpeaker && current ? 1.02 : 1 }}
          transition={{ duration: 0.2 }}
          className={`flex flex-col items-center gap-2 z-10 ${leftSpeaker && current ? 'ring-4 ring-amber-400 ring-offset-2 rounded-2xl' : ''}`}
        >
          <MangaCharacter variant="amber" isSpeaking={leftSpeaker && current} />
          <span className="text-xs font-medium text-slate-600 bg-white/80 px-2 py-0.5 rounded">
            {leftSpeaker ? current?.name : (conversations[index - 1] || {})?.name || conversations[0]?.name || 'A'}
          </span>
        </motion.div>

        {/* Right character - manga style */}
        <motion.div
          animate={{ scale: rightSpeaker && current ? 1.02 : 1 }}
          transition={{ duration: 0.2 }}
          className={`flex flex-col items-center gap-2 z-10 ${rightSpeaker && current ? 'ring-4 ring-pink-400 ring-offset-2 rounded-2xl' : ''}`}
        >
          <MangaCharacter variant="pink" isSpeaking={rightSpeaker && current} />
          <span className="text-xs font-medium text-slate-600 bg-white/80 px-2 py-0.5 rounded">
            {rightSpeaker ? current?.name : (conversations[index - 1] || {})?.name || conversations[1]?.name || 'B'}
          </span>
        </motion.div>
      </div>

      {/* Manga-style speech bubble - positioned above characters, with tail pointing to speaker */}
      <AnimatePresence mode="wait">
        {current && (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.9, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -8 }}
            transition={{ duration: 0.2 }}
            className={`absolute z-20 max-w-[85%] ${leftSpeaker ? 'left-[12%]' : 'right-[12%] left-auto'} top-[18%]`}
          >
            {/* Manga speech bubble: white rounded cloud with tail pointing to speaker */}
            <div
              onClick={() => speak(current.text)}
              className={`
                relative rounded-2xl bg-white px-5 py-4 shadow-lg cursor-pointer 
                border-2 border-slate-300 hover:border-amber-400 hover:shadow-xl transition-all
                before:content-[''] before:absolute before:w-0 before:h-0
                before:border-l-[10px] before:border-l-transparent before:border-r-[10px] before:border-r-transparent
                before:border-t-[14px] before:border-t-white before:-bottom-3
                ${leftSpeaker ? 'before:left-8' : 'before:right-8 before:left-auto'}
              `}
            >
              <p className="text-lg mb-1 examples-with-furigana" style={{ fontFamily: 'var(--font-jp)' }}>
                <FuriganaText text={current.text.replace(/\s/g, '')} />
              </p>
              <p className="text-sm text-slate-600">{current.en}</p>
              {speaking && (
                <motion.span
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                  className="text-amber-600 text-xs mt-2 block"
                >
                  🔊 再生中...
                </motion.span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls - video player style */}
      <div className="bg-slate-800 px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={playing ? handlePause : handlePlay}
            className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center text-white hover:bg-amber-600"
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
            className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-white hover:bg-slate-500 disabled:opacity-40"
            aria-label="Previous"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" /></svg>
          </button>
          <button
            onClick={handleNext}
            disabled={isLast}
            className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-white hover:bg-slate-500 disabled:opacity-40"
            aria-label="Next"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zm2-6l4.5 3V9L8 12zm11-6v12h2V6h-2z" /></svg>
          </button>
        </div>
        <span className="text-slate-400 text-sm">
          {index + 1} / {conversations.length}
        </span>
      </div>
    </div>
  )
}
