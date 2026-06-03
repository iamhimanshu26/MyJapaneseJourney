import { appendTimelineEvent, ensureUserProfile, query } from '../server/lib/db.js'
import { getAuthContext, ensureAuthUserId } from '../server/lib/auth.js'
import { checkRateLimit, generateJson } from '../server/lib/gemini.js'
import { handleOptions, methodNotAllowed, parseJsonBody, setCors } from '../server/lib/http.js'

function pct(part, total) {
  if (!total) return 0
  return Math.round((part / total) * 100)
}

async function resolveRole(authUserId) {
  if (!authUserId || authUserId.startsWith('guest:')) return 'guest'
  const roleResult = await query('select role from auth_users where id = $1 limit 1', [authUserId])
  return roleResult.rows[0]?.role || 'student'
}

async function buildSnapshot(userId) {
  const summary = await query(
    `select
      count(*)::int as total_items,
      count(*) filter (where type in ('vocabulary', 'phrase'))::int as vocab_total,
      count(*) filter (where type = 'grammar')::int as grammar_total,
      count(*) filter (where type = 'kanji')::int as kanji_total,
      count(*) filter (where status = 'mastered')::int as mastered_total,
      count(*) filter (where status in ('learning','mastered'))::int as reviewed_total,
      count(*) filter (where type in ('vocabulary', 'phrase') and status = 'mastered')::int as vocab_mastered,
      count(*) filter (where type = 'grammar' and status = 'mastered')::int as grammar_mastered,
      count(*) filter (where type = 'kanji' and status = 'mastered')::int as kanji_mastered,
      count(*) filter (where status = 'weak')::int as weak_count
     from discovered_items
     where user_id = $1`,
    [userId]
  )
  return summary.rows[0] || {}
}

function buildDemoWorkspace(profile, role) {
  return {
    profile,
    role,
    demoWorkspace: true,
    demoBanner: 'Using Demo Workspace – Sign In To Save Progress',
    hero: {
      currentLevel: profile?.current_level || 'N5',
      targetExam: profile?.target_exam || 'JLPT',
      targetLevel: profile?.target_level || 'N3',
      readinessScore: 68,
      studyStreak: 8,
      dailyGoalMinutes: Number(profile?.daily_goal_minutes || 25),
    },
    metrics: {
      vocabularyMastery: 66,
      grammarMastery: 52,
      kanjiProgress: 49,
      readingReadiness: 61,
      interviewReadiness: 58,
      estimatedN3Readiness: 68,
      learningReadinessScore: 68,
      aiLookups: 14,
      totalVocabulary: 124,
      totalGrammar: 42,
      totalKanji: 38,
    },
    weakAreas: ['Passive form usage consistency', 'Business expression precision', 'Long sentence parsing speed'],
    recommendations: [
      { label: 'Review 12 weak vocabulary words', action: '/review-mode' },
      { label: 'Practice 3 grammar points (passive + causative)', action: '/grammar' },
      { label: 'Complete 1 Dokkai exercise', action: '/dokkai-analyzer' },
    ],
    recentActivity: [
      { activity_type: 'review', count: 9 },
      { activity_type: 'ai_lookup', count: 6 },
      { activity_type: 'dokkai_analysis', count: 3 },
    ],
    activityFeed: [
      { title: 'Reviewed 15 words', description: 'Strengthened retention with spaced repetition.', occurred_at: new Date().toISOString() },
      { title: 'Completed Dokkai Analysis', description: 'Improved reading comprehension accuracy.', occurred_at: new Date(Date.now() - 86_400_000).toISOString() },
      { title: 'Practiced Interview Questions', description: 'Raised business Japanese confidence.', occurred_at: new Date(Date.now() - 2 * 86_400_000).toISOString() },
    ],
    learningPatternAnalysis: {
      mostActiveWindow: 'Evening',
      consistencyScore: 72,
      weakPattern: 'Grammar precision drops during long responses',
      strongestPattern: 'Vocabulary retention is improving steadily',
    },
    studyEfficiencyMetrics: {
      averageSessionMinutes: 24,
      itemsReviewedPerSession: 13,
      retentionRate: 74,
      completionRate: 78,
    },
  }
}

