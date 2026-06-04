import { useContext } from 'react'
import { UiPreferencesContext } from '../context/uiPreferencesContextValue'

const DEFAULT_PREFS = {
  theme: 'system',
  resolvedTheme: 'light',
  language: 'en',
  setTheme: () => {},
  setLanguage: () => {},
  isJapanese: false,
}

export function useUiPreferences() {
  const ctx = useContext(UiPreferencesContext)
  return ctx || DEFAULT_PREFS
}
