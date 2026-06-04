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
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-50 px-4 py-8">
      <PageMeta title="Log in" />
      <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[1.1fr_1fr]">
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="hidden rounded-3xl border border-blue-200/70 bg-gradient-to-br from-blue-600 to-indigo-600 p-8 text-white shadow-[0_24px_60px_rgba(37,99,235,0.28)] lg:block"
        >
          <p className="inline-flex items-center rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]">
            Kotoba Seven
          </p>
          <h1 className="mt-6 text-4xl font-bold leading-tight">
            Enterprise AI
            <br />
            Japanese Learning Platform
          </h1>
          <p className="mt-4 text-sm text-blue-100">
            Secure Neon-native authentication, personalized intelligence, and role-aware learning workflows in one professional dashboard.
          </p>
          <div className="mt-8 space-y-3 text-sm text-blue-50">
            <p>• Direct ID/password login with session protection</p>
            <p>• AI study planning, analytics, and knowledge graph</p>
            <p>• Guest workspace for fast exploration</p>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_20px_45px_rgba(15,23,42,0.12)] sm:p-8"
        >
          <h2 className="text-2xl font-bold text-slate-900">Welcome back</h2>
          <p className="mt-2 text-sm text-slate-600">
            Sign in with your Login ID and password. If the ID is new, your account will be created securely.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Login ID</label>
              <input
                type="text"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                required
                minLength={3}
                maxLength={40}
                placeholder="e.g. akash_n3"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
              />
              <p className="mt-1 text-xs text-slate-500">Allowed: letters, numbers, underscore, hyphen.</p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:border-blue-500 focus:outline-none"
              >
                <option value="student">Student</option>
                <option value="employee">Employee</option>
                <option value="admin">Admin</option>
              </select>
              <p className="mt-1 text-xs text-slate-500">
                Admin is reserved for existing admin IDs. New IDs cannot self-create as admin.
              </p>
            </div>

            {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3 font-semibold text-white shadow-sm transition hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Signing in…' : 'Sign in / Create account'}
            </button>

            <button
              type="button"
              onClick={handleGuestLogin}
              disabled={loading}
              className="w-full rounded-xl border border-slate-300 bg-white py-3 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Continue as guest
            </button>
          </form>

          <p className="mt-5 text-sm text-slate-600">
            Prefer separate sign-up flow? <Link to="/signup" className="font-semibold text-blue-600 hover:underline">Open sign-up page</Link>
          </p>
        </motion.section>
      </div>
    </div>
  )
}
