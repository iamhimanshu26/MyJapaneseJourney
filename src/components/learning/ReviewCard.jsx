import { JLPTBadge } from './JLPTBadge'
import { MasteryBadge } from './MasteryBadge'

export function ReviewCard({ item, onRate }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <JLPTBadge level={item.jlpt_level || 'N5'} />
        <MasteryBadge status={item.status} />
      </div>
      <p className="text-3xl font-semibold text-slate-900" style={{ fontFamily: 'var(--font-jp)' }}>
        {item.word}
      </p>
      {item.reading ? <p className="mt-1 text-sm text-slate-500">{item.reading}</p> : null}
      <p className="mt-4 text-sm text-slate-700">{item.meaning_en || 'No meaning available'}</p>
      {item.romaji ? <p className="mt-1 text-xs text-slate-500">Romaji: {item.romaji}</p> : null}
      {item.business_usage ? <p className="mt-1 text-xs text-slate-500">Business: {item.business_usage}</p> : null}
      {item.example_jp ? (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          <p style={{ fontFamily: 'var(--font-jp)' }}>{item.example_jp}</p>
          {item.example_en ? <p className="mt-1 text-xs text-slate-500">{item.example_en}</p> : null}
        </div>
      ) : null}
      {item.next_review_at ? (
        <p className="mt-3 text-xs text-slate-500">
          Next review due: {new Date(item.next_review_at).toLocaleString()}
        </p>
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
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:border-blue-400 hover:bg-slate-50"
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}
