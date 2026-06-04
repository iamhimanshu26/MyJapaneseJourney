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
    setLanguage(language === 'en' ? 'ja' : 'en')
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

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileSearchOpen((prev) => !prev)}
            className={isDark
              ? 'rounded-lg border border-slate-600 bg-slate-700 px-2.5 py-1.5 text-xs text-slate-100 md:hidden'
              : 'rounded-lg border border-slate-300 bg-slate-100 px-2.5 py-1.5 text-xs text-slate-700 md:hidden'}
          >
            {t.searchButton}
          </button>
          <div className="hidden sm:flex items-center rounded-full border border-slate-200 bg-white p-1 shadow-[0_8px_18px_rgba(15,23,42,0.10)]">
            <button
              type="button"
              onClick={() => setLanguage('en')}
              aria-label="Switch language to English"
              className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                language === 'en' ? 'bg-[#edf2ff] text-[#3b4bff]' : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLanguage('ja')}
              aria-label="Switch language to Japanese"
              className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                language === 'ja' ? 'bg-[#edf2ff] text-[#3b4bff]' : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              日本語
            </button>
          </div>

          <button
            type="button"
            onClick={toggleLanguage}
            aria-label="Toggle language"
            className="inline-flex h-9 items-center rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-[#3b4bff] shadow-[0_6px_14px_rgba(15,23,42,0.10)] sm:hidden"
          >
            {language === 'en' ? 'EN' : '日本語'}
          </button>

          <span className={isDark ? 'text-sm font-semibold text-slate-200' : 'text-sm font-semibold text-slate-800'}>
            {user?.loginId || t.guest}
          </span>
          {hasAuth && user ? (
            <button
              type="button"
              onClick={() => signOut()}
              title={t.signOut}
              aria-label={t.signOut}
              className={isDark
                ? 'inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-200 hover:bg-slate-700'
                : 'inline-flex h-10 w-10 items-center justify-center rounded-xl text-[#5d7398] hover:bg-slate-100'}
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth="2.2" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 8.25V5.25A2.25 2.25 0 0013.5 3h-6A2.25 2.25 0 005.25 5.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25v-3" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 12H9m0 0l3-3m-3 3l3 3" />
              </svg>
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
