import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PageMeta } from '../components/PageMeta'
import { SectionHeader } from '../components/shared/SectionHeader'
import { LoadingState } from '../components/shared/LoadingState'
import { EmptyState } from '../components/shared/EmptyState'
import { ActionButton } from '../components/ui/ActionButton'
import { useLessons } from '../hooks/useLessons'
import { useToast } from '../context/ToastContext'

function formatDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString()
}

export function LessonDetail() {
  const { id } = useParams()
  const lessonsApi = useLessons()
  const toast = useToast()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [questionResults, setQuestionResults] = useState({})
  const [editingMeta, setEditingMeta] = useState(false)
  const [metaForm, setMetaForm] = useState({
    title: '',
    jlpt_level: 'N5',
    category: '',
    tags: '',
    notes: '',
  })

  async function loadDetail() {
    if (!id) return
    setLoading(true)
    setError('')
    try {
      const response = await lessonsApi.getLesson(id)
      setData(response)
      setMetaForm({
        title: response.lesson?.title || '',
        jlpt_level: response.lesson?.jlpt_level || response.lesson?.estimated_level || 'N5',
        category: response.lesson?.category || '',
        tags: Array.isArray(response.lesson?.tags) ? response.lesson.tags.join(', ') : '',
        notes: response.lesson?.notes || '',
      })
    } catch (err) {
      setError(err.message || 'Failed to load lesson detail')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDetail()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const completionFromPractice = useMemo(() => {
    const questions = data?.practice_questions || []
    if (!questions.length) return data?.lesson?.completion_percentage || 0
    const solved = Object.keys(questionResults).length
    return Math.min(100, Math.round((solved / questions.length) * 100))
  }, [data?.lesson?.completion_percentage, data?.practice_questions, questionResults])

  async function saveAll(type) {
    if (!id) return
    setSaving(true)
    try {
      if (type === 'vocabulary') await lessonsApi.saveVocabulary(id)
      if (type === 'grammar') await lessonsApi.saveGrammar(id)
      if (type === 'kanji') await lessonsApi.saveKanji(id)
      if (type === 'all') {
        await lessonsApi.saveVocabulary(id)
        await lessonsApi.saveGrammar(id)
        await lessonsApi.saveKanji(id)
      }
      toast.success(type === 'all' ? 'Lesson items saved to My Discovered' : `${type} saved to My Discovered`)
    } catch (err) {
      toast.error(err.message || 'Failed to save lesson items')
    } finally {
      setSaving(false)
    }
  }

  async function markComplete() {
    if (!id) return
    setSaving(true)
    try {
      await lessonsApi.completeLesson(id)
      toast.success('Lesson marked complete')
      await loadDetail()
    } catch (err) {
      toast.error(err.message || 'Failed to mark complete')
    } finally {
      setSaving(false)
    }
  }

  async function generateReviewSession() {
    if (!id) return
    setSaving(true)
    try {
      const result = await lessonsApi.generateReviewSession(id)
      toast.success(`Generated review session items: ${result.total_inserted || 0}`)
    } catch (err) {
      toast.error(err.message || 'Failed to generate review session')
    } finally {
      setSaving(false)
    }
  }

  async function reprocessLesson() {
    if (!id || !data?.lesson?.raw_text) return
    setProcessing(true)
    try {
      await lessonsApi.reprocessLesson(id, data.lesson.raw_text)
      toast.success('Lesson reprocessed with AI')
      await loadDetail()
    } catch (err) {
      toast.error(err.message || 'Failed to reprocess lesson')
    } finally {
      setProcessing(false)
    }
  }

  async function saveMetadata() {
    if (!id) return
    setSaving(true)
    try {
      await lessonsApi.updateLesson(id, {
        title: metaForm.title,
        jlpt_level: metaForm.jlpt_level,
        category: metaForm.category,
        tags: metaForm.tags,
        notes: metaForm.notes,
        completion_percentage: completionFromPractice,
      })
      setEditingMeta(false)
      toast.success('Lesson metadata updated')
      await loadDetail()
    } catch (err) {
      toast.error(err.message || 'Failed to update metadata')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl">
        <LoadingState title="Loading lesson detail..." subtitle="Preparing lesson overview and extracted content." />
      </div>
    )
  }

  if (error || !data?.lesson) {
    return (
      <div className="mx-auto max-w-7xl">
        <EmptyState title="Lesson unavailable" message={error || 'Could not load this lesson.'} />
      </div>
    )
  }

  const lesson = data.lesson

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <PageMeta title={lesson.title || 'Lesson Detail'} description="Lesson detail with text cleanup, extracted vocabulary, grammar, kanji, and practice flow." />
      <SectionHeader
        title={lesson.title}
        subtitle={`JLPT ${lesson.jlpt_level || lesson.estimated_level || 'N5'} • ${lesson.source_type?.toUpperCase()} • Created ${formatDate(lesson.created_at)}`}
        actions={[
          <Link key="back" to="/lessons" className="inline-flex h-10 items-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Back to Library
          </Link>,
          <ActionButton key="edit" onClick={() => setEditingMeta((prev) => !prev)}>Edit Lesson</ActionButton>,
          <ActionButton key="reprocess" onClick={reprocessLesson} disabled={processing}>
            {processing ? 'Reprocessing...' : 'Reprocess with AI'}
          </ActionButton>,
          <ActionButton key="complete" variant="primary" onClick={markComplete} disabled={saving}>Mark Lesson Complete</ActionButton>,
        ]}
      />

      {editingMeta ? (
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.06)]">
          <h2 className="text-base font-medium text-slate-900">Edit Lesson Metadata</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <input className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800" value={metaForm.title} onChange={(e) => setMetaForm((prev) => ({ ...prev, title: e.target.value }))} />
            <select className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800" value={metaForm.jlpt_level} onChange={(e) => setMetaForm((prev) => ({ ...prev, jlpt_level: e.target.value }))}>
              {['N5', 'N4', 'N3', 'N2', 'N1'].map((level) => <option key={level} value={level}>{level}</option>)}
            </select>
            <input className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800" value={metaForm.category} onChange={(e) => setMetaForm((prev) => ({ ...prev, category: e.target.value }))} placeholder="Category" />
            <input className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800" value={metaForm.tags} onChange={(e) => setMetaForm((prev) => ({ ...prev, tags: e.target.value }))} placeholder="Tags (comma separated)" />
          </div>
          <textarea className="mt-3 h-24 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800" value={metaForm.notes} onChange={(e) => setMetaForm((prev) => ({ ...prev, notes: e.target.value }))} placeholder="Notes" />
          <div className="mt-3 flex gap-2">
            <ActionButton onClick={() => setEditingMeta(false)}>Cancel</ActionButton>
            <ActionButton variant="primary" onClick={saveMetadata} disabled={saving}>Save Metadata</ActionButton>
          </div>
        </section>
      ) : null}

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.06)]">
        <h2 className="text-xl font-semibold text-slate-900">Overview</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <p className="text-sm text-slate-700">Status: <strong>{lesson.status}</strong></p>
          <p className="text-sm text-slate-700">Completion: <strong>{lesson.completion_percentage}%</strong></p>
          <p className="text-sm text-slate-700">Last studied: <strong>{formatDate(lesson.last_studied_at)}</strong></p>
          <p className="text-sm text-slate-700">Vocabulary count: <strong>{lesson.vocabulary_count || 0}</strong></p>
          <p className="text-sm text-slate-700">Grammar count: <strong>{lesson.grammar_count || 0}</strong></p>
          <p className="text-sm text-slate-700">Kanji count: <strong>{lesson.kanji_count || 0}</strong></p>
        </div>
        <p className="mt-3 text-sm text-slate-700">{lesson.summary || 'No summary available yet.'}</p>
      </section>

      <section className="grid gap-3 lg:grid-cols-2" id="text">
        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="text-base font-medium text-slate-900">Original Text</h3>
          <pre className="mt-2 max-h-[22rem] overflow-y-auto whitespace-pre-wrap text-sm text-slate-700">{lesson.raw_text}</pre>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="text-base font-medium text-slate-900">Cleaned Japanese Text</h3>
          <pre className="mt-2 max-h-[22rem] overflow-y-auto whitespace-pre-wrap text-sm text-slate-700">{lesson.cleaned_text || '-'}</pre>
          <h4 className="mt-4 text-base font-medium text-slate-900">Corrected Text</h4>
          <pre className="mt-2 max-h-[16rem] overflow-y-auto whitespace-pre-wrap text-sm text-slate-700">{lesson.corrected_text || '-'}</pre>
        </article>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="text-base font-medium text-slate-900">Romaji</h3>
        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{lesson.romaji || '-'}</p>
        <h3 className="mt-4 text-base font-medium text-slate-900">English Translation</h3>
        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{lesson.english_translation || '-'}</p>
      </section>

      <section id="vocabulary" className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-medium text-slate-900">Vocabulary</h3>
          <ActionButton onClick={() => saveAll('vocabulary')} disabled={saving}>Save All Vocabulary</ActionButton>
        </div>
        <div className="mt-3 space-y-2">
          {(data.vocabulary || []).map((item) => (
            <article key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-slate-900">{item.word} {item.reading ? `(${item.reading})` : ''}</p>
                <ActionButton className="h-8 text-xs" onClick={() => lessonsApi.saveVocabulary(id, [item.id]).then(() => toast.success('Saved to My Discovered')).catch((err) => toast.error(err.message || 'Save failed'))}>
                  Save to My Discovered
                </ActionButton>
              </div>
              <p className="mt-1 text-sm text-slate-700">{item.meaning_en || '-'}</p>
              <p className="mt-1 text-xs text-slate-500">JLPT {item.jlpt_level || '-'} • {item.part_of_speech || '-'}</p>
              {item.example_jp ? <p className="mt-1 text-xs text-slate-600">{item.example_jp} {item.example_en ? `— ${item.example_en}` : ''}</p> : null}
            </article>
          ))}
          {!data.vocabulary?.length ? <p className="text-sm text-slate-600">No vocabulary extracted.</p> : null}
        </div>
      </section>

      <section id="grammar" className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-medium text-slate-900">Grammar</h3>
          <ActionButton onClick={() => saveAll('grammar')} disabled={saving}>Save All Grammar</ActionButton>
        </div>
        <div className="mt-3 space-y-2">
          {(data.grammar || []).map((item) => (
            <article key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-slate-900">{item.grammar_point}</p>
                <ActionButton className="h-8 text-xs" onClick={() => lessonsApi.saveGrammar(id, [item.id]).then(() => toast.success('Saved to My Discovered')).catch((err) => toast.error(err.message || 'Save failed'))}>
                  Save to My Discovered
                </ActionButton>
              </div>
              <p className="mt-1 text-sm text-slate-700">{item.meaning_en || '-'}</p>
              <p className="mt-1 text-xs text-slate-500">{item.explanation || '-'} • JLPT {item.jlpt_level || '-'}</p>
              {item.example_jp ? <p className="mt-1 text-xs text-slate-600">{item.example_jp} {item.example_en ? `— ${item.example_en}` : ''}</p> : null}
            </article>
          ))}
          {!data.grammar?.length ? <p className="text-sm text-slate-600">No grammar extracted.</p> : null}
        </div>
      </section>

      <section id="kanji" className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-medium text-slate-900">Kanji</h3>
          <ActionButton onClick={() => saveAll('kanji')} disabled={saving}>Save All Kanji</ActionButton>
        </div>
        <div className="mt-3 space-y-2">
          {(data.kanji || []).map((item) => (
            <article key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-slate-900">{item.kanji} {item.reading ? `(${item.reading})` : ''}</p>
                <ActionButton className="h-8 text-xs" onClick={() => lessonsApi.saveKanji(id, [item.id]).then(() => toast.success('Saved to My Discovered')).catch((err) => toast.error(err.message || 'Save failed'))}>
                  Save to My Discovered
                </ActionButton>
              </div>
              <p className="mt-1 text-sm text-slate-700">{item.meaning_en || '-'}</p>
              <p className="mt-1 text-xs text-slate-500">Example: {item.example_word || '-'} • JLPT {item.jlpt_level || '-'}</p>
            </article>
          ))}
          {!data.kanji?.length ? <p className="text-sm text-slate-600">No kanji extracted.</p> : null}
        </div>
      </section>

      <section id="practice" className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-medium text-slate-900">Practice Questions</h3>
          <div className="flex gap-2">
            <ActionButton onClick={generateReviewSession} disabled={saving}>Generate Review Session</ActionButton>
            <ActionButton onClick={() => saveAll('all')} disabled={saving}>Save All Lesson Items</ActionButton>
          </div>
        </div>
        <ol className="mt-3 space-y-3">
          {(data.practice_questions || []).map((item, idx) => (
            <li key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm font-medium text-slate-900">{idx + 1}. {item.question}</p>
              {Array.isArray(item.options_json) && item.options_json.length ? (
                <ul className="mt-2 list-disc pl-5 text-sm text-slate-700">
                  {item.options_json.map((option) => <li key={option}>{option}</li>)}
                </ul>
              ) : null}
              <p className="mt-2 text-xs text-slate-500">Answer: {item.answer || '-'}</p>
              {item.explanation ? <p className="mt-1 text-xs text-slate-500">Explanation: {item.explanation}</p> : null}
              <div className="mt-2 flex gap-2">
                <ActionButton
                  className="h-8 text-xs"
                  onClick={() => setQuestionResults((prev) => ({ ...prev, [item.id]: 'correct' }))}
                >
                  Mark Correct
                </ActionButton>
                <ActionButton
                  className="h-8 text-xs"
                  variant="danger"
                  onClick={() => setQuestionResults((prev) => ({ ...prev, [item.id]: 'incorrect' }))}
                >
                  Mark Incorrect
                </ActionButton>
                {questionResults[item.id] ? <span className="inline-flex items-center text-xs text-slate-600">Saved: {questionResults[item.id]}</span> : null}
              </div>
            </li>
          ))}
        </ol>
        {!data.practice_questions?.length ? <p className="mt-2 text-sm text-slate-600">No practice questions generated.</p> : null}
      </section>
    </div>
  )
}
