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
            <h1 className="mb-2 text-3xl font-semibold text-slate-900">
              Something went wrong
            </h1>
            <p className="mb-6 text-sm text-slate-600">
              We encountered an unexpected error. Please try refreshing the page.
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="h-10 rounded-lg bg-amber-500 px-6 text-sm font-medium text-white hover:bg-amber-600"
              >
                Refresh page
              </button>
              <Link
                to="/"
                className="inline-flex h-10 items-center rounded-lg border border-slate-200 px-6 text-sm font-medium text-slate-800 hover:bg-slate-100"
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
