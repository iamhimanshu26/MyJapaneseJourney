import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from '../components/layout/Sidebar'
import { Topbar } from '../components/layout/Topbar'
import { useUiPreferences } from '../hooks/useUiPreferences'

export function MainLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { resolvedTheme } = useUiPreferences()
  const isDark = resolvedTheme === 'dark'

  return (
    <div className={isDark
      ? 'min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 text-slate-100'
      : 'min-h-screen bg-gradient-to-br from-slate-200 via-slate-100 to-sky-100 text-slate-900'}
    >
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <div className="flex min-h-screen">
        <div className="hidden w-72 shrink-0 lg:block">
          <Sidebar />
        </div>

        {mobileOpen ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute inset-0 bg-black/60"
              aria-label="Close navigation menu"
            />
            <div className="relative z-10 h-full w-72">
              <Sidebar onNavigate={() => setMobileOpen(false)} />
            </div>
          </div>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar onMenu={() => setMobileOpen((prev) => !prev)} />
          <main className={isDark ? 'flex-1 bg-slate-900/35 p-4 md:p-6 lg:p-8' : 'flex-1 bg-white/55 p-4 md:p-6 lg:p-8'} id="main-content">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
