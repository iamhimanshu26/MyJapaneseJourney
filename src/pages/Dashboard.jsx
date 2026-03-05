import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { HeardNewVocabCta } from '../components/HeardNewVocabCta'
import { PageMeta } from '../components/PageMeta'
import { useDiscovered } from '../hooks/useDiscovered'
import { useAuth } from '../context/AuthContext'

export function Dashboard() {
  const { items } = useDiscovered()
  const { user, profile, hasAuth } = useAuth()
  const discoveredCount = items.length

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <PageMeta title="Dashboard" description="Your Japanese learning hub. Vocabulary, grammar, and AI-powered lookup." />
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          {user ? 'Welcome back' : 'Welcome'}
        </h1>
        <p className="text-[var(--color-text-muted)] mb-8">
          {profile?.current_level && profile?.target_level
            ? `Your journey: ${profile.current_level} → ${profile.target_level}`
            : 'Ready to continue your Japanese journey from N5 to N1.'}
        </p>
        {discoveredCount > 0 && (
          <p className="mb-6 text-sm text-[var(--color-text-muted)]">
            You&apos;ve saved {discoveredCount} word{discoveredCount !== 1 ? 's' : ''} to My Discovered.
          </p>
        )}
        {hasAuth && !user && (
          <p className="mb-6 text-sm text-[var(--color-text-muted)]">
            <Link to="/signup" className="text-amber-600 hover:underline font-medium">Sign up</Link>
            {' '}or{' '}
            <Link to="/login" className="text-amber-600 hover:underline font-medium">log in</Link>
            {' '}to sync your progress across devices.
          </p>
        )}

        <HeardNewVocabCta />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { title: 'Vocabulary', desc: 'Flashcards & quizzes', path: '/vocab', icon: '📚' },
            { title: 'Grammar', desc: 'Patterns & explanations', path: '/grammar', icon: '📝' },
            { title: 'My Discovered', desc: 'Words you looked up', path: '/discovered', icon: '✨' },
          ].map((card, i) => (
            <motion.div
              key={card.path}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05 }}
            >
              <Link
                to={card.path}
                className="block rounded-2xl border border-slate-200 bg-[var(--color-bg-card)] p-6 transition-colors hover:border-amber-300 hover:bg-amber-50/50 shadow-sm"
              >
                <span className="text-2xl mb-3 block" aria-hidden>{card.icon}</span>
                <h3 className="font-semibold text-[var(--color-text)]">{card.title}</h3>
                <p className="text-sm text-[var(--color-text-muted)] mt-1">{card.desc}</p>
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
