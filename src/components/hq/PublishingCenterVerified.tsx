import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Approval, PublishItem } from '../../lib/hqTypes'
import {
  DESTINATION_AVAILABILITY,
  DESTINATION_LABELS,
  PUBLISH_DESTINATIONS,
  logActivity,
  timeAgo,
} from '../../lib/hq'

export default function PublishingCenterVerified() {
  const [items, setItems] = useState<PublishItem[]>([])
  const [approvals, setApprovals] = useState<Approval[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAdd, setShowAdd] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    const [queueResult, approvalResult] = await Promise.all([
      supabase.from('publish_items').select('*').order('created_at', { ascending: false }),
      supabase.from('approvals').select('*').eq('status', 'pending').order('created_at', { ascending: false }),
    ])

    if (queueResult.error || approvalResult.error) {
      setError(queueResult.error?.message ?? approvalResult.error?.message ?? 'Unable to load publishing state.')
      setItems([])
      setApprovals([])
    } else {
      setItems(queueResult.data ?? [])
      setApprovals(approvalResult.data ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const ready = items.filter((item) => item.status === 'ready')
  const scheduled = items.filter((item) => item.status === 'scheduled')
  const published = items.filter((item) => item.status === 'published')

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="section-eyebrow">
            <span className="h-px w-8 bg-blood-700" /> Publishing
          </p>
          <h1 className="section-title">
            Verified publication
            <span className="italic text-blood-500"> only.</span>
          </h1>
          <p className="mt-4 max-w-2xl text-ink-300">
            Headquarters can prepare and approve publication work, but it cannot mark an item published from the browser. Published state is reserved for a trusted server-side publisher after external confirmation.
          </p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary">
          Add to Queue
        </button>
      </div>

      <section className="card border-amber-700/40 p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber-300">Publication boundary</p>
        <p className="mt-2 text-sm text-ink-300">
          No destination currently has verified server-side publication evidence. Ready items remain ready until an authenticated publisher records the external publication ID and confirmation time.
        </p>
      </section>

      {error && (
        <div className="rounded-xl border border-blood-700/60 bg-blood-900/20 p-4 text-sm text-blood-300">
          {error}
        </div>
      )}

      {approvals.length > 0 && (
        <section className="card p-6">
          <h2 className="font-display text-xl font-semibold text-ink-100">Pending approvals ({approvals.length})</h2>
          <p className="mt-1 text-sm text-ink-400">
            Decisions are written through the authenticated Supabase session. Database triggers attribute the decision to the signed-in user and make terminal decisions immutable.
          </p>
          <ul className="mt-4 space-y-3">
            {approvals.map((approval) => (
              <ApprovalDecisionRow key={approval.id} approval={approval} onDecision={load} />
            ))}
          </ul>
        </section>
      )}

      <QueueSection title="Ready to publish" items={ready} loading={loading} onChange={load} />
      {scheduled.length > 0 && <QueueSection title="Scheduled" items={scheduled} loading={loading} onChange={load} />}
      <QueueSection title="Published" items={published} loading={loading} onChange={load} />

      <section className="card p-6">
        <h2 className="font-display text-xl font-semibold text-ink-100">Destination health</h2>
        <p className="mt-1 text-sm text-ink-400">Availability is fail-closed until a real publisher connector proves otherwise.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {PUBLISH_DESTINATIONS.map((destination) => {
            const available = DESTINATION_AVAILABILITY[destination]
            return (
              <div key={destination} className="rounded-xl border border-ink-800 bg-ink-900/30 p-4">
                <p className="text-sm font-medium text-ink-100">{DESTINATION_LABELS[destination]}</p>
                <span className={`mt-2 inline-block font-mono text-[10px] uppercase tracking-[0.2em] ${available ? 'text-toxic-300' : 'text-ink-500'}`}>
                  {available ? 'Verified available' : 'Needs verified publisher'}
                </span>
              </div>
            )
          })}
        </div>
      </section>

      {showAdd && <AddQueueModal onClose={() => setShowAdd(false)} onAdded={load} />}
    </div>
  )
}

function ApprovalDecisionRow({ approval, onDecision }: { approval: Approval; onDecision: () => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function decide(status: 'approved' | 'rejected') {
    if (busy) return
    const verb = status === 'approved' ? 'approve' : 'reject'
    const reason = window.prompt(`Optional reason to ${verb} “${approval.title}”:`, '')
    if (reason === null) return

    setBusy(true)
    setError('')
    const { data, error: decisionError } = await supabase
      .from('approvals')
      .update({
        status,
        decision_reason: reason.trim() || null,
      })
      .eq('id', approval.id)
      .eq('status', 'pending')
      .select('id,status')
      .single()

    if (decisionError || !data || data.status !== status) {
      setBusy(false)
      setError(decisionError?.message ?? 'Approval decision was not confirmed by the database.')
      return
    }

    try {
      await logActivity(
        approval.project_id,
        approval.job_id,
        'Creator',
        `${status} approval “${approval.title}”`,
        'approve',
        reason.trim() || null,
      )
    } catch (activityError) {
      setBusy(false)
      setError(activityError instanceof Error ? activityError.message : 'Decision saved, but activity evidence failed to record.')
      await onDecision()
      return
    }

    setBusy(false)
    await onDecision()
  }

  return (
    <li className="rounded-lg border border-amber-700/40 bg-amber-700/5 px-4 py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-ink-100">{approval.title}</p>
          {approval.description && <p className="mt-1 text-xs text-ink-400">{approval.description}</p>}
          <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-amber-300">
            {timeAgo(approval.created_at)} · {approval.category}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => void decide('rejected')}
            disabled={busy}
            className="rounded-lg border border-blood-700/60 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-blood-300 hover:bg-blood-700/10 disabled:opacity-50"
          >
            Reject
          </button>
          <button
            type="button"
            onClick={() => void decide('approved')}
            disabled={busy}
            className="rounded-lg border border-toxic-700/60 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-toxic-300 hover:bg-toxic-700/10 disabled:opacity-50"
          >
            {busy ? 'Saving…' : 'Approve'}
          </button>
        </div>
      </div>
      {error && (
        <div className="mt-3 rounded-lg border border-blood-700/60 bg-blood-900/20 px-3 py-2 text-xs text-blood-300" role="alert">
          {error}
        </div>
      )}
    </li>
  )
}

function QueueSection({
  title,
  items,
  loading,
  onChange,
}: {
  title: string
  items: PublishItem[]
  loading: boolean
  onChange: () => void
}) {
  return (
    <section>
      <h2 className="mb-3 font-display text-xl font-semibold text-ink-100">{title} ({items.length})</h2>
      {loading ? (
        <div className="card p-8 text-center text-sm text-ink-400">Loading verified queue state…</div>
      ) : items.length === 0 ? (
        <div className="card p-8 text-center text-sm text-ink-400">No items.</div>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => <QueueRow key={item.id} item={item} onChange={onChange} />)}
        </ul>
      )}
    </section>
  )
}

