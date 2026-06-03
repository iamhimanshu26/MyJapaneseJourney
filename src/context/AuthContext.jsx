import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { getOrCreateGuestId } from '../lib/userIdentity'

const AuthContext = createContext(null)
const SESSION_STORAGE_KEY = 'my-japanese-journey-auth-session'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sessionToken, setSessionToken] = useState(null)

  function readStoredSession() {
    try {
      const raw = localStorage.getItem(SESSION_STORAGE_KEY)
      if (!raw) return null
      return JSON.parse(raw)
    } catch {
      return null
    }
  }

  function storeSession(next) {
    try {
      if (!next) localStorage.removeItem(SESSION_STORAGE_KEY)
      else localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(next))
    } catch {
      // Ignore storage issues in private browsing mode.
    }
  }

  useEffect(() => {
    const stored = readStoredSession()
    if (!stored?.token) {
      setLoading(false)
      return
    }

    setSessionToken(stored.token)
    fetch('/api/auth', {
      headers: { 'x-session-token': stored.token },
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('Session expired')
        const data = await response.json()
        setUser({ ...data.user, sessionToken: stored.token })
        setProfile(data.profile || null)
      })
      .catch(() => {
        storeSession(null)
        setSessionToken(null)
        setUser(null)
        setProfile(null)
      })
      .finally(() => setLoading(false))
  }, [])

  function applySession(data) {
    const token = data.token || null
    const nextUser = data.user ? { ...data.user, sessionToken: token } : null
    setSessionToken(token)
    setUser(nextUser)
    setProfile(data.profile || null)
    storeSession(token && nextUser ? { token, userId: nextUser.id } : null)
  }

  async function signUp(loginId, password, role = 'student') {
    return signIn(loginId, password, role)
  }

  async function signIn(loginId, password, role = 'student') {
    const response = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ loginId, password, role }),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data?.error || 'Login failed')
    applySession(data)
    return data
  }

  async function signInAsGuest() {
    const guestId = getOrCreateGuestId()
    applySession({
      token: null,
      user: {
        id: guestId,
        loginId: 'Guest',
        role: 'guest',
        isGuest: true,
      },
      profile: {
        auth_user_id: guestId,
        current_level: 'N5',
        target_level: 'N3',
        target_exam: 'JLPT',
      },
    })
    return { user: { id: guestId, role: 'guest', isGuest: true } }
  }

  async function signOut() {
    const token = sessionToken
    setSessionToken(null)
    setUser(null)
    setProfile(null)
    storeSession(null)

    if (!token) return
    await fetch('/api/auth', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-session-token': token,
      },
      body: JSON.stringify({ action: 'logout' }),
    }).catch(() => {})
  }

  async function updateProfile(updates) {
    if (!user) return null

    if (user.isGuest) {
      const localProfile = {
        ...(profile || {}),
        ...updates,
        updated_at: new Date().toISOString(),
      }
      setProfile(localProfile)
      return localProfile
    }

    const response = await fetch('/api/auth', {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        'x-session-token': sessionToken,
      },
      body: JSON.stringify(updates),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data?.error || 'Could not update profile')
    setProfile(data.profile || null)
    return data.profile
  }

  const value = useMemo(() => ({
    user,
    profile,
    loading,
    signUp,
    signIn,
    signInAsGuest,
    signOut,
    updateProfile,
    sessionToken,
    isAuthenticated: !!user,
    hasAuth: true,
  }), [user, profile, loading, sessionToken])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

const defaultAuth = {
  user: null,
  profile: null,
  loading: false,
  signUp: async () => { throw new Error('Auth not configured') },
  signIn: async () => { throw new Error('Auth not configured') },
  signInAsGuest: async () => {},
  signOut: () => {},
  updateProfile: async () => {},
  sessionToken: null,
  isAuthenticated: false,
  hasAuth: true,
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  return ctx ?? defaultAuth
}
