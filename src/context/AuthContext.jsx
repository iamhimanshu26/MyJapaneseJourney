import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setProfile(null)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_, session) => {
        setUser(session?.user ?? null)
        if (session?.user) await fetchProfile(session.user.id)
        else setProfile(null)
      }
    )
    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    if (!supabase) return
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (error?.code === 'PGRST116') {
      await supabase.from('user_profiles').insert({ id: userId })
      const { data: created } = await supabase.from('user_profiles').select('*').eq('id', userId).single()
      setProfile(created)
    } else {
      setProfile(data)
    }
  }

  async function signUp(email, password) {
    if (!supabase) throw new Error('Supabase not configured')
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    return data
  }

  async function signIn(email, password) {
    if (!supabase) throw new Error('Supabase not configured')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  async function signOut() {
    if (!supabase) return
    await supabase.auth.signOut()
  }

  async function updateProfile(updates) {
    if (!supabase || !user) return
    const { data, error } = await supabase
      .from('user_profiles')
      .upsert({ id: user.id, ...updates, updated_at: new Date().toISOString() })
      .select()
      .single()
    if (error) throw error
    setProfile(data)
    return data
  }

  const value = {
    user,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile,
    isAuthenticated: !!user,
    hasAuth: !!supabase,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

const defaultAuth = {
  user: null,
  profile: null,
  loading: false,
  signUp: async () => { throw new Error('Auth not configured') },
  signIn: async () => { throw new Error('Auth not configured') },
  signOut: () => {},
  updateProfile: async () => {},
  isAuthenticated: false,
  hasAuth: false,
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  return ctx ?? defaultAuth
}