async function buildStudyPlan(userId, role, payload) {
  const weakItems = Number(payload?.weakItems || 0)
  const grammarGap = Math.max(3, Math.ceil((100 - Number(payload?.grammarMastery || 0)) / 18))
  const reviewCount = Math.max(6, Math.min(20, weakItems || 12))
  const estimate = Math.max(15, Math.min(50, 10 + reviewCount + grammarGap * 2))
  const planPayload = {
    review: [`${reviewCount} weak vocabulary words`],
    learn: [`${grammarGap} grammar points`],
    practice: [role === 'employee' || role === 'admin' ? '1 interview practice run' : '1 Dokkai exercise'],
    quickFocus: payload?.recommendations?.slice(0, 3) || [],
    readinessScore: Number(payload?.learningReadinessScore || payload?.readinessScore || 0),
  }

  const persisted = await query(
    `insert into study_plans (user_id, plan_date, status, estimated_minutes, plan_payload, generated_by, updated_at)
     values ($1, current_date, 'pending', $2, $3::jsonb, 'ai', now())
     on conflict (user_id, plan_date)
     do update set estimated_minutes = excluded.estimated_minutes,
                   plan_payload = excluded.plan_payload,
                   status = 'pending',
                   generated_by = excluded.generated_by,
                   updated_at = now()
     returning *`,
    [userId, estimate, JSON.stringify(planPayload)]
  )

  return {
    id: persisted.rows[0]?.id,
    status: persisted.rows[0]?.status || 'pending',
    estimatedMinutes: estimate,
    ...planPayload,
  }
}

async function getLatestPlan(userId) {
  const result = await query(
    `select *
     from study_plans
     where user_id = $1
     order by plan_date desc
     limit 1`,
    [userId]
  )
  return result.rows[0] || null
}

