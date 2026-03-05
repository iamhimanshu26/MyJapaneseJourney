import { Outlet, Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'

const navItems = [
  { path: '/', label: 'Dashboard' },
  { path: '/lookup', label: 'Heard New?', highlight: true },
  { path: '/vocab', label: 'Vocabulary' },
  { path: '/grammar', label: 'Grammar' },
  { path: '/discovered', label: 'My Discovered' },
]

export function MainLayout() {
  const location = useLocation()

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-[var(--color-bg)]/95 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="text-xl font-semibold tracking-tight">
            My Japanese Journey
          </Link>
          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === item.path
                    ? 'bg-amber-100 text-amber-700'
                    : item.highlight
                      ? 'text-amber-700 hover:text-amber-800 hover:bg-amber-50'
                      : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-slate-100'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}
