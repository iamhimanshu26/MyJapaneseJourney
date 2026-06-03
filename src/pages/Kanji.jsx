import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { PageMeta } from '../components/PageMeta'
import { SectionHeader } from '../components/shared/SectionHeader'
import { useDiscovered } from '../hooks/useDiscovered'
import { EmptyState } from '../components/shared/EmptyState'
import { JLPTBadge } from '../components/learning/JLPTBadge'

const LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1']

export function Kanji() {
  const { items, loading } = useDiscovered()
  const [level, setLevel] = useState('ALL')

  const kanji = useMemo(() => {
    const list = items.filter((item) => item.type === 'kanji')
    if (level === 'ALL') return list
    return list.filter((item) => item.jlpt_level === level)
  }, [items, level])

  return (
    <div className="mx-auto max-w-6xl">
      <PageMeta title="Kanji" description="Kanji learning board with discovered character knowledge base." />
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <SectionHeader
          title="Kanji Board"
          subtitle="Track learned kanji, levels, and review readiness."
        />

        <div className="mb-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setLevel('ALL')}
            className={`rounded-lg px-3 py-1.5 text-sm ${level === 'ALL' ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-200'}`}
          >
            ALL
          </button>
          {LEVELS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setLevel(item)}
              className={`rounded-lg px-3 py-1.5 text-sm ${level === item ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-200'}`}
            >
              {item}
            </button>
          ))}
        </div>

        {loading ? <p className="text-sm text-slate-400">Loading kanji...</p> : null}
        {!loading && !kanji.length ? (
          <EmptyState title="No kanji saved yet" message="Use AI Lookup or Dokkai Analyzer to add kanji into your knowledge base." />
        ) : null}
        {!loading && kanji.length ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {kanji.map((item) => (
              <article key={item.id} className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
                <div className="mb-2 flex justify-between">
                  <JLPTBadge level={item.jlpt_level || 'N5'} />
                </div>
                <p className="text-4xl font-bold text-slate-100" style={{ fontFamily: 'var(--font-jp)' }}>{item.word}</p>
                <p className="mt-1 text-xs text-slate-400">{item.reading || '-'}</p>
                <p className="mt-2 text-xs text-slate-300">{item.meaning_en || '-'}</p>
              </article>
            ))}
          </div>
        ) : null}
      </motion.div>
    </div>
  )
}
