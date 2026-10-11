import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import type { RoundtableMessage, Project } from '../../lib/hqTypes'
import { ROLES, ROLE_META, type Role, logActivity, timeAgo } from '../../lib/hq'
import { navigate } from '../../lib/router'
import { requestRoundtableReply } from '../../lib/pathRoundtable'

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
  const [participants, setParticipants] = useState<Role[]>([...ROLES])
  const [replyTo, setReplyTo] = useState<RoundtableMessage | null>(null)
  const [answeringRole, setAnsweringRole] = useState<Role | null>(null)
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
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
    setReplyTo(null)
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
  }, [messages, answeringRole, sendError])

  async function send(e: { preventDefault(): void }, messageOverride?: string) {
    e.preventDefault()
    const draft = (messageOverride ?? input).trim()
    const addressed = !messageOverride && replyTo ? [replyTo.role as Role] : participants
    const creatorMessage = replyTo && !messageOverride
      ? `Reply to ${ROLE_META[replyTo.role as Role].name} (comment ${replyTo.id}):\n${replyTo.message.slice(0, 1800)}\n\nMy reply:\n${draft}`
      : draft
    if (sending || !draft) return
    if (!addressed.length) {
      setSendError('Turn on at least one speaker before sending.')
      return
    }
    const addressTo = addressed.length === 1 ? addressed[0] : 'everybody'

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

      if (!messageOverride) {
        setInput((current) => current.trim() === draft ? '' : current)
        setReplyTo(null)
      }
      followLatest.current = true
      void load()

      const failures: string[] = []

      for (const role of addressed) {
        setAnsweringRole(role)
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
      setAnsweringRole(null)
      setSending(false)
      void load()
    }
  }

  return (
    <main className="relative z-10 flex h-dvh min-h-0 w-full flex-col bg-ink-950" aria-label="Roundtable conversation">
      <header className="shrink-0 border-b border-ink-700 bg-ink-900 px-3 py-2 sm:px-6 sm:py-3">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-xl font-semibold text-ink-100">Roundtable</h1>
            <a href="#/hq/command" className="rounded-lg px-2 py-2 text-sm text-ink-200 hover:text-blood-300">← Headquarters</a>
          </div>
          <div className="mt-1 flex items-center gap-2">
          <select
            aria-label="Conversation room"
            value={selectedProject ?? ''}
            onChange={(e) => {
              setSelectedProject(e.target.value || null)
              navigate({ name: 'hq-roundtable', projectId: e.target.value || undefined })
            }}
            className="field-select min-w-0 flex-1 !py-2 !text-sm"
            disabled={sending || (!!loadError && projects.length === 0)}
          >
            <option value="">General room</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
          <button type="button" onClick={() => void load()} className="btn-secondary !px-3 !py-2">Refresh</button>
          </div>
          <div className="mt-2 grid grid-cols-4 gap-1 sm:gap-3" aria-label="Conversation participants">
            {ROLES.map((role) => {
              const enabled = participants.includes(role)
              const answering = answeringRole === role
              return (
                <button
                  key={role}
                  type="button"
                  aria-pressed={enabled}
                  aria-label={`${ROLE_META[role].name}: ${enabled ? 'in conversation' : 'off'}`}
                  title={ROLE_META[role].title}
                  disabled={sending}
                  onClick={() => {
                    setParticipants((current) => enabled ? current.filter((item) => item !== role) : ROLES.filter((item) => item === role || current.includes(item)))
                    if (!enabled || replyTo?.role === role) setReplyTo(null)
                  }}
                  className={`min-w-0 rounded-lg border px-1 py-2 text-xs sm:text-base transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-toxic-300 ${enabled ? 'border-toxic-400/60 bg-toxic-900 text-toxic-300' : 'border-ink-700 bg-ink-950 text-ink-300'} ${answering ? 'ring-2 ring-toxic-300' : ''}`}
                >
                  <span className="flex flex-col items-center justify-center gap-1 sm:flex-row sm:gap-2">
                    <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${answering ? 'motion-safe:animate-pulse bg-toxic-300 shadow-[0_0_10px_#7fd0bf]' : enabled ? 'bg-toxic-400' : 'bg-ink-600'}`} />
                    {ROLE_META[role].name}
                  </span>
                  <span className="mt-1 block text-[10px] sm:text-xs">{answering ? 'Replying…' : enabled ? 'On' : 'Off'}</span>
                </button>
              )
            })}
          </div>
        </div>
      </header>

      {loadError && <p role="alert" className="shrink-0 px-3 py-2 text-sm text-blood-300">Could not refresh the room: {loadError}</p>}

      <div
        ref={scrollRef}
        role="log"
        aria-label="Shared comments"
        aria-live="polite"
        onScroll={() => {
          const element = scrollRef.current
          if (element) followLatest.current = element.scrollHeight - element.scrollTop - element.clientHeight < 80
        }}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6"
      >
        <div className="mx-auto w-full max-w-5xl">
        {loading && messages.length === 0 ? <p className="py-4 text-ink-400">Loading…</p>
          : loadError && messages.length === 0 ? <p className="py-4 text-blood-300">The conversation could not be loaded. Try Refresh.</p>
          : messages.length === 0 ? <p className="py-4 text-ink-300">Say something to start the conversation.</p>
          : messages.map((msg) => <MessageBubble key={msg.id} msg={msg} disabled={sending} onReply={() => {
            const role = msg.role as Role
            setParticipants((current) => ROLES.filter((item) => item === role || current.includes(item)))
            setReplyTo(msg)
            setSendError(null)
            inputRef.current?.focus()
          }} />)}
        {sending && <p role="status" className="py-3 text-sm text-toxic-300">{answeringRole ? `${ROLE_META[answeringRole].name} is preparing a reply…` : 'Saving your message…'}</p>}
        {sendError && <p role="alert" className="py-3 text-sm text-blood-300">{sendError}</p>}
        </div>
      </div>

      <form onSubmit={send} className="shrink-0 border-t border-ink-700 bg-ink-900 px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-6">
        <div className="mx-auto max-w-5xl">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-ink-200">
            {replyTo ? `Reply to ${ROLE_META[replyTo.role as Role].name}` : participants.length === 1 ? `Send to ${ROLE_META[participants[0]].name}` : participants.length ? `${participants.length} speakers selected` : 'Turn on a speaker above'}
          </p>
          <div className="flex items-center gap-2">
          <button type="button" title="Prepare a script request for Allie" disabled={sending} onClick={() => {
            setReplyTo(null)
            setParticipants(['allie'])
            setInput((current) => `Write a complete script from ${current.trim() ? `this idea: ${current.trim()}` : 'the creative idea and replies already in this room'}. Include a title, character list, scene directions, dialogue or narration, and sound cues. Give me the actual draft to read and revise.`)
            inputRef.current?.focus()
          }} className="btn-secondary !px-3 !py-2 disabled:opacity-40">Draft script</button>
          <button
            type="button"
            disabled={sending || participants.length === 0 || !messages.some((msg) => msg.role !== 'creator')}
            onClick={(e) => void send(e, 'Read the latest replies in this room. Respond to the other speakers: say what you agree with, what you would change, and help us move the creative idea forward.')}
            className="btn-secondary !px-3 !py-2 disabled:opacity-40"
          >Discuss replies</button>
          </div>
        </div>
        {replyTo && <div className="mb-2 flex items-start justify-between gap-3 rounded-lg border border-ink-600 px-3 py-2 text-sm text-ink-200">
          <p className="line-clamp-2 whitespace-pre-wrap">{replyTo.message}</p>
          <button type="button" disabled={sending} onClick={() => setReplyTo(null)} className="shrink-0 text-toxic-300">Cancel reply</button>
        </div>}
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
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
          <button type="submit" disabled={sending || !input.trim() || participants.length === 0} className="btn-primary !px-4 disabled:opacity-40">Send</button>
        </div>
        </div>
      </form>
    </main>
  )
}

function MessageBubble({ msg, disabled, onReply }: { msg: RoundtableMessage; disabled: boolean; onReply(): void }) {
  const name = msg.role === 'creator' ? 'You' : ROLE_META[msg.role as Role]?.name ?? msg.role
  return (
    <article className="min-w-0 border-b border-ink-800 py-4">
      <div className="mb-1 flex flex-wrap items-center gap-2 text-sm">
        <span className="font-semibold text-ink-200">{name}</span>
        <span className="text-xs text-ink-300">{timeAgo(msg.created_at)}</span>
        {ROLES.includes(msg.role as Role) && <button type="button" disabled={disabled} onClick={onReply} className="ml-auto rounded-lg px-3 py-2 text-sm text-toxic-300 hover:bg-toxic-900 disabled:opacity-40">Reply to {name}</button>}
      </div>
      <p className="whitespace-pre-wrap break-words text-[17px] leading-7 text-ink-100 [overflow-wrap:anywhere]">{msg.message}</p>
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