async function buildLearningIntelligence(userId, profile, role) {
  const [summary, lookups, activities, streak, studyPlan, timeline] = await Promise.all([
    buildSnapshot(userId),
    query(
      `select count(*)::int as lookup_count
       from ai_lookups
       where user_id = $1`,
      [userId]
    ),
    query(
      `select activity_type, count(*)::int as count
       from learning_activity
       where user_id = $1
         and created_at >= now() - interval '14 day'
       group by activity_type`,
      [userId]
    ),
    query(
      `select count(*)::int as streak
       from (
        select distinct date(created_at) as day
        from learning_activity
        where user_id = $1
          and created_at >= now() - interval '30 day'
       ) recent_days`,
      [userId]
    ),
    query(
      `select id, status, estimated_minutes, plan_payload, plan_date
       from study_plans
       where user_id = $1
       order by plan_date desc
       limit 1`,
      [userId]
    ),
    buildTimeline(userId, 10),
  ])

  const s = summary || {}
  const isDemo = Number(s.total_items || 0) === 0 && Number(lookups.rows[0]?.lookup_count || 0) === 0
  if (isDemo) {
    const demoPayload = buildDemoWorkspace(profile, role)
    demoPayload.studyPlan = await buildStudyPlan(userId, role, demoPayload.metrics)
    return demoPayload
  }

  const vocabMastery = pct(s.vocab_mastered || 0, s.vocab_total || 0)
  const grammarMastery = pct(s.grammar_mastered || 0, s.grammar_total || 0)
  const kanjiProgress = pct(s.kanji_mastered || 0, s.kanji_total || 0)
  const readingReadiness = Math.round((vocabMastery * 0.4) + (grammarMastery * 0.4) + (kanjiProgress * 0.2))
  const interviewReadiness = Math.min(100, Math.round((grammarMastery * 0.35) + (vocabMastery * 0.25) + ((lookups.rows[0]?.lookup_count || 0) * 2)))
  const n3Readiness = Math.round((readingReadiness * 0.55) + (interviewReadiness * 0.2) + (grammarMastery * 0.25))
  const learningReadinessScore = Math.round((n3Readiness * 0.7) + (Math.min(100, (s.reviewed_total || 0) * 4) * 0.3))

  const weakAreas = []
  if (vocabMastery < 55) weakAreas.push('Vocabulary retention below target')
  if (grammarMastery < 55) weakAreas.push('Grammar consistency needs reinforcement')
  if (kanjiProgress < 40) weakAreas.push('Kanji recall is lagging')
  if ((s.weak_count || 0) > 12) weakAreas.push('High weak-item backlog')
  if (weakAreas.length === 0) weakAreas.push('No critical weak area detected')

  const recommendations = [
    { label: 'Review 10 N3 grammar points', action: '/review-mode' },
    { label: 'Practice 15 weak vocabulary words', action: '/discovered?status=weak' },
    { label: 'Complete one reading passage', action: '/dokkai-analyzer' },
    { label: 'Recheck recently discovered words', action: '/discovered?sort=recent' },
  ]
  if (role === 'employee' || role === 'admin') {
    recommendations.push({ label: 'Practice business Japanese self-introduction', action: '/interview-coach' })
  } else {
    recommendations.push({ label: 'Use Dokkai Analyzer to extract and save 3 study items', action: '/dokkai-analyzer' })
  }

  const retentionRate = Math.max(20, Math.min(100, Math.round((vocabMastery * 0.45) + (grammarMastery * 0.35) + (kanjiProgress * 0.2))))
  const studyPlanRow = studyPlan.rows[0]
  const studyPlan = studyPlanRow
    ? {
        id: studyPlanRow.id,
        status: studyPlanRow.status,
        estimatedMinutes: studyPlanRow.estimated_minutes,
        ...studyPlanRow.plan_payload,
      }
    : await buildStudyPlan(userId, role, {
        weakItems: s.weak_count,
        grammarMastery,
        recommendations: recommendations.map((x) => x.label),
        learningReadinessScore,
      })

  return {
    profile,
    demoWorkspace: false,
    hero: {
      currentLevel: profile?.current_level || 'N5',
      targetExam: profile?.target_exam || 'JLPT',
      targetLevel: profile?.target_level || 'N3',
      readinessScore: learningReadinessScore,
      studyStreak: Number(streak.rows[0]?.streak || 0),
      dailyGoalMinutes: Number(profile?.daily_goal_minutes || 25),
    },
    metrics: {
      vocabularyMastery: vocabMastery,
      grammarMastery,
      kanjiProgress,
      readingReadiness,
      interviewReadiness,
      estimatedN3Readiness: n3Readiness,
      learningReadinessScore,
      aiLookups: lookups.rows[0]?.lookup_count || 0,
      totalVocabulary: Number(s.vocab_total || 0),
      totalGrammar: Number(s.grammar_total || 0),
      totalKanji: Number(s.kanji_total || 0),
    },
    weakAreas,
    recommendations,
    studyPlan,
    role,
    recentActivity: activities.rows,
    activityFeed: Array.isArray(timeline) ? timeline : [],
    learningPatternAnalysis: {
      mostActiveWindow: Number(activities.rows.find((row) => row.activity_type === 'review')?.count || 0) >= 5 ? 'Review-driven sessions' : 'Mixed sessions',
      consistencyScore: Math.min(100, Number(streak.rows[0]?.streak || 0) * 8),
      weakPattern: weakAreas[0],
      strongestPattern: vocabMastery >= grammarMastery ? 'Vocabulary momentum is stronger' : 'Grammar confidence is stabilizing',
    },
    studyEfficiencyMetrics: {
      averageSessionMinutes: Number(profile?.daily_goal_minutes || 25),
      itemsReviewedPerSession: Math.max(4, Math.round((s.reviewed_total || 0) / Math.max(1, Number(streak.rows[0]?.streak || 1)))),
      retentionRate,
      completionRate: Math.min(100, Math.round((Number(s.reviewed_total || 0) / Math.max(1, Number(s.total_items || 1))) * 100)),
    },
  }
}

