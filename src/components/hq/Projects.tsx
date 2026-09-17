import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import type { Project, Job, RenderQualityReview } from '../../lib/hqTypes'
import { normalizeStoryboardV2 } from '../../lib/briefValidator'
import {
  PROJECT_STATUS_LABELS,
  PROJECT_TYPE_LABELS,
  STAGE_LABELS,
  stageColor,
  timeAgo,
  logActivity,
} from '../../lib/hq'
import { navigate } from '../../lib/router'

type RightsComplianceReview = {
  music_rights_ok: boolean
  image_rights_ok: boolean
  clip_rights_ok: boolean
  policy_safety_ok: boolean
  publish_allowed: boolean
  notes: string | null
  violations: string[]
}

type ContinuityCheck = {
  continuity_bible_id: string
  continuity_score: number
  issues: string[]
  fix_plan: string | null
  publish_ready: boolean
}

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
  const [stageError, setStageError] = useState<string | null>(null)

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
    setSaving(true)
    setStageError(null)
    try {
      const { error } = await supabase.from('jobs').update({ stage: next }).eq('id', job.id)
      if (error) throw error

      await logActivity(
        projectId,
        job.id,
        'Herman',
        `advanced job from ${job.stage} to ${next}`,
        'info',
      )

      onUpdated()
    } catch (error) {
      const maybeMessage = typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message: unknown }).message)
        : null
      setStageError(maybeMessage || 'Stage transition failed.')
      console.error(
        'Headquarters stage transition failed or lost observability evidence:',
        maybeMessage || error,
      )
    } finally {
      setSaving(false)
    }
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
      {stageError && (
        <div className="rounded-lg border border-blood-700/60 bg-blood-900/20 px-4 py-3 text-sm text-blood-300">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em]">Advance blocked:</span>{' '}
          {stageError}
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
          onSave={(v) => update({ shots: normalizeStoryboardV2(v) })}
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
      <RenderQualityGatePanel job={job} projectId={projectId} />
      <RightsCompliancePanel job={job} projectId={projectId} />
      <ContinuityGatePanel job={job} projectId={projectId} />
    </div>
  )
}

function clampScore(value: string): number {
  const numeric = Number.parseInt(value, 10)
  if (!Number.isFinite(numeric)) return 0
  return Math.max(0, Math.min(100, numeric))
}

