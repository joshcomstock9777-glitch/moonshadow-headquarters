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
  const [expanded, setExpanded] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('connections')
      .select('*')
      .order('category', { ascending: true })
    setConnections(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function updateStatus(id: string, status: string) {
    const { error } = await supabase
      .from('connections')
      .update({ status })
      .eq('id', id)
    if (error) return
    void load()
  }

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
          Registered studios, modules, and external services. Each shows an
          honest status — we never pretend a connection works when it doesn't.
        </p>
      </div>

      {/* Registered modules */}
      <section>
        <h2 className="mb-4 font-display text-xl font-semibold text-ink-100">
          Registered Modules
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.map((m) => (
            <div key={m.id} className="card p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-semibold text-ink-100">
                    {m.name}
                  </h3>
                  <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-500">
                    {m.category}
                  </p>
                </div>
                <span
                  className={`rounded-full border px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.15em] ${
                    MODULE_STATUS_STYLES[m.status] ?? ''
                  }`}
                >
                  {MODULE_STATUS_LABELS[m.status] ?? m.status}
                </span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-ink-300">
                {m.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* External connections */}
      <section>
        <h2 className="mb-4 font-display text-xl font-semibold text-ink-100">
          External Connections
        </h2>
        <p className="mb-4 text-sm text-ink-400">
          Secrets belong server-side and are never exposed in the frontend.
          Status shown here reflects the connection state, not credentials.
        </p>
        {loading ? (
          <p className="text-ink-400">Loading…</p>
        ) : (
          <div className="space-y-3">
            {CONNECTION_CATEGORIES.map((cat) => {
              const catConns = connections.filter((c) => c.category === cat)
              if (catConns.length === 0) return null
              return (
                <div key={cat}>
                  <h3 className="mb-2 font-mono text-[10px] uppercase tracking-[0.3em] text-ink-500">
                    {cat}
                  </h3>
                  <ul className="space-y-2">
                    {catConns.map((conn) => (
                      <li key={conn.id} className="card p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-ink-100">
                                {conn.name}
                              </p>
                              <span
                                className={`rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.15em] ${
                                  CONNECTION_STATUS_STYLES[conn.status] ?? ''
                                }`}
                              >
                                {CONNECTION_STATUS_LABELS[conn.status] ?? conn.status}
                              </span>
                            </div>
                            {conn.detail && (
                              <p className="mt-1 text-xs text-ink-400">
                                {conn.detail}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-none items-center gap-2">
                            <select
                              value={conn.status}
                              onChange={(e) => updateStatus(conn.id, e.target.value)}
                              className="field-select !w-auto !py-1.5 !text-[11px]"
                            >
                              {Object.entries(CONNECTION_STATUS_LABELS).map(
                                ([value, label]) => (
                                  <option key={value} value={value}>
                                    {label}
                                  </option>
                                ),
                              )}
                            </select>
                            <button
                              onClick={() =>
                                setExpanded(expanded === conn.id ? null : conn.id)
                              }
                              className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-400 hover:text-blood-300"
                            >
                              {expanded === conn.id ? 'Hide' : 'Details'}
                            </button>
                          </div>
                        </div>
                        {expanded === conn.id && (
                          <div className="mt-3 border-t border-ink-800 pt-3 text-xs text-ink-400">
                            {conn.id === 'moonshadow-path' ? (
                              <div className="space-y-2">
                                <p>
                                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber-300">
                                    Adapter Boundary
                                  </span>
                                </p>
                                <p>
                                  Moonshadow Path is the existing backend
                                  routing system. Headquarters is architected
                                  so Path can become an orchestration provider
                                  through an adapter. The following API
                                  information is required before wiring:
                                </p>
                                <ul className="ml-4 list-disc space-y-1">
                                  <li>Path endpoint URL(s) and auth method</li>
                                  <li>Job/event message schema</li>
                                  <li>Routing callback or webhook contract</li>
                                  <li>Rate limits and retry behavior</li>
                                </ul>
                                <p className="text-ink-500">
                                  No Path API contracts are invented. The
                                  adapter boundary is documented; wiring waits
                                  for the real contract.
                                </p>
                              </div>
                            ) : (
                              <p>
                                Connection status is managed here. Actual
                                credential handling happens server-side. To
                                connect this service, configure the
                                credentials in the backend — they are never
                                exposed in frontend code.
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

      {/* Editor adapter info */}
      <section className="card p-6">
        <h2 className="font-display text-xl font-semibold text-ink-100">
          Editor Connection — Adapter Boundary
        </h2>
        <p className="mt-2 text-sm text-ink-400">
          Headquarters is designed to hand assets and projects into the
          existing Moonshadow Editor. The editor is not recreated here.
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
            <div
              key={label}
              className="rounded-lg border border-ink-800 bg-ink-900/30 p-4"
            >
              <p className="text-sm font-medium text-ink-100">{label}</p>
              <p className="mt-1 text-xs text-ink-400">{desc}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-ink-500">
          A temporary internal preview surface is available in the Project
          detail view until the real editor is connected.
        </p>
      </section>
    </div>
  )
}