async function buildLearningPlan(userId, profile, role, options = {}) {
  const { regenerate = false } = options
  const [counts, weeklyReview, weeklyLookup, planRow] = await Promise.all([
    query(
      `select
        count(*) filter (where status = 'weak')::int as weak_items,
        count(*) filter (where status = 'learning')::int as learning_items,
        count(*) filter (where status = 'mastered')::int as mastered_items,
        count(*) filter (where type in ('vocabulary', 'phrase'))::int as vocab_items,
        count(*) filter (where type = 'grammar')::int as grammar_items,
        count(*) filter (where type = 'kanji')::int as kanji_items
       from discovered_items
       where user_id = $1`,
      [userId]
    ),
    query(
      `select count(*)::int as total
       from review_sessions
       where user_id = $1 and created_at >= now() - interval '7 day'`,
      [userId]
    ),
    query(
      `select count(*)::int as total
       from ai_lookups
       where user_id = $1 and created_at >= now() - interval '7 day'`,
      [userId]
    ),
    getLatestPlan(userId),
  ])

  const snapshot = counts.rows[0] || {}
  const weeklyReviewCount = weeklyReview.rows[0]?.total || 0
  const weeklyLookupCount = weeklyLookup.rows[0]?.total || 0

  const nextActions = []
  const weakItems = Number(snapshot.weak_items || 0)
  const learningItems = Number(snapshot.learning_items || 0)
  const vocabItems = Number(snapshot.vocab_items || 0)
  const grammarItems = Number(snapshot.grammar_items || 0)
  const kanjiItems = Number(snapshot.kanji_items || 0)

  nextActions.push({
    title: 'Weak-item recovery sprint',
    description: weakItems > 0
      ? `Review ${Math.min(weakItems, 12)} weak items with spaced repetition.`
      : 'No weak backlog right now. Keep consistency with quick daily reviews.',
    priority: weakItems > 8 ? 'high' : weakItems > 0 ? 'medium' : 'low',
  })
  nextActions.push({
    title: 'Vocabulary growth block',
    description: `Discover + review ${Math.max(8, Math.ceil(vocabItems * 0.15))} vocabulary terms this week.`,
    priority: 'medium',
  })
  nextActions.push({
    title: 'Grammar consolidation',
    description: `Practice ${Math.max(5, Math.ceil(grammarItems * 0.2))} grammar points with example sentences.`,
    priority: learningItems > 10 ? 'high' : 'medium',
  })

  if (role === 'employee' || role === 'admin') {
    nextActions.push({
      title: 'Business Japanese drill',
      description: 'Complete one interview-coach simulation and refine polite/professional phrasing.',
      priority: 'medium',
    })
  } else {
    nextActions.push({
      title: 'Reading readiness',
      description: 'Run one Dokkai Analyzer session and save at least 3 extracted items.',
      priority: 'medium',
    })
  }

  const weeklyTargets = [
    { label: 'Review sessions', current: weeklyReviewCount, target: 18 },
    { label: 'AI lookups', current: weeklyLookupCount, target: 12 },
    { label: 'Kanji touchpoints', current: kanjiItems, target: Math.max(10, kanjiItems + 5) },
  ]

  const isTodayPlan = planRow ? String(planRow.plan_date) === new Date().toISOString().slice(0, 10) : false
  const generatedPlan = regenerate || !planRow || !isTodayPlan
    ? await buildStudyPlan(userId, role, {
        weakItems,
        grammarMastery: Math.round((Math.max(1, grammarItems - weakItems) / Math.max(1, grammarItems)) * 100),
        recommendations: nextActions.map((action) => action.title),
        readinessScore: Math.round((Math.max(1, grammarItems - weakItems) / Math.max(1, grammarItems)) * 100),
      })
    : null

  return {
    profile,
    role,
    snapshot: {
      weakItems,
      learningItems,
      masteredItems: Number(snapshot.mastered_items || 0),
      vocabItems,
      grammarItems,
      kanjiItems,
    },
    weeklyTargets,
    nextActions,
    persistedPlan: generatedPlan || (planRow
      ? {
          id: planRow.id,
          status: planRow.status,
          estimatedMinutes: planRow.estimated_minutes,
          ...planRow.plan_payload,
        }
      : null),
  }
}

async function buildTimeline(userId, limit = 30) {
  const safeLimit = Math.max(5, Math.min(100, Number(limit) || 30))
  const timeline = await query(
    `select id, activity_type, title, description, metadata, occurred_at
     from activity_timeline
     where user_id = $1
     order by occurred_at desc
     limit $2`,
    [userId, safeLimit]
  )
  if (timeline.rows.length) return timeline.rows
  const fallback = await query(
    `select id, activity_type, metadata, created_at
     from learning_activity
     where user_id = $1
     order by created_at desc
     limit $2`,
    [userId, safeLimit]
  )
  return fallback.rows.map((row) => ({
    id: row.id,
    activity_type: row.activity_type,
    title: `Activity: ${row.activity_type}`,
    description: 'Historical activity imported from learning logs.',
    metadata: row.metadata || {},
    occurred_at: row.created_at,
  }))
}

