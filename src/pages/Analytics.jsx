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
const CHART_GRID = '#e2e8f0'
const CHART_AXIS = '#64748b'
const TOOLTIP_STYLE = { background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 8 }

export function Analytics() {
  const { identity } = useDiscovered()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [range, setRange] = useState('30d')
  const [view, setView] = useState('weekly')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      setError('')
      try {
        const query = new URLSearchParams({ range, view })
        if (range === 'custom') {
          if (startDate) query.set('start', startDate)
          if (endDate) query.set('end', endDate)
        }
        const response = await apiRequest(`/api/analytics?${query.toString()}`, { method: 'GET', identity })
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
  }, [identity, range, view, startDate, endDate])

  return (
    <div className="mx-auto max-w-7xl">
      <PageMeta title="Analytics" description="Enterprise analytics for Japanese learning progress and trends." />
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <SectionHeader
          title="Enterprise Analytics"
          subtitle="Study activity, category trends, and monthly learning outcomes."
        />
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <select value={range} onChange={(e) => setRange(e.target.value)} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800">
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="custom">Custom range</option>
          </select>
          <select value={view} onChange={(e) => setView(e.target.value)} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800">
            <option value="weekly">Weekly view</option>
            <option value="monthly">Monthly view</option>
          </select>
          {range === 'custom' ? (
            <>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800" />
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800" />
            </>
          ) : null}
        </div>

        {loading ? <LoadingState /> : null}
        {!loading && error ? <EmptyState title="Analytics unavailable" message={error} /> : null}
        {!loading && !error && data ? (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="card-shell">
                <p className="text-xs uppercase tracking-[0.1em] text-slate-500">Total Items</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{data.cards.totalItems}</p>
              </div>
              <div className="card-shell">
                <p className="text-xs uppercase tracking-[0.1em] text-slate-500">Mastered</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{data.cards.mastered}</p>
              </div>
              <div className="card-shell">
                <p className="text-xs uppercase tracking-[0.1em] text-slate-500">Weak Items</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{data.cards.weak}</p>
              </div>
              <div className="card-shell">
                <p className="text-xs uppercase tracking-[0.1em] text-slate-500">Mastery Rate</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{data.cards.masteryRate}%</p>
              </div>
              <div className="card-shell">
                <p className="text-xs uppercase tracking-[0.1em] text-slate-500">Favorites</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{data.cards.favorites}</p>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <div className="card-shell lg:col-span-2">
                <h3 className="text-base font-medium text-slate-900">Study Activity (Last 14 Days)</h3>
                <div className="mt-4 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.studyActivity}>
                      <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                      <XAxis dataKey="day" stroke={CHART_AXIS} />
                      <YAxis stroke={CHART_AXIS} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                      <Line type="monotone" dataKey="activity_count" stroke="#60a5fa" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="card-shell">
                <h3 className="text-base font-medium text-slate-900">Vocabulary by JLPT</h3>
                <div className="mt-4 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={data.vocabularyByJlpt} dataKey="count" nameKey="level" outerRadius={95} label>
                        {data.vocabularyByJlpt.map((entry, idx) => (
                          <Cell key={entry.level} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="card-shell">
                <h3 className="text-base font-medium text-slate-900">Readiness Trend</h3>
                <div className="mt-4 h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.readinessTrend || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                      <XAxis dataKey="day" stroke={CHART_AXIS} />
                      <YAxis stroke={CHART_AXIS} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                      <Line type="monotone" dataKey="readiness_score" stroke="#a78bfa" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="card-shell">
                <h3 className="text-base font-medium text-slate-900">Monthly Reports</h3>
                <div className="mt-4 h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.monthlyReports || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                      <XAxis dataKey="month" stroke={CHART_AXIS} />
                      <YAxis stroke={CHART_AXIS} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                      <Line type="monotone" dataKey="readiness" stroke="#60a5fa" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <ul className="mt-3 space-y-2 text-sm text-slate-700">
                  {(data.monthlyReports || []).slice(-3).reverse().map((report) => (
                    <li key={report.month} className="rounded-lg border border-slate-200 bg-white p-3">
                      <p className="font-medium text-slate-900">
                        {report.month} • {report.momentum}
                      </p>
                      <p className="text-xs text-slate-600">
                        Mastered: {report.mastered} • New: {report.newItems} • Reviewed: {report.reviewed} • AI: {report.aiLookups} • Readiness: {report.readiness}% ({report.readinessDelta >= 0 ? '+' : ''}{report.readinessDelta})
                      </p>
                      <p className="mt-1 text-[11px] text-slate-500">{report.narrative}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="card-shell">
                <h3 className="text-base font-medium text-slate-900">Grammar Progress by Level</h3>
                <div className="mt-4 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.grammarByLevel}>
                      <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                      <XAxis dataKey="level" stroke={CHART_AXIS} />
                      <YAxis stroke={CHART_AXIS} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                      <Bar dataKey="reviewed" stackId="a" fill="#22d3ee" />
                      <Bar dataKey="pending" stackId="a" fill="#334155" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="card-shell">
                <h3 className="text-base font-medium text-slate-900">Recently Discovered Words Trend</h3>
                <div className="mt-4 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.discoveredTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                      <XAxis dataKey="week" stroke={CHART_AXIS} />
                      <YAxis stroke={CHART_AXIS} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                      <Line type="monotone" dataKey="discovered_count" stroke="#818cf8" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <div className="card-shell">
                <h3 className="text-base font-medium text-slate-900">AI Usage Trend</h3>
                <div className="mt-4 h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.aiUsageTrend || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                      <XAxis dataKey="week" stroke={CHART_AXIS} />
                      <YAxis stroke={CHART_AXIS} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                      <Line type="monotone" dataKey="lookup_count" stroke="#22d3ee" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="card-shell">
                <h3 className="text-base font-medium text-slate-900">Interview Improvement</h3>
                <div className="mt-4 h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.interviewImprovement || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                      <XAxis dataKey="week" stroke={CHART_AXIS} />
                      <YAxis stroke={CHART_AXIS} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                      <Line type="monotone" dataKey="avg_score" stroke="#fbbf24" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="card-shell">
                <h3 className="text-base font-medium text-slate-900">Dokkai Improvement</h3>
                <div className="mt-4 h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.dokkaiImprovement || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                      <XAxis dataKey="week" stroke={CHART_AXIS} />
                      <YAxis stroke={CHART_AXIS} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                      <Line type="monotone" dataKey="avg_summary_quality" stroke="#34d399" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="card-shell">
                <h3 className="text-base font-medium text-slate-900">Weakest Categories</h3>
                <ul className="mt-3 space-y-2 text-sm text-slate-700">
                  {data.weakestCategories.map((item) => (
                    <li key={item.type} className="flex justify-between">
                      <span>{item.type}</span>
                      <span>{item.weak_count} weak / {item.item_count} total</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="card-shell">
                <h3 className="text-base font-medium text-slate-900">Strongest Categories</h3>
                <ul className="mt-3 space-y-2 text-sm text-slate-700">
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
              <h3 className="text-base font-medium text-slate-900">Monthly Learning Summary</h3>
              <div className="mt-3 grid gap-3 text-sm text-slate-700 sm:grid-cols-3">
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
