import { JLPTBadge } from '../learning/JLPTBadge'
import { MasteryBadge } from '../learning/MasteryBadge'

export function AIResultCard({ result, saved, onSave, onStatusChange }) {
  if (!result) return null

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl shadow-slate-950/20">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <JLPTBadge level={result.jlpt_level || 'N5'} />
          <MasteryBadge status={result.status || 'new'} />
        </div>
        <button
          type="button"
          onClick={onSave}
          disabled={saved}
          className="rounded-lg bg-gradient-to-r from-blue-500 to-violet-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saved ? 'Saved to My Discovered' : 'Save to My Discovered'}
        </button>
      </div>

      <h2 className="mt-4 text-3xl font-bold text-slate-100" style={{ fontFamily: 'var(--font-jp)' }}>
        {result.word}
      </h2>
      <div className="mt-2 grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
        <p><span className="text-slate-400">Reading:</span> {result.reading || '-'}</p>
        <p><span className="text-slate-400">Romaji:</span> {result.romaji || '-'}</p>
        <p><span className="text-slate-400">English:</span> {result.meaning_en || '-'}</p>
        <p><span className="text-slate-400">Hindi:</span> {result.meaning_hi || '-'}</p>
        <p><span className="text-slate-400">Part of speech:</span> {result.part_of_speech || '-'}</p>
        <p><span className="text-slate-400">Type:</span> {result.type || '-'}</p>
      </div>

      <div className="mt-4 grid gap-3 rounded-xl border border-slate-700 bg-slate-950/70 p-4 text-sm text-slate-200">
        <p><span className="font-semibold text-slate-300">Example JP:</span> {result.example_jp || '-'}</p>
        <p><span className="font-semibold text-slate-300">Example Romaji:</span> {result.example_romaji || '-'}</p>
        <p><span className="font-semibold text-slate-300">Example EN:</span> {result.example_en || '-'}</p>
      </div>

      <div className="mt-4 grid gap-3 text-sm text-slate-300">
        <p><span className="font-semibold text-slate-200">Formal / Casual:</span> {result.formal_casual_usage || '-'}</p>
        <p><span className="font-semibold text-slate-200">Business Usage:</span> {result.business_usage || '-'}</p>
        <p><span className="font-semibold text-slate-200">Similar Words:</span> {(result.similar_words || []).join(', ') || '-'}</p>
        <p><span className="font-semibold text-slate-200">Common Mistake:</span> {result.common_mistake || '-'}</p>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {['new', 'learning', 'weak', 'mastered', 'favorite'].map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => onStatusChange(status)}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-blue-400"
          >
            Mark {status}
          </button>
        ))}
      </div>
    </section>
  )
}
