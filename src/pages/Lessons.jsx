import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageMeta } from '../components/PageMeta'
import { SectionHeader } from '../components/shared/SectionHeader'
import { EmptyState } from '../components/shared/EmptyState'
import { LoadingState } from '../components/shared/LoadingState'
import { ActionButton } from '../components/ui/ActionButton'
import { SearchInput } from '../components/ui/SearchInput'
import { useLessons } from '../hooks/useLessons'
import { useToast } from '../context/ToastContext'
import { LESSONS as LEGACY_LESSONS } from '../data/lessons'

const STEPS = [
  'Upload / Paste',
  'Preview Extracted Text',
  'AI Cleanup',
  'Review Structured Lesson',
  'Save Lesson',
]

function formatDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString()
}

function UploadStepper({ step }) {
  return (
    <ol className="grid gap-2 md:grid-cols-5">
      {STEPS.map((label, idx) => {
        const active = idx + 1 === step
        const done = idx + 1 < step
        return (
          <li
            key={label}
            className={`rounded-lg border px-3 py-2 text-xs ${
              done ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : active ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-500'
            }`}
          >
            <p className="font-medium">Step {idx + 1}</p>
            <p className="mt-0.5">{label}</p>
          </li>
        )
      })}
    </ol>
  )
}

export function Lessons() {
  const toast = useToast()
  const lessonsApi = useLessons()

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState({
    q: '',
    jlpt: '',
    source_type: '',
    status: '',
    date_from: '',
    date_to: '',
  })
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploadStep, setUploadStep] = useState(1)
  const [uploadMethod, setUploadMethod] = useState('paste')
  const [metadata, setMetadata] = useState({
    title: '',
    jlpt_level: 'N5',
    category: 'General',
    tags: '',
    notes: '',
  })
  const [selectedFile, setSelectedFile] = useState(null)
  const [rawText, setRawText] = useState('')
  const [sourceType, setSourceType] = useState('text')
  const [processing, setProcessing] = useState(false)
  const [processingError, setProcessingError] = useState('')
  const [processed, setProcessed] = useState(null)
  const [createdLesson, setCreatedLesson] = useState(null)
  const [savingLesson, setSavingLesson] = useState(false)
  const [editingLesson, setEditingLesson] = useState(null)

  const filteredLegacyCount = useMemo(() => LEGACY_LESSONS.length, [])

  async function loadLessons(nextFilters = filters) {
    setLoading(true)
    setError('')
    try {
      const data = await lessonsApi.listLessons(nextFilters)
      setItems(data.items || [])
    } catch (err) {
      setError(err.message || 'Failed to load lessons')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLessons()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function resetUploader() {
    setUploadOpen(false)
    setUploadStep(1)
    setUploadMethod('paste')
    setMetadata({ title: '', jlpt_level: 'N5', category: 'General', tags: '', notes: '' })
    setSelectedFile(null)
    setRawText('')
    setSourceType('text')
    setProcessed(null)
    setProcessingError('')
    setCreatedLesson(null)
    setProcessing(false)
    setSavingLesson(false)
  }

  async function goToPreview() {
    setProcessingError('')
    if (!metadata.title.trim()) {
      setProcessingError('Lesson title is required.')
      return
    }
    if (uploadMethod === 'paste') {
      try {
        const response = await lessonsApi.uploadText({
          title: metadata.title,
          source_type: 'text',
          raw_text: rawText,
        })
        setRawText(response.extracted_text || '')
        setSourceType('text')
        setUploadStep(2)
      } catch (err) {
        setProcessingError(err.message || 'Failed to prepare pasted text')
      }
      return
    }

    if (!selectedFile) {
      setProcessingError('Select a TXT or PDF file first.')
      return
    }
    try {
      const response = await lessonsApi.uploadFile(selectedFile)
      setRawText(response.extracted_text || '')
      setSourceType(response.source_type || (selectedFile.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'txt'))
      setUploadStep(2)
    } catch (err) {
      setProcessingError(err.message || 'Failed to extract uploaded file')
    }
  }

  async function runAiCleanup() {
    setProcessing(true)
    setProcessingError('')
    setUploadStep(3)
    try {
      const response = await lessonsApi.processAi({
        title: metadata.title,
        jlpt_level: metadata.jlpt_level,
        category: metadata.category,
        raw_text: rawText,
      })
      setProcessed(response)
      setUploadStep(4)
    } catch (err) {
      setProcessingError(err.message || 'AI cleanup failed')
      setUploadStep(2)
    } finally {
      setProcessing(false)
    }
  }

  async function saveLesson() {
    if (!processed) return
    setSavingLesson(true)
    setProcessingError('')
    try {
      const response = await lessonsApi.createLesson({
        lesson: {
          ...metadata,
          source_type: sourceType,
          status: 'ready',
          raw_text: rawText,
        },
        processed,
      })
      setCreatedLesson(response.lesson)
      setUploadStep(5)
      toast.success('Lesson saved successfully')
      await loadLessons()
    } catch (err) {
      setProcessingError(err.message || 'Failed to save lesson')
    } finally {
      setSavingLesson(false)
    }
  }

  async function removeLesson(id) {
    if (!window.confirm('Delete this lesson permanently?')) return
    try {
      await lessonsApi.deleteLesson(id)
      toast.success('Lesson deleted')
      await loadLessons()
    } catch (err) {
      toast.error(err.message || 'Failed to delete lesson')
    }
  }

  async function saveMetadataEdit() {
    if (!editingLesson?.id) return
    try {
      await lessonsApi.updateLesson(editingLesson.id, editingLesson)
      toast.success('Lesson metadata updated')
      setEditingLesson(null)
      await loadLessons()
    } catch (err) {
      toast.error(err.message || 'Failed to update lesson')
    }
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageMeta title="Lesson Library" description="Enterprise lesson library with upload, AI cleanup, and structured study content." />
      <SectionHeader
        title="Lesson Library"
        subtitle="Upload lessons from text/TXT/PDF, process with AI cleanup, and manage your study content in Neon."
        actions={[
          <ActionButton key="upload" variant="primary" onClick={() => setUploadOpen(true)}>Upload Lesson</ActionButton>,
          <Link key="legacy" to="/chapters" className="inline-flex h-10 items-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Open Legacy Guided Lessons ({filteredLegacyCount})
          </Link>,
        ]}
      />

      {uploadOpen ? (
        <section className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.06)]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900">Lesson Upload Wizard</h2>
            <ActionButton onClick={resetUploader}>Close</ActionButton>
          </div>
          <UploadStepper step={uploadStep} />

          {uploadStep === 1 ? (
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-base font-medium text-slate-900">Metadata</h3>
                <div className="mt-3 grid gap-3">
                  <input
                    type="text"
                    placeholder="Lesson Title"
                    value={metadata.title}
                    onChange={(e) => setMetadata((prev) => ({ ...prev, title: e.target.value }))}
                    className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800"
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <select
                      value={metadata.jlpt_level}
                      onChange={(e) => setMetadata((prev) => ({ ...prev, jlpt_level: e.target.value }))}
                      className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800"
                    >
                      {['N5', 'N4', 'N3', 'N2', 'N1'].map((level) => <option key={level} value={level}>{level}</option>)}
                    </select>
                    <input
                      type="text"
                      placeholder="Category"
                      value={metadata.category}
                      onChange={(e) => setMetadata((prev) => ({ ...prev, category: e.target.value }))}
                      className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Tags (comma separated)"
                    value={metadata.tags}
                    onChange={(e) => setMetadata((prev) => ({ ...prev, tags: e.target.value }))}
                    className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800"
                  />
                  <textarea
                    value={metadata.notes}
                    onChange={(e) => setMetadata((prev) => ({ ...prev, notes: e.target.value }))}
                    placeholder="Notes"
                    className="h-24 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
                  />
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-base font-medium text-slate-900">Upload Method</h3>
                <div className="mt-3 flex gap-2">
                  <ActionButton
                    variant={uploadMethod === 'paste' ? 'primary' : 'secondary'}
                    onClick={() => setUploadMethod('paste')}
                  >
                    Paste Text
                  </ActionButton>
                  <ActionButton
                    variant={uploadMethod === 'file' ? 'primary' : 'secondary'}
                    onClick={() => setUploadMethod('file')}
                  >
                    Upload TXT/PDF
                  </ActionButton>
                </div>
                {uploadMethod === 'paste' ? (
                  <div className="mt-3">
                    <textarea
                      value={rawText}
                      onChange={(e) => setRawText(e.target.value)}
                      placeholder="Paste lesson text here..."
                      className="h-48 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
                    />
                    <p className="mt-1 text-xs text-slate-500">Character count: {rawText.length}</p>
                  </div>
                ) : (
                  <div className="mt-3 space-y-2">
                    <input
                      type="file"
                      accept=".txt,.pdf,text/plain,application/pdf"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      className="block w-full text-sm"
                    />
                    <p className="text-xs text-slate-500">Supported file types: TXT, PDF (max 5MB).</p>
                    {selectedFile ? <p className="text-xs text-slate-600">Selected: {selectedFile.name}</p> : null}
                  </div>
                )}
              </div>

              {processingError ? <p className="text-sm text-rose-600 lg:col-span-2">{processingError}</p> : null}
              <div className="lg:col-span-2">
                <ActionButton variant="primary" onClick={goToPreview}>Continue to Preview</ActionButton>
              </div>
            </div>
          ) : null}

          {uploadStep === 2 ? (
            <div className="mt-4 space-y-3">
              <h3 className="text-base font-medium text-slate-900">Preview Extracted Text</h3>
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                className="h-72 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
              />
              <p className="text-xs text-slate-500">Characters: {rawText.length}</p>
              {processingError ? <p className="text-sm text-rose-600">{processingError}</p> : null}
              <div className="flex gap-2">
                <ActionButton onClick={() => setUploadStep(1)}>Back</ActionButton>
                <ActionButton variant="primary" onClick={runAiCleanup}>Run AI Cleanup</ActionButton>
              </div>
            </div>
          ) : null}

          {uploadStep === 3 ? (
            <div className="mt-4">
              {processing ? (
                <LoadingState
                  title="AI processing lesson..."
                  subtitle="Cleaning text, extracting vocabulary/grammar/kanji, generating practice questions."
                />
              ) : null}
            </div>
          ) : null}

          {uploadStep === 4 && processed ? (
            <div className="mt-4 space-y-4">
              <h3 className="text-base font-medium text-slate-900">Review Structured Lesson</h3>
              <div className="grid gap-3 lg:grid-cols-2">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Original Text</p>
                  <pre className="mt-1 max-h-56 overflow-y-auto whitespace-pre-wrap text-sm text-slate-700">{rawText}</pre>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Cleaned Text</p>
                  <pre className="mt-1 max-h-56 overflow-y-auto whitespace-pre-wrap text-sm text-slate-700">{processed.cleaned_text}</pre>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm">Estimated JLPT: <strong>{processed.estimated_level || metadata.jlpt_level}</strong></div>
                <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm">Vocabulary: <strong>{processed.counts?.vocabulary || processed.vocabulary?.length || 0}</strong></div>
                <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm">Grammar: <strong>{processed.counts?.grammar || processed.grammar?.length || 0}</strong></div>
                <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm">Kanji: <strong>{processed.counts?.kanji || processed.kanji?.length || 0}</strong></div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Summary</p>
                <p className="mt-1 text-sm text-slate-700">{processed.summary || 'No summary generated.'}</p>
              </div>
              {processingError ? <p className="text-sm text-rose-600">{processingError}</p> : null}
              <div className="flex gap-2">
                <ActionButton onClick={() => setUploadStep(2)}>Back</ActionButton>
                <ActionButton variant="primary" onClick={saveLesson} disabled={savingLesson}>
                  {savingLesson ? 'Saving...' : 'Save Lesson'}
                </ActionButton>
              </div>
            </div>
          ) : null}

          {uploadStep === 5 ? (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm font-medium text-emerald-700">Lesson saved successfully.</p>
              {createdLesson ? (
                <Link to={`/lessons/${createdLesson.id}`} className="mt-2 inline-block text-sm text-emerald-700 underline">
                  Open Lesson Detail
                </Link>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.06)]">
        <div className="grid gap-2 md:grid-cols-6">
          <SearchInput
            value={filters.q}
            onChange={(e) => setFilters((prev) => ({ ...prev, q: e.target.value }))}
            placeholder="Search title/content"
            className="md:col-span-2"
          />
          <select className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800" value={filters.jlpt} onChange={(e) => setFilters((prev) => ({ ...prev, jlpt: e.target.value }))}>
            <option value="">All JLPT</option>
            {['N5', 'N4', 'N3', 'N2', 'N1'].map((level) => <option key={level} value={level}>{level}</option>)}
          </select>
          <select className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800" value={filters.source_type} onChange={(e) => setFilters((prev) => ({ ...prev, source_type: e.target.value }))}>
            <option value="">All Sources</option>
            <option value="text">Text</option>
            <option value="txt">TXT</option>
            <option value="pdf">PDF</option>
          </select>
          <select className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800" value={filters.status} onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}>
            <option value="">All Status</option>
            {['draft', 'processing', 'ready', 'completed', 'archived'].map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
          <ActionButton onClick={() => loadLessons(filters)}>Apply Filters</ActionButton>
        </div>
      </section>

      <section className="mt-4">
        {loading ? <LoadingState title="Loading lessons..." subtitle="Fetching lesson library from Neon." /> : null}
        {!loading && error ? <EmptyState title="Lesson library unavailable" message={error} /> : null}
        {!loading && !error && !items.length ? (
          <EmptyState
            title="No lessons yet"
            message="Upload your first lesson from text, TXT, or PDF. You can also continue using legacy guided lessons."
            actionLabel="Upload Lesson"
            onAction={() => setUploadOpen(true)}
          />
        ) : null}

        {!loading && !error && items.length ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {items.map((lesson) => (
              <article key={lesson.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_6px_16px_rgba(15,23,42,0.05)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-medium text-slate-900">{lesson.title}</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {lesson.jlpt_level || lesson.estimated_level || 'N5'} • {lesson.source_type?.toUpperCase()} • {formatDate(lesson.created_at)}
                    </p>
                  </div>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600">
                    {lesson.status}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-slate-700">
                  <p>Vocabulary: <strong>{lesson.vocabulary_count || 0}</strong></p>
                  <p>Grammar: <strong>{lesson.grammar_count || 0}</strong></p>
                  <p>Kanji: <strong>{lesson.kanji_count || 0}</strong></p>
                  <p>Completion: <strong>{lesson.completion_percentage || 0}%</strong></p>
                </div>
                <p className="mt-2 text-xs text-slate-500">Last studied: {formatDate(lesson.last_studied_at || lesson.last_activity_at)}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link to={`/lessons/${lesson.id}`} className="inline-flex h-9 items-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50">Open Lesson</Link>
                  <Link to={`/lessons/${lesson.id}#vocabulary`} className="inline-flex h-9 items-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50">Review Vocabulary</Link>
                  <Link to={`/lessons/${lesson.id}#practice`} className="inline-flex h-9 items-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50">Practice Questions</Link>
                  <ActionButton className="h-9 text-xs" onClick={() => setEditingLesson(lesson)}>Edit Metadata</ActionButton>
                  <ActionButton className="h-9 text-xs" variant="danger" onClick={() => removeLesson(lesson.id)}>Delete</ActionButton>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </section>

      {editingLesson ? (
        <section className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="text-base font-medium text-slate-900">Edit Lesson Metadata</h3>
            <div className="mt-3 grid gap-3">
              <input className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800" value={editingLesson.title || ''} onChange={(e) => setEditingLesson((prev) => ({ ...prev, title: e.target.value }))} />
              <div className="grid gap-3 sm:grid-cols-2">
                <select className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800" value={editingLesson.jlpt_level || 'N5'} onChange={(e) => setEditingLesson((prev) => ({ ...prev, jlpt_level: e.target.value }))}>
                  {['N5', 'N4', 'N3', 'N2', 'N1'].map((level) => <option key={level} value={level}>{level}</option>)}
                </select>
                <select className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800" value={editingLesson.status || 'ready'} onChange={(e) => setEditingLesson((prev) => ({ ...prev, status: e.target.value }))}>
                  {['draft', 'processing', 'ready', 'completed', 'archived'].map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </div>
              <input className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800" value={editingLesson.category || ''} onChange={(e) => setEditingLesson((prev) => ({ ...prev, category: e.target.value }))} placeholder="Category" />
              <input
                className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800"
                value={Array.isArray(editingLesson.tags) ? editingLesson.tags.join(', ') : String(editingLesson.tags || '')}
                onChange={(e) => setEditingLesson((prev) => ({ ...prev, tags: e.target.value }))}
                placeholder="Tags"
              />
            </div>
            <div className="mt-4 flex gap-2">
              <ActionButton onClick={() => setEditingLesson(null)}>Cancel</ActionButton>
              <ActionButton variant="primary" onClick={saveMetadataEdit}>Save Metadata</ActionButton>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  )
}
