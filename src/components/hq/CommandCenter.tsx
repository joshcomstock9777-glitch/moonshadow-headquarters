import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import type { Job, Approval, Activity, Project, Connection } from '../../lib/hqTypes'
import {
  STAGE_LABELS,
  stageColor,
  timeAgo,
  ACTIVITY_CATEGORY_STYLES,
  CONNECTION_STATUS_STYLES,
  CONNECTION_STATUS_LABELS,
} from '../../lib/hq'
import { navigate } from '../../lib/router'

export default function CommandCenter() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [approvals, setApprovals] = useState<Approval[]>([])
  const [activity, setActivity] = useState<Activity[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [connections, setConnections] = useState<Connection[]>([])
  const [loading, setLoading] = useState(true)
  const [connectionLoadError, setConnectionLoadError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [j, a, act, p, c] = await Promise.all([
      supabase
        .from('jobs')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(8),
      supabase
        .from('approvals')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),
      supabase
        .from('activity')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(12),
      supabase
        .from('projects')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(6),
      supabase
        .from('connections')
        .select('*')
        .order('name', { ascending: true }),
    ])
    setJobs(j.data ?? [])
    setApprovals(a.data ?? [])
    setActivity(act.data ?? [])
    setProjects(p.data ?? [])
    setConnections(c.data ?? [])
    setConnectionLoadError(c.error?.message ?? null)
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const connectedCount = connections.filter((connection) => connection.status === 'connected').length
  const blocked = jobs.filter((j) => j.error)
  const waitingApprovals = approvals.length

  return (
    <div className="space-y-8">
      <div>
        <p className="section-eyebrow">
          <span className="h-px w-8 bg-blood-700" /> Command Center
        </p>
        <h1 className="section-title">
          What's moving in the
          <span className="italic text-blood-500"> studio.</span>
        </h1>
        <p className="mt-4 max-w-2xl text-ink-300">
          Active jobs, waiting approvals, recent activity, and live connection
          evidence — all in one place.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Active jobs"
          value={jobs.filter((j) => j.stage !== 'done').length}
          accent="text-toxic-400"
          onClick={() => navigate({ name: 'hq-projects' })}
        />
        <StatCard
          label="Waiting approvals"
          value={waitingApprovals}
          accent="text-amber-400"
          onClick={() => navigate({ name: 'hq-publish' })}
        />
        <StatCard
          label="Blocked"
          value={blocked.length}
          accent="text-blood-400"
          onClick={() => navigate({ name: 'hq-projects' })}
        />
        <StatCard
          label="Verified connections"
          value={connectionLoadError ? 'Unknown' : `${connectedCount}/${connections.length}`}
          accent="text-ink-200"
          onClick={() => navigate({ name: 'hq-tools' })}
        />
      </div>

      <div className="card p-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-display text-xl font-semibold text-ink-100">
              Start something
            </h2>
            <p className="mt-1 text-sm text-ink-400">
              Bring an idea. Headquarters will turn it into a production job.
            </p>
          </div>
          <button
            onClick={() => navigate({ name: 'hq-create' })}
            className="btn-primary"
          >
            New Job
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <section className="card p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold text-ink-100">
              Active jobs
            </h2>
            <button
              onClick={() => navigate({ name: 'hq-projects' })}
              className="font-mono text-[10px] uppercase tracking-[0.2em] text-blood-300 hover:text-blood-200"
            >
              All projects →
            </button>
          </div>
          {loading ? (
            <p className="mt-4 text-ink-400">Loading…</p>
          ) : jobs.length === 0 ? (
            <div className="mt-4 rounded-lg border border-dashed border-ink-700 p-8 text-center text-sm text-ink-400">
              No jobs yet. Start one with "New Job" above.
            </div>
          ) : (
            <ul className="mt-4 space-y-2">
              {jobs.map((job) => {
                const proj = projects.find((p) => p.id === job.project_id)
                return (
                  <li key={job.id}>
                    <button
                      onClick={() =>
                        job.project_id &&
                        navigate({ name: 'hq-project', id: job.project_id })
                      }
                      className="flex w-full items-center justify-between gap-3 rounded-lg border border-ink-800 bg-ink-900/30 px-4 py-3 text-left transition-all hover:border-ink-700 hover:bg-ink-900/60"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink-100">
                          {job.title}
                        </p>
                        <p className="mt-0.5 truncate font-mono text-[10px] uppercase tracking-[0.2em] text-ink-500">
                          {proj?.title ?? 'No project'} · {timeAgo(job.updated_at)}
                        </p>
                      </div>
                      <div className="flex flex-none items-center gap-2">
                        {job.error && (
                          <span className="rounded-full border border-blood-700/50 bg-blood-700/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.15em] text-blood-400">
                            Blocked
                          </span>
                        )}
                        <span
                          className={`font-mono text-[10px] uppercase tracking-[0.2em] ${stageColor(job.stage)}`}
                        >
                          {STAGE_LABELS[job.stage as keyof typeof STAGE_LABELS] ?? job.stage}
                        </span>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section className="card p-6">
          <h2 className="font-display text-xl font-semibold text-ink-100">
            Waiting approvals
          </h2>
          {approvals.length === 0 ? (
            <p className="mt-4 text-sm text-ink-400">
              Nothing waiting. The system won't publish, spend, or destroy
              without your say-so.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {approvals.map((ap) => (
                <li
                  key={ap.id}
                  className="rounded-lg border border-amber-700/40 bg-amber-700/5 px-4 py-3"
                >
                  <p className="text-sm font-medium text-ink-100">{ap.title}</p>
                  {ap.description && (
                    <p className="mt-1 text-xs text-ink-400">{ap.description}</p>
                  )}
                  <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-amber-300">
                    {timeAgo(ap.created_at)} · {ap.category}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="card p-6">
        <h2 className="font-display text-xl font-semibold text-ink-100">
          System activity
        </h2>
        {activity.length === 0 ? (
          <p className="mt-4 text-sm text-ink-400">
            Every important action shows up here. Nothing happens quietly.
          </p>
        ) : (
          <ul className="mt-4 space-y-1.5">
            {activity.map((a) => (
              <li
                key={a.id}
                className="flex items-start gap-3 rounded-lg px-3 py-2 text-sm"
              >
                <span className="mt-1.5 h-1 w-1 flex-none rounded-full bg-ink-600" />
                <p className="min-w-0 flex-1">
                  <span
                    className={`font-mono text-[10px] uppercase tracking-[0.2em] ${
                      ACTIVITY_CATEGORY_STYLES[a.category] ?? 'text-ink-300'
                    }`}
                  >
                    {a.actor}
                  </span>{' '}
                  <span className="text-ink-200">{a.action}</span>
                  {a.detail && (
                    <span className="text-ink-400"> — {a.detail}</span>
                  )}
                  <span className="ml-2 font-mono text-[9px] uppercase tracking-[0.2em] text-ink-600">
                    {timeAgo(a.created_at)}
                  </span>
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold text-ink-100">
              Connection evidence
            </h2>
            <p className="mt-1 text-sm text-ink-400">
              These states are read from the live Headquarters connections table, not frontend defaults.
            </p>
          </div>
          <button
            onClick={() => navigate({ name: 'hq-tools' })}
            className="font-mono text-[10px] uppercase tracking-[0.2em] text-blood-300 hover:text-blood-200"
          >
            Inspect →
          </button>
        </div>

        {connectionLoadError ? (
          <div className="mt-4 rounded-lg border border-blood-700/40 bg-blood-700/5 p-4 text-sm text-blood-300">
            Connection evidence unavailable: {connectionLoadError}
          </div>
        ) : connections.length === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed border-ink-700 p-6 text-sm text-ink-400">
            No connection records are available. Headquarters will not infer a connected state.
          </div>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {connections.map((connection) => (
              <div
                key={connection.id}
                className="rounded-xl border border-ink-800 bg-ink-900/30 p-4"
              >
                <p className="text-sm font-medium text-ink-100">{connection.name}</p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-500">
                  {connection.category}
                </p>
                <span
                  className={`mt-3 inline-block rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.15em] ${
                    CONNECTION_STATUS_STYLES[connection.status] ?? ''
                  }`}
                >
                  {CONNECTION_STATUS_LABELS[connection.status] ?? connection.status}
                </span>
                <p className="mt-2 font-mono text-[9px] text-ink-600">
                  Updated {timeAgo(connection.updated_at)}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function StatCard({
  label,
  value,
  accent,
  onClick,
}: {
  label: string
  value: number | string
  accent: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="card card-hover p-5 text-left"
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-500">
        {label}
      </p>
      <p className={`mt-2 font-display text-3xl font-semibold ${accent}`}>
        {value}
      </p>
    </button>
  )
}