function QueueRow({ item, onChange }: { item: PublishItem; onChange: () => void }) {
  const [busy, setBusy] = useState(false)
  const destination = item.destination as (typeof PUBLISH_DESTINATIONS)[number] | null

  async function requestApproval() {
    if (busy) return
    setBusy(true)
    const { error } = await supabase.from('approvals').insert({
      project_id: item.project_id,
      job_id: item.job_id,
      title: `Publish: ${item.title}`,
      description: `Destination: ${destination ? DESTINATION_LABELS[destination] : 'not set'}. ${item.description ?? ''}`.trim(),
      status: 'pending',
      category: 'publish',
    })
    setBusy(false)
    if (error) return
    await logActivity(item.project_id, item.job_id, 'Creator', `requested publication approval for "${item.title}"`, 'approve')
    onChange()
  }

  async function remove() {
    if (!confirm('Remove this item from the queue?')) return
    setBusy(true)
    const { error } = await supabase.from('publish_items').delete().eq('id', item.id)
    setBusy(false)
    if (!error) onChange()
  }

  return (
    <li className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {destination && <span className="rounded-full border border-ink-700 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-300">{DESTINATION_LABELS[destination]}</span>}
            <span className="rounded-full bg-blood-700/20 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-blood-300">{item.status}</span>
            {item.status === 'published' && item.published_at && <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-500">{timeAgo(item.published_at)}</span>}
          </div>
          <h3 className="mt-2 text-sm font-medium text-ink-100">{item.title}</h3>
          {item.description && <p className="mt-1 text-sm text-ink-300">{item.description}</p>}
          {item.caption && <p className="mt-1 text-xs text-ink-500">{item.caption}</p>}
        </div>
        <div className="flex flex-none flex-col items-end gap-2">
          {item.status === 'ready' && (
            <>
              <span className="rounded-full border border-blood-700/50 bg-blood-700/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-blood-300">Awaiting verified publisher</span>
              <button onClick={requestApproval} disabled={busy} className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber-300 hover:text-amber-200">Request Approval</button>
            </>
          )}
          {item.status !== 'published' && <button onClick={remove} disabled={busy} className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-500 hover:text-blood-400">Remove</button>}
        </div>
      </div>
    </li>
  )
}

function AddQueueModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [destination, setDestination] = useState<(typeof PUBLISH_DESTINATIONS)[number]>('youtube')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (saving || !title.trim()) return
    setSaving(true)
    setError('')
    const result = await supabase.from('publish_items').insert({
      title: title.trim(),
      description: description.trim() || null,
      destination,
      status: 'ready',
    })
    setSaving(false)
    if (result.error) {
      setError(result.error.message)
      return
    }
    onAdded()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/80 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="card w-full max-w-lg p-6" onClick={(event) => event.stopPropagation()}>
        <h2 className="font-display text-xl font-semibold text-ink-100">Add to publishing queue</h2>
        <form onSubmit={submit} className="mt-5 space-y-4">
          <div>
            <label className="field-label">Title *</label>
            <input required value={title} onChange={(event) => setTitle(event.target.value)} className="field-input" />
          </div>
          <div>
            <label className="field-label">Destination</label>
            <select value={destination} onChange={(event) => setDestination(event.target.value as (typeof PUBLISH_DESTINATIONS)[number])} className="field-select">
              {PUBLISH_DESTINATIONS.map((value) => <option key={value} value={value}>{DESTINATION_LABELS[value]}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label">Description</label>
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} className="field-textarea" />
          </div>
          {error && <div className="rounded-lg border border-blood-700/60 bg-blood-900/30 px-4 py-3 text-sm text-blood-300">{error}</div>}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Add to Queue'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
