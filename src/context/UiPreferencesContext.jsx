import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from './AuthContext'

const UiPreferencesContext = createContext(null)

const UI_THEME_KEY = 'mjj-ui-theme'
const UI_LANG_KEY = 'mjj-ui-language'
const VALID_THEMES = new Set(['system', 'light', 'dark'])
const VALID_LANGS = new Set(['en', 'ja'])

function readStorage(key) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Ignore storage failures.
  }
}

function normalizeTheme(theme) {
  const value = String(theme || '').toLowerCase()
  return VALID_THEMES.has(value) ? value : 'system'
}

function normalizeLanguage(language) {
  const value = String(language || '').toLowerCase()
  return VALID_LANGS.has(value) ? value : 'en'
}

function getResolvedTheme(theme) {
  if (theme === 'dark' || theme === 'light') return theme
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark'
  return 'light'
}

export function UiPreferencesProvider({ children }) {
  const { profile } = useAuth()
  const [theme, setThemeState] = useState(() => normalizeTheme(readStorage(UI_THEME_KEY) || 'system'))
  const [language, setLanguageState] = useState(() => normalizeLanguage(readStorage(UI_LANG_KEY) || 'en'))
  const [resolvedTheme, setResolvedTheme] = useState(() => getResolvedTheme(normalizeTheme(readStorage(UI_THEME_KEY) || 'system')))

  useEffect(() => {
    if (!profile) return
    const nextTheme = normalizeTheme(profile.ui_theme || theme)
    const nextLanguage = normalizeLanguage(profile.ui_language || language)
    setThemeState(nextTheme)
    setLanguageState(nextLanguage)
    writeStorage(UI_THEME_KEY, nextTheme)
    writeStorage(UI_LANG_KEY, nextLanguage)
  }, [profile])

  useEffect(() => {
    const nextResolved = getResolvedTheme(theme)
    setResolvedTheme(nextResolved)
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.theme = nextResolved
      document.body.dataset.theme = nextResolved
      document.documentElement.classList.toggle('theme-dark', nextResolved === 'dark')
    }
    writeStorage(UI_THEME_KEY, theme)
  }, [theme])

  useEffect(() => {
    writeStorage(UI_LANG_KEY, language)
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language === 'ja' ? 'ja' : 'en'
    }
  }, [language])

  useEffect(() => {
    if (theme !== 'system' || typeof window === 'undefined') return undefined
    const media = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!media) return undefined
    const onChange = () => setResolvedTheme(media.matches ? 'dark' : 'light')
    media.addEventListener?.('change', onChange)
    return () => media.removeEventListener?.('change', onChange)
  }, [theme])

  const value = useMemo(() => ({
    theme,
    resolvedTheme,
    language,
    setTheme: (nextTheme) => setThemeState(normalizeTheme(nextTheme)),
    setLanguage: (nextLanguage) => setLanguageState(normalizeLanguage(nextLanguage)),
    isJapanese: language === 'ja',
  }), [theme, resolvedTheme, language])

  return <UiPreferencesContext.Provider value={value}>{children}</UiPreferencesContext.Provider>
}

export function useUiPreferences() {
  const ctx = useContext(UiPreferencesContext)
  if (ctx) return ctx
  return {
    theme: 'system',
    resolvedTheme: 'light',
    language: 'en',
    setTheme: () => {},
    setLanguage: () => {},
    isJapanese: false,
  }
}