async function buildKnowledgeGraph(userId) {
  const [discovered, relations] = await Promise.all([
    query(
      `select word, reading, type, cluster_category
       from discovered_items
       where user_id = $1
       order by created_at desc
       limit 180`,
      [userId]
    ),
    query(
      `select source_term, target_term, relation_type, weight
       from knowledge_graph_relations
       where user_id = $1
       order by created_at desc
       limit 300`,
      [userId]
    ),
  ])

  const nodesMap = new Map()
  for (const item of discovered.rows) {
    if (!item.word) continue
    nodesMap.set(item.word, {
      id: item.word,
      label: item.word,
      group: item.cluster_category || item.type || 'general',
      reading: item.reading || '',
      type: item.type || 'vocabulary',
    })
  }
  const edges = []
  for (const relation of relations.rows) {
    if (!nodesMap.has(relation.source_term)) {
      nodesMap.set(relation.source_term, { id: relation.source_term, label: relation.source_term, group: 'related', reading: '', type: 'unknown' })
    }
    if (!nodesMap.has(relation.target_term)) {
      nodesMap.set(relation.target_term, { id: relation.target_term, label: relation.target_term, group: 'related', reading: '', type: 'unknown' })
    }
    edges.push({
      source: relation.source_term,
      target: relation.target_term,
      relationType: relation.relation_type,
      weight: Number(relation.weight || 1),
    })
  }
  return {
    nodes: [...nodesMap.values()],
    edges,
  }
}

function buildFallbackCopilot({ question, role, profile, intelligence }) {
  const focus = intelligence?.weakAreas?.slice(0, 3) || ['Grammar consistency', 'Reading speed', 'Weak vocabulary recall']
  return {
    fallback_used: true,
    answer: `Based on your current profile (${profile?.current_level || 'N5'} to ${profile?.target_level || 'N3'}), focus this week on ${focus.join(', ')}.`,
    recommendations: [
      { title: 'Run Review Mode', detail: 'Clear weak backlog with 10-15 cards.', action: '/review-mode' },
      { title: role === 'employee' ? 'Practice Interview Coach' : 'Practice Dokkai Analyzer', detail: 'Do one focused practice session today.', action: role === 'employee' ? '/interview-coach' : '/dokkai-analyzer' },
      { title: 'Use AI Lookup', detail: 'Capture and save 5 new words.', action: '/lookup' },
    ],
    confidence: 0.62,
  }
}

async function handleCopilot(req, res, profile, role, body) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.headers['x-real-ip'] || 'unknown'
  if (!checkRateLimit(ip, 'kotoba-sensei', 18)) {
    return res.status(429).json({ error: 'Too many copilot requests. Please try again soon.' })
  }

  const question = String(body.question || '').trim().slice(0, 600)
  if (!question) return res.status(400).json({ error: 'question is required' })

  const intelligence = await buildLearningIntelligence(profile.id, profile, role)
  const systemPrompt = `You are Kotoba Sensei, an AI learning copilot for JLPT/NAT learners.
Return strict JSON:
{
  "answer": "...",
  "recommendations": [{"title":"", "detail":"", "action":"/route"}],
  "confidence": 0.0
}
Rules:
- Use the learner context provided.
- Be practical and concise.
- Keep recommendations actionable and tied to existing routes.
- JSON only.`
  const prompt = JSON.stringify({
    question,
    profile: {
      currentLevel: profile.current_level,
      targetExam: profile.target_exam,
      targetLevel: profile.target_level,
      dailyGoalMinutes: profile.daily_goal_minutes,
      role,
    },
    metrics: intelligence.metrics,
    weakAreas: intelligence.weakAreas,
    recommendations: intelligence.recommendations,
  })

  let response
  try {
    response = await generateJson({
      systemPrompt,
      prompt,
      maxOutputTokens: 1800,
      temperature: 0.3,
    })
  } catch {
    response = buildFallbackCopilot({ question, role, profile, intelligence })
  }

  const normalized = {
    answer: String(response.answer || '').trim() || buildFallbackCopilot({ question, role, profile, intelligence }).answer,
    recommendations: Array.isArray(response.recommendations)
      ? response.recommendations.slice(0, 5).map((item) => ({
          title: String(item.title || '').trim() || 'Recommended next step',
          detail: String(item.detail || '').trim() || '',
          action: String(item.action || '/').trim() || '/',
        }))
      : buildFallbackCopilot({ question, role, profile, intelligence }).recommendations,
    confidence: Number.isFinite(Number(response.confidence)) ? Math.max(0, Math.min(1, Number(response.confidence))) : 0.6,
    fallback_used: Boolean(response.fallback_used),
  }

  await appendTimelineEvent({
    userId: profile.id,
    activityType: 'copilot',
    title: 'Consulted Kotoba Sensei',
    description: question,
    metadata: { recommendations: normalized.recommendations.length, confidence: normalized.confidence },
  })

  return res.status(200).json(normalized)
}

