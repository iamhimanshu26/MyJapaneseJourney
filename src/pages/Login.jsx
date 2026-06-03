import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { PageMeta } from '../components/PageMeta'

export function Login() {
  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('student')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn, signInAsGuest } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await signIn(loginId, password, role)
      toast.success(result?.created ? 'Account created and logged in' : 'Logged in')
      navigate('/')
    } catch (err) {
      setError(err?.message || 'Login failed')
      toast.error(err?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleGuestLogin() {
    setError('')
    setLoading(true)
    try {
      await signInAsGuest()
      toast.success('Logged in as guest')
      navigate('/')
    } catch (err) {
      setError(err?.message || 'Guest login failed')
      toast.error(err?.message || 'Guest login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <PageMeta title="Log in" />
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <h1 className="text-2xl font-bold mb-2">Direct login</h1>
        <p className="text-sm text-[var(--color-text-muted)] mb-6">
          Use any random ID + password. If the ID does not exist yet, we create it in Neon with your selected role.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">Login ID</label>
            <input
              type="text"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              required
              minLength={3}
              maxLength={40}
              placeholder="e.g. akash_n3"
              className="w-full rounded-xl border border-slate-200 bg-[var(--color-bg-card)] px-4 py-3"
            />
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">Allowed: letters, numbers, underscore, hyphen.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full rounded-xl border border-slate-200 bg-[var(--color-bg-card)] px-4 py-3"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-[var(--color-bg-card)] px-4 py-3"
            >
              <option value="student">Student</option>
              <option value="employee">Employee</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-amber-500 text-white font-semibold hover:bg-amber-600 disabled:opacity-50"
          >
            {loading ? 'Logging in…' : 'Log in / Create account'}
          </button>
          <button
            type="button"
            onClick={handleGuestLogin}
            disabled={loading}
            className="w-full py-3 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-100 disabled:opacity-50"
          >
            Continue as guest
          </button>
        </form>
        <p className="mt-4 text-sm text-[var(--color-text-muted)]">
          Prefer separate sign-up flow? <Link to="/signup" className="text-amber-600 hover:underline">Open sign-up page</Link>
        </p>
      </motion.div>
    </div>
  )
}
