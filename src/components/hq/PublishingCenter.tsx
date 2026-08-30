import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import type { PublishItem, Job, Project, Approval } from '../../lib/hqTypes'
import {
  PUBLISH_DESTINATIONS,
  DESTINATION_LABELS,
  DESTINATION_AVAILABILITY,
  timeAgo,
  logActivity,
} from '../../lib/hq'
import { navigate } from '../../lib/router'

export default function PublishingCenter() {
  const [items, setItems] = useState<PublishItem[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [approvals, setApprovals] = useState<Approval[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [pi, p, j, a] = await Promise.all([
      supabase.from('publish_items').select('*').order('created_at', { ascending: false }),
      supabase.from('projects').select('*').order('updated_at', { ascending: false }),
      supabase.from('jobs').select('*').order('updated_at', { ascending: false }),
      supabase.from('approvals').select('*').eq('status', 'pending').order('created_at', { ascending: false }),
    ])
    setItems(pi.data ?? [])
    setProjects(p.data ?? [])
    setJobs(j.data ?? [])
    setApprovals(a.data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const ready = items.filter((i) => i.status === 'ready')
  const published = items.filter((i) => i.status === 'published')
  const scheduled = items.filter((i) => i.status === 'scheduled')

  const projectMap = new Map(projects.map((p) => [p.id, p.title]))
  const jobMap = new Map(jobs.map((j) => [j.id, j.title]))

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="section-eyebrow">
            <span className="h-px w-8 bg-blood-700" /> Publishing
          </p>
          <h1 className="section-title">
            What's leaving the
            <span className="italic text-blood-500"> building.</span>
          </h1>
          <p className="mt-4 max-w-2xl text-ink-300">
            Ready to publish is separate from published. Nothing goes live
            without approval. Destinations show honest status.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="btn-primary"
        >
          Add to Queue
        </button>
      </div>

      {/* Pending approvals */}
      {approvals.length > 0 && (
        <section className="card border-amber-700/40 p-6">
          <h2 className="font-display text-xl font-semibold text-amber-300">
            Waiting approval ({approvals.length})
          </h2>
          <p className="mt-1 text-sm text-ink-400">
            These items need your decision before they can publish.
          </p>
          <ul className="mt-4 space-y-2">
            {approvals.map((ap) => (
              <li
                key={ap.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-700/30 bg-amber-700/5 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-ink-100">{ap.title}</p>
                  {ap.description && (
                    <p className="mt-0.5 text-xs text-ink-400">{ap.description}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => decideApproval(ap.id, 'approved', ap.project_id, ap.title, load)}
                    className="btn-primary !px-4 !py-1.5 !text-xs"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => decideApproval(ap.id, 'rejected', ap.project_id, ap.title, load)}
                    className="btn-ghost !px-4 !py-1.5 !text-xs"
                  >
                    Reject
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Ready to publish */}
      <section>
        <h2 className="mb-3 font-display text-xl font-semibold text-ink-100">
          Ready to publish ({ready.length})
        </h2>
        {ready.length === 0 ? (
          <div className="card p-8 text-center text-sm text-ink-400">
            Nothing in the queue. Add a finished piece, or mark a job as
            packaged.
          </div>
        ) : (
          <ul className="space-y-3">
            {ready.map((item) => (
              <PublishRow
                key={item.id}
                item={item}
                projectName={item.project_id ? projectMap.get(item.project_id) ?? null : null}
                jobName={item.job_id ? jobMap.get(item.job_id) ?? null : null}
                onAction={load}
              />
            ))}
          </ul>
        )}
      </section>

      {/* Scheduled */}
      {scheduled.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-xl font-semibold text-ink-100">
            Scheduled ({scheduled.length})
          </h2>
          <ul className="space-y-3">
            {scheduled.map((item) => (
              <PublishRow
                key={item.id}
                item={item}
                projectName={item.project_id ? projectMap.get(item.project_id) ?? null : null}
                jobName={item.job_id ? jobMap.get(item.job_id) ?? null : null}
                onAction={load}
              />
            ))}
          </ul>
        </section>
      )}

      {/* Published */}
      <section>
        <h2 className="mb-3 font-display text-xl font-semibold text-ink-100">
          Published ({published.length})
        </h2>
        {published.length === 0 ? (
          <div className="card p-8 text-center text-sm text-ink-400">
            Nothing published yet. When a piece goes live, it shows up here
            with the real publication time.
          </div>
        ) : (
          <ul className="space-y-3">
            {published.map((item) => (
              <PublishRow
                key={item.id}
                item={item}
                projectName={item.project_id ? projectMap.get(item.project_id) ?? null : null}
                jobName={item.job_id ? jobMap.get(item.job_id) ?? null : null}
                onAction={load}
              />
            ))}
          </ul>
        )}
      </section>

      {/* Destination availability */}
      <section className="card p-6">
        <h2 className="font-display text-xl font-semibold text-ink-100">
          Destinations
        </h2>
        <p className="mt-1 text-sm text-ink-400">
          Honest status. We never fake a successful publication.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {PUBLISH_DESTINATIONS.map((dest) => {
            const available = DESTINATION_AVAILABILITY[dest]
            return (
              <div
                key={dest}
                className={`rounded-xl border p-4 ${
                  available
                    ? 'border-toxic-700/40 bg-toxic-700/5'
                    : 'border-ink-800 bg-ink-900/30'
                }`}
              >
                <p className="text-sm font-medium text-ink-100">
                  {DESTINATION_LABELS[dest]}
                </p>
                <span
                  className={`mt-2 inline-block font-mono text-[10px] uppercase tracking-[0.2em] ${
                    available ? 'text-toxic-300' : 'text-ink-500'
                  }`}
                >
                  {available ? 'Available' : 'Needs connection'}
                </span>
              </div>
            )
          })}
        </div>
      </section>

      {showAdd && (
        <AddPublishModal
          projects={projects}
          jobs={jobs}
          onClose={() => setShowAdd(false)}
          onAdded={load}
        />
      )}
    </div>
  )
}

async function decideApproval(
  id: string,
  decision: 'approved' | 'rejected',
  projectId: string | null,
  title: string,
  reload: () => void,
) {
  const { error } = await supabase
    .from('approvals')
    .update({ status: decision, decided_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return
  if (projectId) {
    await logActivity(projectId, null, 'Creator', `${decision} approval: ${title}`, 'approve')
  }
  void reload()
}

function PublishRow({
  item,
  projectName,
  jobName,
  onAction,
}: {
  item: PublishItem
  projectName: string | null
  jobName: string | null
  onAction: () => void
}) {
  const [busy, setBusy] = useState(false)
  const dest = item.destination as (typeof PUBLISH_DESTINATIONS)[number] | null
  const destAvailable = dest ? DESTINATION_AVAILABILITY[dest] : false
  const canPublish = item.status === 'ready' && (!dest || destAvailable || dest === 'other')

  async function requestApproval() {
    setBusy(true)
    const { error } = await supabase.from('approvals').insert({
      project_id: item.project_id,
      job_id: item.job_id,
      title: `Publish: ${item.title}`,
      description: `Destination: ${dest ? DESTINATION_LABELS[dest] : 'not set'}. ${item.description ?? ''}`.trim(),
      status: 'pending',
      category: 'publish',
    })
    setBusy(false)
    if (error) return
    await logActivity(item.project_id, item.job_id, 'Creator', `requested publication approval for "${item.title}"`, 'approve')
    onAction()
  }

  async function publish() {
    if (!canPublish) return
    setBusy(true)
    // Mark as published with real timestamp
    const { error } = await supabase
      .from('publish_items')
      .update({ status: 'published', published_at: new Date().toISOString() })
      .eq('id', item.id)
    setBusy(false)
    if (error) return
    await logActivity(item.project_id, item.job_id, 'Creator', `published "${item.title}" to ${dest ? DESTINATION_LABELS[dest] : 'destination'}`, 'publish')
    onAction()
  }

  async function remove() {
    if (!confirm('Remove this item from the queue?')) return
    await supabase.from('publish_items').delete().eq('id', item.id)
    onAction()
  }

  return (
    <li className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {dest && (
              <span className="rounded-full border border-ink-700 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-300">
                {DESTINATION_LABELS[dest] ?? dest}
              </span>
            )}
            <span
              className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.2em] ${
                item.status === 'published'
                  ? 'bg-toxic-700/20 text-toxic-300'
                  : item.status === 'scheduled'
                    ? 'bg-amber-700/20 text-amber-300'
                    : 'bg-blood-700/20 text-blood-300'
              }`}
            >
              {item.status}
            </span>
            {item.status === 'published' && item.published_at && (
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-500">
                {timeAgo(item.published_at)}
              </span>
            )}
          </div>
          <h3 className="mt-2 text-sm font-medium text-ink-100">{item.title}</h3>
          {projectName && (
            <p className="mt-0.5 text-xs text-ink-400">{projectName}</p>
          )}
          {item.description && (
            <p className="mt-1 text-sm text-ink-300">{item.description}</p>
          )}
          {item.caption && (
            <p className="mt-1 text-xs text-ink-500">{item.caption}</p>
          )}
        </div>
        <div className="flex flex-none flex-col items-end gap-2">
          {item.status === 'ready' && (
            <>
              {canPublish ? (
                <button
                  onClick={publish}
                  disabled={busy}
                  className="btn-primary !px-4 !py-2 !text-xs"
                >
                  {busy ? '…' : 'Publish Now'}
                </button>
              ) : (
                <span className="rounded-full border border-blood-700/50 bg-blood-700/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-blood-300">
                  Destination not connected
                </span>
              )}
              <button
                onClick={requestApproval}
                disabled={busy}
                className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber-300 hover:text-amber-200"
              >
                Request Approval
              </button>
            </>
          )}
          <button
            onClick={remove}
            className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-500 hover:text-blood-400"
          >
            Remove
          </button>
        </div>
      </div>
    </li>
  )
}

function AddPublishModal({
  projects,
  jobs,
  onClose,
  onAdded,
}: {
  projects: Project[]
  jobs: Job[]
  onClose: () => void
  onAdded: () => void
}) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    caption: '',
    destination: 'youtube',
    project_id: '',
    job_id: '',
    rights: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const field = (k: keyof typeof form) => (e: React.ChangeEvent<any>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return
    setSaving(true)
    setError('')
    const { error } = await supabase.from('publish_items').insert({
      title: form.title.trim(),
      description: form.description.trim() || null,
      caption: form.caption.trim() || null,
      destination: form.destination,
      project_id: form.project_id || null,
      job_id: form.job_id || null,
      rights: form.rights.trim() || null,
      status: 'ready',
    })
    setSaving(false)
    if (error) {
      setError(error.message)
      return
    }
    if (form.project_id) {
      await logActivity(form.project_id, null, 'Creator', `added "${form.title}" to publishing queue`, 'info')
    }
    onAdded()
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="card max-h-[90vh] w-full max-w-lg overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold text-ink-100">
            Add to publishing queue
          </h2>
          <button
            onClick={onClose}
            className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-400 hover:text-blood-300"
          >
            Close
          </button>
        </div>
        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <label className="field-label">Title *</label>
            <input
              required
              value={form.title}
              onChange={field('title')}
              className="field-input"
              placeholder="Publication title"
            />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="field-label">Destination</label>
              <select value={form.destination} onChange={field('destination')} className="field-select">
                {PUBLISH_DESTINATIONS.map((d) => (
                  <option key={d} value={d}>
                    {DESTINATION_LABELS[d]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">Project</label>
              <select value={form.project_id} onChange={field('project_id')} className="field-select">
                <option value="">— none —</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="field-label">Description</label>
            <textarea
              value={form.description}
              onChange={field('description')}
              className="field-textarea !min-h-[60px]"
              placeholder="Description for the destination."
            />
          </div>
          <div>
            <label className="field-label">Caption</label>
            <input
              value={form.caption}
              onChange={field('caption')}
              className="field-input"
              placeholder="Short caption / on-screen text."
            />
          </div>
          <div>
            <label className="field-label">Rights / license</label>
            <input
              value={form.rights}
              onChange={field('rights')}
              className="field-input"
              placeholder="Rights information."
            />
          </div>
          {error && (
            <div className="rounded-lg border border-blood-700/60 bg-blood-900/30 px-4 py-3 text-sm text-blood-300">
              {error}
            </div>
          )}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-ghost">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving…' : 'Add to Queue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
