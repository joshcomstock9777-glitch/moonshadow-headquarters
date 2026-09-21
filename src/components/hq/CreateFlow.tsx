import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Project, Job } from '../../lib/hqTypes'
import {
  PROJECT_TYPES,
  PROJECT_TYPE_LABELS,
  STAGES,
  logActivity,
} from '../../lib/hq'
import { navigate } from '../../lib/router'
import { requestRoundtableReply } from '../../lib/pathRoundtable'
import WorkspaceIntake from '../shared/WorkspaceIntake'
import {
  linkAttachmentsToProject,
  type WorkspaceAttachment,
} from '../../lib/workspaceAttachments'

const TONES = [
  'Slow-building dread',
  'Visceral / intense',
  'Quiet and psychological',
  'Surreal and dreamlike',
  'Bleak and hopeless',
]

const PLATFORMS = ['YouTube', 'Instagram', 'TikTok', 'X', 'Internal', 'Other']

type VerifyRoundtableEvidenceResult = {
  verified?: boolean
  error?: string
}

type CreateResult = {
  project: Project
  job: Job
  kickoff: {
    sessionId: string
    correlationId: string
  } | null
  kickoffError: string | null
}

async function verifyRecordedPathEvidence(messageId: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke<VerifyRoundtableEvidenceResult>(
    'verify-roundtable-path-evidence',
    { body: { messageId } },
  )

  if (error) throw error
  if (!data?.verified) throw new Error(data?.error || 'Path evidence could not be verified')
}

