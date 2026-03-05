import { Component } from 'react'
import { Link } from 'react-router-dom'

export class ErrorBoundary extends Component {
  state = { hasError: false, error: null }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-[var(--color-bg)]">
          <div className="max-w-md text-center">
            <h1 className="text-2xl font-bold text-[var(--color-text)] mb-2">
              Something went wrong
            </h1>
            <p className="text-[var(--color-text-muted)] mb-6">
              We encountered an unexpected error. Please try refreshing the page.
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 rounded-xl bg-amber-500 text-white font-semibold hover:bg-amber-600"
              >
                Refresh page
              </button>
              <Link
                to="/"
                className="px-6 py-3 rounded-xl border border-slate-200 text-[var(--color-text)] font-medium hover:bg-slate-100"
              >
                Go home
              </Link>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
