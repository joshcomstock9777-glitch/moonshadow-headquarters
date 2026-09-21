import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import type { RoundtableMessage, Project } from '../../lib/hqTypes'
import { ROLES, ROLE_META, type Role, logActivity, timeAgo } from '../../lib/hq'
import { navigate } from '../../lib/router'
import { requestRoundtableReply } from '../../lib/pathRoundtable'
import WorkspaceIntake from '../shared/WorkspaceIntake'
import MessageAttachments from '../shared/MessageAttachments'
import type { WorkspaceAttachment } from '../../lib/workspaceAttachments'

const ADDRESS_TARGETS = ['everybody', ...ROLES] as const
type AddressTarget = (typeof ADDRESS_TARGETS)[number]

type VerifyRoundtableEvidenceResult = {
  verified?: boolean
  error?: string
}

function pathTargetForRole(role: Role): 'allie' | 'amber' {
  return role === 'watcher' ? 'amber' : 'allie'
}

async function verifyRecordedPathEvidence(messageId: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke<VerifyRoundtableEvidenceResult>(
    'verify-roundtable-path-evidence',
    { body: { messageId } },
  )

  if (error) throw error
  if (!data?.verified) throw new Error(data?.error || 'Path evidence could not be verified')
}

export default function Roundtable({ projectId }: { projectId?: string }) {
  const [messages, setMessages] = useState<RoundtableMessage[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<string | null>(projectId ?? null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [addressTo, setAddressTo] = useState<AddressTarget>('everybody')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [attachments, setAttachments] = useState<WorkspaceAttachment[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    let query = supabase
      .from('roundtable_messages')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(100)
    if (selectedProject) query = query.eq('project_id', selectedProject)

    const [msgs, ps] = await Promise.all([
      query,
      supabase.from('projects').select('*').order('updated_at', { ascending: false }).limit(20),
    ])

    const failures: string[] = []
    if (msgs.error) failures.push(`messages: ${msgs.error.message}`)
    if (ps.error) failures.push(`projects: ${ps.error.message}`)

    if (!msgs.error) setMessages(msgs.data ?? [])
    if (!ps.error) setProjects(ps.data ?? [])
    if (failures.length) setLoadError(failures.join(' · '))
    setLoading(false)
  }, [selectedProject])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  async function send(e: React.FormEvent) {
    e.preventDefault()
    const creatorMessage = input.trim()
    if (sending || !creatorMessage) return

    setSending(true)
    setSendError(null)

    const { error } = await supabase.from('roundtable_messages').insert({
      project_id: selectedProject,
      role: 'creator',
      message: creatorMessage,
      addressed_to: addressTo,
      kind: 'message',
      attachments,
    })
    if (error) {
      setSendError(error.message)
      setSending(false)
      return
    }

    if (selectedProject) {
      await logActivity(
        selectedProject,
        null,
        'Creator',
        `addressed ${addressTo} in Roundtable`,
        'info',
        creatorMessage.slice(0, 80),
      )
    }

    setInput('')
    const sentAttachments = attachments
    setAttachments([])
    void load()

    const addressed = addressTo === 'everybody' ? ROLES : [addressTo as Role]
    const failures: string[] = []

    for (const role of addressed) {
      try {
        const response = await requestRoundtableReply(role, creatorMessage, sentAttachments)
        const { data: inserted, error: insertError } = await supabase
          .from('roundtable_messages')
          .insert({
            project_id: selectedProject,
            role,
            message: response.message,
            addressed_to: 'creator',
            kind: 'message',
            proposed_action: null,
            path_session_id: response.sessionId,
            path_correlation_id: response.correlationId,
            path_target: pathTargetForRole(role),
            path_evidence_verified: false,
            attachments: [],
          })
          .select('id')
          .single()
        if (insertError) throw insertError

        let evidenceVerified = false
        try {
          await verifyRecordedPathEvidence(inserted.id)
          evidenceVerified = true
        } catch (verificationError) {
          const verificationMessage = verificationError instanceof Error ? verificationError.message : 'verification failed'
          failures.push(
            `${ROLE_META[role].name}: reply recorded, verification pending (${verificationMessage})`,
          )
          if (selectedProject) {
            await logActivity(
              selectedProject,
              null,
              ROLE_META[role].name,
              'Roundtable Path evidence verification failed',
              'warning',
              `Session ${response.sessionId.slice(0, 12)}… · ${verificationMessage.slice(0, 120)}`,
            )
          }
        }

        if (selectedProject && evidenceVerified) {
          await logActivity(
            selectedProject,
            null,
            ROLE_META[role].name,
            'responded through verified Moonshadow Path evidence',
            'success',
            `Path session ${response.sessionId.slice(0, 12)}… · correlation ${response.correlationId.slice(0, 12)}…`,
          )
        }
        void load()
      } catch (err) {
        failures.push(`${ROLE_META[role].name}: ${err instanceof Error ? err.message : 'Path request failed'}`)
      }
    }

    if (failures.length) setSendError(failures.join(' · '))
    setSending(false)
    void load()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="section-eyebrow"><span className="h-px w-8 bg-blood-700" /> Roundtable</p>
          <h1 className="section-title">The room where the work <span className="italic text-blood-500">gets shaped.</span></h1>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedProject ?? ''}
            onChange={(e) => {
              setSelectedProject(e.target.value || null)
              if (e.target.value) navigate({ name: 'hq-roundtable', projectId: e.target.value })
            }}
            className="field-select !w-auto !py-2 !text-xs"
            disabled={!!loadError && projects.length === 0}
          >
            <option value="">All projects</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {ROLES.map((role) => {
          const meta = ROLE_META[role]
          return (
            <div key={role} className="rounded-xl border border-ink-800 bg-ink-900/30 p-4">
              <div className="flex items-center gap-2">
                <span className="font-display text-2xl text-blood-500">{meta.glyph}</span>
                <div>
                  <p className="text-sm font-semibold text-ink-100">{meta.name}</p>
                  <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-500">{meta.title}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {loadError && (
        <div className="rounded-xl border border-blood-700/50 bg-blood-900/10 px-4 py-3 text-sm text-blood-300">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>Roundtable live evidence unavailable: {loadError}</span>
            <button type="button" onClick={() => void load()} className="btn-secondary !px-3 !py-1.5 !text-[10px]">Retry evidence</button>
          </div>
        </div>
      )}

      <div className="card flex h-[55vh] flex-col overflow-hidden">
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-6">
          {loading ? (
            <p className="text-ink-400">Loading…</p>
          ) : loadError && messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <p className="text-blood-300">Roundtable messages could not be verified from Supabase.</p>
              <p className="mt-2 text-sm text-ink-500">No empty-room status is being inferred while live evidence is unavailable.</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <p className="text-ink-300">The Roundtable is quiet. Say something to get it started.</p>
              <p className="mt-2 text-sm text-ink-500">Address everybody, or pick a specialist.</p>
            </div>
          ) : (
            messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)
          )}
          {sending && (
            <div className="flex items-center gap-2 text-ink-500">
              <span className="h-2 w-2 animate-pulse rounded-full bg-blood-500" />
              <span className="font-mono text-[10px] uppercase tracking-[0.2em]">Path is routing the room…</span>
            </div>
          )}
          {sendError && (
            <div className="rounded-lg border border-blood-700/50 bg-blood-900/10 px-4 py-3 text-sm text-blood-300">
              Roundtable connection error: {sendError}
            </div>
          )}
        </div>

        <div className="border-t border-ink-800 p-4">
          <form onSubmit={send} className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-500">Address:</span>
              {ADDRESS_TARGETS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setAddressTo(t)}
                  className={`rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-[0.15em] transition-all ${addressTo === t ? 'bg-blood-700/20 text-blood-300' : 'text-ink-400 hover:text-ink-200'}`}
                >
                  {t === 'everybody' ? 'Everybody' : ROLE_META[t as Role]?.name ?? t}
                </button>
              ))}
            </div>
            <div className="flex items-end gap-3">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    void send(e as any)
                  }
                }}
                className="field-textarea !min-h-[60px] flex-1 resize-none"
                placeholder="Speak to the room…"
                rows={2}
              />
              <button type="submit" disabled={sending || !input.trim()} className="btn-primary flex-none">Send</button>
            </div>
            <WorkspaceIntake
              projectId={selectedProject}
              attachments={attachments}
              onChange={setAttachments}
              onInsertText={(text) => setInput((current) => [current, text].filter(Boolean).join(current ? '\n' : ''))}
              compact
            />
          </form>
        </div>
      </div>
    </div>
  )
}

