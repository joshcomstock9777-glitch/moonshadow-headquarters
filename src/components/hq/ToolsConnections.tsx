import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import type { Connection } from '../../lib/hqTypes'
import {
  MODULES,
  MODULE_STATUS_STYLES,
  MODULE_STATUS_LABELS,
  CONNECTION_STATUS_STYLES,
  CONNECTION_STATUS_LABELS,
  CONNECTION_CATEGORIES,
} from '../../lib/hq'

export default function ToolsConnections() {
  const [connections, setConnections] = useState<Connection[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    const { data, error } = await supabase
      .from('connections')
      .select('*')
      .order('category', { ascending: true })

    if (error) {
      setConnections([])
      setLoadError(error.message || 'Headquarters could not read live connection evidence from Supabase.')
      setLoading(false)
      return
    }

    setConnections(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

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
          Registered studios, modules, and external services. Status is read-only here and must be written by real verification or backend connection flows.
        </p>
      </div>

      <section>
        <h2 className="mb-4 font-display text-xl font-semibold text-ink-100">Registered Modules</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.map((m) => (
            <div key={m.id} className="card p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-semibold text-ink-100">{m.name}</h3>
                  <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-500">{m.category}</p>
                </div>
                <span className={`rounded-full border px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.15em] ${MODULE_STATUS_STYLES[m.status] ?? ''}`}>
                  {MODULE_STATUS_LABELS[m.status] ?? m.status}
                </span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-ink-300">{m.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl font-semibold text-ink-100">External Connections</h2>
          <button onClick={() => void load()} disabled={loading} className="btn-ghost">
            {loading ? 'Checking…' : 'Refresh evidence'}
          </button>
        </div>
        <p className="mb-4 text-sm text-ink-400">
          Secrets belong server-side and are never exposed in the frontend. A connection cannot be promoted to connected from this screen; status must come from verified backend evidence.
        </p>
        {loading ? (
          <p className="text-ink-400">Loading live connection evidence…</p>
        ) : loadError ? (
          <div className="rounded-lg border border-blood-700/60 bg-blood-900/20 p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-blood-300">Live evidence unavailable</p>
            <p className="mt-2 text-sm text-ink-300">
              Headquarters could not verify external connection status from Supabase. No connection is being treated as connected from this screen.
            </p>
            <p className="mt-2 break-words text-xs text-ink-500">{loadError}</p>
          </div>
        ) : connections.length === 0 ? (
          <div className="rounded-lg border border-ink-800 bg-ink-900/30 p-4 text-sm text-ink-400">
            Supabase returned no connection evidence. Nothing is marked connected.
          </div>
        ) : (
          <div className="space-y-3">
            {CONNECTION_CATEGORIES.map((cat) => {
              const catConns = connections.filter((c) => c.category === cat)
              if (catConns.length === 0) return null
              return (
                <div key={cat}>
                  <h3 className="mb-2 font-mono text-[10px] uppercase tracking-[0.3em] text-ink-500">{cat}</h3>
                  <ul className="space-y-2">
                    {catConns.map((conn) => (
                      <li key={conn.id} className="card p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-ink-100">{conn.name}</p>
                              <span className={`rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.15em] ${CONNECTION_STATUS_STYLES[conn.status] ?? ''}`}>
                                {CONNECTION_STATUS_LABELS[conn.status] ?? conn.status}
                              </span>
                            </div>
                            {conn.detail && <p className="mt-1 text-xs text-ink-400">{conn.detail}</p>}
                          </div>
                          <button
                            onClick={() => setExpanded(expanded === conn.id ? null : conn.id)}
                            className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-400 hover:text-blood-300"
                          >
                            {expanded === conn.id ? 'Hide' : 'Details'}
                          </button>
                        </div>
                        {expanded === conn.id && (
                          <div className="mt-3 border-t border-ink-800 pt-3 text-xs text-ink-400">
                            {conn.id === 'moonshadow-path' ? (
                              <div className="space-y-2">
                                <p><span className="font-mono text-[10px] uppercase tracking-[0.2em] text-emerald-300">Known Path Contract</span></p>
                                <p>
                                  Headquarters uses the existing Moonshadow Path session contract already proven by Studio Go. No replacement protocol is invented here.
                                </p>
                                <ul className="ml-4 list-disc space-y-1">
                                  <li>Production base: https://moonshadow-path-proof.vercel.app</li>
                                  <li>Create session: POST /api/sessions</li>
                                  <li>Read session: GET /api/sessions/:sessionId</li>
                                  <li>Terminal evidence: final/error session state plus correlation ID and transcript</li>
                                  <li>Retry/timeout behavior belongs in the Path client and backend, not a manual status selector</li>
                                </ul>
                              </div>
                            ) : (
                              <p>
                                This status is informational. Actual credential setup, verification, refresh, and health checks must be performed by the service-specific backend integration before Headquarters marks it connected.
                              </p>
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
        <p className="mt-2 text-sm text-ink-400">
          Headquarters hands assets and projects into the shared Moonshadow Editor core rather than recreating a second editor implementation.
        </p>
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
        <p className="mt-4 text-xs text-ink-500">
          Until the real editor adapter reports healthy, Headquarters must show this boundary as incomplete rather than treating the internal preview as the production editor.
        </p>
      </section>
    </div>
  )
}
