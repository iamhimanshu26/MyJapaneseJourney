import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getDiscovered, removeDiscovered } from '../lib/discovered'
import { FuriganaText } from '../components/FuriganaText'

const LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1']

export function MyDiscovered() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setItems(getDiscovered())
    setLoading(false)
  }, [])

  function handleRemove(id) {
    setItems(removeDiscovered(id))
  }

  const byLevel = LEVELS.reduce((acc, l) => {
    acc[l] = items.filter((i) => i.level === l)
    return acc
  }, {})

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold tracking-tight mb-2">My Discovered</h1>
        <p className="text-[var(--color-text-muted)] mb-8">
          Words and grammar you looked up, grouped by JLPT level.
        </p>

        {loading ? (
          <p className="text-[var(--color-text-muted)]">Loading…</p>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-[var(--color-bg-card)] p-8 text-center">
            <p className="text-[var(--color-text-muted)] mb-4">
              No words saved yet.
            </p>
            <Link to="/lookup" className="text-amber-600 hover:underline font-medium">
              Use &quot;Heard New Vocab — Find Here&quot; to look up and save words
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {LEVELS.map((level) => {
              const list = byLevel[level] || []
              if (list.length === 0) return null
              return (
                <div key={level}>
                  <h2 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-3">
                    My {level} words
                  </h2>
                  <div className="space-y-2">
                    {list.map((item) => {
                      const d = item.item_data || {}
                      const isVocab = item.item_type === 'vocab'
                      return (
                        <motion.div
                          key={item.id}
                          layout
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="flex items-center justify-between rounded-xl border border-slate-200 bg-[var(--color-bg-card)] p-4 shadow-sm"
                        >
                          <div>
                            <span className="font-bold" style={{ fontFamily: 'var(--font-jp)' }}>
                              {isVocab ? (
                                d.reading ? (
                                  <FuriganaText text={`${d.word}(${d.reading})`} />
                                ) : (
                                  d.word
                                )
                              ) : (
                                d.name || d.structure
                              )}
                            </span>
                            <p className="text-sm text-[var(--color-text-muted)] mt-1">{d.meaning}</p>
                          </div>
                          <button
                            onClick={() => handleRemove(item.id)}
                            className="text-sm text-red-500 hover:text-red-600"
                          >
                            Remove
                          </button>
                        </motion.div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </motion.div>
    </div>
  )
}
