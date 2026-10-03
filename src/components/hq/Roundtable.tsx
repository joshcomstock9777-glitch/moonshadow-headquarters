import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import type { RoundtableMessage, Project } from '../../lib/hqTypes'
import { ROLES, ROLE_META, type Role, logActivity, timeAgo } from '../../lib/hq'
import { navigate } from '../../lib/router'
import { requestRoundtableReply } from '../../lib/pathRoundtable'

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
  const scrollRef = useRef<HTMLDivElement>(null)
  const followLatest = useRef(true)
  const loadRequest = useRef(0)

  const load = useCallback(async (showLoading = false) => {
    const request = ++loadRequest.current
    if (showLoading) setLoading(true)
    setLoadError(null)
    let query = supabase
      .from('roundtable_messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
    query = selectedProject ? query.eq('project_id', selectedProject) : query.is('project_id', null)

    const [msgs, ps] = await Promise.all([
      query,
      supabase.from('projects').select('*').order('updated_at', { ascending: false }).limit(20),
    ])

    if (request !== loadRequest.current) return
    const failures: string[] = []
    if (msgs.error) failures.push(`messages: ${msgs.error.message}`)
    if (ps.error) failures.push(`projects: ${ps.error.message}`)

    if (!msgs.error) setMessages((msgs.data ?? []).reverse())
    if (!ps.error) setProjects(ps.data ?? [])
    if (failures.length) setLoadError(failures.join(' · '))
    setLoading(false)
  }, [selectedProject])

  useEffect(() => setSelectedProject(projectId ?? null), [projectId])

  useEffect(() => {
    setSendError(null)
    followLatest.current = true
    setMessages([])
    void load(true)
    const timer = window.setInterval(() => void load(), 5000)
    return () => {
      window.clearInterval(timer)
      loadRequest.current += 1
    }
  }, [load])

  useEffect(() => {
    if (scrollRef.current && followLatest.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  async function send(e: { preventDefault(): void }, messageOverride?: string) {
    e.preventDefault()
    const creatorMessage = (messageOverride ?? input).trim()
    if (sending || !creatorMessage) return

    setSendError(null)
    if (new TextEncoder().encode(creatorMessage).length > 6000) {
      setSendError('Message is too long. Split it into shorter messages.')
      return
    }
    setSending(true)

    try {
      const { data: creatorRow, error } = await supabase.from('roundtable_messages').insert({
        project_id: selectedProject,
        role: 'creator',
        message: creatorMessage,
        addressed_to: addressTo,
        kind: 'message',
      }).select('id').single()
      if (error) throw error
      if (!creatorRow) throw new Error('Your message could not be saved')

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

      if (!messageOverride) setInput((current) => current.trim() === creatorMessage ? '' : current)
      followLatest.current = true
      void load()

      const addressed = addressTo === 'everybody' ? ROLES : [addressTo as Role]
      const failures: string[] = []

      for (const role of addressed) {
        try {
        const response = await requestRoundtableReply(role, creatorMessage, { creatorMessageId: creatorRow.id })
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
    } catch (error) {
      setSendError(error instanceof Error ? error.message : 'Could not send the message')
    } finally {
      setSending(false)
      void load()
    }
  }

  return (
    <section className="flex h-full min-h-0 flex-col" aria-label="Roundtable conversation">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 pb-2">
        <h1 className="text-lg font-semibold">Roundtable</h1>
        <div className="flex items-center gap-2">
          <select
            aria-label="Conversation room"
            value={selectedProject ?? ''}
            onChange={(e) => {
              setSelectedProject(e.target.value || null)
              navigate({ name: 'hq-roundtable', projectId: e.target.value || undefined })
            }}
            className="field-select !w-auto max-w-[55vw] !py-2 !text-sm"
            disabled={sending || (!!loadError && projects.length === 0)}
          >
            <option value="">General room</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
          <button type="button" onClick={() => void load()} className="btn-secondary !px-3 !py-2">Refresh</button>
        </div>
      </div>

      {loadError && <p role="alert" className="shrink-0 pb-2 text-sm text-blood-300">Could not refresh the room: {loadError}</p>}

      <div
        ref={scrollRef}
        role="log"
        aria-label="Shared comments"
        aria-live="polite"
        onScroll={() => {
          const element = scrollRef.current
          if (element) followLatest.current = element.scrollHeight - element.scrollTop - element.clientHeight < 80
        }}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 sm:px-4"
      >
        {loading && messages.length === 0 ? <p className="py-4 text-ink-400">Loading…</p>
          : loadError && messages.length === 0 ? <p className="py-4 text-blood-300">The conversation could not be loaded. Try Refresh.</p>
          : messages.length === 0 ? <p className="py-4 text-ink-300">Say something to start the conversation.</p>
          : messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)}
        {sending && <p role="status" className="py-3 text-sm text-ink-400">Waiting for replies…</p>}
        {sendError && <p role="alert" className="py-3 text-sm text-blood-300">{sendError}</p>}
      </div>

      <form onSubmit={send} className="shrink-0 border-t border-ink-800 pt-2 pb-[env(safe-area-inset-bottom)]">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <label className="flex items-center gap-2 text-sm text-ink-300">
            Send to
            <select value={addressTo} onChange={(e) => setAddressTo(e.target.value as AddressTarget)} disabled={sending} className="field-select !w-auto !py-1.5 !text-sm">
              {ADDRESS_TARGETS.map((t) => <option key={t} value={t}>{t === 'everybody' ? 'Everybody' : ROLE_META[t as Role]?.name ?? t}</option>)}
            </select>
          </label>
          <button
            type="button"
            disabled={sending || !messages.some((msg) => msg.role !== 'creator')}
            onClick={(e) => void send(e, 'Read the latest replies in this room. Respond to the other speakers: say what you agree with, what you would change, and help us move the creative idea forward.')}
            className="btn-secondary !px-3 !py-2 disabled:opacity-40"
          >Discuss replies</button>
        </div>
        <div className="flex items-end gap-2">
          <textarea
            aria-label="Message to the room"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault()
                void send(e)
              }
            }}
            className="field-textarea !min-h-[60px] min-w-0 flex-1 resize-none !text-base"
            placeholder="Talk to the room…"
            rows={2}
          />
          <button type="submit" disabled={sending || !input.trim()} className="btn-primary !px-4 disabled:opacity-40">Send</button>
        </div>
      </form>
    </section>
  )
}

function MessageBubble({ msg }: { msg: RoundtableMessage }) {
  const name = msg.role === 'creator' ? 'You' : ROLE_META[msg.role as Role]?.name ?? msg.role
  return (
    <article className="min-w-0 border-b border-ink-800 py-4">
      <div className="mb-1 flex flex-wrap items-center gap-2 text-sm">
        <span className="font-semibold text-ink-200">{name}</span>
        <span className="text-xs text-ink-500">{timeAgo(msg.created_at)}</span>
      </div>
      <p className="whitespace-pre-wrap break-words text-base leading-relaxed text-ink-100 [overflow-wrap:anywhere]">{msg.message}</p>
      {msg.path_session_id && msg.path_correlation_id && (
        <details className="mt-2 text-xs text-ink-400">
          <summary>{msg.path_evidence_verified ? 'Verified reply' : 'Reply recorded · verification pending'}</summary>
          <p className="mt-1 break-words">Target: {msg.path_target ?? 'unknown'} · Session: {msg.path_session_id} · Correlation: {msg.path_correlation_id}</p>
        </details>
      )}
      {msg.kind === 'proposal' && msg.proposed_action && <p className="mt-2 whitespace-pre-wrap break-words text-base text-amber-300">Proposed action: {msg.proposed_action}</p>}
    </article>
  )
}