function RenderQualityGatePanel({ job, projectId }: { job: Job; projectId: string }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [qualityScore, setQualityScore] = useState(90)
  const [originalityScore, setOriginalityScore] = useState(90)
  const [clarityScore, setClarityScore] = useState(85)
  const [retentionPredictionScore, setRetentionPredictionScore] = useState(85)
  const [craftScore, setCraftScore] = useState(85)
  const [publishReady, setPublishReady] = useState(false)
  const [notes, setNotes] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: loadError } = await supabase
      .from('render_quality_reviews')
      .select('*')
      .eq('job_id', job.id)
      .maybeSingle()

    if (loadError) {
      setLoading(false)
      setError(loadError.message)
      return
    }

    const review = data as RenderQualityReview | null
    if (review) {
      setQualityScore(review.quality_score)
      setOriginalityScore(review.originality_score)
      setClarityScore(review.clarity_score)
      setRetentionPredictionScore(review.retention_prediction_score)
      setCraftScore(review.craft_score)
      setPublishReady(review.publish_ready)
      setNotes(review.notes ?? '')
    }
    setLoading(false)
  }, [job.id])

  useEffect(() => {
    void load()
  }, [load])

  const thresholdsMet = qualityScore >= 85 && originalityScore >= 85 && clarityScore >= 80 && retentionPredictionScore >= 80 && craftScore >= 80

  async function saveReview() {
    setSaving(true)
    setError(null)
    const effectivePublishReady = publishReady && thresholdsMet
    const { error: saveError } = await supabase
      .from('render_quality_reviews')
      .upsert(
        {
          project_id: projectId,
          job_id: job.id,
          quality_score: qualityScore,
          originality_score: originalityScore,
          clarity_score: clarityScore,
          retention_prediction_score: retentionPredictionScore,
          craft_score: craftScore,
          notes: notes.trim() || null,
          publish_ready: effectivePublishReady,
        },
        { onConflict: 'job_id' },
      )
    setSaving(false)

    if (saveError) {
      setError(saveError.message)
      return
    }

    setPublishReady(effectivePublishReady)
  }

  return (
    <section className="rounded-xl border border-amber-700/40 bg-amber-700/5 p-5">
      <h4 className="font-display text-lg font-semibold text-ink-100">Render quality gate</h4>
      <p className="mt-1 text-sm text-ink-400">
        Publish requires high-quality evidence: quality/originality ≥ 85, clarity/retention prediction/craft ≥ 80, and publish-ready checked.
      </p>
      {loading ? (
        <p className="mt-3 text-sm text-ink-400">Loading quality evidence…</p>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <ScoreField label="Quality score" value={qualityScore} onChange={setQualityScore} />
          <ScoreField label="Originality score" value={originalityScore} onChange={setOriginalityScore} />
          <ScoreField label="Clarity score" value={clarityScore} onChange={setClarityScore} />
          <ScoreField label="Retention prediction score" value={retentionPredictionScore} onChange={setRetentionPredictionScore} />
          <ScoreField label="Craft score" value={craftScore} onChange={setCraftScore} />
          <div className="sm:col-span-2">
            <label className="field-label">Quality notes</label>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              className="field-textarea !min-h-0 text-sm"
              placeholder="What makes this output distinctly above average?"
            />
          </div>
          <label className="sm:col-span-2 flex items-center gap-2 text-sm text-ink-200">
            <input
              type="checkbox"
              checked={publishReady}
              onChange={(event) => setPublishReady(event.target.checked)}
              disabled={!thresholdsMet}
            />
            Mark publish-ready after quality review (enabled only when thresholds pass)
          </label>
        </div>
      )}
      <div className="mt-4 flex items-center gap-3">
        <span className={`font-mono text-[10px] uppercase tracking-[0.2em] ${thresholdsMet ? 'text-toxic-300' : 'text-blood-300'}`}>
          {thresholdsMet ? 'Threshold met' : 'Threshold not met'}
        </span>
        <button onClick={() => void saveReview()} disabled={saving || loading} className="btn-ghost !text-xs">
          {saving ? 'Saving…' : 'Save quality evidence'}
        </button>
      </div>
      {error && <p className="mt-3 text-sm text-blood-300">{error}</p>}
    </section>
  )
}

function ScoreField({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (value: number) => void
}) {
  return (
    <div>
      <label className="field-label">{label}</label>
      <input
        type="number"
        min={0}
        max={100}
        value={value}
        onChange={(event) => onChange(clampScore(event.target.value))}
        className="field-input"
      />
    </div>
  )
}

