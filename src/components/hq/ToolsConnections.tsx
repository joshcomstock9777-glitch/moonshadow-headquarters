import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Connection } from '../../lib/hqTypes'
import { loadDockControlPlane, type DockMachineView } from '../../lib/dockControlPlane'
import {
  MODULES,
  MODULE_STATUS_STYLES,
  MODULE_STATUS_LABELS,
  CONNECTION_STATUS_STYLES,
  CONNECTION_STATUS_LABELS,
  CONNECTION_CATEGORIES,
} from '../../lib/hq'

const MODULE_MACHINE_ALIASES: Record<string, string[]> = {
  'studio-go': ['studio-go', 'moonshadow-studio-go'],
  editor: ['editor', 'moonshadow-editor', 'studio-go-editor'],
  kimmy: ['kimmy'],
  'skin-studio': ['skin-studio'],
  'content-factory': ['content-factory'],
  'code-lab': ['code-lab'],
  'asset-library': ['asset-library', 'storage'],
  publishing: ['publishing', 'publisher'],
}

const PATH_ROUTED_YOUTUBE_CONNECTION_IDS = new Set([
  'youtube',
  'youtube-moonshadow',
  'youtube-kimmy',
  'youtube-comedy-studio',
  'youtube-story-culture-studio',
  'youtube-idea-lab',
])

function isYouTubePublishingConnection(connection: Connection) {
  return (
    connection.category === 'publishing'
    && PATH_ROUTED_YOUTUBE_CONNECTION_IDS.has(connection.id)
  )
}

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

function moduleMachine(moduleId: string, machines: DockMachineView[]) {
  const aliases = new Set([moduleId, ...(MODULE_MACHINE_ALIASES[moduleId] ?? [])].map(normalize))
  return machines.find((machine) => aliases.has(normalize(machine.id)) || aliases.has(normalize(machine.name)))
}

function moduleStatus(machine: DockMachineView | undefined) {
  if (!machine) return 'unavailable'
  if ((machine.status === 'online' || machine.status === 'connected') && machine.healthStatus === 'healthy') return 'connected'
  if (machine.status === 'online' || machine.status === 'connected') return 'development'
  if (machine.status === 'auth-required' || machine.status === 'needs-auth') return 'needs-auth'
  if (machine.status === 'ready-to-connect') return 'ready-to-connect'
  return 'unavailable'
}

