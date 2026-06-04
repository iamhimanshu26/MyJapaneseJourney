import { JLPTBadge } from '../learning/JLPTBadge'
import { MasteryBadge } from '../learning/MasteryBadge'

export function AIResultCard({ result, saved, onSave, onStatusChange }) {
  if (!result) return null

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-[0_8px_20px_rgba(15,23,42,0.08)]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <JLPTBadge level={result.jlpt_level || 'N5'} />
          <MasteryBadge status={result.status || 'new'} />
        </div>
        <button
          type="button"
          onClick={onSave}
          disabled={saved}
          className="inline-flex h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saved ? 'Saved to My Discovered' : 'Save to My Discovered'}
        </button>
      </div>

      <h2 className="mt-4 text-3xl font-semibold text-slate-900" style={{ fontFamily: 'var(--font-jp)' }}>
        {result.word}
      </h2>
      <div className="mt-2 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
        <p><span className="text-slate-500">Reading:</span> {result.reading || '-'}</p>
        <p><span className="text-slate-500">Romaji:</span> {result.romaji || '-'}</p>
        <p><span className="text-slate-500">English:</span> {result.meaning_en || '-'}</p>
        <p><span className="text-slate-500">Hindi:</span> {result.meaning_hi || '-'}</p>
        <p><span className="text-slate-500">Part of speech:</span> {result.part_of_speech || '-'}</p>
        <p><span className="text-slate-500">Type:</span> {result.type || '-'}</p>
      </div>

      <div className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        <p><span className="font-medium text-slate-900">Example JP:</span> {result.example_jp || '-'}</p>
        <p><span className="font-medium text-slate-900">Example Romaji:</span> {result.example_romaji || '-'}</p>
        <p><span className="font-medium text-slate-900">Example EN:</span> {result.example_en || '-'}</p>
      </div>

      <div className="mt-4 grid gap-3 text-sm text-slate-700">
        <p><span className="font-medium text-slate-900">Formal / Casual:</span> {result.formal_casual_usage || '-'}</p>
        <p><span className="font-medium text-slate-900">Business Usage:</span> {result.business_usage || '-'}</p>
        <p><span className="font-medium text-slate-900">Similar Words:</span> {(result.similar_words || []).join(', ') || '-'}</p>
        <p><span className="font-medium text-slate-900">Common Mistake:</span> {result.common_mistake || '-'}</p>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {['new', 'learning', 'weak', 'mastered', 'favorite'].map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => onStatusChange(status)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-blue-400"
          >
            Mark {status}
          </button>
        ))}
      </div>
    </section>
  )
}
