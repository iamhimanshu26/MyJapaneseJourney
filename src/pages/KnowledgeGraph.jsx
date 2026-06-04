import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { PageMeta } from '../components/PageMeta'
import { SectionHeader } from '../components/shared/SectionHeader'
import { LoadingState } from '../components/shared/LoadingState'
import { EmptyState } from '../components/shared/EmptyState'
import { useDiscovered } from '../hooks/useDiscovered'
import { apiRequest } from '../lib/apiClient'
import { useToast } from '../context/ToastContext'
import { ActionButton } from '../components/ui/ActionButton'

const NODE_COLORS = {
  business: '#60a5fa',
  technology: '#a78bfa',
  'daily-life': '#34d399',
  'grammar-patterns': '#fbbf24',
  'kanji-core': '#fb7185',
  related: '#22d3ee',
  general: '#94a3b8',
}

function buildNodeLinkLayout(graph) {
  const nodes = Array.isArray(graph?.nodes) ? graph.nodes : []
  const edges = Array.isArray(graph?.edges) ? graph.edges : []
  if (!nodes.length) return { nodes: [], links: [], groups: [] }

  const grouped = new Map()
  for (const node of nodes) {
    const group = String(node.group || 'general')
    if (!grouped.has(group)) grouped.set(group, [])
    grouped.get(group).push(node)
  }

  const groups = [...grouped.keys()]
  const groupGap = groups.length > 1 ? 860 / (groups.length - 1) : 0
  const nodeMap = new Map()
  const positionedNodes = []

  groups.forEach((group, groupIdx) => {
    const groupNodes = grouped.get(group) || []
    const rowGap = groupNodes.length > 1 ? 360 / (groupNodes.length - 1) : 0
    groupNodes.forEach((node, rowIdx) => {
      const positioned = {
        ...node,
        x: 60 + (groupIdx * groupGap),
        y: 50 + (rowIdx * rowGap),
        color: NODE_COLORS[group] || NODE_COLORS.general,
      }
      positionedNodes.push(positioned)
      nodeMap.set(node.id, positioned)
    })
  })

  const links = edges
    .map((edge) => {
      const source = nodeMap.get(edge.source)
      const target = nodeMap.get(edge.target)
      if (!source || !target) return null
      return {
        ...edge,
        source,
        target,
        weight: Number(edge.weight || 1),
      }
    })
    .filter(Boolean)

  return { nodes: positionedNodes, links, groups }
}

