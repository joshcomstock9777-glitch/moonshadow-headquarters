import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import type { Job, Project } from '../../lib/hqTypes'
import { STAGE_LABELS, stageColor, timeAgo } from '../../lib/hq'
import { navigate } from '../../lib/router'

const DEFAULT_LANES = ['Short Film', 'Story', 'Channel Piece', 'Social Clip']

export default function ContentFactory() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [lanes, setLanes] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [laneError, setLaneError] = useState<string | null>(null)
  const [showLaneConfig, setShowLaneConfig] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setLaneError(null)

    const [j, p, l] = await Promise.all([
      supabase.from('jobs').select('*').order('updated_at', { ascending: false }),
      supabase.from('projects').select('*').order('updated_at', { ascending: false }),
      supabase.from('factory_lanes').select('name, position').order('position', { ascending: true }),
    ])

    setJobs(j.data ?? [])
    setProjects(p.data ?? [])

    if (l.error) {
      setLanes([])
      setLaneError(`Factory lane data unavailable: ${l.error.message}`)
    } else {
      setLanes((l.data ?? []).map((row) => row.name))
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function saveLanes(newLanes: string[]) {
    setLaneError(null)
    const normalized = [...new Set(newLanes.map((lane) => lane.trim()).filter(Boolean))]

    if (normalized.length === 0) {
      setLaneError('At least one factory lane is required.')
      return false
    }

    const { error } = await supabase.rpc('replace_factory_lanes', {
      lane_names: normalized,
    })

    if (error) {
      setLaneError(`Factory lane save failed: ${error.message}`)
      return false
    }

    setLanes(normalized)
    return true
  }

  const projectMap = new Map(projects.map((p) => [p.id, p]))

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="section-eyebrow">
            <span className="h-px w-8 bg-blood-700" /> Content Factory
          </p>
          <h1 className="section-title">
            Production jobs, by
            <span className="italic text-blood-500"> lane.</span>
          </h1>
          <p className="mt-4 max-w-2xl text-ink-300">
            Repeatable short-form content organized into shared Headquarters lanes.
            See exactly where each piece is in production.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowLaneConfig(true)}
            className="btn-ghost !text-xs"
            disabled={lanes.length === 0}
          >
            Configure Lanes
          </button>
          <button
            onClick={() => navigate({ name: 'hq-create' })}
            className="btn-primary"
          >
            New Job
          </button>
        </div>
      </div>

      {laneError && (
        <div className="rounded-lg border border-blood-700/50 bg-blood-700/10 p-4 text-sm text-blood-300">
          {laneError}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-500">
          Pipeline:
        </span>
        {['idea', 'plan', 'create', 'review', 'edit', 'package', 'approve', 'publish', 'done'].map((s, i, arr) => (
          <span key={s} className="flex items-center gap-1.5">
            <span className={`font-mono text-[10px] uppercase tracking-[0.15em] ${stageColor(s)}`}>
              {STAGE_LABELS[s as keyof typeof STAGE_LABELS] ?? s}
            </span>
            {i < arr.length - 1 && <span className="text-ink-700">→</span>}
          </span>
        ))}
      </div>

      {loading ? (
        <p className="text-ink-400">Loading…</p>
      ) : lanes.length === 0 ? (
        <div className="card p-12 text-center text-ink-400">
          Factory lanes are unavailable. Apply the Headquarters data migration and reload.
        </div>
      ) : jobs.length === 0 ? (
        <div className="card p-12 text-center text-ink-400">
          No production jobs yet. Create one to start the factory.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
          {lanes.map((lane) => {
            const laneJobs = jobs.filter((j) => {
              const proj = j.project_id ? projectMap.get(j.project_id) ?? null : null
              return proj?.type === laneToType(lane) || laneMatch(lane, proj ?? undefined)
            })
            return (
              <div key={lane} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-lg font-semibold text-ink-100">
                    {lane}
                  </h2>
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-500">
                    {laneJobs.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {laneJobs.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-ink-800 p-6 text-center text-xs text-ink-600">
                      Empty
                    </div>
                  ) : (
                    laneJobs.map((job) => {
                      const proj = job.project_id ? projectMap.get(job.project_id) : null
                      return (
                        <button
                          key={job.id}
                          onClick={() =>
                            job.project_id &&
                            navigate({ name: 'hq-project', id: job.project_id })
                          }
                          className="card card-hover block w-full p-4 text-left"
                        >
                          <p className="text-sm font-medium text-ink-100">
                            {job.title}
                          </p>
                          {proj && (
                            <p className="mt-0.5 text-xs text-ink-500">
                              {proj.title}
                            </p>
                          )}
                          <div className="mt-2 flex items-center justify-between">
                            <span
                              className={`font-mono text-[10px] uppercase tracking-[0.2em] ${stageColor(job.stage)}`}
                            >
                              {STAGE_LABELS[job.stage as keyof typeof STAGE_LABELS] ?? job.stage}
                            </span>
                            <span className="font-mono text-[9px] text-ink-600">
                              {timeAgo(job.updated_at)}
                            </span>
                          </div>
                          {job.error && (
                            <span className="mt-2 block font-mono text-[9px] uppercase tracking-[0.15em] text-blood-400">
                              Blocked
                            </span>
                          )}
                        </button>
                      )
                    })
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showLaneConfig && (
        <LaneConfigModal
          lanes={lanes}
          onSave={saveLanes}
          onClose={() => setShowLaneConfig(false)}
        />
      )}
    </div>
  )
}

function laneToType(lane: string): string {
  const map: Record<string, string> = {
    'Short Film': 'short-film',
    Story: 'story',
    'Channel Piece': 'channel-piece',
    'Social Clip': 'short-film',
    'Comedy House': 'comedy-house',
    'Horror House': 'horror-house',
    'Technology House': 'technology-house',
    'Financial House': 'financial-house',
    'Kids House': 'kids-house',
    'Music Video House': 'music-video-house',
    'Adult AI House': 'adult-house',
  }
  return map[lane] ?? ''
}

function laneMatch(lane: string, project: Project | undefined): boolean {
  if (!project) return false
  const type = project.type ?? ''
  return laneToType(lane) === type
}

function LaneConfigModal({
  lanes,
  onSave,
  onClose,
}: {
  lanes: string[]
  onSave: (l: string[]) => Promise<boolean>
  onClose: () => void
}) {
  const [local, setLocal] = useState(lanes)
  const [newLane, setNewLane] = useState('')
  const [saving, setSaving] = useState(false)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-xl font-semibold text-ink-100">
          Configure lanes
        </h2>
        <p className="mt-2 text-sm text-ink-400">
          Lanes are stored in the authenticated Headquarters data plane.
        </p>
        <ul className="mt-4 space-y-2">
          {local.map((lane, i) => (
            <li key={`${lane}-${i}`} className="flex items-center gap-2">
              <span className="flex-1 text-sm text-ink-100">{lane}</span>
              <button
                onClick={() => setLocal(local.filter((_, idx) => idx !== i))}
                className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-500 hover:text-blood-400"
                disabled={saving}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex gap-2">
          <input
            value={newLane}
            onChange={(e) => setNewLane(e.target.value)}
            className="field-input flex-1"
            placeholder="New lane name"
            disabled={saving}
          />
          <button
            onClick={() => {
              const candidate = newLane.trim()
              if (candidate && !local.includes(candidate)) {
                setLocal([...local, candidate])
                setNewLane('')
              }
            }}
            className="btn-ghost !text-xs"
            disabled={saving}
          >
            Add
          </button>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="btn-ghost" disabled={saving}>
            Cancel
          </button>
          <button
            onClick={async () => {
              setSaving(true)
              const saved = await onSave(local)
              setSaving(false)
              if (saved) onClose()
            }}
            className="btn-primary"
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

export { DEFAULT_LANES }
