import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from '../components/layout/Sidebar'
import { Topbar } from '../components/layout/Topbar'

export function MainLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-700 via-slate-600 to-slate-500 text-slate-100">
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
          <main className="flex-1 bg-slate-800/20 p-4 md:p-6 lg:p-8" id="main-content">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
