import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import type { Project, Job } from '../../lib/hqTypes'
import {
  PROJECT_STATUS_LABELS,
  PROJECT_TYPE_LABELS,
  STAGE_LABELS,
  stageColor,
  timeAgo,
} from '../../lib/hq'
import { navigate } from '../../lib/router'

export default function ProjectsList() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void load()
  }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('projects')
      .select('*')
      .order('updated_at', { ascending: false })
    setProjects(data ?? [])
    setLoading(false)
  }

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <p className="section-eyebrow">
            <span className="h-px w-8 bg-blood-700" /> Projects
          </p>
          <h1 className="section-title">
            Every project,
            <span className="italic text-blood-500"> in one place.</span>
          </h1>
        </div>
        <button
          onClick={() => navigate({ name: 'hq-create' })}
          className="btn-primary"
        >
          New Job
        </button>
      </div>

      {loading ? (
        <p className="text-ink-400">Loading…</p>
      ) : projects.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-ink-300">No projects yet.</p>
          <button
            onClick={() => navigate({ name: 'hq-create' })}
            className="btn-ghost mt-6"
          >
            Create your first job
          </button>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {projects.map((p) => (
            <li key={p.id}>
              <ProjectCard project={p} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function ProjectCard({ project }: { project: Project }) {
  const [jobCount, setJobCount] = useState<number | null>(null)

  useEffect(() => {
    void (async () => {
      const { count } = await supabase
        .from('jobs')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', project.id)
      setJobCount(count ?? 0)
    })()
  }, [project.id])

  return (
    <button
      onClick={() => navigate({ name: 'hq-project', id: project.id })}
      className="card card-hover group w-full p-6 text-left"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display text-xl font-semibold text-ink-100">
          {project.title}
        </h3>
        <span className="rounded-full border border-ink-700 px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.2em] text-ink-300">
          {PROJECT_STATUS_LABELS[project.status] ?? project.status}
        </span>
      </div>
      {project.goal && (
        <p className="mt-2 line-clamp-2 text-sm text-ink-300">{project.goal}</p>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-3 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-500">
        {project.type && <span>{PROJECT_TYPE_LABELS[project.type] ?? project.type}</span>}
        {project.target_platform && <span>· {project.target_platform}</span>}
        {jobCount !== null && <span>· {jobCount} job{jobCount !== 1 ? 's' : ''}</span>}
        <span>· {timeAgo(project.updated_at)}</span>
      </div>
    </button>
  )
}

export function ProjectDetail({ id }: { id: string }) {
  const [project, setProject] = useState<Project | null>(null)
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [activeJobId, setActiveJobId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [p, j] = await Promise.all([
      supabase.from('projects').select('*').eq('id', id).maybeSingle(),
      supabase
        .from('jobs')
        .select('*')
        .eq('project_id', id)
        .order('created_at', { ascending: false }),
    ])
    setProject(p.data)
    setJobs(j.data ?? [])
    if (j.data && j.data.length > 0 && !activeJobId) {
      setActiveJobId(j.data[0].id)
    }
    setLoading(false)
  }, [id, activeJobId])

  useEffect(() => {
    void load()
  }, [load])

  if (loading) {
    return <p className="text-ink-400">Loading…</p>
  }

  if (!project) {
    return (
      <div className="card p-12 text-center">
        <p className="text-ink-300">Project not found.</p>
        <button
          onClick={() => navigate({ name: 'hq-projects' })}
          className="btn-ghost mt-6"
        >
          Back to projects
        </button>
      </div>
    )
  }

  const activeJob = jobs.find((j) => j.id === activeJobId) ?? jobs[0] ?? null

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate({ name: 'hq-projects' })}
          className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-400 hover:text-blood-300"
        >
          ← All projects
        </button>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="section-title">{project.title}</h1>
            {project.goal && (
              <p className="mt-3 max-w-2xl text-ink-300">{project.goal}</p>
            )}
            <div className="mt-3 flex flex-wrap gap-3 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-500">
              {project.type && (
                <span>{PROJECT_TYPE_LABELS[project.type] ?? project.type}</span>
              )}
              {project.tone && <span>· {project.tone}</span>}
              {project.target_platform && <span>· {project.target_platform}</span>}
              {project.duration && <span>· {project.duration}</span>}
            </div>
          </div>
          <button
            onClick={() => navigate({ name: 'hq-roundtable', projectId: project.id })}
            className="btn-ghost"
          >
            Roundtable
          </button>
        </div>
      </div>

      {/* Jobs */}
      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <div>
          <h2 className="mb-3 font-mono text-[10px] uppercase tracking-[0.3em] text-ink-500">
            Jobs ({jobs.length})
          </h2>
          {jobs.length === 0 ? (
            <p className="text-sm text-ink-400">No jobs in this project.</p>
          ) : (
            <ul className="space-y-2">
              {jobs.map((job) => (
                <li key={job.id}>
                  <button
                    onClick={() => setActiveJobId(job.id)}
                    className={`w-full rounded-xl border p-4 text-left transition-all ${
                      activeJob?.id === job.id
                        ? 'border-blood-700/70 bg-blood-700/10'
                        : 'border-ink-800 bg-ink-900/30 hover:border-ink-700'
                    }`}
                  >
                    <p className="text-sm font-medium text-ink-100">
                      {job.title}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <span
                        className={`font-mono text-[10px] uppercase tracking-[0.2em] ${stageColor(job.stage)}`}
                      >
                        {STAGE_LABELS[job.stage as keyof typeof STAGE_LABELS] ?? job.stage}
                      </span>
                      {job.error && (
                        <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-blood-400">
                          blocked
                        </span>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {activeJob ? (
          <JobPipeline key={activeJob.id} job={activeJob} projectId={project.id} onUpdated={load} />
        ) : (
          <div className="card flex min-h-[300px] items-center justify-center p-10 text-center text-ink-400">
            Select a job to view its pipeline.
          </div>
        )}
      </div>
    </div>
  )
}

function JobPipeline({
  job,
  projectId,
  onUpdated,
}: {
  job: Job
  projectId: string
  onUpdated: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [field, setField] = useState<keyof Job>(null as any)

  async function update(patch: Partial<Job>) {
    setSaving(true)
    const { error } = await supabase.from('jobs').update(patch).eq('id', job.id)
    setSaving(false)
    if (error) return
    onUpdated()
  }

  async function advance() {
    const stages = ['idea', 'plan', 'create', 'review', 'edit', 'package', 'approve', 'publish', 'done']
    const idx = stages.indexOf(job.stage)
    const next = stages[Math.min(idx + 1, stages.length - 1)]
    await update({ stage: next })
    await logStage(job.id, projectId, job.stage, next)
  }

  async function logStage(jobId: string, pid: string, from: string, to: string) {
    await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/activity`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        project_id: pid,
        job_id: jobId,
        actor: 'Herman',
        action: `advanced job from ${from} to ${to}`,
        category: 'info',
      }),
    }).catch(() => {})
  }

  const stages = ['idea', 'plan', 'create', 'review', 'edit', 'package', 'approve', 'publish', 'done']
  const currentIdx = stages.indexOf(job.stage)

  return (
    <div className="card space-y-6 p-6">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display text-2xl font-semibold text-ink-100">
          {job.title}
        </h3>
        {job.stage !== 'done' && (
          <button
            onClick={advance}
            disabled={saving}
            className="btn-primary !px-5 !py-2 !text-xs"
          >
            {saving ? '…' : `Advance → ${STAGE_LABELS[stages[Math.min(currentIdx + 1, stages.length - 1)] as keyof typeof STAGE_LABELS]}`}
          </button>
        )}
      </div>

      {job.error && (
        <div className="rounded-lg border border-blood-700/60 bg-blood-900/30 px-4 py-3 text-sm text-blood-300">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em]">Blocked:</span>{' '}
          {job.error}
          <button
            onClick={() => update({ error: null })}
            className="ml-3 font-mono text-[10px] uppercase tracking-[0.2em] text-blood-400 hover:text-blood-300"
          >
            Clear
          </button>
        </div>
      )}

      {/* Pipeline visualization */}
      <div className="flex flex-wrap items-center gap-1.5">
        {stages.map((s, i) => (
          <div key={s} className="flex items-center gap-1.5">
            <div
              className={`flex h-8 items-center rounded-full border px-3 font-mono text-[10px] uppercase tracking-[0.15em] transition-all ${
                i < currentIdx
                  ? 'border-toxic-700/50 bg-toxic-700/15 text-toxic-300'
                  : i === currentIdx
                    ? 'border-blood-600 bg-blood-700/20 text-blood-300'
                    : 'border-ink-700 bg-ink-900/30 text-ink-500'
              }`}
            >
              {STAGE_LABELS[s as keyof typeof STAGE_LABELS] ?? s}
            </div>
            {i < stages.length - 1 && (
              <span className="h-px w-3 bg-ink-700" />
            )}
          </div>
        ))}
      </div>

      {/* Editable fields */}
      <PipelineField
        label="Brief"
        value={job.brief}
        placeholder="The seed idea / what the client wants."
        rows={3}
        onSave={(v) => update({ brief: v })}
      />
      <PipelineField
        label="Script"
        value={job.script}
        placeholder="The written script — from Kimmy or entered by hand."
        rows={8}
        onSave={(v) => update({ script: v })}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <PipelineField
          label="Shots / scene list"
          value={job.shots}
          placeholder="Shot 1 — … Shot 2 — …"
          rows={5}
          onSave={(v) => update({ shots: v })}
        />
        <PipelineField
          label="Narration / dialogue"
          value={job.narration}
          placeholder="Voiceover and dialogue lines."
          rows={5}
          onSave={(v) => update({ narration: v })}
        />
        <PipelineField
          label="Music / audio"
          value={job.music}
          placeholder="Score, sound design, audio notes."
          rows={4}
          onSave={(v) => update({ music: v })}
        />
        <PipelineField
          label="Captions"
          value={job.captions}
          placeholder="On-screen captions / subtitles."
          rows={4}
          onSave={(v) => update({ captions: v })}
        />
      </div>
      <PipelineField
        label="Edit notes"
        value={job.edit_notes}
        placeholder="Cut, pacing, transitions — notes for the editor."
        rows={4}
        onSave={(v) => update({ edit_notes: v })}
      />
      <PipelineField
        label="Rights / license"
        value={job.rights}
        placeholder="Rights and license information."
        rows={2}
        onSave={(v) => update({ rights: v })}
      />
    </div>
  )
}

function PipelineField({
  label,
  value,
  placeholder,
  rows,
  onSave,
}: {
  label: string
  value: string | null
  placeholder: string
  rows: number
  onSave: (v: string) => void
}) {
  const [local, setLocal] = useState(value ?? '')
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    setLocal(value ?? '')
    setDirty(false)
  }, [value])

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="field-label !mb-0">{label}</label>
        {dirty && (
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber-400">
            unsaved
          </span>
        )}
      </div>
      <textarea
        value={local}
        onChange={(e) => {
          setLocal(e.target.value)
          setDirty(true)
        }}
        onBlur={() => {
          if (dirty) onSave(local)
        }}
        placeholder={placeholder}
        rows={rows}
        className="field-textarea !min-h-0 text-base leading-relaxed"
      />
    </div>
  )
}
