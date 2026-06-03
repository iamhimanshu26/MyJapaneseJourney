import { useState } from 'react'
import { motion } from 'framer-motion'
import { PageMeta } from '../components/PageMeta'
import { SectionHeader } from '../components/shared/SectionHeader'
import { useDiscovered } from '../hooks/useDiscovered'
import { useToast } from '../context/ToastContext'

export function Settings() {
  const { importLocalToNeon } = useDiscovered()
  const [importing, setImporting] = useState(false)
  const toast = useToast()

  async function handleImport() {
    setImporting(true)
    try {
      const result = await importLocalToNeon()
      toast.success(`Imported ${result.imported} local items to Neon`)
    } catch (err) {
      toast.error(err.message || 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageMeta title="Settings" description="Data and platform settings for your Japanese learning dashboard." />
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <SectionHeader
          title="Settings"
          subtitle="Manage enterprise data options and migration helpers."
        />
        <div className="space-y-4">
          <section className="card-shell">
            <h2 className="text-sm font-semibold text-slate-100">Data Source</h2>
            <p className="mt-2 text-sm text-slate-400">
              Primary source of truth is Neon PostgreSQL via secure API routes.
              Browser localStorage is only used as legacy import source or temporary guest fallback.
            </p>
          </section>

          <section className="card-shell">
            <h2 className="text-sm font-semibold text-slate-100">Import Local Data to Neon</h2>
            <p className="mt-2 text-sm text-slate-400">
              Use this once to migrate existing local vocabulary/grammar/kanji/discovered data.
              Local storage will not be deleted automatically.
            </p>
            <button
              type="button"
              onClick={handleImport}
              disabled={importing}
              className="mt-4 rounded-lg bg-gradient-to-r from-blue-500 to-violet-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {importing ? 'Importing...' : 'Import Local Data to Neon'}
            </button>
          </section>
        </div>
      </motion.div>
    </div>
  )
}
