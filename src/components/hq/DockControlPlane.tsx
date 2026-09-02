import { useCallback, useEffect, useState } from 'react'
import {
  loadDockControlPlane,
  type DockCommissioningView,
  type DockHandoffView,
  type DockMachineView,
} from '../../lib/dockControlPlane'

type State =
  | { kind: 'loading' }
  | { kind: 'unavailable'; error: string }
  | {
      kind: 'ready'
      machines: DockMachineView[]
      handoffs: DockHandoffView[]
      tests: DockCommissioningView[]
    }

function statusClass(status: string): string {
  if (status === 'online' || status === 'PASS') return 'text-toxic-300'
  if (status === 'busy' || status === 'NOT_YET_CONNECTED' || status === 'BLOCKED') return 'text-amber-300'
  if (status === 'error' || status === 'FAIL') return 'text-blood-300'
  return 'text-ink-400'
}

function shortTime(value: string | null): string {
  if (!value) return 'never'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

export default function DockControlPlane() {
  const [state, setState] = useState<State>({ kind: 'loading' })

  const load = useCallback(async () => {
    setState({ kind: 'loading' })
    try {
      const data = await loadDockControlPlane()
      setState({ kind: 'ready', ...data })
    } catch (error) {
      setState({
        kind: 'unavailable',
        error: error instanceof Error ? error.message : 'Live Dock evidence could not be read.',
      })
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  if (state.kind === 'loading') {
    return (
      <div className="card p-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-500">
          Loading verified Dock control-plane evidence…
        </p>
      </div>
    )
  }

  if (state.kind === 'unavailable') {
    return (
      <div className="card border-blood-700/50 p-6">
        <p className="text-sm text-blood-300">Live Dock evidence unavailable.</p>
        <p className="mt-2 break-words text-xs text-ink-500">{state.error}</p>
        <button onClick={() => void load()} className="btn-secondary mt-5">
          Retry live evidence
        </button>
      </div>
    )
  }

  const online = state.machines.filter((machine) => machine.status === 'online').length
  const passingTests = state.tests.filter((test) => test.result === 'PASS').length

  return (
    <div className="space-y-10">
      <div>
        <p className="section-eyebrow">
          <span className="h-px w-8 bg-blood-700" /> Moonshadow Dock
        </p>
        <h1 className="section-title">
          Live control-plane
          <span className="italic text-blood-500"> evidence.</span>
        </h1>
        <p className="mt-4 max-w-2xl text-ink-300">
          Read-only commissioning view of the adopted Dock schema. Registration, health writes,
          and retries remain backend-controlled until their authenticated contracts are commissioned.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Registered machines" value={state.machines.length} />
        <Stat label="Online machines" value={online} />
        <Stat label="Passing tests" value={passingTests} />
      </div>

      <section>
        <h2 className="mb-4 font-display text-xl font-semibold text-ink-100">Machines</h2>
        {state.machines.length === 0 ? (
          <TruthfulEmpty label="No machine rows are present in the verified live registry." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {state.machines.map((machine) => (
              <div key={machine.id} className="card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-ink-100">{machine.name}</h3>
                    <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.18em] text-ink-500">
                      {machine.machineType}
                    </p>
                  </div>
                  <span className={`font-mono text-[10px] uppercase tracking-[0.15em] ${statusClass(machine.status)}`}>
                    {machine.status}
                  </span>
                </div>
                <p className="mt-3 text-xs text-ink-400">
                  Health: {machine.healthStatus}
                  {machine.healthLatencyMs !== null ? ` · ${machine.healthLatencyMs}ms` : ''}
                </p>
                <p className="mt-1 text-xs text-ink-500">Heartbeat: {shortTime(machine.lastHeartbeat)}</p>
                {machine.capabilities.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {machine.capabilities.map((capability) => (
                      <span key={capability} className="rounded bg-ink-800/60 px-2 py-1 font-mono text-[9px] text-ink-300">
                        {capability}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 font-display text-xl font-semibold text-ink-100">Recent handoffs</h2>
        {state.handoffs.length === 0 ? (
          <TruthfulEmpty label="No handoff rows are present in the verified live ledger." />
        ) : (
          <div className="space-y-2">
            {state.handoffs.map((handoff) => (
              <div key={handoff.id} className="card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-ink-200">
                    {handoff.fromActor} → {handoff.toActor}
                  </p>
                  <span className="font-mono text-[9px] text-ink-500">{shortTime(handoff.createdAt)}</span>
                </div>
                {handoff.note && <p className="mt-2 text-xs text-ink-400">{handoff.note}</p>}
                {handoff.jobId && <p className="mt-2 font-mono text-[9px] text-ink-600">Job {handoff.jobId}</p>}
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 font-display text-xl font-semibold text-ink-100">Commissioning evidence</h2>
        {state.tests.length === 0 ? (
          <TruthfulEmpty label="No commissioning-test rows are present in the verified live ledger." />
        ) : (
          <div className="space-y-2">
            {state.tests.map((test) => (
              <div key={test.id} className="card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-ink-100">{test.testName}</p>
                    <p className="mt-1 text-xs text-ink-500">
                      {test.targetType}{test.targetId ? ` · ${test.targetId}` : ''} · run by {test.runBy}
                    </p>
                  </div>
                  <span className={`font-mono text-[10px] font-semibold ${statusClass(test.result)}`}>
                    {test.result}
                  </span>
                </div>
                <p className="mt-2 text-xs text-ink-500">
                  {shortTime(test.runAt)} · evidence records {test.evidence.length}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-500">{label}</p>
      <p className="mt-2 font-display text-2xl font-bold text-ink-100">{value}</p>
    </div>
  )
}

function TruthfulEmpty({ label }: { label: string }) {
  return (
    <div className="card p-6 text-sm text-ink-400">
      {label}
    </div>
  )
}
