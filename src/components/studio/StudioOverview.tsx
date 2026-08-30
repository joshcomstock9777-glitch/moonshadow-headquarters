import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Gig, Draft } from '../../lib/types'
import {
  GENRE_LABELS,
  GIG_STATUS_LABELS,
  DRAFT_STATUS_LABELS,
  type Genre,
  type GigStatus,
  type DraftStatus,
} from '../../lib/genres'

export default function StudioOverview({
  onNavigate,
}: {
  onNavigate: (tab: 'gigs' | 'drafts') => void
}) {
  const [gigs, setGigs] = useState<Gig[]>([])
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void load()
  }, [])

  async function load() {
    setLoading(true)
    const [g, d] = await Promise.all([
      supabase
        .from('gigs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('drafts')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(5),
    ])
    if (g.data) setGigs(g.data)
    if (d.data) setDrafts(d.data)
    setLoading(false)
  }

  const newGigs = gigs.filter((g) => g.status === 'new').length
  const activeDrafts = drafts.filter((d) =>
    ['idea', 'outlining', 'drafting', 'editing'].includes(d.status),
  ).length
  const totalBudget = gigs
    .filter((g) => ['accepted', 'invoiced', 'paid'].includes(g.status))
    .reduce((sum, g) => sum + (g.budget_usd ?? 0), 0)

  return (
    <div className="space-y-10">
      <div>
        <p className="section-eyebrow">
          <span className="h-px w-8 bg-blood-700" /> Studio
        </p>
        <h1 className="section-title">Where the work happens.</h1>
        <p className="mt-4 max-w-2xl text-ink-300">
          Two tools, one workspace. The <strong className="text-ink-100">Gig Scout</strong>{' '}
          aggregates freelance leads into a single inbox. The{' '}
          <strong className="text-ink-100">Drafting Workspace</strong> takes a
          brief from idea to outline to hand-edited final copy.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="New leads" value={newGigs} accent="blood" />
        <Stat label="Active drafts" value={activeDrafts} accent="amber" />
        <Stat label="In-flight budget" value={`$${totalBudget.toFixed(0)}`} accent="toxic" />
        <Stat label="Total leads" value={gigs.length} accent="ink" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold text-ink-100">
              Recent leads
            </h2>
            <button
              onClick={() => onNavigate('gigs')}
              className="font-mono text-[10px] uppercase tracking-[0.2em] text-blood-300 hover:text-blood-200"
            >
              Open Gig Scout →
            </button>
          </div>
          {loading ? (
            <p className="mt-4 text-ink-400">Loading…</p>
          ) : gigs.length === 0 ? (
            <p className="mt-4 text-sm text-ink-400">
              No leads yet. Open the Gig Scout to add one.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {gigs.map((g) => (
                <li
                  key={g.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-ink-800 bg-ink-900/30 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-ink-100">{g.title}</p>
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-500">
                      {GENRE_LABELS[g.genre as Genre] ?? g.genre} ·{' '}
                      {GIG_STATUS_LABELS[g.status as GigStatus] ?? g.status}
                    </p>
                  </div>
                  {g.budget_usd != null && (
                    <span className="font-mono text-[10px] text-amber-400">
                      ${g.budget_usd.toFixed(0)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold text-ink-100">
              Recent drafts
            </h2>
            <button
              onClick={() => onNavigate('drafts')}
              className="font-mono text-[10px] uppercase tracking-[0.2em] text-blood-300 hover:text-blood-200"
            >
              Open Workspace →
            </button>
          </div>
          {loading ? (
            <p className="mt-4 text-ink-400">Loading…</p>
          ) : drafts.length === 0 ? (
            <p className="mt-4 text-sm text-ink-400">
              No drafts yet. Open the Workspace to start one.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {drafts.map((d) => {
                const wc = (d.final_copy ?? '')
                  .trim()
                  .split(/\s+/)
                  .filter(Boolean).length
                return (
                  <li
                    key={d.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-ink-800 bg-ink-900/30 px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm text-ink-100">{d.title}</p>
                      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-500">
                        {GENRE_LABELS[d.genre as Genre] ?? d.genre} ·{' '}
                        {DRAFT_STATUS_LABELS[d.status as DraftStatus] ?? d.status}
                      </p>
                    </div>
                    <span className="font-mono text-[10px] text-ink-400">
                      {wc}w
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>

      <section className="card p-7">
        <h2 className="font-display text-xl font-semibold text-ink-100">
          How the two halves fit together
        </h2>
        <ol className="mt-4 space-y-3 text-sm text-ink-300">
          <li className="flex gap-3">
            <span className="font-mono text-blood-500">01</span>
            <span>
              Paste a posting into the <strong>Gig Scout</strong>. Tag genre,
              budget, deadline. Status starts at <em>new</em>.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="font-mono text-blood-500">02</span>
            <span>
              Triage. Mark as <em>applied</em>, <em>accepted</em>, or{' '}
              <em>declined</em> as you go.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="font-mono text-blood-500">03</span>
            <span>
              When a gig is accepted, create a <strong>Draft</strong> linked to
              it. Drop in the brief, sketch the outline, write the scaffold.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="font-mono text-blood-500">04</span>
            <span>
              Rewrite the scaffold into <strong>final copy</strong> in your
              voice. That's the version you ship — hand-edited, no AI.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="font-mono text-blood-500">05</span>
            <span>
              Mark draft <em>delivered</em>, gig <em>invoiced</em>, then{' '}
              <em>paid</em>. Money in.
            </span>
          </li>
        </ol>
      </section>
    </div>
  )
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string
  value: number | string
  accent: 'blood' | 'amber' | 'toxic' | 'ink'
}) {
  const color =
    accent === 'blood'
      ? 'text-blood-400'
      : accent === 'amber'
        ? 'text-amber-400'
        : accent === 'toxic'
          ? 'text-toxic-400'
          : 'text-ink-200'
  return (
    <div className="card p-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-500">
        {label}
      </p>
      <p className={`mt-2 font-display text-3xl font-semibold ${color}`}>
        {value}
      </p>
    </div>
  )
}
