import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Sankey, Tooltip, ResponsiveContainer } from 'recharts'
import { PageMeta } from '../components/PageMeta'
import { SectionHeader } from '../components/shared/SectionHeader'
import { LoadingState } from '../components/shared/LoadingState'
import { EmptyState } from '../components/shared/EmptyState'
import { useDiscovered } from '../hooks/useDiscovered'
import { apiRequest } from '../lib/apiClient'
import { useToast } from '../context/ToastContext'

function buildSankeyData(graph) {
  const nodeIndex = new Map()
  const nodes = []
  for (const node of graph.nodes || []) {
    nodeIndex.set(node.id, nodes.length)
    nodes.push({ name: node.label || node.id })
  }

  const links = []
  for (const edge of graph.edges || []) {
    const source = nodeIndex.get(edge.source)
    const target = nodeIndex.get(edge.target)
    if (source == null || target == null) continue
    links.push({
      source,
      target,
      value: Number(edge.weight || 1),
    })
  }
  return { nodes, links }
}

export function KnowledgeGraph() {
  const { identity } = useDiscovered()
  const toast = useToast()
  const [graph, setGraph] = useState({ nodes: [], edges: [] })
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

  const sankeyData = useMemo(() => buildSankeyData(graph), [graph])

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

        <form onSubmit={handleAddRelation} className="mb-4 grid gap-2 rounded-xl border border-slate-800 bg-slate-900/80 p-3 md:grid-cols-4">
          <input
            value={sourceTerm}
            onChange={(e) => setSourceTerm(e.target.value)}
            placeholder="Source term"
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          />
          <input
            value={targetTerm}
            onChange={(e) => setTargetTerm(e.target.value)}
            placeholder="Target term"
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          />
          <select
            value={relationType}
            onChange={(e) => setRelationType(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          >
            <option value="related">related</option>
            <option value="similar">similar</option>
            <option value="derived">derived</option>
            <option value="grammar-link">grammar-link</option>
          </select>
          <button
            type="submit"
            className="rounded-lg bg-gradient-to-r from-blue-500 to-violet-500 px-3 py-2 text-sm font-semibold text-white"
          >
            Add Relation
          </button>
        </form>

        {loading ? <LoadingState title="Building graph..." subtitle="Linking your discovered terms." /> : null}
        {!loading && error ? <EmptyState title="Knowledge graph unavailable" message={error} /> : null}
        {!loading && !error && !sankeyData.links.length ? (
          <EmptyState title="No graph links yet" message="Save more items or add term relations to start visualizing your knowledge graph." />
        ) : null}

        {!loading && !error && sankeyData.links.length ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
            <div className="h-[460px]">
              <ResponsiveContainer width="100%" height="100%">
                <Sankey data={sankeyData} nodePadding={18} margin={{ left: 12, right: 12, top: 12, bottom: 12 }}>
                  <Tooltip />
                </Sankey>
              </ResponsiveContainer>
            </div>
          </div>
        ) : null}
      </motion.div>
    </div>
  )
}
