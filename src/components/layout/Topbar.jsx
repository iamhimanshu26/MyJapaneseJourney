import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useUiPreferences } from '../../hooks/useUiPreferences'
import { ActionButton } from '../ui/ActionButton'
import { SearchInput } from '../ui/SearchInput'
import { cn } from '../../lib/cn'

const COPY = {
  en: {
    titleShort: 'Kotoba Seven',
    title: 'AI Japanese Learning Intelligence Dashboard',
    subtitle: 'JLPT / NAT preparation workspace',
    search: 'Search vocabulary, grammar, kanji...',
    searchButton: 'Search',
    guest: 'Guest mode',
    signOut: 'Sign out',
  },
  ja: {
    titleShort: 'ことばセブン',
    title: 'AI日本語学習インテリジェンスダッシュボード',
    subtitle: 'JLPT / NAT 試験対策ワークスペース',
    search: '語彙・文法・漢字を検索...',
    searchButton: '検索',
    guest: 'ゲストモード',
    signOut: 'ログアウト',
  },
}

export function Topbar({ onMenu }) {
  const { user, signOut, hasAuth } = useAuth()
  const { language, setLanguage, resolvedTheme } = useUiPreferences()
  const [search, setSearch] = useState('')
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const navigate = useNavigate()
  const isDark = resolvedTheme === 'dark'

  const t = useMemo(() => COPY[language] || COPY.en, [language])
  const languageOptions = [
    { code: 'en', label: 'EN' },
    { code: 'ja', label: '日本語' },
  ]

  function onSearchSubmit(e) {
    e.preventDefault()
    const query = search.trim()
    if (!query) return
    navigate(`/lookup?q=${encodeURIComponent(query)}`)
    setSearch('')
    setMobileSearchOpen(false)
  }

  async function onSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <header className={isDark
      ? 'sticky top-0 z-40 border-b border-slate-700 bg-slate-900/85 backdrop-blur'
      : 'sticky top-0 z-40 border-b border-slate-300 bg-white/90 backdrop-blur'}
    >
      <div className="flex h-16 items-center justify-between gap-2 px-3 md:px-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onMenu}
            className={isDark
              ? 'rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-slate-100 lg:hidden'
              : 'rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-800 lg:hidden'}
            aria-label="Open menu"
          >
            ☰
          </button>
          <div className="min-w-0">
            <p className={isDark ? 'truncate text-sm font-semibold text-slate-100' : 'truncate text-sm font-semibold text-slate-900'}>
              <span className="md:hidden">{t.titleShort}</span>
              <span className="hidden md:inline">{t.title}</span>
            </p>
            <p className={isDark ? 'hidden text-xs text-slate-300 sm:block' : 'hidden text-xs text-slate-500 sm:block'}>{t.subtitle}</p>
          </div>
        </div>

        <div className="hidden w-full max-w-md px-4 md:block">
          <form onSubmit={onSearchSubmit}>
            <SearchInput
              placeholder={t.search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={isDark ? 'border-slate-600 bg-slate-800 text-slate-100 placeholder:text-slate-400' : ''}
            />
          </form>
        </div>

        <div className="flex items-center gap-2">
          <ActionButton
            type="button"
            onClick={() => setMobileSearchOpen((prev) => !prev)}
            className={`md:hidden ${isDark ? 'border-slate-600 bg-slate-700 text-slate-100 hover:bg-slate-600' : ''}`}
          >
            {t.searchButton}
          </ActionButton>

          <div
            className={cn(
              'hidden sm:flex items-center rounded-full border p-0.5 text-xs font-semibold',
              isDark
                ? 'border-slate-700 bg-slate-900'
                : 'border-slate-200 bg-slate-100',
            )}
            role="group"
            aria-label="Language"
          >
            {languageOptions.map(({ code, label }) => (
              <button
                key={code}
                type="button"
                onClick={() => setLanguage(code)}
                className={cn(
                  'rounded-full px-2.5 py-1 transition-colors',
                  language === code
                    ? 'bg-white text-indigo-700 shadow-sm dark:bg-slate-800 dark:text-indigo-300'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100',
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <ActionButton
            type="button"
            onClick={() => setLanguage(language === 'en' ? 'ja' : 'en')}
            className="sm:hidden"
          >
            {language === 'en' ? 'EN' : '日本語'}
          </ActionButton>

          <span className={isDark ? 'text-sm font-medium text-slate-200' : 'text-sm font-medium text-slate-800'}>
            {user?.loginId || t.guest}
          </span>
          {hasAuth && user ? (
            <button
              type="button"
              onClick={onSignOut}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-rose-600 dark:hover:bg-slate-900 dark:hover:text-rose-400"
              title={t.signOut}
              aria-label={t.signOut}
            >
              <LogOut className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>
      {mobileSearchOpen ? (
        <div className={isDark ? 'border-t border-slate-700 px-3 pb-3 pt-2 md:hidden' : 'border-t border-slate-300/60 px-3 pb-3 pt-2 md:hidden'}>
          <form className="flex gap-2" onSubmit={onSearchSubmit}>
            <SearchInput
              placeholder={t.search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={isDark ? 'border-slate-600 bg-slate-800 text-slate-100 placeholder:text-slate-400' : ''}
            />
            <ActionButton
              type="submit"
              variant="primary"
            >
              {t.searchButton}
            </ActionButton>
          </form>
        </div>
      ) : null}
    </header>
  )
}
