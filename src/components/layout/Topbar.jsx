import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const LANG_KEY = 'mjj-ui-language'

const COPY = {
  en: {
    title: 'AI Japanese Learning Intelligence Dashboard',
    subtitle: 'JLPT / NAT preparation workspace',
    search: 'Search vocabulary, grammar, kanji...',
    guest: 'Guest mode',
    signOut: 'Sign out',
  },
  ja: {
    title: 'AI日本語学習インテリジェンスダッシュボード',
    subtitle: 'JLPT / NAT 試験対策ワークスペース',
    search: '語彙・文法・漢字を検索...',
    guest: 'ゲストモード',
    signOut: 'ログアウト',
  },
}

export function Topbar({ onMenu }) {
  const { user, signOut, hasAuth } = useAuth()
  const [language, setLanguage] = useState('en')
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LANG_KEY)
      if (saved === 'ja' || saved === 'en') setLanguage(saved)
    } catch {}
  }, [])

  function toggleLanguage() {
    const next = language === 'en' ? 'ja' : 'en'
    setLanguage(next)
    try {
      localStorage.setItem(LANG_KEY, next)
    } catch {}
  }

  const t = useMemo(() => COPY[language] || COPY.en, [language])

  function onSearchSubmit(e) {
    e.preventDefault()
    const query = search.trim()
    if (!query) return
    navigate(`/lookup?q=${encodeURIComponent(query)}`)
    setSearch('')
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-700 bg-slate-800/85 backdrop-blur">
      <div className="flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onMenu}
            className="rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-slate-100 lg:hidden"
            aria-label="Open menu"
          >
            ☰
          </button>
          <div>
            <p className="text-sm font-semibold text-slate-100">{t.title}</p>
            <p className="text-xs text-slate-300">{t.subtitle}</p>
          </div>
        </div>

        <div className="hidden w-full max-w-md px-4 md:block">
          <form onSubmit={onSearchSubmit}>
            <input
              type="search"
              placeholder={t.search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-300/70 focus:border-blue-300 focus:outline-none"
            />
          </form>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleLanguage}
            aria-label="Toggle language"
            className="relative hidden h-11 w-[160px] items-center rounded-full border border-slate-200 bg-white px-3 shadow-[0_6px_20px_rgba(15,23,42,0.15)] md:flex"
          >
            <span className={`z-10 text-sm font-semibold transition-colors ${language === 'en' ? 'text-emerald-500' : 'text-slate-400'}`}>
              EN
            </span>
            <span
              aria-hidden
              className={`absolute top-1/2 h-7 w-7 -translate-y-1/2 rounded-full bg-emerald-400 shadow-md transition-all ${
                language === 'en' ? 'left-[58px]' : 'left-[95px]'
              }`}
            />
            <span className={`ml-auto z-10 text-sm font-semibold transition-colors ${language === 'ja' ? 'text-slate-700' : 'text-slate-400'}`}>
              日本語
            </span>
          </button>

          <span className="text-xs text-slate-200">{user?.loginId || t.guest}</span>
          {hasAuth && user ? (
            <button
              type="button"
              onClick={() => signOut()}
              className="rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-xs font-medium text-slate-100 hover:border-slate-400"
            >
              {t.signOut}
            </button>
          ) : null}
        </div>
      </div>
    </header>
  )
}