export default async function handler(req, res) {
  if (handleOptions(req, res, 'GET, POST, OPTIONS')) return
  setCors(res, 'GET, POST, OPTIONS')
  if (!['GET', 'POST'].includes(req.method)) return methodNotAllowed(req, res, ['GET', 'POST', 'OPTIONS'])

  let body = {}
  if (req.method !== 'GET') {
    try {
      body = parseJsonBody(req)
    } catch {
      return res.status(400).json({ error: 'Invalid JSON body' })
    }
  }

  const auth = getAuthContext(req, body)
  if (!ensureAuthUserId(auth, res)) return

  try {
    const profile = await ensureUserProfile(auth)
    const role = await resolveRole(auth.authUserId)

    if (req.method === 'POST') {
      const action = String(body.action || '').toLowerCase()
      if (action === 'copilot') return await handleCopilot(req, res, profile, role, body)
      if (action === 'plan-complete') {
        const planId = String(body.planId || '').trim()
        if (!planId) return res.status(400).json({ error: 'planId is required' })
        const result = await query(
          `update study_plans
           set status = 'completed', updated_at = now()
           where id = $1 and user_id = $2
           returning *`,
          [planId, profile.id]
        )
        if (!result.rows[0]) return res.status(404).json({ error: 'Study plan not found' })
        await appendTimelineEvent({
          userId: profile.id,
          activityType: 'study_plan_completed',
          title: 'Completed today\'s study plan',
          description: `Finished estimated ${result.rows[0].estimated_minutes} minute plan.`,
          metadata: { planId },
        })
        return res.status(200).json({ success: true, plan: result.rows[0] })
      }
      if (action === 'knowledge-relation') {
        const sourceTerm = String(body.source_term || body.sourceTerm || '').trim()
        const targetTerm = String(body.target_term || body.targetTerm || '').trim()
        const relationType = String(body.relation_type || body.relationType || 'related').trim().toLowerCase()
        const weight = Number.isFinite(Number(body.weight)) ? Math.max(0.1, Math.min(10, Number(body.weight))) : 1
        if (!sourceTerm || !targetTerm) return res.status(400).json({ error: 'source_term and target_term are required' })
        const result = await query(
          `insert into knowledge_graph_relations (user_id, source_term, target_term, relation_type, weight, created_at)
           values ($1, $2, $3, $4, $5, now())
           on conflict (user_id, source_term, target_term, relation_type)
           do update set weight = excluded.weight
           returning *`,
          [profile.id, sourceTerm, targetTerm, relationType, weight]
        )
        return res.status(200).json({ relation: result.rows[0] })
      }
      if (action === 'demo-reset') {
        await query('delete from knowledge_graph_relations where user_id = $1', [profile.id])
        await query('delete from study_plans where user_id = $1', [profile.id])
        await query('delete from activity_timeline where user_id = $1', [profile.id])
        await query('delete from review_sessions where user_id = $1', [profile.id])
        await query('delete from ai_lookups where user_id = $1', [profile.id])
        await query('delete from dokkai_analyses where user_id = $1', [profile.id])
        await query('delete from interview_practice where user_id = $1', [profile.id])
        await query('delete from learning_activity where user_id = $1', [profile.id])
        await query('delete from discovered_items where user_id = $1', [profile.id])
        await appendTimelineEvent({
          userId: profile.id,
          activityType: 'demo_reset',
          title: 'Workspace reset',
          description: 'Learning workspace reset to demo mode.',
          metadata: {},
        })
        return res.status(200).json({ success: true })
      }
      return res.status(400).json({ error: 'Unsupported intelligence action' })
    }

    const view = String(req.query?.view || '').toLowerCase()
    if (view === 'plan') {
      const regenerate = String(req.query?.regenerate || '').toLowerCase() === '1'
      return res.status(200).json(await buildLearningPlan(profile.id, profile, role, { regenerate }))
    }
    if (view === 'timeline') {
      const items = await buildTimeline(profile.id, req.query?.limit)
      return res.status(200).json({ items })
    }
    if (view === 'knowledge-graph') {
      const graph = await buildKnowledgeGraph(profile.id)
      return res.status(200).json(graph)
    }
    return res.status(200).json(await buildLearningIntelligence(profile.id, profile, role))
  } catch (error) {
    console.error('intelligence error', error)
    return res.status(500).json({ error: 'Failed to fetch intelligence data' })
  }
}
