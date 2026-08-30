import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Draft, Gig } from '../../lib/types'
import {
  GENRES,
  GENRE_LABELS,
  DRAFT_STATUSES,
  DRAFT_STATUS_LABELS,
  type Genre,
  type DraftStatus,
} from '../../lib/genres'

const emptyForm = {
  title: '',
  genre: 'short-story' as Genre,
  gig_id: '',
  brief: '',
  word_count_target: '',
}

export default function DraftingWorkspace() {
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [gigs, setGigs] = useState<Gig[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<'all' | DraftStatus>('all')

  useEffect(() => {
    void load()
  }, [])

  async function load() {
    setLoading(true)
    setError('')
    const [d, g] = await Promise.all([
      supabase
        .from('drafts')
        .select('*')
        .order('updated_at', { ascending: false }),
      supabase
        .from('gigs')
        .select('*')
        .order('created_at', { ascending: false }),
    ])
    if (d.error) setError(d.error.message)
    if (g.error) setError(g.error.message)
    setDrafts(d.data ?? [])
    setGigs(g.data ?? [])
    setLoading(false)
  }

  const filtered = useMemo(
    () =>
      drafts.filter(
        (d) => filterStatus === 'all' || d.status === filterStatus,
      ),
    [drafts, filterStatus],
  )

  async function onCreate(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return
    setSaving(true)
    setError('')
    const payload = {
      title: form.title.trim(),
      genre: form.genre,
      gig_id: form.gig_id || null,
      brief: form.brief.trim() || null,
      word_count_target: form.word_count_target
        ? Number(form.word_count_target)
        : null,
      status: 'idea',
    }
    const { data, error } = await supabase
      .from('drafts')
      .insert(payload)
      .select()
      .single()
    setSaving(false)
    if (error) {
      setError(error.message)
      return
    }
    setForm(emptyForm)
    setDrafts((ds) => [data, ...ds])
    setActiveId(data.id)
  }

  async function update(id: string, patch: Partial<Draft>) {
    const { error } = await supabase.from('drafts').update(patch).eq('id', id)
    if (error) {
      setError(error.message)
      return
    }
    setDrafts((ds) =>
      ds.map((d) => (d.id === id ? { ...d, ...patch } : d)),
    )
  }

  async function remove(id: string) {
    if (!confirm('Delete this draft?')) return
    const { error } = await supabase.from('drafts').delete().eq('id', id)
    if (error) {
      setError(error.message)
      return
    }
    setDrafts((ds) => ds.filter((d) => d.id !== id))
    if (activeId === id) setActiveId(null)
  }

  const field = (k: keyof typeof form) => (e: React.ChangeEvent<any>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const active = drafts.find((d) => d.id === activeId) ?? null

  return (
    <div className="space-y-10">
      <div>
        <p className="section-eyebrow">
          <span className="h-px w-8 bg-blood-700" /> Drafting Workspace
        </p>
        <h1 className="section-title">From brief to final, by hand.</h1>
        <p className="mt-4 max-w-2xl text-ink-300">
          Create a draft from a gig (or standalone). Drop in the brief, sketch
          the outline, write the first-draft scaffold, then rewrite it into the
          final copy. The scaffold is a head start — the final voice is yours.
        </p>
      </div>

      <form onSubmit={onCreate} className="card space-y-5 p-7">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="field-label">Title *</label>
            <input
              required
              value={form.title}
              onChange={field('title')}
              className="field-input"
              placeholder="Working title"
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
            <label className="field-label">Linked gig (optional)</label>
            <select
              value={form.gig_id}
              onChange={field('gig_id')}
              className="field-select"
            >
              <option value="">— none —</option>
              {gigs.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Word count target</label>
            <input
              type="number"
              min="0"
              value={form.word_count_target}
              onChange={field('word_count_target')}
              className="field-input"
              placeholder="3000"
            />
          </div>
        </div>
        <div>
          <label className="field-label">Brief</label>
          <textarea
            value={form.brief}
            onChange={field('brief')}
            className="field-textarea"
            placeholder="What the client wants — tone, length, must-haves, avoid-list."
          />
        </div>
        {error && (
          <div className="rounded-lg border border-blood-700/60 bg-blood-900/30 px-4 py-3 text-sm text-blood-300">
            {error}
          </div>
        )}
        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Creating…' : 'Create Draft'}
          </button>
        </div>
      </form>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-2xl font-semibold text-ink-100">
            Drafts{' '}
            <span className="font-mono text-sm text-ink-500">
              ({filtered.length})
            </span>
          </h2>
          <select
            value={filterStatus}
            onChange={(e) =>
              setFilterStatus(e.target.value as 'all' | DraftStatus)
            }
            className="field-select !w-auto !py-2 !text-xs"
          >
            <option value="all">All statuses</option>
            {DRAFT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {DRAFT_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <p className="text-ink-400">Loading…</p>
        ) : filtered.length === 0 ? (
          <div className="card p-10 text-center text-ink-400">
            No drafts yet. Create one above.
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
            <ul className="space-y-2">
              {filtered.map((d) => (
                <li key={d.id}>
                  <button
                    onClick={() => setActiveId(d.id)}
                    className={`w-full rounded-xl border p-4 text-left transition-all ${
                      activeId === d.id
                        ? 'border-blood-700/70 bg-blood-700/10'
                        : 'border-ink-800 bg-ink-900/30 hover:border-ink-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-full bg-blood-700/20 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.2em] text-blood-300">
                        {GENRE_LABELS[d.genre as Genre] ?? d.genre}
                      </span>
                      <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-500">
                        {DRAFT_STATUS_LABELS[d.status as DraftStatus] ?? d.status}
                      </span>
                    </div>
                    <h3 className="mt-2 font-display text-base font-semibold text-ink-100">
                      {d.title}
                    </h3>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-500">
                      {new Date(d.updated_at).toLocaleDateString()}
                    </p>
                  </button>
                </li>
              ))}
            </ul>

            {active ? (
              <DraftEditor
                key={active.id}
                draft={active}
                gigs={gigs}
                onUpdate={(p) => update(active.id, p)}
                onDelete={() => remove(active.id)}
              />
            ) : (
              <div className="card flex min-h-[300px] items-center justify-center p-10 text-center text-ink-400">
                Select a draft to edit.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function DraftEditor({
  draft,
  gigs,
  onUpdate,
  onDelete,
}: {
  draft: Draft
  gigs: Gig[]
  onUpdate: (p: Partial<Draft>) => void
  onDelete: () => void
}) {
  const linkedGig = gigs.find((g) => g.id === draft.gig_id) ?? null
  const wordCount = (draft.final_copy ?? '').trim().split(/\s+/).filter(Boolean).length

  return (
    <div className="card space-y-5 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-2xl font-semibold text-ink-100">
            {draft.title}
          </h3>
          {linkedGig && (
            <p className="mt-1 text-sm text-ink-400">
              From gig:{' '}
              <span className="text-ink-200">{linkedGig.title}</span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <select
            value={draft.status}
            onChange={(e) => onUpdate({ status: e.target.value })}
            className="field-select !w-auto !py-1.5 !text-[11px]"
          >
            {DRAFT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {DRAFT_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <button
            onClick={onDelete}
            className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-500 hover:text-blood-400"
          >
            Delete
          </button>
        </div>
      </div>

      <EditorBlock
        label="Brief"
        value={draft.brief ?? ''}
        placeholder="What the client wants."
        rows={4}
        onSave={(v) => onUpdate({ brief: v })}
      />
      <EditorBlock
        label="Outline / beat sheet"
        value={draft.outline ?? ''}
        placeholder="Scene 1 — hook. Scene 2 — inciting dread. Scene 3 — turn. Scene 4 — ending that lingers."
        rows={6}
        onSave={(v) => onUpdate({ outline: v })}
      />
      <EditorBlock
        label="First-draft scaffold (your head start)"
        value={draft.scaffold ?? ''}
        placeholder="Rough scaffolding — research notes, opening lines, key beats, lines of dialogue to rewrite later. Not the final voice."
        rows={8}
        onSave={(v) => onUpdate({ scaffold: v })}
      />
      <EditorBlock
        label="Final copy (hand-edited)"
        value={draft.final_copy ?? ''}
        placeholder="The version you ship. Your voice, your prose."
        rows={12}
        onSave={(v) => onUpdate({ final_copy: v })}
        footer={
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-500">
            {wordCount} words
          </span>
        }
      />
    </div>
  )
}

function EditorBlock({
  label,
  value,
  placeholder,
  rows,
  onSave,
  footer,
}: {
  label: string
  value: string
  placeholder: string
  rows: number
  onSave: (v: string) => void
  footer?: React.ReactNode
}) {
  const [local, setLocal] = useState(value)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    setLocal(value)
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
        className="field-textarea !min-h-0 font-body text-base leading-relaxed"
      />
      {footer && <div className="mt-1.5 text-right">{footer}</div>}
    </div>
  )
}
