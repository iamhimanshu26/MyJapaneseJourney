import { useAuth } from '../../context/AuthContext'

export function Topbar({ onMenu }) {
  const { user, signOut, hasAuth } = useAuth()

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/85 backdrop-blur">
      <div className="flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onMenu}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 lg:hidden"
            aria-label="Open menu"
          >
            ☰
          </button>
          <div>
            <p className="text-sm font-semibold text-slate-100">AI Japanese Learning Intelligence Dashboard</p>
            <p className="text-xs text-slate-400">JLPT / NAT preparation workspace</p>
          </div>
        </div>

        <div className="hidden w-full max-w-md px-4 md:block">
          <input
            type="search"
            placeholder="Search vocabulary, grammar, kanji..."
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-400 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400">{user?.email || 'Guest mode'}</span>
          {hasAuth && user ? (
            <button
              type="button"
              onClick={() => signOut()}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-200 hover:border-slate-500"
            >
              Sign out
            </button>
          ) : null}
        </div>
      </div>
    </header>
  )
}
