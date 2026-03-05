import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FuriganaText } from './FuriganaText'

/**
 * Video-like Kaiwa Renshuu: animated characters with dialogue, play/pause, TTS
 */
export function KaiwaVideo({ conversations = [] }) {
  const [playing, setPlaying] = useState(false)
  const [index, setIndex] = useState(0)
  const [speaking, setSpeaking] = useState(false)

  const current = conversations[index]
  const isLast = index >= conversations.length - 1

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
    <div className="rounded-2xl overflow-hidden border-2 border-slate-200 bg-slate-900">
      {/* Video-like header */}
      <div className="bg-slate-800 px-4 py-2 flex items-center gap-2">
        <span className="text-red-500 text-sm">●</span>
        <span className="text-slate-400 text-sm">会話練習 — Kaiwa Renshuu</span>
      </div>

      {/* Stage area with characters */}
      <div className="relative aspect-video bg-gradient-to-b from-slate-800 to-slate-900 flex items-end justify-center gap-8 pb-4 px-6 min-h-[240px]">
        {/* Left character */}
        <motion.div
          animate={{ scale: current && index % 2 === 0 ? 1.08 : 1 }}
          transition={{ duration: 0.2 }}
          className={`flex flex-col items-center transition-shadow ${current && index % 2 === 0 ? 'ring-4 ring-amber-400 rounded-full' : ''}`}
        >
          <div className="w-20 h-20 rounded-full bg-amber-100 border-4 border-amber-300 flex items-center justify-center shadow-lg">
            <span className="text-3xl text-amber-800">
              {(conversations[0] || current)?.speaker?.slice(0, 1) || 'A'}
            </span>
          </div>
          <span className="text-xs text-slate-400 mt-2">
            {index % 2 === 0 ? current?.name : (conversations[index - 1] || {})?.name || ''}
          </span>
        </motion.div>

        {/* Right character */}
        <motion.div
          animate={{ scale: current && index % 2 === 1 ? 1.08 : 1 }}
          transition={{ duration: 0.2 }}
          className={`flex flex-col items-center transition-shadow ${current && index % 2 === 1 ? 'ring-4 ring-pink-400 rounded-full' : ''}`}
        >
          <div className="w-20 h-20 rounded-full bg-pink-100 border-4 border-pink-300 flex items-center justify-center shadow-lg">
            <span className="text-3xl text-pink-800">
              {(conversations[1] || conversations[0])?.speaker?.slice(0, 1) || 'B'}
            </span>
          </div>
          <span className="text-xs text-slate-400 mt-2">
            {index % 2 === 1 ? current?.name : (conversations[index - 1] || {})?.name || ''}
          </span>
        </motion.div>
      </div>

      {/* Dialogue bubble */}
      <AnimatePresence mode="wait">
        {current && (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute bottom-20 left-1/2 -translate-x-1/2 w-[90%] max-w-lg z-10"
          >
            <div
              onClick={() => speak(current.text)}
              className="rounded-2xl bg-white/95 backdrop-blur px-6 py-4 shadow-xl cursor-pointer hover:bg-white border border-slate-200"
            >
              <p className="text-lg mb-1 examples-with-furigana" style={{ fontFamily: 'var(--font-jp)' }}>
                <FuriganaText text={current.text.replace(/\s/g, '')} />
              </p>
              <p className="text-sm text-slate-500">{current.en}</p>
              {speaking && (
                <motion.span
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                  className="text-amber-500 text-xs mt-2 block"
                >
                  🔊 Playing...
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
