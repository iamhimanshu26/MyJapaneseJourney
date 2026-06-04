import { useEffect, useMemo, useState } from 'react'
import { useAuth } from './AuthContext'
import { UiPreferencesContext } from './uiPreferencesContextValue'

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
    const profileTheme = profile.ui_theme ? normalizeTheme(profile.ui_theme) : null
    const profileLanguage = profile.ui_language ? normalizeLanguage(profile.ui_language) : null

    // Sync from profile only when values are explicitly present.
    if (profileTheme && profileTheme !== theme) setThemeState(profileTheme)
    if (profileLanguage && profileLanguage !== language) setLanguageState(profileLanguage)
    if (profileTheme) writeStorage(UI_THEME_KEY, profileTheme)
    if (profileLanguage) writeStorage(UI_LANG_KEY, profileLanguage)
  }, [profile?.ui_theme, profile?.ui_language])

  useEffect(() => {
    const nextResolved = getResolvedTheme(theme)
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
