import { supabase } from './supabase'

export type DockMachineView = {
  id: string
  name: string
  machineType: string
  status: string
  capabilities: string[]
  lastHeartbeat: string | null
  healthStatus: string
  healthLatencyMs: number | null
  updatedAt: string
}

export type DockHandoffView = {
  id: string
  jobId: string | null
  fromActor: string
  toActor: string
  note: string | null
  createdAt: string
}

export type DockCommissioningView = {
  id: string
  testName: string
  targetType: string
  targetId: string | null
  result: string
  runBy: string
  runAt: string
  detail: Record<string, unknown>
  evidence: Record<string, unknown>[]
}

type JsonRecord = Record<string, unknown>

function record(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonRecord) : {}
}

function stringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string')
  const object = record(value)
  return Object.entries(object)
    .filter(([, enabled]) => enabled === true || typeof enabled === 'string' || typeof enabled === 'number')
    .map(([name]) => name)
}

function text(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

export async function loadDockControlPlane() {
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
    throw new Error(failures.join(' · '))
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

  const machines: DockMachineView[] = (machinesResult.data ?? []).map((raw) => {
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

  const handoffs: DockHandoffView[] = (handoffsResult.data ?? []).map((raw) => {
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

  const tests: DockCommissioningView[] = (testsResult.data ?? []).map((raw) => {
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

  return { machines, handoffs, tests }
}
