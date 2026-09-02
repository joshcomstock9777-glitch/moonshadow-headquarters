import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { getAdapter } from '../../lib/dockAdapters'
import type { DockHandoff, DockMachine } from '../../lib/dockTypes'

const RETRYABLE_STATUSES = new Set(['failed'])

function handoffPayload(handoff: DockHandoff) {
  return {
    correlation_id: handoff.correlation_id,
    job_id: handoff.job_id,
    project_id: handoff.project_id,
    requested_action: handoff.requested_action,
    creator_instructions: handoff.creator_instructions,
    payload: handoff.payload,
    asset_refs: handoff.asset_refs,
    source_machine_id: handoff.source_machine_id,
    destination_machine_id: handoff.destination_machine_id,
    expected_output: handoff.expected_output,
    approval_state: handoff.approval_state,
    approval_id: handoff.approval_id,
    provenance: handoff.provenance,
  }
}

export default function DockHandoffRetryPanel() {
  const [handoffs, setHandoffs] = useState<DockHandoff[]>([])
  const [machines, setMachines] = useState<DockMachine[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [retryingId, setRetryingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    const [handoffResult, machineResult] = await Promise.all([
      supabase.from('dock_handoffs').select('*').eq('status', 'failed').order('updated_at', { ascending: false }).limit(10),
      supabase.from('dock_machines').select('*'),
    ])

    if (handoffResult.error || machineResult.error) {
      setHandoffs([])
      setMachines([])
      setLoadError(handoffResult.error?.message || machineResult.error?.message || 'Could not read live retry evidence.')
    } else {
      setHandoffs((handoffResult.data ?? []) as DockHandoff[])
      setMachines((machineResult.data ?? []) as DockMachine[])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const machineById = useMemo(() => new Map(machines.map((machine) => [machine.id, machine])), [machines])

  async function retry(handoff: DockHandoff) {
    setActionError('')
    if (!RETRYABLE_STATUSES.has(handoff.status)) {
      setActionError('Only failed handoffs can be retried from this control.')
      return
    }

    const destination = handoff.destination_machine_id ? machineById.get(handoff.destination_machine_id) : undefined
    if (!destination) {
      setActionError('Retry blocked: destination machine is not present in the live Dock registry.')
      return
    }
    if (destination.connection_status !== 'connected' || destination.health_status !== 'healthy') {
      setActionError(`Retry blocked: ${destination.name} is not both connected and healthy.`)
      return
    }

    const adapter = getAdapter(destination.adapter_type)
    if (!adapter) {
      setActionError(`Retry blocked: adapter ${destination.adapter_type} is not supported.`)
      return
    }

    const { data: authData, error: authError } = await supabase.auth.getSession()
    if (authError || !authData.session?.access_token) {
      setActionError(authError?.message || 'Retry requires an authenticated Headquarters session.')
      return
    }

    setRetryingId(handoff.id)
    try {
      const nextRetryCount = handoff.retries + 1
      const { error: markRetryingError } = await supabase
        .from('dock_handoffs')
        .update({ status: 'retrying', retries: nextRetryCount, error: null })
        .eq('id', handoff.id)
        .eq('status', 'failed')

      if (markRetryingError) throw new Error(`Could not claim retry: ${markRetryingError.message}`)

      const result = await adapter.send(destination, handoffPayload(handoff))
      const now = new Date().toISOString()
      const updates = result.success
        ? {
            status: 'sent',
            sent_at: now,
            result: {
              httpStatus: result.httpStatus,
              responseBody: result.responseBody,
              latencyMs: result.latencyMs,
            },
            error: null,
          }
        : {
            status: 'failed',
            result: {
              httpStatus: result.httpStatus,
              responseBody: result.responseBody,
              latencyMs: result.latencyMs,
            },
            error: result.error || 'Dock adapter retry failed.',
          }

      const { error: persistError } = await supabase.from('dock_handoffs').update(updates).eq('id', handoff.id)
      if (persistError) {
        throw new Error(`Adapter returned ${result.success ? 'success' : 'failure'}, but Headquarters could not persist the retry evidence: ${persistError.message}`)
      }
      await load()
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Dock handoff retry failed.')
      await load()
    } finally {
      setRetryingId(null)
    }
  }

  if (loading) return null

  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-500">Handoff recovery</p>
          <h2 className="mt-1 font-display text-lg font-semibold text-ink-100">Failed Dock handoffs</h2>
        </div>
        <button onClick={() => void load()} className="btn-ghost">Refresh</button>
      </div>

      {loadError ? (
        <div className="mt-4 rounded-lg border border-blood-700/60 bg-blood-900/20 p-4" role="alert">
          <p className="text-sm text-blood-300">Retry evidence unavailable. No retry action is enabled.</p>
          <p className="mt-2 break-words text-xs text-ink-500">{loadError}</p>
        </div>
      ) : handoffs.length === 0 ? (
        <p className="mt-4 text-sm text-ink-400">No failed handoffs are currently recorded.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {handoffs.map((handoff) => {
            const destination = handoff.destination_machine_id ? machineById.get(handoff.destination_machine_id) : undefined
            const canRetry = Boolean(destination && destination.connection_status === 'connected' && destination.health_status === 'healthy')
            return (
              <div key={handoff.id} className="rounded-lg border border-ink-800 bg-ink-900/30 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink-100">{handoff.requested_action}</p>
                    <p className="mt-1 text-xs text-ink-500">
                      Destination: {destination?.name ?? handoff.destination_machine_id ?? 'missing'} · attempts {handoff.retries}
                    </p>
                    {handoff.error && <p className="mt-1 break-words text-xs text-blood-300">{handoff.error}</p>}
                  </div>
                  <button
                    onClick={() => void retry(handoff)}
                    disabled={!canRetry || retryingId === handoff.id}
                    className="btn-secondary disabled:cursor-not-allowed disabled:opacity-40"
                    title={canRetry ? 'Retry through the registered Dock adapter' : 'Destination must be connected and healthy before retry'}
                  >
                    {retryingId === handoff.id ? 'Retrying…' : 'Retry'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {actionError && (
        <div className="mt-4 rounded-lg border border-blood-700/60 bg-blood-900/20 p-3" role="alert">
          <p className="text-xs text-blood-300">{actionError}</p>
        </div>
      )}
    </section>
  )
}
