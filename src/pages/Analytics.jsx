import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts'
import { PageMeta } from '../components/PageMeta'
import { SectionHeader } from '../components/shared/SectionHeader'
import { LoadingState } from '../components/shared/LoadingState'
import { EmptyState } from '../components/shared/EmptyState'
import { useDiscovered } from '../hooks/useDiscovered'
import { apiRequest } from '../lib/apiClient'

const PIE_COLORS = ['#60a5fa', '#818cf8', '#22d3ee', '#34d399', '#fbbf24', '#fb7185']

export function Analytics() {
  const { identity } = useDiscovered()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      setError('')
      try {
        const response = await apiRequest('/api/analytics', { method: 'GET', identity })
        if (mounted) setData(response)
      } catch (err) {
        if (mounted) setError(err.message || 'Failed to load analytics')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [identity])

  return (
    <div className="mx-auto max-w-7xl">
      <PageMeta title="Analytics" description="Enterprise analytics for Japanese learning progress and trends." />
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <SectionHeader
          title="Enterprise Analytics"
          subtitle="Study activity, category trends, and monthly learning outcomes."
        />

        {loading ? <LoadingState /> : null}
        {!loading && error ? <EmptyState title="Analytics unavailable" message={error} /> : null}
        {!loading && !error && data ? (
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="card-shell">
                <p className="text-xs uppercase tracking-[0.1em] text-slate-400">Total Items</p>
                <p className="mt-2 text-2xl font-bold text-slate-100">{data.cards.totalItems}</p>
              </div>
              <div className="card-shell">
                <p className="text-xs uppercase tracking-[0.1em] text-slate-400">Mastered</p>
                <p className="mt-2 text-2xl font-bold text-slate-100">{data.cards.mastered}</p>
              </div>
              <div className="card-shell">
                <p className="text-xs uppercase tracking-[0.1em] text-slate-400">Weak Items</p>
                <p className="mt-2 text-2xl font-bold text-slate-100">{data.cards.weak}</p>
              </div>
              <div className="card-shell">
                <p className="text-xs uppercase tracking-[0.1em] text-slate-400">Mastery Rate</p>
                <p className="mt-2 text-2xl font-bold text-slate-100">{data.cards.masteryRate}%</p>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <div className="card-shell lg:col-span-2">
                <h3 className="text-sm font-semibold text-slate-200">Study Activity (Last 14 Days)</h3>
                <div className="mt-4 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.studyActivity}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="day" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155' }} />
                      <Line type="monotone" dataKey="activity_count" stroke="#60a5fa" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="card-shell">
                <h3 className="text-sm font-semibold text-slate-200">Vocabulary by JLPT</h3>
                <div className="mt-4 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={data.vocabularyByJlpt} dataKey="count" nameKey="level" outerRadius={95} label>
                        {data.vocabularyByJlpt.map((entry, idx) => (
                          <Cell key={entry.level} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="card-shell">
                <h3 className="text-sm font-semibold text-slate-200">Grammar Progress by Level</h3>
                <div className="mt-4 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.grammarByLevel}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="level" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155' }} />
                      <Bar dataKey="reviewed" stackId="a" fill="#22d3ee" />
                      <Bar dataKey="pending" stackId="a" fill="#334155" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="card-shell">
                <h3 className="text-sm font-semibold text-slate-200">Recently Discovered Words Trend</h3>
                <div className="mt-4 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.discoveredTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="week" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155' }} />
                      <Line type="monotone" dataKey="discovered_count" stroke="#818cf8" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="card-shell">
                <h3 className="text-sm font-semibold text-slate-200">Weakest Categories</h3>
                <ul className="mt-3 space-y-2 text-sm text-slate-300">
                  {data.weakestCategories.map((item) => (
                    <li key={item.type} className="flex justify-between">
                      <span>{item.type}</span>
                      <span>{item.weak_count} weak / {item.item_count} total</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="card-shell">
                <h3 className="text-sm font-semibold text-slate-200">Strongest Categories</h3>
                <ul className="mt-3 space-y-2 text-sm text-slate-300">
                  {data.strongestCategories.map((item) => (
                    <li key={item.type} className="flex justify-between">
                      <span>{item.type}</span>
                      <span>{item.mastered_count} mastered / {item.item_count} total</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="card-shell">
              <h3 className="text-sm font-semibold text-slate-200">Monthly Learning Summary</h3>
              <div className="mt-3 grid gap-3 text-sm text-slate-300 sm:grid-cols-3">
                <p>New items this month: <strong>{data.monthlySummary.new_this_month}</strong></p>
                <p>Reviewed this month: <strong>{data.monthlySummary.reviewed_this_month}</strong></p>
                <p>Total mastered: <strong>{data.monthlySummary.mastered_total}</strong></p>
              </div>
            </div>
          </div>
        ) : null}
      </motion.div>
    </div>
  )
}
