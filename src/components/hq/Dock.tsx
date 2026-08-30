import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { logActivity, timeAgo } from '../../lib/hq'
import type {
  DockMachine,
  DockHandoff,
  DockConnectionTest,
  DockStatus,
  AdapterType,
  AuthType,
  Capability,
  MachineManifest,
} from '../../lib/dockTypes'
import {
  DOCK_STATUS_LABELS,
  DOCK_STATUS_STYLES,
  DOCK_HEALTH_LABELS,
  ADAPTER_TYPES,
  ADAPTER_TYPE_LABELS,
  AUTH_TYPES,
  AUTH_TYPE_LABELS,
  CAPABILITIES,
  CAPABILITY_LABELS,
  HANDOFF_STATUS_LABELS,
  HANDOFF_STATUS_STYLES,
  TEST_TYPES,
  TEST_TYPE_LABELS,
} from '../../lib/dockTypes'
import {
  getAdapter,
  getAdapterDescription,
  saveTestResult,
  updateMachineHealth,
  findMachinesByCapability,
  buildManifest,
} from '../../lib/dockAdapters'

type Tab = 'overview' | 'capabilities' | 'connection' | 'tests' | 'activity' | 'config'

export default function Dock() {
  const [machines, setMachines] = useState<DockMachine[]>([])
  const [handoffs, setHandoffs] = useState<DockHandoff[]>([])
  const [tests, setTests] = useState<DockConnectionTest[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMachine, setSelectedMachine] = useState<DockMachine | null>(null)
  const [showWizard, setShowWizard] = useState(false)
  const [showCapabilityQuery, setShowCapabilityQuery] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [testing, setTesting] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [m, h, t] = await Promise.all([
      supabase.from('dock_machines').select('*').order('created_at', { ascending: true }),
      supabase.from('dock_handoffs').select('*').order('created_at', { ascending: false }).limit(20),
      supabase.from('dock_connection_tests').select('*').order('created_at', { ascending: false }).limit(50),
    ])
    setMachines(m.data ?? [])
    setHandoffs(h.data ?? [])
    setTests(t.data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function runTest(machine: DockMachine, testType: string) {
    const adapter = getAdapter(machine.adapter_type)
    if (!adapter) return
    setTesting(machine.id)
    try {
      const result = await adapter.test(machine)
      await saveTestResult(machine.id, testType, result)
      await updateMachineHealth(machine.id, result)
      void logActivity(null, null, 'Dock', `Tested ${machine.name} (${testType})`, result.success ? 'info' : 'error', result.error ?? `HTTP ${result.httpStatus}`)
      void load()
    } finally {
      setTesting(null)
    }
  }

  function openMachine(machine: DockMachine, tab: Tab = 'overview') {
    setSelectedMachine(machine)
    setActiveTab(tab)
  }

  const machineTests = selectedMachine
    ? tests.filter((t) => t.machine_id === selectedMachine.id).slice(0, 10)
    : []

  const machineHandoffs = selectedMachine
    ? handoffs.filter(
        (h) => h.source_machine_id === selectedMachine.id || h.destination_machine_id === selectedMachine.id,
      )
    : []

  if (selectedMachine) {
    return (
      <MachineDetail
        machine={selectedMachine}
        tests={machineTests}
        handoffs={machineHandoffs}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onBack={() => { setSelectedMachine(null); void load() }}
        onTest={(testType) => runTest(selectedMachine, testType)}
        testing={testing === selectedMachine.id}
      />
    )
  }

  const connected = machines.filter((m) => m.connection_status === 'connected').length
  const readyToConnect = machines.filter((m) => m.connection_status === 'ready-to-connect').length
  const needsAttention = machines.filter((m) =>
    ['needs-auth', 'auth-required', 'broken', 'unknown'].includes(m.connection_status),
  ).length

  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <p className="section-eyebrow">
          <span className="h-px w-8 bg-blood-700" /> Moonshadow Dock
        </p>
        <h1 className="section-title">
          The universal
          <span className="italic text-blood-500"> plugboard.</span>
        </h1>
        <p className="mt-4 max-w-2xl text-ink-300">
          One standard way to connect every Moonshadow machine — existing,
          recovered, and future. Register a machine, prove what it can do,
          and make it available to Herman without redesigning the studio.
        </p>
      </div>

      {/* Status summary */}
      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard label="Registered" value={machines.length} accent="text-ink-100" />
        <StatCard label="Connected" value={connected} accent="text-toxic-300" />
        <StatCard label="Ready to Connect" value={readyToConnect} accent="text-amber-300" />
        <StatCard label="Needs Attention" value={needsAttention} accent="text-blood-300" />
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <button onClick={() => setShowWizard(true)} className="btn-primary">
          + Add Machine
        </button>
        <button
          onClick={() => setShowCapabilityQuery(!showCapabilityQuery)}
          className="btn-secondary"
        >
          {showCapabilityQuery ? 'Hide' : 'Capability Search'}
        </button>
      </div>

      {/* Capability query */}
      {showCapabilityQuery && (
        <CapabilityQuery machines={machines} />
      )}

      {/* Machine grid */}
      {loading ? (
        <p className="text-ink-400">Loading machines…</p>
      ) : machines.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-ink-300">No machines registered yet.</p>
          <p className="mt-2 text-sm text-ink-500">
            Click "Add Machine" to register the first one.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {machines.map((m) => {
            const lastTest = tests.find((t) => t.machine_id === m.id)
            return (
              <button
                key={m.id}
                onClick={() => openMachine(m)}
                className="card group p-6 text-left transition-all hover:border-blood-700/50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-semibold text-ink-100 group-hover:text-blood-300">
                      {m.name}
                    </h3>
                    <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-500">
                      {ADAPTER_TYPE_LABELS[m.adapter_type as AdapterType] ?? m.adapter_type}
                    </p>
                  </div>
                  <span
                    className={`flex-none rounded-full border px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.15em] ${
                      DOCK_STATUS_STYLES[m.connection_status as DockStatus] ?? ''
                    }`}
                  >
                    {DOCK_STATUS_LABELS[m.connection_status as DockStatus] ?? m.connection_status}
                  </span>
                </div>
                <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-ink-300">
                  {m.description}
                </p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {m.capabilities.slice(0, 3).map((cap) => (
                    <span
                      key={cap}
                      className="rounded bg-ink-800/60 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-ink-400"
                    >
                      {CAPABILITY_LABELS[cap as Capability] ?? cap}
                    </span>
                  ))}
                  {m.capabilities.length > 3 && (
                    <span className="font-mono text-[9px] text-ink-500">
                      +{m.capabilities.length - 3} more
                    </span>
                  )}
                </div>
                {lastTest && (
                  <p className="mt-3 font-mono text-[9px] text-ink-500">
                    {lastTest.success ? '✓' : '✗'} {TEST_TYPE_LABELS[lastTest.test_type as keyof typeof TEST_TYPE_LABELS] ?? lastTest.test_type} · {timeAgo(lastTest.created_at)}
                    {lastTest.latency_ms != null && ` · ${lastTest.latency_ms}ms`}
                  </p>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Recent handoffs */}
      {handoffs.length > 0 && (
        <section>
          <h2 className="mb-4 font-display text-xl font-semibold text-ink-100">
            Recent Handoffs
          </h2>
          <div className="space-y-2">
            {handoffs.slice(0, 8).map((h) => {
              const source = machines.find((m) => m.id === h.source_machine_id)
              const dest = machines.find((m) => m.id === h.destination_machine_id)
              return (
                <div key={h.id} className="card flex items-center gap-3 p-3">
                  <span
                    className={`flex-none rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.15em] ${
                      HANDOFF_STATUS_STYLES[h.status as keyof typeof HANDOFF_STATUS_STYLES] ?? ''
                    }`}
                  >
                    {HANDOFF_STATUS_LABELS[h.status as keyof typeof HANDOFF_STATUS_LABELS] ?? h.status}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-ink-200">
                    {h.requested_action}
                  </span>
                  <span className="hidden font-mono text-[10px] text-ink-500 sm:inline">
                    {source?.name ?? '—'} → {dest?.name ?? '—'}
                  </span>
                  <span className="font-mono text-[10px] text-ink-500">
                    {timeAgo(h.created_at)}
                  </span>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Add Machine Wizard */}
      {showWizard && (
        <AddMachineWizard
          onClose={() => setShowWizard(false)}
          onCreated={() => { setShowWizard(false); void load() }}
        />
      )}
    </div>
  )
}

// ── Machine Detail View ──────────────────────────────────────────────────────
function MachineDetail({
  machine,
  tests,
  handoffs,
  activeTab,
  setActiveTab,
  onBack,
  onTest,
  testing,
}: {
  machine: DockMachine
  tests: DockConnectionTest[]
  handoffs: DockHandoff[]
  activeTab: Tab
  setActiveTab: (t: Tab) => void
  onBack: () => void
  onTest: (testType: string) => void
  testing: boolean
}) {
  const TABS: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'capabilities', label: 'Capabilities' },
    { id: 'connection', label: 'Connection' },
    { id: 'tests', label: 'Tests' },
    { id: 'activity', label: 'Activity' },
    { id: 'config', label: 'Configuration' },
  ]

  const manifest = machine.manifest as MachineManifest | null

  return (
    <div className="space-y-6">
      {/* Back + title */}
      <div>
        <button
          onClick={onBack}
          className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-400 transition-colors hover:text-blood-300"
        >
          ← Back to Dock
        </button>
        <div className="mt-4 flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-ink-100">
              {machine.name}
            </h1>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-500">
              {ADAPTER_TYPE_LABELS[machine.adapter_type as AdapterType] ?? machine.adapter_type}
              {machine.version && ` · v${machine.version}`}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span
              className={`rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.15em] ${
                DOCK_STATUS_STYLES[machine.connection_status as DockStatus] ?? ''
              }`}
            >
              {DOCK_STATUS_LABELS[machine.connection_status as DockStatus] ?? machine.connection_status}
            </span>
            <span className="font-mono text-[10px] text-ink-500">
              Health: {DOCK_HEALTH_LABELS[machine.health_status] ?? machine.health_status}
            </span>
          </div>
        </div>
        {machine.description && (
          <p className="mt-3 text-sm leading-relaxed text-ink-300">
            {machine.description}
          </p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-ink-800">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`border-b-2 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] transition-colors ${
              activeTab === tab.id
                ? 'border-blood-500 text-blood-300'
                : 'border-transparent text-ink-400 hover:text-ink-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {manifest && (
            <div className="card p-6">
              <h2 className="mb-4 font-display text-lg font-semibold text-ink-100">
                Machine Manifest
              </h2>
              <div className="space-y-3 text-sm">
                <ManifestRow label="WHO I AM" value={manifest.who} />
                <ManifestRow label="WHAT I CAN DO" value={manifest.what_can_do.join(', ')} />
                <ManifestRow label="WHAT I ACCEPT" value={manifest.what_accepts.join(', ')} />
                <ManifestRow label="WHAT I RETURN" value={manifest.what_returns.join(', ')} />
                <ManifestRow label="WHERE I LIVE" value={manifest.where_lives} />
                <ManifestRow label="HOW TO CALL ME" value={manifest.how_to_call} />
                <ManifestRow label="HOW I AUTHENTICATE" value={manifest.how_authenticates} />
                <ManifestRow
                  label="AM I AVAILABLE"
                  value={manifest.currently_available ? 'Yes' : 'No'}
                />
              </div>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <InfoCard label="Location" value={machine.location_url ?? 'Not configured'} />
            <InfoCard label="API Base URL" value={machine.api_base_url ?? 'Not configured'} />
            <InfoCard label="Source Repository" value={machine.source_repo ?? 'Not configured'} />
            <InfoCard label="Machine Type" value={machine.machine_type ?? 'Unknown'} />
            <InfoCard
              label="Last Connected"
              value={machine.last_connected_at ? timeAgo(machine.last_connected_at) : 'Never'}
            />
            <InfoCard
              label="Last Failure"
              value={machine.last_failure_at ? `${timeAgo(machine.last_failure_at)} — ${machine.last_failure_reason ?? 'Unknown'}` : 'None'}
            />
          </div>
          {machine.notes && (
            <div className="card p-6">
              <h2 className="mb-2 font-mono text-[10px] uppercase tracking-[0.3em] text-ink-500">
                Notes
              </h2>
              <p className="text-sm leading-relaxed text-ink-300">{machine.notes}</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'capabilities' && (
        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="mb-4 font-display text-lg font-semibold text-ink-100">
              Declared Capabilities
            </h2>
            {machine.capabilities.length === 0 ? (
              <p className="text-sm text-ink-400">No capabilities declared.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {machine.capabilities.map((cap) => (
                  <span
                    key={cap}
                    className="rounded-lg border border-ink-700 bg-ink-800/40 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-toxic-300"
                  >
                    {CAPABILITY_LABELS[cap as Capability] ?? cap}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="card p-6">
              <h3 className="mb-3 font-mono text-[10px] uppercase tracking-[0.3em] text-ink-500">
                Accepted Inputs
              </h3>
              {machine.accepted_inputs.length === 0 ? (
                <p className="text-sm text-ink-400">None declared.</p>
              ) : (
                <ul className="space-y-1.5 text-sm text-ink-300">
                  {machine.accepted_inputs.map((input) => (
                    <li key={input} className="flex items-center gap-2">
                      <span className="text-blood-500">▸</span> {input}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="card p-6">
              <h3 className="mb-3 font-mono text-[10px] uppercase tracking-[0.3em] text-ink-500">
                Produced Outputs
              </h3>
              {machine.produced_outputs.length === 0 ? (
                <p className="text-sm text-ink-400">None declared.</p>
              ) : (
                <ul className="space-y-1.5 text-sm text-ink-300">
                  {machine.produced_outputs.map((output) => (
                    <li key={output} className="flex items-center gap-2">
                      <span className="text-toxic-500">▸</span> {output}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'connection' && (
        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="mb-2 font-display text-lg font-semibold text-ink-100">
              Connection Details
            </h2>
            <p className="mb-4 text-sm text-ink-400">
              {getAdapterDescription(machine.adapter_type)}
            </p>
            <div className="space-y-3 text-sm">
              <ManifestRow label="Adapter Type" value={ADAPTER_TYPE_LABELS[machine.adapter_type as AdapterType] ?? machine.adapter_type} />
              <ManifestRow label="Auth Type" value={AUTH_TYPE_LABELS[machine.auth_type as AuthType] ?? machine.auth_type} />
              <ManifestRow
                label="Credential Reference"
                value={machine.credential_ref ?? 'None — secrets are server-side only'}
              />
              <ManifestRow label="Location URL" value={machine.location_url ?? 'Not configured'} />
              <ManifestRow label="API Base URL" value={machine.api_base_url ?? 'Not configured'} />
            </div>
          </div>
          <div className="card p-6">
            <h3 className="mb-3 font-mono text-[10px] uppercase tracking-[0.3em] text-amber-300">
              Secret Handling
            </h3>
            <p className="text-sm leading-relaxed text-ink-300">
              Secret values are never stored in connector records exposed to
              the browser. Only a credential reference is stored here, pointing
              to server-side configuration. The UI may show AUTHENTICATED, AUTH
              REQUIRED, or EXPIRED — but never reveals the credential itself.
            </p>
          </div>
        </div>
      )}

      {activeTab === 'tests' && (
        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="mb-4 font-display text-lg font-semibold text-ink-100">
              Connection Test Bench
            </h2>
            <p className="mb-4 text-sm text-ink-400">
              Each test performs a real network call. Results come from actual
              responses — never faked.
            </p>
            <div className="flex flex-wrap gap-2">
              {TEST_TYPES.map((type) => (
                <button
                  key={type}
                  onClick={() => onTest(type)}
                  disabled={testing}
                  className="btn-secondary disabled:opacity-40"
                >
                  {testing ? 'Testing…' : TEST_TYPE_LABELS[type]}
                </button>
              ))}
            </div>
          </div>
          {tests.length === 0 ? (
            <p className="text-sm text-ink-400">No tests run yet.</p>
          ) : (
            <div className="space-y-3">
              {tests.map((t) => (
                <div key={t.id} className="card p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex-none rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.15em] ${
                          t.success
                            ? 'border border-toxic-700/50 bg-toxic-700/10 text-toxic-300'
                            : 'border border-blood-700/50 bg-blood-700/10 text-blood-400'
                        }`}
                      >
                        {t.success ? 'PASS' : 'FAIL'}
                      </span>
                      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-300">
                        {TEST_TYPE_LABELS[t.test_type as keyof typeof TEST_TYPE_LABELS] ?? t.test_type}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 font-mono text-[10px] text-ink-500">
                      {t.http_status != null && <span>HTTP {t.http_status}</span>}
                      {t.latency_ms != null && <span>{t.latency_ms}ms</span>}
                      <span>{timeAgo(t.created_at)}</span>
                    </div>
                  </div>
                  {t.error && (
                    <p className="mt-2 text-xs text-blood-400">{t.error}</p>
                  )}
                  {t.response_body && (
                    <details className="mt-2">
                      <summary className="cursor-pointer font-mono text-[10px] text-ink-500">
                        Response body
                      </summary>
                      <pre className="mt-2 max-h-48 overflow-auto rounded bg-ink-900/50 p-3 text-[11px] text-ink-300">
                        {t.response_body}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="space-y-3">
          {handoffs.length === 0 ? (
            <p className="text-sm text-ink-400">No handoffs for this machine yet.</p>
          ) : (
            handoffs.map((h) => (
              <div key={h.id} className="card p-4">
                <div className="flex items-center justify-between gap-3">
                  <span
                    className={`flex-none rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.15em] ${
                      HANDOFF_STATUS_STYLES[h.status as keyof typeof HANDOFF_STATUS_STYLES] ?? ''
                    }`}
                  >
                    {HANDOFF_STATUS_LABELS[h.status as keyof typeof HANDOFF_STATUS_LABELS] ?? h.status}
                  </span>
                  <span className="font-mono text-[10px] text-ink-500">
                    {timeAgo(h.created_at)}
                  </span>
                </div>
                <p className="mt-2 text-sm text-ink-200">{h.requested_action}</p>
                {h.error && <p className="mt-1 text-xs text-blood-400">{h.error}</p>}
                <p className="mt-1 font-mono text-[9px] text-ink-500">
                  Correlation: {h.correlation_id.slice(0, 8)}… · Retries: {h.retries}
                </p>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'config' && (
        <MachineConfig machine={machine} onSaved={onBack} />
      )}
    </div>
  )
}

// ── Machine Configuration Editor ─────────────────────────────────────────────
function MachineConfig({ machine, onSaved }: { machine: DockMachine; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: machine.name,
    description: machine.description ?? '',
    location_url: machine.location_url ?? '',
    api_base_url: machine.api_base_url ?? '',
    source_repo: machine.source_repo ?? '',
    adapter_type: machine.adapter_type,
    auth_type: machine.auth_type,
    machine_type: machine.machine_type ?? '',
    version: machine.version ?? '',
    owner_source: machine.owner_source ?? '',
    notes: machine.notes ?? '',
    capabilities: machine.capabilities.join(', '),
    accepted_inputs: machine.accepted_inputs.join(', '),
    produced_outputs: machine.produced_outputs.join(', '),
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    setSaving(true)
    setError(null)
    const { error: err } = await supabase
      .from('dock_machines')
      .update({
        name: form.name,
        description: form.description || null,
        location_url: form.location_url || null,
        api_base_url: form.api_base_url || null,
        source_repo: form.source_repo || null,
        adapter_type: form.adapter_type,
        auth_type: form.auth_type,
        machine_type: form.machine_type || null,
        version: form.version || null,
        owner_source: form.owner_source || null,
        notes: form.notes || null,
        capabilities: form.capabilities.split(',').map((s) => s.trim()).filter(Boolean),
        accepted_inputs: form.accepted_inputs.split(',').map((s) => s.trim()).filter(Boolean),
        produced_outputs: form.produced_outputs.split(',').map((s) => s.trim()).filter(Boolean),
      })
      .eq('id', machine.id)
    setSaving(false)
    if (err) {
      setError(err.message)
      return
    }
    void logActivity(null, null, 'Dock', `Updated machine configuration: ${form.name}`, 'system')
    onSaved()
  }

  async function remove() {
    if (!confirm(`Remove "${machine.name}" from the registry? This deletes the machine and its test history. Handoff records are preserved.`)) return
    const { error: err } = await supabase.from('dock_machines').delete().eq('id', machine.id)
    if (err) { setError(err.message); return }
    void logActivity(null, null, 'Dock', `Removed machine: ${machine.name}`, 'system')
    onSaved()
  }

  return (
    <div className="space-y-6">
      <div className="card space-y-4 p-6">
        <h2 className="font-display text-lg font-semibold text-ink-100">
          Edit Machine Configuration
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name">
            <input className="field-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Machine Type">
            <input className="field-input" value={form.machine_type} onChange={(e) => setForm({ ...form, machine_type: e.target.value })} />
          </Field>
          <Field label="Location URL">
            <input className="field-input" value={form.location_url} onChange={(e) => setForm({ ...form, location_url: e.target.value })} placeholder="https://…" />
          </Field>
          <Field label="API Base URL">
            <input className="field-input" value={form.api_base_url} onChange={(e) => setForm({ ...form, api_base_url: e.target.value })} placeholder="https://api…" />
          </Field>
          <Field label="Source Repository">
            <input className="field-input" value={form.source_repo} onChange={(e) => setForm({ ...form, source_repo: e.target.value })} placeholder="https://github.com/…" />
          </Field>
          <Field label="Version">
            <input className="field-input" value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} />
          </Field>
          <Field label="Adapter Type">
            <select className="field-select" value={form.adapter_type} onChange={(e) => setForm({ ...form, adapter_type: e.target.value })}>
              {ADAPTER_TYPES.map((t) => (
                <option key={t} value={t}>{ADAPTER_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </Field>
          <Field label="Auth Type">
            <select className="field-select" value={form.auth_type} onChange={(e) => setForm({ ...form, auth_type: e.target.value })}>
              {AUTH_TYPES.map((t) => (
                <option key={t} value={t}>{AUTH_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Description">
          <textarea className="field-input min-h-[80px]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </Field>
        <Field label="Capabilities (comma-separated)">
          <input className="field-input" value={form.capabilities} onChange={(e) => setForm({ ...form, capabilities: e.target.value })} placeholder="WRITE_STORY, GENERATE_IMAGE" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Accepted Inputs (comma-separated)">
            <input className="field-input" value={form.accepted_inputs} onChange={(e) => setForm({ ...form, accepted_inputs: e.target.value })} />
          </Field>
          <Field label="Produced Outputs (comma-separated)">
            <input className="field-input" value={form.produced_outputs} onChange={(e) => setForm({ ...form, produced_outputs: e.target.value })} />
          </Field>
        </div>
        <Field label="Owner / Source">
          <input className="field-input" value={form.owner_source} onChange={(e) => setForm({ ...form, owner_source: e.target.value })} />
        </Field>
        <Field label="Notes">
          <textarea className="field-input min-h-[80px]" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </Field>
        {error && <p className="text-sm text-blood-400">{error}</p>}
        <div className="flex items-center gap-3">
          <button onClick={save} disabled={saving} className="btn-primary disabled:opacity-40">
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
          <button onClick={remove} className="btn-danger">
            Remove Machine
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Add Machine Wizard ───────────────────────────────────────────────────────
function AddMachineWizard({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: () => void
}) {
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    id: '',
    name: '',
    description: '',
    location_url: '',
    api_base_url: '',
    source_repo: '',
    adapter_type: 'web' as AdapterType,
    auth_type: 'none' as AuthType,
    machine_type: '',
    version: '',
    owner_source: '',
    notes: '',
    capabilities: [] as string[],
    accepted_inputs: [] as string[],
    produced_outputs: [] as string[],
  })

  const STEPS = ['Identity', 'Location', 'Capabilities', 'Review']

  async function create() {
    setSaving(true)
    setError(null)
    const machineId = form.id || form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    if (!machineId) { setError('A name or ID is required'); setSaving(false); return }

    const manifest = buildManifest({
      name: form.name,
      description: form.description,
      capabilities: form.capabilities,
      acceptedInputs: form.accepted_inputs,
      producedOutputs: form.produced_outputs,
      locationUrl: form.location_url || 'Not configured',
      howToCall: ADAPTER_TYPE_LABELS[form.adapter_type],
      authType: AUTH_TYPE_LABELS[form.auth_type],
      currentlyAvailable: false,
    })

    const { error: err } = await supabase.from('dock_machines').insert({
      id: machineId,
      name: form.name,
      description: form.description || null,
      location_url: form.location_url || null,
      api_base_url: form.api_base_url || null,
      source_repo: form.source_repo || null,
      adapter_type: form.adapter_type,
      auth_type: form.auth_type,
      machine_type: form.machine_type || null,
      version: form.version || null,
      owner_source: form.owner_source || null,
      notes: form.notes || null,
      capabilities: form.capabilities,
      accepted_inputs: form.accepted_inputs,
      produced_outputs: form.produced_outputs,
      connection_status: 'unknown',
      health_status: 'unknown',
      manifest,
    })

    setSaving(false)
    if (err) { setError(err.message); return }
    void logActivity(null, null, 'Dock', `Registered new machine: ${form.name}`, 'create')
    onCreated()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/80 p-4 backdrop-blur-sm">
      <div className="card max-h-[90vh] w-full max-w-2xl overflow-auto p-8">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold text-ink-100">
            Register a Machine
          </h2>
          <button onClick={onClose} className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-400 hover:text-blood-300">
            Close
          </button>
        </div>

        {/* Step indicator */}
        <div className="mt-6 flex items-center gap-2">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full border font-mono text-[10px] ${
                  step > i + 1
                    ? 'border-toxic-700/50 bg-toxic-700/20 text-toxic-300'
                    : step === i + 1
                    ? 'border-blood-500 bg-blood-700/20 text-blood-300'
                    : 'border-ink-700 text-ink-500'
                }`}
              >
                {step > i + 1 ? '✓' : i + 1}
              </div>
              <span className={`font-mono text-[10px] uppercase tracking-[0.15em] ${step === i + 1 ? 'text-ink-200' : 'text-ink-500'}`}>
                {label}
              </span>
              {i < STEPS.length - 1 && <span className="h-px w-6 bg-ink-700" />}
            </div>
          ))}
        </div>

        <div className="mt-6 space-y-4">
          {step === 1 && (
            <>
              <Field label="Machine Name *">
                <input className="field-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Moonshadow Editor" />
              </Field>
              <Field label="Machine ID (optional — auto-generated from name)">
                <input className="field-input" value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value })} placeholder="auto-generated" />
              </Field>
              <Field label="Description">
                <textarea className="field-input min-h-[80px]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What does this machine do?" />
              </Field>
              <Field label="Machine Type">
                <input className="field-input" value={form.machine_type} onChange={(e) => setForm({ ...form, machine_type: e.target.value })} placeholder="e.g. editor, capture, writing" />
              </Field>
              <Field label="Version">
                <input className="field-input" value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} placeholder="e.g. 1.0.0" />
              </Field>
            </>
          )}

          {step === 2 && (
            <>
              <Field label="Location URL (where the machine lives)">
                <input className="field-input" value={form.location_url} onChange={(e) => setForm({ ...form, location_url: e.target.value })} placeholder="https://…" />
              </Field>
              <Field label="API Base URL (if it has a REST API)">
                <input className="field-input" value={form.api_base_url} onChange={(e) => setForm({ ...form, api_base_url: e.target.value })} placeholder="https://api…" />
              </Field>
              <Field label="Source Repository (if hosted on GitHub)">
                <input className="field-input" value={form.source_repo} onChange={(e) => setForm({ ...form, source_repo: e.target.value })} placeholder="https://github.com/owner/repo" />
              </Field>
              <Field label="Adapter Type">
                <select className="field-select" value={form.adapter_type} onChange={(e) => setForm({ ...form, adapter_type: e.target.value as AdapterType })}>
                  {ADAPTER_TYPES.map((t) => (
                    <option key={t} value={t}>{ADAPTER_TYPE_LABELS[t]}</option>
                  ))}
                </select>
              </Field>
              <Field label="Authentication Type">
                <select className="field-select" value={form.auth_type} onChange={(e) => setForm({ ...form, auth_type: e.target.value as AuthType })}>
                  {AUTH_TYPES.map((t) => (
                    <option key={t} value={t}>{AUTH_TYPE_LABELS[t]}</option>
                  ))}
                </select>
              </Field>
              <p className="text-xs text-ink-500">
                Secret values are never stored in the browser. Only a credential
                reference is recorded — actual secrets belong in server-side
                configuration.
              </p>
            </>
          )}

          {step === 3 && (
            <>
              <div>
                <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.3em] text-ink-500">
                  Capabilities
                </p>
                <div className="flex flex-wrap gap-2">
                  {CAPABILITIES.map((cap) => (
                    <button
                      key={cap}
                      onClick={() => {
                        const has = form.capabilities.includes(cap)
                        setForm({
                          ...form,
                          capabilities: has
                            ? form.capabilities.filter((c) => c !== cap)
                            : [...form.capabilities, cap],
                        })
                      }}
                      className={`rounded-lg border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.15em] transition-all ${
                        form.capabilities.includes(cap)
                          ? 'border-toxic-700/50 bg-toxic-700/10 text-toxic-300'
                          : 'border-ink-700 text-ink-400 hover:text-ink-200'
                      }`}
                    >
                      {CAPABILITY_LABELS[cap]}
                    </button>
                  ))}
                </div>
              </div>
              <Field label="Accepted Inputs (comma-separated)">
                <input className="field-input" value={form.accepted_inputs.join(', ')} onChange={(e) => setForm({ ...form, accepted_inputs: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} placeholder="prompt, brief, asset_ref" />
              </Field>
              <Field label="Produced Outputs (comma-separated)">
                <input className="field-input" value={form.produced_outputs.join(', ')} onChange={(e) => setForm({ ...form, produced_outputs: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} placeholder="image, story_text, export_file" />
              </Field>
            </>
          )}

          {step === 4 && (
            <div className="space-y-3">
              <h3 className="font-display text-lg font-semibold text-ink-100">Review</h3>
              <p className="text-sm text-ink-400">
                Verify the information below. You can edit it later from the
                Configuration tab. The machine will be registered with status
                "unknown" — run a connection test to verify it for real.
              </p>
              <div className="rounded-lg border border-ink-800 bg-ink-900/30 p-4 text-sm">
                <ReviewRow label="Name" value={form.name} />
                <ReviewRow label="Type" value={form.machine_type || '—'} />
                <ReviewRow label="Adapter" value={ADAPTER_TYPE_LABELS[form.adapter_type]} />
                <ReviewRow label="Auth" value={AUTH_TYPE_LABELS[form.auth_type]} />
                <ReviewRow label="Location" value={form.location_url || 'Not configured'} />
                <ReviewRow label="API URL" value={form.api_base_url || 'Not configured'} />
                <ReviewRow label="Capabilities" value={form.capabilities.map((c) => CAPABILITY_LABELS[c as Capability] ?? c).join(', ') || 'None'} />
                <ReviewRow label="Accepted Inputs" value={form.accepted_inputs.join(', ') || 'None'} />
                <ReviewRow label="Produced Outputs" value={form.produced_outputs.join(', ') || 'None'} />
              </div>
              {error && <p className="text-sm text-blood-400">{error}</p>}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={() => setStep(Math.max(1, step - 1))}
            disabled={step === 1}
            className="btn-secondary disabled:opacity-30"
          >
            ← Back
          </button>
          {step < 4 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={step === 1 && !form.name}
              className="btn-primary disabled:opacity-30"
            >
              Next →
            </button>
          ) : (
            <button onClick={create} disabled={saving} className="btn-primary disabled:opacity-40">
              {saving ? 'Registering…' : 'Register Machine'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Capability Query ─────────────────────────────────────────────────────────
function CapabilityQuery({ machines }: { machines: DockMachine[] }) {
  const [selected, setSelected] = useState<Capability | ''>('')

  const results = selected
    ? findMachinesByCapability(machines, selected as Capability)
    : []

  return (
    <div className="card p-6">
      <h2 className="mb-3 font-display text-lg font-semibold text-ink-100">
        Capability Search
      </h2>
      <p className="mb-4 text-sm text-ink-400">
        Ask Dock: "Which machines can do X?" — get truthful candidates based on
        registered capabilities and availability.
      </p>
      <select
        className="field-select mb-4"
        value={selected}
        onChange={(e) => setSelected(e.target.value as Capability | '')}
      >
        <option value="">Select a capability…</option>
        {CAPABILITIES.map((cap) => (
          <option key={cap} value={cap}>{CAPABILITY_LABELS[cap]}</option>
        ))}
      </select>
      {selected && (
        <div className="space-y-2">
          {results.length === 0 ? (
            <p className="text-sm text-ink-400">
              No machines with this capability are currently available.
            </p>
          ) : (
            results.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-lg border border-ink-800 bg-ink-900/30 p-3">
                <div>
                  <p className="text-sm font-medium text-ink-100">{m.name}</p>
                  <p className="font-mono text-[10px] text-ink-500">
                    {ADAPTER_TYPE_LABELS[m.adapter_type as AdapterType] ?? m.adapter_type}
                  </p>
                </div>
                <span
                  className={`rounded-full border px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.15em] ${
                    DOCK_STATUS_STYLES[m.connection_status as DockStatus] ?? ''
                  }`}
                >
                  {DOCK_STATUS_LABELS[m.connection_status as DockStatus] ?? m.connection_status}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ── Small helpers ────────────────────────────────────────────────────────────
function StatCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="card p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-500">{label}</p>
      <p className={`mt-2 font-display text-2xl font-bold ${accent}`}>{value}</p>
    </div>
  )
}

function ManifestRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 border-b border-ink-800/50 pb-2 sm:flex-row sm:gap-4">
      <span className="flex-none font-mono text-[10px] uppercase tracking-[0.3em] text-ink-500 sm:w-48">
        {label}
      </span>
      <span className="text-ink-200">{value}</span>
    </div>
  )
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-500">{label}</p>
      <p className="mt-2 text-sm text-ink-200">{value}</p>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.2em] text-ink-400">
        {label}
      </span>
      {children}
    </label>
  )
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-ink-800/50 py-1.5">
      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-500">{label}</span>
      <span className="text-right text-ink-200">{value}</span>
    </div>
  )
}
