import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { navigate, type Route } from '../../lib/router'

const NAV_ITEMS = [
  { name: 'hq-command', label: 'Command', href: '#/hq/command', glyph: '⬡' },
  { name: 'hq-roundtable', label: 'Roundtable', href: '#/hq/roundtable', glyph: '◈' },
  { name: 'hq-create', label: 'Create', href: '#/hq/create', glyph: '✦' },
  { name: 'hq-projects', label: 'Projects', href: '#/hq/projects', glyph: '▤' },
  { name: 'hq-assets', label: 'Assets', href: '#/hq/assets', glyph: '◳' },
  { name: 'hq-factory', label: 'Factory', href: '#/hq/factory', glyph: '⚙' },
  { name: 'hq-publish', label: 'Publish', href: '#/hq/publish', glyph: '↗' },
  { name: 'hq-tools', label: 'Tools', href: '#/hq/tools', glyph: '⌗' },
  { name: 'hq-dock', label: 'Dock', href: '#/hq/dock', glyph: '⬚' },
] as const

type ShellEvidenceState = 'loading' | 'verified' | 'error'

export default function HqShell({
  route,
  children,
}: {
  route: Route
  children: React.ReactNode
}) {
  const [approvals, setApprovals] = useState<number | null>(null)
  const [activeJobs, setActiveJobs] = useState<number | null>(null)
  const [evidenceState, setEvidenceState] = useState<ShellEvidenceState>('loading')
  const [evidenceError, setEvidenceError] = useState<string | null>(null)

  useEffect(() => {
    void load()
  }, [route.name])

  async function load() {
    setEvidenceState('loading')
    setEvidenceError(null)

    const [a, j] = await Promise.all([
      supabase.from('approvals').select('id').eq('status', 'pending'),
      supabase
        .from('jobs')
        .select('stage')
        .not('stage', 'in', '("done")'),
    ])

    if (a.error || j.error) {
      setApprovals(null)
      setActiveJobs(null)
      setEvidenceState('error')
      setEvidenceError(
        [a.error?.message, j.error?.message].filter(Boolean).join(' · ') ||
          'Headquarters evidence read failed',
      )
      return
    }

    setApprovals(a.data?.length ?? 0)
    setActiveJobs(j.data?.length ?? 0)
    setEvidenceState('verified')
  }

  const activeName = route.name
  const verifiedApprovals = evidenceState === 'verified' ? approvals : null

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-ink-800/80 bg-ink-950/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-[1400px] items-center justify-between px-6">
          <a
            href="#/hq/command"
            className="flex items-center gap-3 text-ink-100 transition-colors hover:text-blood-300"
          >
            <span className="relative flex h-7 w-7 items-center justify-center">
              <span className="absolute inset-0 rounded-full border border-blood-600/60" />
              <span className="absolute inset-1.5 rounded-full bg-blood-600/30" />
              <span className="h-1.5 w-1.5 rounded-full bg-blood-400 shadow-[0_0_10px_rgba(201,56,56,0.8)]" />
            </span>
            <span className="font-display text-lg font-semibold">Moonshadow</span>
            <span className="hidden font-mono text-[10px] uppercase tracking-[0.3em] text-ink-500 sm:inline">
              // headquarters
            </span>
          </a>

          <div className="hidden items-center gap-2 md:flex">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] transition-all ${
                  activeName === item.name ||
                  (activeName === 'hq-project' && item.name === 'hq-projects')
                    ? 'bg-blood-700/20 text-blood-300'
                    : 'text-ink-400 hover:text-ink-200'
                }`}
              >
                <span className="text-[12px] opacity-60">{item.glyph}</span>
                {item.label}
                {item.name === 'hq-command' &&
                  verifiedApprovals !== null &&
                  verifiedApprovals > 0 && (
                    <span className="rounded-full bg-blood-600/50 px-1.5 text-[9px] text-ink-100">
                      {verifiedApprovals}
                    </span>
                  )}
              </a>
            ))}
          </div>

          <a
            href="#/"
            className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-400 transition-colors hover:text-blood-300"
          >
            View Site
          </a>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1400px] px-6 py-8">
        {children}
      </main>

      <footer className="border-t border-ink-800/60 px-6 py-6">
        <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between gap-4">
          <div className="min-w-0">
            {evidenceState === 'verified' ? (
              <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-500">
                Moonshadow Headquarters · {activeJobs ?? 0} active jobs · {approvals ?? 0} pending approvals · live evidence verified
              </span>
            ) : evidenceState === 'loading' ? (
              <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-500">
                Moonshadow Headquarters · refreshing live evidence…
              </span>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className="font-mono text-[10px] uppercase tracking-[0.3em] text-blood-300"
                  title={evidenceError ?? undefined}
                >
                  Moonshadow Headquarters · live evidence unavailable
                </span>
                <button
                  type="button"
                  onClick={() => void load()}
                  className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-400 hover:text-blood-300"
                >
                  Retry evidence
                </button>
              </div>
            )}
          </div>
          <button
            onClick={() => navigate({ name: 'hq-command' })}
            className="shrink-0 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-400 hover:text-blood-300"
          >
            Command Center
          </button>
        </div>
      </footer>
    </div>
  )
}