function RightsCompliancePanel({ job, projectId }: { job: Job; projectId: string }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [musicRightsOk, setMusicRightsOk] = useState(false)
  const [imageRightsOk, setImageRightsOk] = useState(false)
  const [clipRightsOk, setClipRightsOk] = useState(false)
  const [policySafetyOk, setPolicySafetyOk] = useState(false)
  const [publishAllowed, setPublishAllowed] = useState(false)
  const [notes, setNotes] = useState('')
  const [violationsText, setViolationsText] = useState('')

  const prerequisitesMet = musicRightsOk && imageRightsOk && clipRightsOk && policySafetyOk
  const allChecksPassed = prerequisitesMet && publishAllowed

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: loadError } = await supabase
      .from('rights_compliance_reviews')
      .select('*')
      .eq('job_id', job.id)
      .maybeSingle()

    if (loadError) {
      setError(loadError.message)
      setLoading(false)
      return
    }

    const review = data as RightsComplianceReview | null
    if (review) {
      setMusicRightsOk(review.music_rights_ok)
      setImageRightsOk(review.image_rights_ok)
      setClipRightsOk(review.clip_rights_ok)
      setPolicySafetyOk(review.policy_safety_ok)
      setPublishAllowed(review.publish_allowed)
      setNotes(review.notes ?? '')
      setViolationsText((review.violations ?? []).join(', '))
    }
    setLoading(false)
  }, [job.id])

  useEffect(() => {
    void load()
  }, [load])

  async function saveReview() {
    setSaving(true)
    setError(null)
    const effectivePublishAllowed = prerequisitesMet && publishAllowed
    const violations = violationsText
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean)

    const { error: saveError } = await supabase
      .from('rights_compliance_reviews')
      .upsert(
        {
          project_id: projectId,
          job_id: job.id,
          music_rights_ok: musicRightsOk,
          image_rights_ok: imageRightsOk,
          clip_rights_ok: clipRightsOk,
          policy_safety_ok: policySafetyOk,
          publish_allowed: effectivePublishAllowed,
          notes: notes.trim() || null,
          violations,
        },
        { onConflict: 'job_id' },
      )

    setSaving(false)
    if (saveError) {
      setError(saveError.message)
      return
    }

    setPublishAllowed(effectivePublishAllowed)
  }

  return (
    <section className="rounded-xl border border-blood-700/40 bg-blood-700/5 p-5">
      <h4 className="font-display text-lg font-semibold text-ink-100">Rights & compliance gate</h4>
      <p className="mt-1 text-sm text-ink-400">No rights, no publish. All checks must be true before publish is allowed.</p>
      {loading ? (
        <p className="mt-3 text-sm text-ink-400">Loading rights evidence…</p>
      ) : (
        <div className="mt-4 space-y-3 text-sm text-ink-200">
          <label className="flex items-center gap-2"><input type="checkbox" checked={musicRightsOk} onChange={(event) => setMusicRightsOk(event.target.checked)} /> Music rights verified</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={imageRightsOk} onChange={(event) => setImageRightsOk(event.target.checked)} /> Image rights verified</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={clipRightsOk} onChange={(event) => setClipRightsOk(event.target.checked)} /> Clip rights verified</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={policySafetyOk} onChange={(event) => setPolicySafetyOk(event.target.checked)} /> Policy safety verified</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={publishAllowed} onChange={(event) => setPublishAllowed(event.target.checked)} disabled={!prerequisitesMet} /> Publish allowed (enabled only after all checks pass)</label>
          <div>
            <label className="field-label">Violations (comma separated)</label>
            <input value={violationsText} onChange={(event) => setViolationsText(event.target.value)} className="field-input" placeholder="missing license, policy mismatch" />
          </div>
          <div>
            <label className="field-label">Notes</label>
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} className="field-textarea !min-h-0 text-sm" />
          </div>
        </div>
      )}
      <div className="mt-4 flex items-center gap-3">
        <span className={`font-mono text-[10px] uppercase tracking-[0.2em] ${allChecksPassed ? 'text-toxic-300' : 'text-blood-300'}`}>
          {allChecksPassed ? 'Gate ready' : 'Gate blocked'}
        </span>
        <button onClick={() => void saveReview()} disabled={saving || loading} className="btn-ghost !text-xs">
          {saving ? 'Saving…' : 'Save rights evidence'}
        </button>
      </div>
      {error && <p className="mt-3 text-sm text-blood-300">{error}</p>}
    </section>
  )
}

