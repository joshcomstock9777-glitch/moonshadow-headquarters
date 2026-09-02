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

type DockControlPlaneResponse = {
  machines?: DockMachineView[]
  handoffs?: DockHandoffView[]
  tests?: DockCommissioningView[]
  error?: string
}

export async function loadDockControlPlane() {
  const { data, error } = await supabase.functions.invoke<DockControlPlaneResponse>('read-dock-control-plane')

  if (error) {
    throw new Error(`Live Dock evidence unavailable: ${error.message}`)
  }
  if (!data || data.error) {
    throw new Error(data?.error || 'Live Dock evidence unavailable')
  }
  if (!Array.isArray(data.machines) || !Array.isArray(data.handoffs) || !Array.isArray(data.tests)) {
    throw new Error('Live Dock evidence returned an invalid response shape')
  }

  return {
    machines: data.machines,
    handoffs: data.handoffs,
    tests: data.tests,
  }
}
