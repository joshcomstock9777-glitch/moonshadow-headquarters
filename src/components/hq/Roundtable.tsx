import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import type { RoundtableMessage, Project } from '../../lib/hqTypes'
import { ROLES, ROLE_META, type Role, logActivity, timeAgo } from '../../lib/hq'
import { navigate } from '../../lib/router'

const ADDRESS_TARGETS = ['everybody', ...ROLES] as const
type AddressTarget = (typeof ADDRESS_TARGETS)[number]

export default function Roundtable({ projectId }: { projectId?: string }) {
  const [messages, setMessages] = useState<RoundtableMessage[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<string | null>(projectId ?? null)
  const [loading, setLoading] = useState(true)
  const [input, setInput] = useState('')
  const [addressTo, setAddressTo] = useState<AddressTarget>('everybody')
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('roundtable_messages')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(100)
    if (selectedProject) {
      query = query.eq('project_id', selectedProject)
    }
    const [msgs, ps] = await Promise.all([
      query,
      supabase.from('projects').select('*').order('updated_at', { ascending: false }).limit(20),
    ])
    setMessages(msgs.data ?? [])
    setProjects(ps.data ?? [])
    setLoading(false)
  }, [selectedProject])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  async function send(e: React.FormEvent) {
    e.preventDefault()
    if (sending || !input.trim()) return
    setSending(true)

    // Creator's message
    const { error } = await supabase.from('roundtable_messages').insert({
      project_id: selectedProject,
      role: 'creator',
      message: input.trim(),
      addressed_to: addressTo,
      kind: 'message',
    })
    if (error) {
      setSending(false)
      return
    }

    if (selectedProject) {
      await logActivity(selectedProject, null, 'Creator', `addressed ${addressTo} in Roundtable`, 'info', input.trim().slice(0, 80))
    }

    setInput('')

    // Simulated role responses — role system, not hard-coded personalities.
    // Each role responds based on its function.
    const addressed = addressTo === 'everybody' ? ROLES : [addressTo as Role]
    for (const role of addressed) {
      const response = generateRoleResponse(role, input.trim())
      if (response) {
        await new Promise((r) => setTimeout(r, 400 + Math.random() * 600))
        await supabase.from('roundtable_messages').insert({
          project_id: selectedProject,
          role,
          message: response.message,
          addressed_to: 'creator',
          kind: response.kind,
          proposed_action: response.proposedAction ?? null,
        })
      }
    }

    setSending(false)
    void load()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="section-eyebrow">
            <span className="h-px w-8 bg-blood-700" /> Roundtable
          </p>
          <h1 className="section-title">
            The room where the work
            <span className="italic text-blood-500"> gets shaped.</span>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedProject ?? ''}
            onChange={(e) => {
              setSelectedProject(e.target.value || null)
              if (e.target.value) {
                navigate({ name: 'hq-roundtable', projectId: e.target.value })
              }
            }}
            className="field-select !w-auto !py-2 !text-xs"
          >
            <option value="">All projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Role seats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {ROLES.map((role) => {
          const meta = ROLE_META[role]
          return (
            <div
              key={role}
              className="rounded-xl border border-ink-800 bg-ink-900/30 p-4"
            >
              <div className="flex items-center gap-2">
                <span className="font-display text-2xl text-blood-500">
                  {meta.glyph}
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink-100">
                    {meta.name}
                  </p>
                  <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-500">
                    {meta.title}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Conversation */}
      <div className="card flex h-[55vh] flex-col overflow-hidden">
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-6">
          {loading ? (
            <p className="text-ink-400">Loading…</p>
          ) : messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <p className="text-ink-300">
                The Roundtable is quiet. Say something to get it started.
              </p>
              <p className="mt-2 text-sm text-ink-500">
                Address everybody, or pick a specialist.
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <MessageBubble key={msg.id} msg={msg} />
            ))
          )}
          {sending && (
            <div className="flex items-center gap-2 text-ink-500">
              <span className="h-2 w-2 animate-pulse rounded-full bg-blood-500" />
              <span className="font-mono text-[10px] uppercase tracking-[0.2em]">
                The room is thinking…
              </span>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-ink-800 p-4">
          <form onSubmit={send} className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-500">
                Address:
              </span>
              {ADDRESS_TARGETS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setAddressTo(t)}
                  className={`rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-[0.15em] transition-all ${
                    addressTo === t
                      ? 'bg-blood-700/20 text-blood-300'
                      : 'text-ink-400 hover:text-ink-200'
                  }`}
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
              <button
                type="submit"
                disabled={sending || !input.trim()}
                className="btn-primary flex-none"
              >
                Send
              </button>
            </div>
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
          <span className={`font-mono text-[10px] uppercase tracking-[0.2em] ${roleColor}`}>
            {name}
          </span>
          {msg.addressed_to && msg.addressed_to !== 'creator' && (
            <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-600">
              → {msg.addressed_to === 'everybody' ? 'all' : ROLE_META[msg.addressed_to as Role]?.name ?? msg.addressed_to}
            </span>
          )}
          <span className="font-mono text-[9px] text-ink-600">
            {timeAgo(msg.created_at)}
          </span>
        </div>
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isCreator
              ? 'rounded-tr-sm border border-blood-700/40 bg-blood-700/10 text-ink-100'
              : msg.kind === 'proposal'
                ? 'rounded-tl-sm border border-amber-700/40 bg-amber-700/5 text-ink-100'
                : 'rounded-tl-sm border border-ink-700 bg-ink-900/40 text-ink-200'
          }`}
        >
          {msg.message}
          {msg.kind === 'proposal' && msg.proposed_action && (
            <div className="mt-3 rounded-lg border border-amber-700/40 bg-amber-700/10 px-3 py-2">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber-300">
                Proposed action
              </p>
              <p className="mt-1 text-sm text-ink-200">{msg.proposed_action}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Role-based response generation — each role responds from its function.
function generateRoleResponse(
  role: Role,
  userMessage: string,
): { message: string; kind: string; proposedAction?: string } | null {
  const lower = userMessage.toLowerCase()

  if (role === 'herman') {
    if (lower.includes('script') || lower.includes('write') || lower.includes('story')) {
      return {
        message:
          'Routing this to Kimmy — she handles atmospheric horror and sci-fi writing. I can send the brief and receive structured material back into the project.',
        kind: 'message',
        proposedAction: 'Send writing assignment to Kimmy with the project brief.',
      }
    }
    if (lower.includes('image') || lower.includes('visual') || lower.includes('picture')) {
      return {
        message:
          'Skin Studio handles image generation. It needs auth before I can route a generation job — I won\'t pretend it\'s connected when it isn\'t.',
        kind: 'message',
        proposedAction: 'Mark Skin Studio as needs-auth in the Tools panel.',
      }
    }
    return {
      message:
        'I can break this into steps and route each part to the right specialist. Want me to draft a plan?',
      kind: 'message',
      proposedAction: 'Create a production plan for this job.',
    }
  }

  if (role === 'allie') {
    return {
      message:
        'Here\'s how I\'d shape it: start with the seed idea, define the tone and target, sketch the structure, then produce. I can propose a beat sheet once we agree on the direction.',
      kind: 'proposal',
      proposedAction: 'Draft a 4-beat structure: hook → tension → turn → landing.',
    }
  }

  if (role === 'challenger') {
    return {
      message:
        'Before we commit: what makes this different from the last ten horror shorts? If the hook doesn\'t land in the first 3 seconds, the rest doesn\'t matter. I want to see the opening beat before we go further.',
      kind: 'message',
    }
  }

  if (role === 'watcher') {
    return {
      message:
        'Tracking: 1 idea in, 0 assets attached, 0 approvals pending. The job is at the idea stage. I\'ll flag it if anything stalls.',
      kind: 'message',
    }
  }

  return null
}
