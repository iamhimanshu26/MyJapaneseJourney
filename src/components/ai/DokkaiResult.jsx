export function DokkaiResult({
  analysis,
  onSaveVocabulary,
  onSaveGrammar,
  onCopy,
  onGenerateQuiz,
}) {
  if (!analysis) return null

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-100">Dokkai Analysis Result</h2>
        <span className="rounded-md bg-blue-500/20 px-2 py-1 text-xs font-semibold text-blue-300">
          Estimated: {analysis.estimated_jlpt_level || 'N4'}
        </span>
      </div>

      <div className="space-y-3 text-sm text-slate-200">
        <p><span className="font-semibold text-slate-100">Original:</span> {analysis.original_text}</p>
        <p><span className="font-semibold text-slate-100">Romaji:</span> {analysis.romaji || '-'}</p>
        <p><span className="font-semibold text-slate-100">English:</span> {analysis.english_translation || '-'}</p>
        <p><span className="font-semibold text-slate-100">Summary:</span> {analysis.summary || '-'}</p>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-3">
          <h3 className="text-sm font-semibold text-slate-100">Extracted Vocabulary</h3>
          <ul className="mt-2 space-y-1 text-xs text-slate-300">
            {(analysis.vocabulary || []).slice(0, 12).map((item, idx) => (
              <li key={`${item.word}-${idx}`}>{item.word} ({item.reading}) - {item.meaning_en}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-3">
          <h3 className="text-sm font-semibold text-slate-100">Extracted Kanji</h3>
          <ul className="mt-2 space-y-1 text-xs text-slate-300">
            {(analysis.kanji || []).slice(0, 12).map((item, idx) => (
              <li key={`${item.char}-${idx}`}>{item.char} ({item.reading}) - {item.meaning_en}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-3">
          <h3 className="text-sm font-semibold text-slate-100">Grammar Points</h3>
          <ul className="mt-2 space-y-1 text-xs text-slate-300">
            {(analysis.grammar_points || []).slice(0, 12).map((item, idx) => (
              <li key={`${item.name}-${idx}`}>{item.name} - {item.meaning}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-slate-700 bg-slate-950/70 p-3">
        <h3 className="text-sm font-semibold text-slate-100">Practice Questions</h3>
        <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm text-slate-300">
          {(analysis.practice_questions || []).map((item, idx) => (
            <li key={`${item.question}-${idx}`}>
              <p>{item.question}</p>
              <p className="text-xs text-slate-500">Answer: {item.answer}</p>
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" onClick={onSaveVocabulary} className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-700">
          Save vocabulary to My Discovered
        </button>
        <button type="button" onClick={onSaveGrammar} className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-700">
          Save grammar to My Discovered
        </button>
        <button type="button" onClick={onGenerateQuiz} className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-700">
          Generate quiz
        </button>
        <button type="button" onClick={onCopy} className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-700">
          Copy analysis
        </button>
      </div>
    </section>
  )
}
