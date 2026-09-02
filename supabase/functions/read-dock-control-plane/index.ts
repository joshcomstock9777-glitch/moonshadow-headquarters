import { createClient } from 'npm:@supabase/supabase-js@2'

type HqRole = 'owner' | 'operator'
type JsonRecord = Record<string, unknown>

function requiredEnv(name: string): string {
  const value = Deno.env.get(name)?.trim()
  if (!value) throw new Error(`${name} is not configured`)
  return value
}

function bearerToken(request: Request): string | null {
  const authorization = request.headers.get('authorization')?.trim()
  if (!authorization) return null
  const match = authorization.match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() || null
}

function hqRole(value: unknown): HqRole | null {
  return value === 'owner' || value === 'operator' ? value : null
}

function record(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonRecord) : {}
}

function text(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function stringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string')
  return Object.entries(record(value))
    .filter(([, enabled]) => enabled === true || typeof enabled === 'string' || typeof enabled === 'number')
    .map(([name]) => name)
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 })
  }

  try {
    const token = bearerToken(request)
    if (!token) return Response.json({ error: 'Authentication required' }, { status: 401 })

    const supabase = createClient(requiredEnv('SUPABASE_URL'), requiredEnv('SUPABASE_SERVICE_ROLE_KEY'), {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { data: callerData, error: callerError } = await supabase.auth.getUser(token)
    const caller = callerData.user
    if (callerError || !caller) {
      return Response.json({ error: 'Invalid or expired Headquarters session' }, { status: 401 })
    }
    if (!hqRole(caller.app_metadata?.hq_role)) {
      return Response.json({ error: 'Headquarters owner/operator role required' }, { status: 403 })
    }

    const [machinesResult, handoffsResult, testsResult, evidenceResult, healthResult] = await Promise.all([
      supabase.from('machines').select('*').order('created_at', { ascending: true }),
      supabase.from('handoffs').select('*').order('created_at', { ascending: false }).limit(20),
      supabase.from('commissioning_tests').select('*').order('run_at', { ascending: false }).limit(50),
      supabase.from('evidence').select('*').eq('ref_type', 'commissioning_test').order('created_at', { ascending: false }).limit(100),
      supabase.from('machine_health').select('*').order('checked_at', { ascending: false }).limit(100),
    ])

    const failures = [
      machinesResult.error ? `machines: ${machinesResult.error.message}` : null,
      handoffsResult.error ? `handoffs: ${handoffsResult.error.message}` : null,
      testsResult.error ? `commissioning_tests: ${testsResult.error.message}` : null,
      evidenceResult.error ? `evidence: ${evidenceResult.error.message}` : null,
      healthResult.error ? `machine_health: ${healthResult.error.message}` : null,
    ].filter((failure): failure is string => failure !== null)

    if (failures.length > 0) {
      console.error('Dock control-plane read failed:', failures.join(' · '))
      return Response.json({ error: 'Live Dock evidence unavailable' }, { status: 503 })
    }

    const latestHealth = new Map<string, JsonRecord>()
    for (const raw of healthResult.data ?? []) {
      const row = record(raw)
      const machineId = text(row.machine_id)
      if (machineId && !latestHealth.has(machineId)) latestHealth.set(machineId, row)
    }

    const evidenceByTest = new Map<string, JsonRecord[]>()
    for (const raw of evidenceResult.data ?? []) {
      const row = record(raw)
      const refId = text(row.ref_id)
      if (!refId) continue
      const current = evidenceByTest.get(refId) ?? []
      current.push(record(row.detail))
      evidenceByTest.set(refId, current)
    }

    const machines = (machinesResult.data ?? []).map((raw) => {
      const row = record(raw)
      const health = latestHealth.get(text(row.id))
      return {
        id: text(row.id),
        name: text(row.name, 'Unnamed machine'),
        machineType: text(row.machine_type, 'unknown'),
        status: text(row.status, 'offline'),
        capabilities: stringList(row.capabilities),
        lastHeartbeat: typeof row.last_heartbeat === 'string' ? row.last_heartbeat : null,
        healthStatus: health ? text(health.status, 'unknown') : 'not-tested',
        healthLatencyMs: health ? numberOrNull(health.latency_ms) : null,
        updatedAt: text(row.updated_at, text(row.created_at)),
      }
    })

    const handoffs = (handoffsResult.data ?? []).map((raw) => {
      const row = record(raw)
      return {
        id: text(row.id),
        jobId: typeof row.job_id === 'string' ? row.job_id : null,
        fromActor: text(row.from_actor, 'unknown'),
        toActor: text(row.to_actor, 'unknown'),
        note: typeof row.note === 'string' ? row.note : null,
        createdAt: text(row.created_at),
      }
    })

    const tests = (testsResult.data ?? []).map((raw) => {
      const row = record(raw)
      const id = text(row.id)
      return {
        id,
        testName: text(row.test_name, 'Unnamed test'),
        targetType: text(row.target_type, 'system'),
        targetId: typeof row.target_id === 'string' ? row.target_id : null,
        result: text(row.result, 'NOT_YET_CONNECTED'),
        runBy: text(row.run_by, 'unknown'),
        runAt: text(row.run_at),
        detail: record(row.detail),
        evidence: evidenceByTest.get(id) ?? [],
      }
    })

    return Response.json({ machines, handoffs, tests })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Dock control-plane read failed'
    console.error('Dock control-plane read failed:', message)
    return Response.json({ error: 'Live Dock evidence unavailable' }, { status: 500 })
  }
})
