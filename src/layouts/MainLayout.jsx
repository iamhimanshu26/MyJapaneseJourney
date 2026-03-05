import { useState } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { path: '/', label: 'Dashboard' },
  { path: '/chapters', label: 'Guided Chapters', highlight: true },
  { path: '/lookup', label: 'Heard New?' },
  { path: '/learn-from-text', label: 'Learn from text' },
  { path: '/vocab', label: 'Vocabulary' },
  { path: '/grammar', label: 'Grammar' },
  { path: '/discovered', label: 'My Discovered' },
]

export function MainLayout() {
  const location = useLocation()
  const { user, signOut, hasAuth } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  const navLinkClass = (item) =>
    location.pathname === item.path
      ? 'bg-amber-100 text-amber-700'
      : item.highlight
        ? 'text-amber-700 hover:bg-amber-50'
        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-slate-100'

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-[var(--color-bg)]/95 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="text-xl font-semibold tracking-tight shrink-0">
            My Japanese Journey
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${navLinkClass(item)}`}
              >
                {item.label}
              </Link>
            ))}
            {hasAuth && (
              user ? (
                <button
                  onClick={() => signOut()}
                  className="px-3 py-2 rounded-lg text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-slate-100"
                  aria-label="Sign out"
                >
                  Sign out
                </button>
              ) : (
                <Link
                  to="/login"
                  className="px-3 py-2 rounded-lg text-sm font-medium text-amber-700 hover:bg-amber-50"
                >
                  Log in
                </Link>
              )
            )}
          </nav>

          {/* Mobile: hamburger */}
          <div className="md:hidden flex items-center gap-2">
            {hasAuth && user && (
              <span className="text-sm text-[var(--color-text-muted)] truncate max-w-[100px]">
                {user.email}
              </span>
            )}
            <button
              type="button"
              onClick={() => setMobileOpen((o) => !o)}
              className="p-2 rounded-lg hover:bg-slate-100"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileOpen && (
          <div className="md:hidden border-t border-slate-200 bg-[var(--color-bg)] py-2">
            <nav className="px-4 flex flex-col gap-1" aria-label="Mobile navigation">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={`px-4 py-3 rounded-lg text-sm font-medium ${navLinkClass(item)}`}
                >
                  {item.label}
                </Link>
              ))}
              {hasAuth && (
                user ? (
                  <button
                    onClick={() => { signOut(); setMobileOpen(false) }}
                    className="px-4 py-3 rounded-lg text-sm text-left text-[var(--color-text-muted)] hover:bg-slate-100"
                  >
                    Sign out
                  </button>
                ) : (
                  <Link
                    to="/login"
                    onClick={() => setMobileOpen(false)}
                    className="px-4 py-3 rounded-lg text-sm font-medium text-amber-700 hover:bg-amber-50"
                  >
                    Log in
                  </Link>
                )
              )}
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1" id="main-content">
        <Outlet />
      </main>
    </div>
  )
}
