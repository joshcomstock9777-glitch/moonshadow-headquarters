import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Gig } from '../../lib/types'
import WorkspaceIntake from '../shared/WorkspaceIntake'
import type { WorkspaceAttachment } from '../../lib/workspaceAttachments'
import {
  GENRES,
  GENRE_LABELS,
  GIG_STATUSES,
  GIG_STATUS_LABELS,
  type Genre,
  type GigStatus,
} from '../../lib/genres'

const emptyForm = {
  source: '',
  url: '',
  client: '',
  title: '',
  genre: 'short-story' as Genre,
  brief: '',
  word_count: '',
  budget_usd: '',
  deadline: '',
  notes: '',
}

export default function GigScout() {
  const [gigs, setGigs] = useState<Gig[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [filterStatus, setFilterStatus] = useState<'all' | GigStatus>('all')
  const [filterGenre, setFilterGenre] = useState<'all' | Genre>('all')
  const [attachments, setAttachments] = useState<WorkspaceAttachment[]>([])

  useEffect(() => {
    void load()
  }, [])

  async function load() {
    setLoading(true)
    setError('')
    const { data, error } = await supabase
      .from('gigs')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else setGigs(data ?? [])
    setLoading(false)
  }

  const filtered = useMemo(
    () =>
      gigs.filter(
        (g) =>
          (filterStatus === 'all' || g.status === filterStatus) &&
          (filterGenre === 'all' || g.genre === filterGenre),
      ),
    [gigs, filterStatus, filterGenre],
  )

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return
    setSaving(true)
    setError('')
    const payload = {
      source: form.source.trim() || null,
      url: form.url.trim() || null,
      client: form.client.trim() || null,
      title: form.title.trim(),
      genre: form.genre,
      brief: form.brief.trim() || null,
      word_count: form.word_count ? Number(form.word_count) : null,
      budget_usd: form.budget_usd ? Number(form.budget_usd) : null,
      deadline: form.deadline || null,
      notes: form.notes.trim() || null,
      status: 'new',
    }
    const { error } = await supabase.from('gigs').insert(payload)
    setSaving(false)
    if (error) {
      setError(error.message)
      return
    }
    setForm(emptyForm)
    setAttachments([])
    await load()
  }

  async function updateStatus(id: string, status: string) {
    const { error } = await supabase
      .from('gigs')
      .update({ status })
      .eq('id', id)
    if (error) {
      setError(error.message)
      return
    }
    setGigs((gs) => gs.map((g) => (g.id === id ? { ...g, status } : g)))
  }

  async function remove(id: string) {
    if (!confirm('Delete this gig?')) return
    const { error } = await supabase.from('gigs').delete().eq('id', id)
    if (error) {
      setError(error.message)
      return
    }
    setGigs((gs) => gs.filter((g) => g.id !== id))
  }

  const field = (k: keyof typeof form) => (e: React.ChangeEvent<any>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  return (
    <div className="space-y-10">
      <div>
        <p className="section-eyebrow">
          <span className="h-px w-8 bg-blood-700" /> Gig Scout
        </p>
        <h1 className="section-title">Leads come in. You decide.</h1>
        <p className="mt-4 max-w-2xl text-ink-300">
          Paste a posting you found anywhere — Upwork, Fiverr, Reddit, a cold
          email, a friend's referral. The scout keeps them in one inbox, tagged
          by genre and status, so nothing slips through.
        </p>
      </div>

      <form onSubmit={onSubmit} className="card space-y-5 p-7">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="field-label">Title *</label>
            <input
              required
              value={form.title}
              onChange={field('title')}
              className="field-input"
              placeholder="e.g. 3k-word cosmic horror short"
            />
          </div>
          <div>
            <label className="field-label">Genre</label>
            <select
              value={form.genre}
              onChange={field('genre')}
              className="field-select"
            >
              {GENRES.map((g) => (
                <option key={g} value={g}>
                  {GENRE_LABELS[g]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Source</label>
            <input
              value={form.source}
              onChange={field('source')}
              className="field-input"
              placeholder="Upwork / Fiverr / Reddit / Referral"
            />
          </div>
          <div>
            <label className="field-label">URL</label>
            <input
              value={form.url}
              onChange={field('url')}
              className="field-input"
              placeholder="https://…"
            />
          </div>
          <div>
            <label className="field-label">Client</label>
            <input
              value={form.client}
              onChange={field('client')}
              className="field-input"
              placeholder="Who's hiring"
            />
          </div>
          <div>
            <label className="field-label">Deadline</label>
            <input
              type="date"
              value={form.deadline}
              onChange={field('deadline')}
              className="field-input"
            />
          </div>
          <div>
            <label className="field-label">Word count</label>
            <input
              type="number"
              min="0"
              value={form.word_count}
              onChange={field('word_count')}
              className="field-input"
              placeholder="3000"
            />
          </div>
          <div>
            <label className="field-label">Budget (USD)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.budget_usd}
              onChange={field('budget_usd')}
              className="field-input"
              placeholder="250"
            />
          </div>
        </div>
        <div>
          <label className="field-label">Brief</label>
          <textarea
            value={form.brief}
            onChange={field('brief')}
            className="field-textarea"
            placeholder="Paste the full posting or your notes on what they want."
          />
          <div className="mt-3">
            <WorkspaceIntake
              attachments={attachments}
              onChange={setAttachments}
              onInsertText={(text) => setForm((current) => ({ ...current, brief: [current.brief, text].filter(Boolean).join(current.brief ? '\n' : '') }))}
            />
          </div>
        </div>
        <div>
          <label className="field-label">Private notes</label>
          <textarea
            value={form.notes}
            onChange={field('notes')}
            className="field-textarea !min-h-[80px]"
            placeholder="Your read on the client, red flags, angle for the pitch…"
          />
        </div>
        {error && (
          <div className="rounded-lg border border-blood-700/60 bg-blood-900/30 px-4 py-3 text-sm text-blood-300">
            {error}
          </div>
        )}
        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Saving…' : 'Add Lead'}
          </button>
        </div>
      </form>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-2xl font-semibold text-ink-100">
            Inbox{' '}
            <span className="font-mono text-sm text-ink-500">
              ({filtered.length})
            </span>
          </h2>
          <div className="flex flex-wrap gap-2">
            <select
              value={filterStatus}
              onChange={(e) =>
                setFilterStatus(e.target.value as 'all' | GigStatus)
              }
              className="field-select !w-auto !py-2 !text-xs"
            >
              <option value="all">All statuses</option>
              {GIG_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {GIG_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
            <select
              value={filterGenre}
              onChange={(e) =>
                setFilterGenre(e.target.value as 'all' | Genre)
              }
              className="field-select !w-auto !py-2 !text-xs"
            >
              <option value="all">All genres</option>
              {GENRES.map((g) => (
                <option key={g} value={g}>
                  {GENRE_LABELS[g]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <p className="text-ink-400">Loading…</p>
        ) : filtered.length === 0 ? (
          <div className="card p-10 text-center text-ink-400">
            No leads yet. Paste one above to start the inbox.
          </div>
        ) : (
          <ul className="space-y-3">
            {filtered.map((g) => (
              <li key={g.id} className="card card-hover p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-blood-700/20 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-blood-300">
                        {GENRE_LABELS[g.genre as Genre] ?? g.genre}
                      </span>
                      <span className="rounded-full border border-ink-700 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-300">
                        {GIG_STATUS_LABELS[g.status as GigStatus] ?? g.status}
                      </span>
                      {g.source && (
                        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-500">
                          {g.source}
                        </span>
                      )}
                      {g.budget_usd != null && (
                        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber-400">
                          ${g.budget_usd.toFixed(0)}
                        </span>
                      )}
                      {g.deadline && (
                        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-500">
                          due {new Date(g.deadline).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <h3 className="mt-2 font-display text-xl font-semibold text-ink-100">
                      {g.title}
                    </h3>
                    {g.client && (
                      <p className="text-sm text-ink-400">{g.client}</p>
                    )}
                    {g.brief && (
                      <p className="mt-2 line-clamp-2 text-sm text-ink-300">
                        {g.brief}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-none flex-col items-end gap-2">
                    <select
                      value={g.status}
                      onChange={(e) => updateStatus(g.id, e.target.value)}
                      className="field-select !w-auto !py-1.5 !text-[11px]"
                    >
                      {GIG_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {GIG_STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      {g.url && (
                        <a
                          href={g.url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-400 hover:text-blood-300"
                        >
                          Open ↗
                        </a>
                      )}
                      <button
                        onClick={() => remove(g.id)}
                        className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-500 hover:text-blood-400"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
