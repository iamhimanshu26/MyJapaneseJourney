import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useUiPreferences } from '../../hooks/useUiPreferences'

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

  function toggleLanguage() {
    const next = language === 'en' ? 'ja' : 'en'
    setLanguage(next)
  }

  const t = useMemo(() => COPY[language] || COPY.en, [language])

  function onSearchSubmit(e) {
    e.preventDefault()
    const query = search.trim()
    if (!query) return
    navigate(`/lookup?q=${encodeURIComponent(query)}`)
    setSearch('')
    setMobileSearchOpen(false)
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
            <input
              type="search"
              placeholder={t.search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={isDark
                ? 'w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none'
                : 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 focus:border-blue-400 focus:outline-none'}
            />
          </form>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMobileSearchOpen((prev) => !prev)}
            className={isDark
              ? 'rounded-lg border border-slate-600 bg-slate-700 px-2.5 py-1.5 text-xs text-slate-100 md:hidden'
              : 'rounded-lg border border-slate-300 bg-slate-100 px-2.5 py-1.5 text-xs text-slate-700 md:hidden'}
          >
            {t.searchButton}
          </button>
          <button
            type="button"
            onClick={toggleLanguage}
            aria-label="Toggle language"
            className="relative flex h-10 w-[138px] items-center rounded-full border border-slate-200 bg-white px-3 shadow-[0_8px_20px_rgba(15,23,42,0.14)]"
          >
            <span className={`z-10 text-[13px] font-semibold transition-colors ${language === 'en' ? 'text-emerald-500' : 'text-slate-400'}`}>
              EN
            </span>
            <span
              aria-hidden
              className="absolute left-1/2 top-1/2 h-[20px] w-[20px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-400 shadow-sm"
            />
            <span className={`ml-auto z-10 text-sm font-semibold transition-colors ${language === 'ja' ? 'text-emerald-500' : 'text-slate-700'}`}>
              日本語
            </span>
          </button>

          <span className={isDark ? 'hidden text-xs text-slate-200 sm:inline' : 'hidden text-xs text-slate-700 sm:inline'}>{user?.loginId || t.guest}</span>
          {hasAuth && user ? (
            <button
              type="button"
              onClick={() => signOut()}
              title={t.signOut}
              aria-label={t.signOut}
              className={isDark
                ? 'rounded-xl border border-slate-600 bg-slate-700 px-3 py-1.5 text-base text-slate-100 hover:border-slate-400'
                : 'rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-base text-slate-800 hover:border-slate-400'}
            >
              🚪
            </button>
          ) : null}
        </div>
      </div>
      {mobileSearchOpen ? (
        <div className={isDark ? 'border-t border-slate-700 px-3 pb-3 pt-2 md:hidden' : 'border-t border-slate-300/60 px-3 pb-3 pt-2 md:hidden'}>
          <form className="flex gap-2" onSubmit={onSearchSubmit}>
            <input
              type="search"
              placeholder={t.search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={isDark
                ? 'w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none'
                : 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 focus:border-blue-400 focus:outline-none'}
            />
            <button
              type="submit"
              className="rounded-lg bg-gradient-to-r from-blue-500 to-violet-500 px-3 py-2 text-xs font-semibold text-white"
            >
              {t.searchButton}
            </button>
          </form>
        </div>
      ) : null}
    </header>
  )
}
