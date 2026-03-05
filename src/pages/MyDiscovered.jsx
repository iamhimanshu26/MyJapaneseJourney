import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useDiscovered } from '../hooks/useDiscovered'
import { FuriganaText } from '../components/FuriganaText'
import { PageMeta } from '../components/PageMeta'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

const LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1']

export function MyDiscovered() {
  const { items, loading, remove } = useDiscovered()
  const { user, hasAuth } = useAuth()
  const toast = useToast()

  async function handleRemove(id) {
    try {
      await remove(id)
      toast.success('Removed')
    } catch {
      toast.error('Could not remove')
    }
  }

  const byLevel = LEVELS.reduce((acc, l) => {
    acc[l] = items.filter((i) => i.level === l)
    return acc
  }, {})

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <PageMeta title="My Discovered" description="Words and grammar you looked up, grouped by JLPT level." />
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold tracking-tight mb-2">My Discovered</h1>
        <p className="text-[var(--color-text-muted)] mb-8">
          {hasAuth && !user
            ? 'Log in to sync your saved words across devices.'
            : 'Words and grammar you looked up, grouped by JLPT level.'}
        </p>

        {loading ? (
          <div className="flex items-center gap-2 text-[var(--color-text-muted)]">
            <span className="inline-block w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" aria-hidden />
            Loading…
          </div>
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
                <section key={level} aria-labelledby={`heading-${level}`}>
                  <h2 id={`heading-${level}`} className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-3">
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
                            aria-label={`Remove ${isVocab ? d.word : d.name}`}
                          >
                            Remove
                          </button>
                        </motion.div>
                      )
                    })}
                  </div>
                </section>
              )
            })}
          </div>
        )}
      </motion.div>
    </div>
  )
}