export function KnowledgeGraph() {
  const { identity } = useDiscovered()
  const toast = useToast()
  const [graph, setGraph] = useState({ nodes: [], edges: [] })
  const [activeNodeId, setActiveNodeId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sourceTerm, setSourceTerm] = useState('')
  const [targetTerm, setTargetTerm] = useState('')
  const [relationType, setRelationType] = useState('related')

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      setError('')
      try {
        const data = await apiRequest('/api/intelligence?view=knowledge-graph', { method: 'GET', identity })
        if (mounted) setGraph(data)
      } catch (err) {
        if (mounted) setError(err.message || 'Failed to load knowledge graph')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [identity])

  const nodeLinkData = useMemo(() => buildNodeLinkLayout(graph), [graph])
  const activeNode = nodeLinkData.nodes.find((node) => node.id === activeNodeId) || null

  const visibleLinks = useMemo(() => {
    if (!activeNodeId) return nodeLinkData.links
    return nodeLinkData.links.filter((link) => link.source.id === activeNodeId || link.target.id === activeNodeId)
  }, [nodeLinkData.links, activeNodeId])

  async function handleAddRelation(e) {
    e.preventDefault()
    if (!sourceTerm.trim() || !targetTerm.trim()) return
    try {
      await apiRequest('/api/intelligence', {
        method: 'POST',
        identity,
        body: {
          action: 'knowledge-relation',
          source_term: sourceTerm.trim(),
          target_term: targetTerm.trim(),
          relation_type: relationType,
          weight: 1,
        },
      })
      const data = await apiRequest('/api/intelligence?view=knowledge-graph', { method: 'GET', identity })
      setGraph(data)
      setSourceTerm('')
      setTargetTerm('')
      toast.success('Knowledge relation added')
    } catch (err) {
      toast.error(err.message || 'Failed to add relation')
    }
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageMeta title="Knowledge Graph" description="Visual relationship graph for vocabulary, grammar, and kanji." />
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <SectionHeader
          title="Knowledge Graph"
          subtitle="Visualize relationships between vocabulary, kanji, and grammar clusters."
        />

        <form onSubmit={handleAddRelation} className="card-shell mb-4 grid gap-2 md:grid-cols-4">
          <input
            value={sourceTerm}
            onChange={(e) => setSourceTerm(e.target.value)}
            placeholder="Source term"
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800"
          />
          <input
            value={targetTerm}
            onChange={(e) => setTargetTerm(e.target.value)}
            placeholder="Target term"
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800"
          />
          <select
            value={relationType}
            onChange={(e) => setRelationType(e.target.value)}
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800"
          >
            <option value="related">related</option>
            <option value="similar">similar</option>
            <option value="derived">derived</option>
            <option value="grammar-link">grammar-link</option>
          </select>
          <ActionButton type="submit" variant="primary">
            Add Relation
          </ActionButton>
        </form>

        {loading ? <LoadingState title="Building graph..." subtitle="Linking your discovered terms." /> : null}
        {!loading && error ? <EmptyState title="Knowledge graph unavailable" message={error} /> : null}
        {!loading && !error && !nodeLinkData.links.length ? (
          <EmptyState title="No graph links yet" message="Save more items or add term relations to start visualizing your knowledge graph." />
        ) : null}

        {!loading && !error && nodeLinkData.links.length ? (
          <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
              {nodeLinkData.groups.map((group) => (
                <span key={group} className="rounded-full border border-slate-300 bg-slate-50 px-2 py-1">
                  <span
                    className="mr-1 inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: NODE_COLORS[group] || NODE_COLORS.general }}
                  />
                  {group}
                </span>
              ))}
              {activeNode ? (
                <button
                  type="button"
                  className="ml-auto rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-600 hover:border-blue-400"
                  onClick={() => setActiveNodeId('')}
                >
                  Clear focus
                </button>
              ) : null}
            </div>
            <div className="overflow-x-auto">
              <svg viewBox="0 0 980 460" className="h-[460px] min-w-[980px] w-full rounded-xl bg-slate-50">
                {visibleLinks.map((link, idx) => (
                  <line
                    key={`${link.source.id}-${link.target.id}-${idx}`}
                    x1={link.source.x}
                    y1={link.source.y}
                    x2={link.target.x}
                    y2={link.target.y}
                    stroke={activeNodeId ? '#60a5fa' : '#94a3b8'}
                    strokeOpacity={activeNodeId ? 0.65 : 0.45}
                    strokeWidth={Math.max(1, Math.min(4, link.weight + 0.5))}
                  />
                ))}
                {nodeLinkData.nodes.map((node) => {
                  const focused = !activeNodeId || node.id === activeNodeId
                  return (
                    <g key={node.id} onClick={() => setActiveNodeId(node.id)} style={{ cursor: 'pointer' }}>
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={focused ? 10 : 7}
                        fill={node.color}
                        opacity={focused ? 1 : 0.55}
                      />
                      <text
                        x={node.x + 12}
                        y={node.y + 4}
                        fontSize="11"
                        fill={focused ? '#0f172a' : '#64748b'}
                      >
                        {node.label}
                      </text>
                    </g>
                  )
                })}
              </svg>
            </div>
            {activeNode ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                <p className="font-medium text-slate-900">{activeNode.label}</p>
                <p className="text-xs text-slate-500">Type: {activeNode.type || 'unknown'} • Group: {activeNode.group || 'general'}</p>
                {activeNode.reading ? <p className="mt-1 text-xs text-slate-500">Reading: {activeNode.reading}</p> : null}
                <p className="mt-1 text-xs text-slate-500">Connected links: {visibleLinks.length}</p>
              </div>
            ) : null}
          </div>
        ) : null}
      </motion.div>
    </div>
  )
}