export default function CreateFlow() {
  const [idea, setIdea] = useState('')
  const [type, setType] = useState('short-film')
  const [tone, setTone] = useState('')
  const [platform, setPlatform] = useState('')
  const [duration, setDuration] = useState('')
  const [title, setTitle] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<CreateResult | null>(null)
  const [attachments, setAttachments] = useState<WorkspaceAttachment[]>([])

  async function onCreate(e: React.FormEvent) {
    e.preventDefault()
    if (creating || !idea.trim()) return
    setCreating(true)
    setError('')

    const creatorBrief = idea.trim()
    const projectTitle = title.trim() || creatorBrief.slice(0, 60)

    try {
      const { data: projData, error: projErr } = await supabase
        .from('projects')
        .insert({
          title: projectTitle,
          goal: creatorBrief,
          status: 'active',
          type,
          tone: tone || null,
          target_platform: platform || null,
          duration: duration || null,
        })
        .select()
        .single()
      if (projErr) throw projErr

      await linkAttachmentsToProject(attachments, projData.id)

      const { data: jobData, error: jobErr } = await supabase
        .from('jobs')
        .insert({
          project_id: projData.id,
          title: projectTitle,
          kind: 'production',
          stage: 'idea',
          brief: creatorBrief,
        })
        .select()
        .single()
      if (jobErr) throw jobErr

      await logActivity(
        projData.id,
        jobData.id,
        'Creator',
        'created project and production job',
        'create',
        projectTitle,
      )

      const { error: creatorMessageError } = await supabase
        .from('roundtable_messages')
        .insert({
          project_id: projData.id,
          role: 'creator',
          message: creatorBrief,
          addressed_to: 'herman',
          kind: 'message',
          attachments,
        })
      if (creatorMessageError) {
        setResult({
          project: projData,
          job: jobData,
          kickoff: null,
          kickoffError: `Job created, but the Roundtable brief could not be persisted: ${creatorMessageError.message}`,
        })
        return
      }

      try {
        const response = await requestRoundtableReply('herman', creatorBrief, attachments)
        const { data: insertedReply, error: replyInsertError } = await supabase
          .from('roundtable_messages')
          .insert({
            project_id: projData.id,
            role: 'herman',
            message: response.message,
            addressed_to: 'creator',
            kind: 'message',
            proposed_action: null,
            path_session_id: response.sessionId,
            path_correlation_id: response.correlationId,
            path_target: 'allie',
            path_evidence_verified: false,
            attachments: [],
          })
          .select('id')
          .single()
        if (replyInsertError) throw replyInsertError

        await verifyRecordedPathEvidence(insertedReply.id)

        const { data: advancedJob, error: advanceError } = await supabase
          .from('jobs')
          .update({ stage: 'plan' })
          .eq('id', jobData.id)
          .select()
          .single()
        if (advanceError) throw advanceError

        await Promise.all([
          logActivity(
            projData.id,
            jobData.id,
            'Herman',
            'responded through Moonshadow Path with verified evidence',
            'success',
            `Path session ${response.sessionId.slice(0, 12)}… · correlation ${response.correlationId.slice(0, 12)}…`,
          ),
          logActivity(
            projData.id,
            jobData.id,
            'Herman',
            `advanced job to stage: ${STAGES[1]}`,
            'system',
          ),
        ])

        setResult({
          project: projData,
          job: advancedJob,
          kickoff: {
            sessionId: response.sessionId,
            correlationId: response.correlationId,
          },
          kickoffError: null,
        })
      } catch (kickoffErr) {
        const kickoffMessage = kickoffErr instanceof Error
          ? kickoffErr.message
          : 'Moonshadow Path kickoff failed'

        await logActivity(
          projData.id,
          jobData.id,
          'Herman',
          'Moonshadow Path kickoff or evidence verification failed; job remains at idea stage',
          'error',
          kickoffMessage.slice(0, 120),
        )

        setResult({
          project: projData,
          job: jobData,
          kickoff: null,
          kickoffError: kickoffMessage,
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create the job.')
    } finally {
      setCreating(false)
    }
  }

  if (result) {
    return (
      <div className="mx-auto max-w-2xl space-y-8">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-toxic-600/60 bg-toxic-700/10">
            <span className="font-display text-3xl text-toxic-400">✦</span>
          </div>
          <h1 className="mt-6 font-display text-3xl font-semibold text-ink-100">
            Job created.
          </h1>
          <p className="mt-3 text-ink-300">
            {result.kickoff
              ? 'Herman received the brief through Moonshadow Path, the backend verified the recorded evidence, and the job advanced to planning.'
              : 'The project and job are durable, but automatic Moonshadow Path kickoff did not complete with verified evidence.'}
          </p>
        </div>

        <div className="card p-6 space-y-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-500">
              Project
            </p>
            <p className="mt-1 text-lg text-ink-100">{result.project.title}</p>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-500">
              Job
            </p>
            <p className="mt-1 text-lg text-ink-100">{result.job.title}</p>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-500">
              Stage
            </p>
            <p className="mt-1 text-lg text-toxic-300">
              {result.kickoff ? 'Plan' : 'Idea'}
            </p>
          </div>
          {result.kickoff && (
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-500">
                Verified Path evidence
              </p>
              <p className="mt-1 break-all font-mono text-xs text-ink-300">
                session {result.kickoff.sessionId} · correlation {result.kickoff.correlationId}
              </p>
            </div>
          )}
          {result.kickoffError && (
            <div className="rounded-lg border border-amber-700/50 bg-amber-900/10 px-4 py-3 text-sm text-amber-300">
              Kickoff not verified: {result.kickoffError}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={() => navigate({ name: 'hq-project', id: result.project.id })}
            className="btn-primary"
          >
            Open Project
          </button>
          <button
            onClick={() => navigate({ name: 'hq-roundtable', projectId: result.project.id })}
            className="btn-ghost"
          >
            Take to Roundtable
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <p className="section-eyebrow">
          <span className="h-px w-8 bg-blood-700" /> Create
        </p>
        <h1 className="section-title">
          Bring an
          <span className="italic text-blood-500"> idea.</span>
        </h1>
        <p className="mt-4 text-ink-300">
          Headquarters will create a durable project and production job, then ask Herman to kick it off through Moonshadow Path.
        </p>
      </div>

      <form onSubmit={onCreate} className="card space-y-6 p-7">
        <div>
          <label className="field-label">
            Your idea <span className="text-blood-500">*</span>
          </label>
          <textarea
            required
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            className="field-textarea"
            placeholder="Make me a creepy 20-second short about something moving behind a bedroom door."
            rows={4}
          />
          <div className="mt-3">
            <WorkspaceIntake
              attachments={attachments}
              onChange={setAttachments}
              onInsertText={(text) => setIdea((current) => [current, text].filter(Boolean).join(current ? '\n' : ''))}
            />
          </div>
        </div>

        <div>
          <label className="field-label">Project title (optional)</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="field-input"
            placeholder="Auto-generated from your idea if left blank"
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="field-label">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="field-select"
            >
              {PROJECT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {PROJECT_TYPE_LABELS[t] ?? t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Tone</label>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="field-select"
            >
              <option value="">Choose…</option>
              {TONES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Target platform</label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="field-select"
            >
              <option value="">Choose…</option>
              {PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Duration</label>
            <input
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="field-input"
              placeholder="e.g. 20 seconds, 3 minutes"
            />
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-blood-700/60 bg-blood-900/30 px-4 py-3 text-sm text-blood-300">
            {error}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={creating || !idea.trim()}
            className="btn-primary"
          >
            {creating ? 'Creating…' : 'Create Job'}
          </button>
        </div>
      </form>
    </div>
  )
}
