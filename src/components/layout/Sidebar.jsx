import { Link, useLocation } from 'react-router-dom'
import { NAV_ITEMS } from './navConfig'

export function Sidebar({ onNavigate }) {
  const location = useLocation()

  return (
    <aside className="h-full border-r border-slate-800 bg-slate-950/95 px-3 py-4">
      <Link to="/" className="mb-6 block rounded-xl bg-gradient-to-r from-blue-500 to-violet-500 px-3 py-3 text-sm font-bold text-white">
        Kotoba Seven
      </Link>
      <nav className="space-y-1" aria-label="Sidebar navigation">
        {NAV_ITEMS.map((item) => {
          const active = location.pathname === item.path
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onNavigate}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                active
                  ? 'bg-blue-500/20 text-blue-200'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span aria-hidden>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
