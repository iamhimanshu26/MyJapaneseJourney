import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { PageMeta } from '../components/PageMeta'

const LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1']

export function Onboarding() {
  const [currentLevel, setCurrentLevel] = useState('N5')
  const [targetLevel, setTargetLevel] = useState('N3')
  const [loading, setLoading] = useState(false)
  const { user, hasAuth, loading: authLoading, updateProfile } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    if (!authLoading && hasAuth && !user) navigate('/login', { replace: true })
  }, [hasAuth, user, authLoading, navigate])

  if (authLoading || (hasAuth && !user)) return null

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      await updateProfile({ current_level: currentLevel, target_level: targetLevel })
      toast.success('Profile updated')
      navigate('/')
    } catch (err) {
      toast.error(err?.message || 'Could not save')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <PageMeta title="Set your level" />
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <h1 className="mb-2 text-3xl font-semibold">Set your level</h1>
        <p className="mb-8 text-sm text-slate-600">We'll personalize content for you.</p>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-600">Current level</label>
            <div className="flex flex-wrap gap-2">
              {LEVELS.map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setCurrentLevel(l)}
                  className={`inline-flex h-10 items-center rounded-lg px-4 text-sm font-medium transition-colors ${
                    currentLevel === l ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-600">Target level</label>
            <div className="flex flex-wrap gap-2">
              {LEVELS.map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setTargetLevel(l)}
                  className={`inline-flex h-10 items-center rounded-lg px-4 text-sm font-medium transition-colors ${
                    targetLevel === l ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="h-10 w-full rounded-lg bg-amber-500 text-sm font-medium text-white hover:bg-amber-600"
          >
            {loading ? 'Saving…' : 'Continue'}
          </button>
        </form>
      </motion.div>
    </div>
  )
}
