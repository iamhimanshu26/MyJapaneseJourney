import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FuriganaText } from '../components/FuriganaText'
import { KaiwaVideo } from '../components/KaiwaVideo'
import { PageMeta } from '../components/PageMeta'
import { LESSONS, getLesson } from '../data/lessons'

export function GuidedChapters() {
  const [selectedLessonId, setSelectedLessonId] = useState(null)

  const lesson = selectedLessonId ? getLesson(selectedLessonId) : null

  function speakJapanese(text) {
    if (!('speechSynthesis' in window) || !text) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(String(text).trim())
    u.lang = 'ja-JP'
    u.rate = 0.8
    window.speechSynthesis.speak(u)
  }

  return (
    <div className="min-h-screen bg-[#faf9f7]">
      <PageMeta title="Guided Chapters" description="Learn Japanese chapter by chapter with interactive lessons, conversations, and practice." />

      {/* Header - refined, editorial */}
      <header className="border-b border-stone-200/80 bg-white/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <h1 className="text-2xl font-semibold tracking-tight text-stone-800">
            Guided Chapters
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Structured lessons · Conversation · Vocabulary · Practice
          </p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Lesson grid - card-style, professional */}
        <section className="mb-10">
          <h2 className="text-xs font-medium uppercase tracking-widest text-stone-400 mb-4">
            Lessons
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {LESSONS.map((l, i) => {
              const isSelected = selectedLessonId === l.id
              return (
                <motion.button
                  key={l.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => setSelectedLessonId(isSelected ? null : l.id)}
                  className={`
                    text-left p-4 rounded-xl transition-all duration-200
                    ${isSelected
                      ? 'bg-stone-900 text-white shadow-lg shadow-stone-900/20 ring-2 ring-stone-900'
                      : 'bg-white border border-stone-200/60 hover:border-stone-300 hover:shadow-sm'
                    }
                  `}
                >
                  <span className={`text-xs font-medium ${isSelected ? 'text-stone-400' : 'text-stone-400'}`}>
                    {l.id}
                  </span>
                  <p className={`mt-1 font-medium text-sm ${isSelected ? 'text-white' : 'text-stone-800'}`}>
                    {l.title}
                  </p>
                  <p className={`mt-0.5 text-xs truncate ${isSelected ? 'text-stone-500' : 'text-stone-500'}`}>
                    {l.subtitle}
                  </p>
                </motion.button>
              )
            })}
          </div>
        </section>

        <AnimatePresence mode="wait">
          {lesson ? (
            <motion.article
              key={lesson.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="bg-white rounded-2xl border border-stone-200/60 shadow-sm overflow-hidden"
            >
              {/* Lesson title bar */}
              <div className="px-6 py-4 border-b border-stone-100 bg-stone-50/50">
                <h3 className="font-semibold text-stone-800">{lesson.title}</h3>
                <p className="text-sm text-stone-500 mt-0.5">{lesson.subtitle}</p>
              </div>

              <div className="p-6 space-y-10">
                {/* 1. Kaiwa Renshuu - Conversation */}
                {lesson.conversations && (
                  <section>
                    <h4 className="text-sm font-semibold text-stone-700 uppercase tracking-wider mb-3">会話練習 — Conversation</h4>
                    <KaiwaVideo conversations={lesson.conversations} />
                    <p className="text-xs text-stone-400 mt-2">Play to listen · Click dialogue to replay · Use speed control</p>
                  </section>
                )}

                {/* 2. Vocabulary / Kotoba */}
                {lesson.vocab && (
                  <section>
                    <h4 className="text-sm font-semibold text-stone-700 uppercase tracking-wider mb-3">言葉 — Vocabulary</h4>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {lesson.vocab.map((v, i) => (
                        <motion.button
                          key={i}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.02 }}
                          onClick={() => speakJapanese(v.jp)}
                          className="flex items-start justify-between gap-3 p-4 rounded-xl text-left
                            bg-stone-50/80 hover:bg-stone-100/80 border border-transparent hover:border-stone-200/60
                            transition-colors group"
                        >
                          <div>
                            <p className="font-medium text-stone-800 examples-with-furigana" style={{ fontFamily: 'var(--font-jp)' }}>
                              {v.furigana ? <FuriganaText text={v.furigana} /> : v.jp}
                            </p>
                            <p className="text-sm text-stone-500 mt-0.5">{v.en}</p>
                          </div>
                          <span className="text-stone-300 group-hover:text-amber-500 transition-colors shrink-0">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                            </svg>
                          </span>
                        </motion.button>
                      ))}
                    </div>
                    {lesson.hiragana && (
                      <div className="mt-6 pt-6 border-t border-stone-200/60">
                        <p className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-3">Hiragana</p>
                        <p className="text-lg text-stone-700" style={{ fontFamily: 'var(--font-jp)' }}>{lesson.hiragana.join('　')}</p>
                      </div>
                    )}
                    {lesson.katakana && (
                      <div className="mt-4">
                        <p className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-3">Katakana</p>
                        <p className="text-lg text-stone-700" style={{ fontFamily: 'var(--font-jp)' }}>{lesson.katakana.join('　')}</p>
                      </div>
                    )}
                    {lesson.counters && (
                      <div className="mt-6 pt-6 border-t border-stone-200/60">
                        <p className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-3">Counters (〜つ)</p>
                        <div className="flex flex-wrap gap-2">
                          {lesson.counters.map((c, i) => (
                            <span key={i} className="px-3 py-1.5 rounded-lg bg-stone-100 text-stone-700 text-sm font-medium">
                              {c.num}: {c.kanji} ({c.jp})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </section>
                )}

                {/* 3. Practice */}
                {lesson.practice && (
                  <section>
                    <h4 className="text-sm font-semibold text-stone-700 uppercase tracking-wider mb-3">練習 — Practice</h4>
                    <div className="space-y-3">
                    {lesson.practice.map((p, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: 8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="p-5 rounded-xl bg-stone-50/80 border border-stone-200/40"
                      >
                        <p className="font-medium text-stone-800">{p.prompt}</p>
                        <p className="text-sm text-stone-500 mt-2">
                          <span className="font-medium text-stone-600">Hint:</span> {p.hint}
                        </p>
                      </motion.div>
                    ))}
                    </div>
                  </section>
                )}
              </div>
            </motion.article>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-24 px-8 rounded-2xl border-2 border-dashed border-stone-200/80 bg-stone-50/30"
            >
              <div className="w-12 h-12 rounded-full bg-stone-200/60 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <p className="text-stone-500 font-medium">Select a lesson to begin</p>
              <p className="text-sm text-stone-400 mt-1">Each lesson includes conversation practice, vocabulary, and exercises</p>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}