function ContinuityGatePanel({ job, projectId }: { job: Job; projectId: string }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [continuityBibleId, setContinuityBibleId] = useState('')
  const [continuityScore, setContinuityScore] = useState(90)
  const [publishReady, setPublishReady] = useState(false)
  const [issuesText, setIssuesText] = useState('')
  const [fixPlan, setFixPlan] = useState('')
  const [bibleOptions, setBibleOptions] = useState<string[]>([])

  const gateReady = publishReady && continuityScore >= 85

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const [checkResult, bibleResult] = await Promise.all([
      supabase
        .from('continuity_checks')
        .select('*')
        .eq('job_id', job.id)
        .maybeSingle(),
      supabase
        .from('continuity_bibles')
        .select('id')
        .order('id', { ascending: true }),
    ])

    if (checkResult.error || bibleResult.error) {
      setError(checkResult.error?.message || bibleResult.error?.message || 'Continuity evidence unavailable.')
      setLoading(false)
      return
    }

    const options = (bibleResult.data ?? []).map((row) => String(row.id))
    setBibleOptions(options)

    const review = checkResult.data as ContinuityCheck | null
    if (review) {
      setContinuityBibleId(review.continuity_bible_id)
      setContinuityScore(review.continuity_score)
      setPublishReady(review.publish_ready)
      setIssuesText((review.issues ?? []).join(', '))
      setFixPlan(review.fix_plan ?? '')
    } else if (options.length > 0) {
      setContinuityBibleId(options[0])
    } else {
      setContinuityBibleId('')
    }
    setLoading(false)
  }, [job.id])

  useEffect(() => {
    void load()
  }, [load])

  async function saveContinuity() {
    setSaving(true)
    setError(null)
    const effectivePublishReady = publishReady && continuityScore >= 85
    const selectedBibleId = continuityBibleId.trim()
    if (!selectedBibleId || !bibleOptions.includes(selectedBibleId)) {
      setSaving(false)
      setError('Continuity Bible evidence is unavailable. Load a valid continuity_bible_id before saving.')
      return
    }
    const issues = issuesText
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean)

    const { error: saveError } = await supabase
      .from('continuity_checks')
      .upsert(
        {
          project_id: projectId,
          job_id: job.id,
          continuity_bible_id: selectedBibleId,
          continuity_score: continuityScore,
          issues,
          fix_plan: fixPlan.trim() || null,
          publish_ready: effectivePublishReady,
        },
        { onConflict: 'job_id' },
      )

    setSaving(false)
    if (saveError) {
      setError(saveError.message)
      return
    }

    setContinuityBibleId(selectedBibleId)
    setPublishReady(effectivePublishReady)
  }

  return (
    <section className="rounded-xl border border-ink-700 bg-ink-900/40 p-5">
      <h4 className="font-display text-lg font-semibold text-ink-100">Continuity Bible gate</h4>
      <p className="mt-1 text-sm text-ink-400">Every publish flow must pass continuity Bible review with score ≥ 85.</p>
      {loading ? (
        <p className="mt-3 text-sm text-ink-400">Loading continuity evidence…</p>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="field-label">Continuity bible id</label>
            <select value={continuityBibleId} onChange={(event) => setContinuityBibleId(event.target.value)} className="field-input">
              {bibleOptions.length === 0 && <option value="">No continuity bibles available</option>}
              {bibleOptions.map((bibleId) => (
                <option key={bibleId} value={bibleId}>{bibleId}</option>
              ))}
            </select>
          </div>
          <ScoreField label="Continuity score" value={continuityScore} onChange={setContinuityScore} />
          <label className="flex items-end gap-2 pb-2 text-sm text-ink-200">
            <input type="checkbox" checked={publishReady} onChange={(event) => setPublishReady(event.target.checked)} disabled={continuityScore < 85} />
            Mark continuity publish-ready (requires score ≥ 85)
          </label>
          <div className="sm:col-span-2">
            <label className="field-label">Continuity issues (comma separated)</label>
            <input value={issuesText} onChange={(event) => setIssuesText(event.target.value)} className="field-input" placeholder="timeline mismatch, character trait drift" />
          </div>
          <div className="sm:col-span-2">
            <label className="field-label">Fix plan</label>
            <textarea value={fixPlan} onChange={(event) => setFixPlan(event.target.value)} rows={3} className="field-textarea !min-h-0 text-sm" />
          </div>
        </div>
      )}
      <div className="mt-4 flex items-center gap-3">
        <span className={`font-mono text-[10px] uppercase tracking-[0.2em] ${gateReady ? 'text-toxic-300' : 'text-blood-300'}`}>
          {gateReady ? 'Gate ready' : 'Gate blocked'}
        </span>
        <button onClick={() => void saveContinuity()} disabled={saving || loading || bibleOptions.length === 0} className="btn-ghost !text-xs">
          {saving ? 'Saving…' : 'Save continuity evidence'}
        </button>
      </div>
      {error && <p className="mt-3 text-sm text-blood-300">{error}</p>}
    </section>
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
