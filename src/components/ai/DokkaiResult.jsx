export function DokkaiResult({
  analysis,
  onSaveVocabulary,
  onSaveGrammar,
  onSaveKanji,
  onSaveAll,
  onCopy,
  onGenerateQuiz,
}) {
  if (!analysis) return null

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-medium text-slate-900">Dokkai Analysis Result</h2>
        <span className="rounded-md bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
          Estimated: {analysis.estimated_jlpt_level || 'N4'}
        </span>
      </div>

      <div className="space-y-3 text-sm text-slate-700">
        <p><span className="font-medium text-slate-900">Original:</span> {analysis.original_text}</p>
        <p><span className="font-medium text-slate-900">Romaji:</span> {analysis.romaji || '-'}</p>
        <p><span className="font-medium text-slate-900">English:</span> {analysis.english_translation || '-'}</p>
        <p><span className="font-medium text-slate-900">Summary:</span> {analysis.summary || '-'}</p>
        <p><span className="font-medium text-slate-900">Difficulty Score:</span> {analysis.difficulty_score ?? '-'}/100</p>
        <p><span className="font-medium text-slate-900">Reading Speed Estimation:</span> {analysis.reading_speed_wpm ?? '-'} WPM</p>
        <p><span className="font-medium text-slate-900">Summary Quality Score:</span> {analysis.summary_quality_score ?? '-'}/100</p>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <h3 className="text-base font-medium text-slate-900">Extracted Vocabulary</h3>
          <ul className="mt-2 space-y-1 text-xs text-slate-600">
            {(analysis.vocabulary || []).slice(0, 12).map((item, idx) => (
              <li key={`${item.word}-${idx}`}>{item.word} ({item.reading}) - {item.meaning_en}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <h3 className="text-base font-medium text-slate-900">Extracted Kanji</h3>
          <ul className="mt-2 space-y-1 text-xs text-slate-600">
            {(analysis.kanji || []).slice(0, 12).map((item, idx) => (
              <li key={`${item.char}-${idx}`}>{item.char} ({item.reading}) - {item.meaning_en}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <h3 className="text-base font-medium text-slate-900">Grammar Points</h3>
          <ul className="mt-2 space-y-1 text-xs text-slate-600">
            {(analysis.grammar_points || []).slice(0, 12).map((item, idx) => (
              <li key={`${item.name}-${idx}`}>{item.name} - {item.meaning}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <h3 className="text-base font-medium text-slate-900">Practice Questions</h3>
        <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm text-slate-700">
          {(analysis.practice_questions || []).map((item, idx) => (
            <li key={`${item.question}-${idx}`}>
              <p>{item.question}</p>
              <p className="text-xs text-slate-500">Answer: {item.answer}</p>
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" onClick={onSaveVocabulary} className="inline-flex h-9 items-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50">
          Save vocabulary to My Discovered
        </button>
        <button type="button" onClick={onSaveGrammar} className="inline-flex h-9 items-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50">
          Save grammar to My Discovered
        </button>
        <button type="button" onClick={onSaveKanji} className="inline-flex h-9 items-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50">
          Save kanji to My Discovered
        </button>
        <button type="button" onClick={onSaveAll} className="inline-flex h-9 items-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50">
          Save all extracted items
        </button>
        <button type="button" onClick={onGenerateQuiz} className="inline-flex h-9 items-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50">
          Generate quiz
        </button>
        <button type="button" onClick={onCopy} className="inline-flex h-9 items-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50">
          Copy analysis
        </button>
      </div>
    </section>
  )
}
