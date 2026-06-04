import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { PageMeta } from '../components/PageMeta'
import { SectionHeader } from '../components/shared/SectionHeader'
import { useDiscovered } from '../hooks/useDiscovered'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import { useUiPreferences } from '../hooks/useUiPreferences'

export function Settings() {
  const { importLocalToNeon, identity } = useDiscovered()
  const { user, profile, updateProfile } = useAuth()
  const { theme: activeTheme, language: activeLanguage, setTheme: applyTheme, setLanguage: applyLanguage } = useUiPreferences()
  const [currentLevel, setCurrentLevel] = useState(profile?.current_level || 'N5')
  const [targetLevel, setTargetLevel] = useState(profile?.target_level || 'N3')
  const [targetExam, setTargetExam] = useState(profile?.target_exam || 'JLPT')
  const [targetExamDate, setTargetExamDate] = useState(profile?.target_exam_date || '')
  const [dailyGoal, setDailyGoal] = useState(profile?.daily_goal_minutes || 25)
  const [theme, setTheme] = useState(profile?.ui_theme || activeTheme || 'system')
  const [language, setLanguage] = useState(profile?.ui_language || activeLanguage || 'en')
  const [savingProfile, setSavingProfile] = useState(false)
  const [importing, setImporting] = useState(false)
  const [resettingDemo, setResettingDemo] = useState(false)
  const toast = useToast()

  const canEdit = useMemo(() => Boolean(user && !user.isGuest), [user])

  useEffect(() => {
    if (!profile) {
      setTheme(activeTheme || 'system')
      setLanguage(activeLanguage || 'en')
      return
    }
    setCurrentLevel(profile.current_level || 'N5')
    setTargetLevel(profile.target_level || 'N3')
    setTargetExam(profile.target_exam || 'JLPT')
    setTargetExamDate(profile.target_exam_date || '')
    setDailyGoal(profile.daily_goal_minutes || 25)
    setTheme(profile.ui_theme || activeTheme || 'system')
    setLanguage(profile.ui_language || activeLanguage || 'en')
  }, [profile, activeTheme, activeLanguage])

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

  async function handleSaveProfile() {
    if (!canEdit) {
      applyTheme(theme)
      applyLanguage(language)
      toast.success('Applied theme and language for guest session')
      return
    }
    setSavingProfile(true)
    try {
      await updateProfile({
        current_level: currentLevel,
        target_level: targetLevel,
        target_exam: targetExam,
        target_exam_date: targetExamDate || null,
        daily_goal_minutes: Number(dailyGoal),
        ui_theme: theme,
        ui_language: language,
      })
      applyTheme(theme)
      applyLanguage(language)
      toast.success('Profile settings updated')
    } catch (err) {
      toast.error(err.message || 'Failed to save profile settings')
    } finally {
      setSavingProfile(false)
    }
  }

  async function handleExport(format) {
    try {
      const response = await fetch(`/api/discovered-items?mode=export&format=${encodeURIComponent(format)}&limit=1000`, {
        headers: {
          'X-Auth-User-Id': identity.authUserId,
          ...(identity.sessionToken ? { 'X-Session-Token': identity.sessionToken } : {}),
        },
      })
      if (!response.ok) {
        const payload = await response.json()
        throw new Error(payload?.error || 'Export failed')
      }
      if (format === 'csv') {
        const content = await response.text()
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.download = 'kotoba-seven-export.csv'
        anchor.click()
        URL.revokeObjectURL(url)
      } else {
        const payload = await response.json()
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.download = 'kotoba-seven-export.json'
        anchor.click()
        URL.revokeObjectURL(url)
      }
      toast.success(`Exported ${format.toUpperCase()} successfully`)
    } catch (err) {
      toast.error(err.message || 'Export failed')
    }
  }

  async function handleDemoReset() {
    if (!canEdit) {
      toast.info('Guest mode does not support demo reset')
      return
    }
    if (!window.confirm('This will permanently delete your saved learning data from Neon. Continue?')) {
      return
    }
    setResettingDemo(true)
    try {
      await fetch('/api/intelligence', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-User-Id': identity.authUserId,
          ...(identity.sessionToken ? { 'X-Session-Token': identity.sessionToken } : {}),
        },
        body: JSON.stringify({ action: 'demo-reset', confirm: 'RESET MY DATA' }),
      }).then(async (res) => {
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data?.error || 'Demo reset failed')
        }
      })
      toast.success('Demo workspace reset completed')
    } catch (err) {
      toast.error(err.message || 'Demo reset failed')
    } finally {
      setResettingDemo(false)
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
            <h2 className="text-sm font-semibold text-slate-100">Account & Access</h2>
            <p className="mt-2 text-sm text-slate-400">
              Login ID: <span className="font-medium text-slate-200">{user?.loginId || 'Guest session'}</span>
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Role: <span className="font-medium text-slate-200">{user?.role || 'guest'}</span>
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Your direct ID/password is stored in Neon auth tables. Use the same credentials next time to restore progress.
            </p>
          </section>

          <section className="card-shell">
            <h2 className="text-sm font-semibold text-slate-100">Profile & Learning Preferences</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <label className="text-sm text-slate-300">Current Level
                <select value={currentLevel} onChange={(e) => setCurrentLevel(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100">
                  {['N5', 'N4', 'N3', 'N2', 'N1'].map((lvl) => <option key={lvl} value={lvl}>{lvl}</option>)}
                </select>
              </label>
              <label className="text-sm text-slate-300">Target Level
                <select value={targetLevel} onChange={(e) => setTargetLevel(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100">
                  {['N5', 'N4', 'N3', 'N2', 'N1'].map((lvl) => <option key={lvl} value={lvl}>{lvl}</option>)}
                </select>
              </label>
              <label className="text-sm text-slate-300">Target Exam
                <select value={targetExam} onChange={(e) => setTargetExam(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100">
                  {['JLPT', 'NAT'].map((exam) => <option key={exam} value={exam}>{exam}</option>)}
                </select>
              </label>
              <label className="text-sm text-slate-300">Target Exam Date
                <input type="date" value={targetExamDate || ''} onChange={(e) => setTargetExamDate(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100" />
              </label>
              <label className="text-sm text-slate-300">Daily Study Goal (minutes)
                <input type="number" min={5} max={300} value={dailyGoal} onChange={(e) => setDailyGoal(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100" />
              </label>
              <label className="text-sm text-slate-300">Theme
                <select value={theme} onChange={(e) => setTheme(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100">
                  <option value="system">System</option>
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                </select>
              </label>
              <label className="text-sm text-slate-300">Language
                <select value={language} onChange={(e) => setLanguage(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100">
                  <option value="en">English</option>
                  <option value="ja">Japanese</option>
                </select>
              </label>
            </div>
            <button
              type="button"
              onClick={handleSaveProfile}
              disabled={savingProfile || !canEdit}
              className="mt-4 rounded-lg bg-gradient-to-r from-blue-500 to-violet-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {savingProfile ? 'Saving...' : 'Save Profile Settings'}
            </button>
          </section>

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
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => handleExport('csv')} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200">Export CSV</button>
              <button type="button" onClick={() => handleExport('json')} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200">Export JSON</button>
              <button type="button" onClick={handleDemoReset} disabled={resettingDemo || !canEdit} className="rounded-lg border border-rose-500/50 bg-rose-500/10 px-3 py-2 text-xs text-rose-200 disabled:opacity-60">
                {resettingDemo ? 'Resetting...' : 'Demo Data Reset'}
              </button>
            </div>
          </section>
        </div>
      </motion.div>
    </div>
  )
}
