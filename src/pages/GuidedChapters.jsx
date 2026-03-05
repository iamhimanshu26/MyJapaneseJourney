import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { LessonCharacter } from '../components/LessonCharacter'
import { FuriganaText } from '../components/FuriganaText'
import { KaiwaVideo } from '../components/KaiwaVideo'
import { PageMeta } from '../components/PageMeta'
import { LESSONS, getLesson } from '../data/lessons'

const tabs = [
  { id: 'kaiwa', label: '会話練習', icon: '💬', en: 'Kaiwa Renshuu' },
  { id: 'words', label: 'Words you will learn', icon: '📖', en: '' },
  { id: 'practice', label: 'Practice More', icon: '✏️', en: '' },
]

export function GuidedChapters() {
  const [selectedLessonId, setSelectedLessonId] = useState(null)
  const [activeTab, setActiveTab] = useState('kaiwa')

  const lesson = selectedLessonId ? getLesson(selectedLessonId) : null

  function speakJapanese(text) {
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const utterances = text.split(/[、。]/).filter(Boolean)
    if (utterances.length === 0) return
    const u = new SpeechSynthesisUtterance(utterances[0])
    u.lang = 'ja-JP'
    u.rate = 0.8
    window.speechSynthesis.speak(u)
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <PageMeta title="Guided Chapters" description="Learn Japanese chapter by chapter with interactive lessons, conversations, and practice." />
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-8">
          <LessonCharacter size="lg" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-1">Guided Chapters</h1>
            <p className="text-[var(--color-text-muted)]">
              Step-by-step lessons with 会話練習, vocabulary, and practice. Pick a lesson to begin!
            </p>
          </div>
        </div>

        {/* Lesson selector */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-3">Choose a lesson</h2>
          <div className="flex flex-wrap gap-3">
            {LESSONS.map((l, i) => (
              <motion.button
                key={l.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => {
                  setSelectedLessonId(selectedLessonId === l.id ? null : l.id)
                  setActiveTab('kaiwa')
                }}
                className={`px-5 py-3 rounded-xl border-2 font-medium transition-all shadow-sm ${
                  selectedLessonId === l.id
                    ? 'border-amber-400 bg-amber-50 text-amber-800 shadow-amber-200/50'
                    : 'border-slate-200 bg-[var(--color-bg-card)] hover:border-amber-300 hover:bg-amber-50/50'
                }`}
              >
                <span className="block text-lg">{l.title}</span>
                <span className="text-xs text-[var(--color-text-muted)]">{l.subtitle}</span>
              </motion.button>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {lesson ? (
            <motion.div
              key={lesson.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="rounded-2xl border border-slate-200 bg-[var(--color-bg-card)] overflow-hidden shadow-lg"
            >
              {/* Tabs */}
              <div className="flex border-b border-slate-200 bg-slate-50">
                {tabs.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id)}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                      activeTab === t.id ? 'bg-white text-amber-700 border-b-2 border-amber-500' : 'text-[var(--color-text-muted)] hover:bg-white/50'
                    }`}
                  >
                    <span>{t.icon}</span>
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>

              <div className="p-6 min-h-[280px]">
                {/* Kaiwa Renshuu - video style with animated characters */}
                {activeTab === 'kaiwa' && lesson.conversations && (
                  <div className="space-y-4">
                    <KaiwaVideo conversations={lesson.conversations} />
                    <p className="text-sm text-[var(--color-text-muted)]">Press Play to hear the conversation. Click dialogue to replay. Use prev/next to step through.</p>
                  </div>
                )}

                {/* Words you will learn */}
                {activeTab === 'words' && lesson.vocab && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="grid gap-3 sm:grid-cols-2"
                  >
                    {lesson.vocab.map((v, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        onClick={() => speakJapanese(v.jp)}
                        className="flex items-center justify-between p-4 rounded-xl bg-slate-50 hover:bg-amber-50 cursor-pointer transition-colors group"
                      >
                        <div>
                          <p className="font-bold examples-with-furigana" style={{ fontFamily: 'var(--font-jp)' }}>
                            {v.furigana ? <FuriganaText text={v.furigana} /> : v.jp}
                          </p>
                          <p className="text-sm text-[var(--color-text-muted)]">{v.en}</p>
                        </div>
                        <span className="opacity-0 group-hover:opacity-100 text-amber-600">🔊</span>
                      </motion.div>
                    ))}
                    {lesson.hiragana && (
                      <div className="sm:col-span-2 mt-4 pt-4 border-t border-slate-200">
                        <p className="text-sm font-medium text-[var(--color-text-muted)] mb-2">Hiragana practice</p>
                        <p className="text-lg" style={{ fontFamily: 'var(--font-jp)' }}>{lesson.hiragana.join('　')}</p>
                      </div>
                    )}
                    {lesson.katakana && (
                      <div className="sm:col-span-2">
                        <p className="text-sm font-medium text-[var(--color-text-muted)] mb-2">Katakana practice</p>
                        <p className="text-lg" style={{ fontFamily: 'var(--font-jp)' }}>{lesson.katakana.join('　')}</p>
                      </div>
                    )}
                    {lesson.counters && (
                      <div className="sm:col-span-2 mt-4 pt-4 border-t border-slate-200">
                        <p className="text-sm font-medium text-[var(--color-text-muted)] mb-2">Counters (〜つ)</p>
                        <div className="flex flex-wrap gap-2">
                          {lesson.counters.map((c, i) => (
                            <span key={i} className="px-3 py-1 rounded-lg bg-amber-100 text-amber-800 text-sm">
                              {c.num}: {c.kanji} ({c.jp})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Practice More */}
                {activeTab === 'practice' && lesson.practice && (
                  <div className="space-y-4">
                    <p className="text-[var(--color-text-muted)] mb-4">Try saying these out loud or writing them down:</p>
                    {lesson.practice.map((p, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="p-4 rounded-xl border-2 border-dashed border-amber-200 bg-amber-50/30"
                      >
                        <p className="font-medium text-[var(--color-text)]">{p.prompt}</p>
                        <p className="text-sm text-amber-700 mt-1">Hint: {p.hint}</p>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-16 text-center"
            >
              <LessonCharacter size="lg" animate={true} />
              <p className="mt-4 text-[var(--color-text-muted)]">Select a lesson above to get started</p>
              <p className="text-sm text-[var(--color-text-muted)] mt-2">Each lesson has 会話練習, vocabulary, and practice!</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
