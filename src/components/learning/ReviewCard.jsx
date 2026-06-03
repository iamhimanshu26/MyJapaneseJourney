import { JLPTBadge } from './JLPTBadge'
import { MasteryBadge } from './MasteryBadge'

export function ReviewCard({ item, onRate }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <JLPTBadge level={item.jlpt_level || 'N5'} />
        <MasteryBadge status={item.status} />
      </div>
      <p className="text-3xl font-bold text-slate-100" style={{ fontFamily: 'var(--font-jp)' }}>
        {item.word}
      </p>
      {item.reading ? <p className="mt-1 text-sm text-slate-400">{item.reading}</p> : null}
      <p className="mt-4 text-sm text-slate-200">{item.meaning_en || 'No meaning available'}</p>
      {item.example_jp ? (
        <div className="mt-4 rounded-xl border border-slate-700 bg-slate-950/70 p-3 text-sm text-slate-200">
          <p style={{ fontFamily: 'var(--font-jp)' }}>{item.example_jp}</p>
          {item.example_en ? <p className="mt-1 text-xs text-slate-400">{item.example_en}</p> : null}
        </div>
      ) : null}
      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { key: 'again', label: 'Again' },
          { key: 'hard', label: 'Hard' },
          { key: 'good', label: 'Good' },
          { key: 'easy', label: 'Easy' },
        ].map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => onRate(option.key)}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-100 hover:border-blue-400 hover:bg-slate-700"
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}