function MessageBubble({ msg }: { msg: RoundtableMessage }) {
  const isCreator = msg.role === 'creator'
  const roleMeta = ROLE_META[msg.role as Role]
  const name = isCreator ? 'You' : roleMeta?.name ?? msg.role

  const roleColor =
    msg.role === 'herman'
      ? 'text-toxic-300'
      : msg.role === 'allie'
        ? 'text-amber-300'
        : msg.role === 'challenger'
          ? 'text-blood-300'
          : msg.role === 'watcher'
            ? 'text-ink-300'
            : 'text-blood-400'

  return (
    <div className={`flex ${isCreator ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] ${isCreator ? 'items-end' : 'items-start'}`}>
        <div className="mb-1 flex items-center gap-2">
          <span className={`font-mono text-[10px] uppercase tracking-[0.2em] ${roleColor}`}>{name}</span>
          {msg.addressed_to && msg.addressed_to !== 'creator' && (
            <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-600">
              → {msg.addressed_to === 'everybody' ? 'all' : ROLE_META[msg.addressed_to as Role]?.name ?? msg.addressed_to}
            </span>
          )}
          <span className="font-mono text-[9px] text-ink-600">{timeAgo(msg.created_at)}</span>
        </div>
        <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${isCreator ? 'rounded-tr-sm border border-blood-700/40 bg-blood-700/10 text-ink-100' : msg.kind === 'proposal' ? 'rounded-tl-sm border border-amber-700/40 bg-amber-700/5 text-ink-100' : 'rounded-tl-sm border border-ink-700 bg-ink-900/40 text-ink-200'}`}>
          {msg.message}
          <MessageAttachments attachments={msg.attachments ?? []} />
          {msg.path_session_id && msg.path_correlation_id && (
            <div className={`mt-3 border-t border-ink-800 pt-2 font-mono text-[9px] uppercase tracking-[0.15em] ${msg.path_evidence_verified ? 'text-toxic-300' : 'text-amber-300'}`}>
              {msg.path_evidence_verified ? 'Verified Path evidence' : 'Path response recorded · backend verification pending'} · target {msg.path_target ?? 'unknown'} · session {msg.path_session_id.slice(0, 12)}… · correlation {msg.path_correlation_id.slice(0, 12)}…
            </div>
          )}
          {msg.kind === 'proposal' && msg.proposed_action && (
            <div className="mt-3 rounded-lg border border-amber-700/40 bg-amber-700/10 px-3 py-2">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber-300">Proposed action</p>
              <p className="mt-1 text-sm text-ink-200">{msg.proposed_action}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