export default function ToolsConnections() {
  const [connections, setConnections] = useState<Connection[]>([])
  const [machines, setMachines] = useState<DockMachineView[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [machineError, setMachineError] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    setMachineError('')

    const [connectionResult, dockResult] = await Promise.all([
      supabase.from('connections').select('*').order('category', { ascending: true }),
      loadDockControlPlane()
        .then((data) => ({ data, error: null as Error | null }))
        .catch((error: unknown) => ({
          data: null,
          error: error instanceof Error ? error : new Error('Headquarters could not read live Dock machine evidence.'),
        })),
    ])

    if (connectionResult.error) {
      setConnections([])
      setLoadError(connectionResult.error.message || 'Headquarters could not read live connection evidence from Supabase.')
    } else {
      setConnections(connectionResult.data ?? [])
    }

    if (dockResult.error || !dockResult.data) {
      setMachines([])
      setMachineError(dockResult.error?.message || 'Headquarters could not read live Dock machine evidence.')
    } else {
      setMachines(dockResult.data.machines)
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const modules = useMemo(
    () => MODULES.map((module) => {
      const machine = moduleMachine(module.id, machines)
      return { ...module, machine, status: moduleStatus(machine) }
    }),
    [machines],
  )

  return (
    <div className="space-y-10">
      <div>
        <p className="section-eyebrow">
          <span className="h-px w-8 bg-blood-700" /> Tools & Connections
        </p>
        <h1 className="section-title">
          The equipment, and what's
          <span className="italic text-blood-500"> connected.</span>
        </h1>
        <p className="mt-4 max-w-2xl text-ink-300">
          Registered studios, modules, and external services. Availability is derived from live Dock and connection evidence; frontend metadata cannot promote a system to connected.
        </p>
      </div>

      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl font-semibold text-ink-100">Registered Modules</h2>
          <button onClick={() => void load()} disabled={loading} className="btn-ghost">
            {loading ? 'Checking…' : 'Refresh evidence'}
          </button>
        </div>
        {machineError && (
          <div className="mb-4 rounded-lg border border-blood-700/60 bg-blood-900/20 p-4" role="alert">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-blood-300">Dock evidence unavailable</p>
            <p className="mt-2 text-sm text-ink-300">Module status is fail-closed to unavailable until Headquarters can read the live Dock registry.</p>
            <p className="mt-2 break-words text-xs text-ink-500">{machineError}</p>
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((module) => (
            <div key={module.id} className="card p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-ink-100">{module.name}</h3>
                  <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-500">{module.category}</p>
                </div>
                <span className={`rounded-full border px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.15em] ${MODULE_STATUS_STYLES[module.status] ?? ''}`}>
                  {MODULE_STATUS_LABELS[module.status] ?? module.status}
                </span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-ink-300">{module.desc}</p>
              {module.machine ? (
                <div className="mt-4 border-t border-ink-800 pt-3 text-xs text-ink-400">
                  <p>Dock machine: <span className="text-ink-200">{module.machine.name}</span></p>
                  <p className="mt-1">Connection: {module.machine.status} · Health: {module.machine.healthStatus}</p>
                  <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.15em] text-ink-600">Evidence updated {new Date(module.machine.updatedAt).toLocaleString()}</p>
                </div>
              ) : (
                <p className="mt-4 border-t border-ink-800 pt-3 text-xs text-ink-500">No matching live Dock machine evidence.</p>
              )}
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl font-semibold text-ink-100">External Connections</h2>
        </div>
        <p className="mb-4 text-sm text-ink-400">
          Secrets belong server-side and are never exposed in the frontend. A connection cannot be promoted to connected from this screen; status must come from verified backend evidence.
        </p>
        {loading ? (
          <p className="text-ink-400">Loading live connection evidence…</p>
        ) : loadError ? (
          <div className="rounded-lg border border-blood-700/60 bg-blood-900/20 p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-blood-300">Live evidence unavailable</p>
            <p className="mt-2 text-sm text-ink-300">Headquarters could not verify external connection status from Supabase. No connection is being treated as connected from this screen.</p>
            <p className="mt-2 break-words text-xs text-ink-500">{loadError}</p>
          </div>
        ) : connections.length === 0 ? (
          <div className="rounded-lg border border-ink-800 bg-ink-900/30 p-4 text-sm text-ink-400">Supabase returned no connection evidence. Nothing is marked connected.</div>
        ) : (
          <div className="space-y-3">
            {CONNECTION_CATEGORIES.map((category) => {
              const categoryConnections = connections.filter((connection) => connection.category === category)
              if (categoryConnections.length === 0) return null
              return (
                <div key={category}>
                  <h3 className="mb-2 font-mono text-[10px] uppercase tracking-[0.3em] text-ink-500">{category}</h3>
                  <ul className="space-y-2">
                    {categoryConnections.map((connection) => (
                      <li key={connection.id} className="card p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-ink-100">{connection.name}</p>
                              <span className={`rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.15em] ${CONNECTION_STATUS_STYLES[connection.status] ?? ''}`}>
                                {CONNECTION_STATUS_LABELS[connection.status] ?? connection.status}
                              </span>
                            </div>
                            {connection.detail && <p className="mt-1 text-xs text-ink-400">{connection.detail}</p>}
                          </div>
                          <button onClick={() => setExpanded(expanded === connection.id ? null : connection.id)} className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-400 hover:text-blood-300">
                            {expanded === connection.id ? 'Hide' : 'Details'}
                          </button>
                        </div>
                        {expanded === connection.id && (
                          <div className="mt-3 border-t border-ink-800 pt-3 text-xs text-ink-400">
                            {connection.id === 'moonshadow-path' ? (
                              <div className="space-y-2">
                                <p><span className="font-mono text-[10px] uppercase tracking-[0.2em] text-emerald-300">Known Path Contract</span></p>
                                <p>Headquarters uses the existing Moonshadow Path session contract already proven by Studio Go. No replacement protocol is invented here.</p>
                                <ul className="ml-4 list-disc space-y-1">
                                  <li>Create session: POST /api/sessions</li>
                                  <li>Read session: GET /api/sessions/:sessionId</li>
                                  <li>Terminal evidence: final/error session state plus correlation ID and transcript</li>
                                  <li>Retry/timeout behavior belongs in the Path client and backend, not a manual status selector</li>
                                </ul>
                              </div>
                            ) : isYouTubePublishingConnection(connection) ? (
                              <div className="space-y-2">
                                <p><span className="font-mono text-[10px] uppercase tracking-[0.2em] text-emerald-300">Path-Proven YouTube Route</span></p>
                                <p>
                                  YouTube publishing routes through Moonshadow Path using the existing session contract.
                                  Channel rows track auth and health independently; browser clients still cannot mark a channel connected.
                                </p>
                                <ul className="ml-4 list-disc space-y-1">
                                  <li>Queue publisher work through authenticated backend routing</li>
                                  <li>Use server-side channel credentials only (never frontend)</li>
                                  <li>Promote to connected only after trusted publish confirmation evidence</li>
                                </ul>
                              </div>
                            ) : (
                              <p>This status is informational. Actual credential setup, verification, refresh, and health checks must be performed by the service-specific backend integration before Headquarters marks it connected.</p>
                            )}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section className="card p-6">
        <h2 className="font-display text-xl font-semibold text-ink-100">Editor Connection — Adapter Boundary</h2>
        <p className="mt-2 text-sm text-ink-400">Headquarters hands assets and projects into the shared Moonshadow Editor core rather than recreating a second editor implementation.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            ['Load media', 'Send asset references to the editor project.'],
            ['Create / open project', 'Initialize or resume an editor session for a Headquarters project.'],
            ['Send assets', 'Push assets from the library into the editor timeline.'],
            ['Request edits', 'Send edit notes and instructions.'],
            ['Receive previews', 'Receive preview renders back into the asset library.'],
            ['Receive exports', 'Final exports land as assets and can enter the publishing queue.'],
          ].map(([label, desc]) => (
            <div key={label} className="rounded-lg border border-ink-800 bg-ink-900/30 p-4">
              <p className="text-sm font-medium text-ink-100">{label}</p>
              <p className="mt-1 text-xs text-ink-400">{desc}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-ink-500">Until the real editor adapter reports healthy through Dock, Headquarters must show this boundary as incomplete rather than treating the internal preview as the production editor.</p>
      </section>
    </div>
  )
}
