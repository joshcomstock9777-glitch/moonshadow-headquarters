import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { navigate, type Route } from '../../lib/router'

interface Counts {
  gigsNew: number
  draftsActive: number
}

export default function StudioShell({
  route,
  children,
}: {
  route: Route
  children: React.ReactNode
}) {
  const [counts, setCounts] = useState<Counts | null>(null)

  useEffect(() => {
    void refresh()
  }, [])

  async function refresh() {
    const [g, d] = await Promise.all([
      supabase.from('gigs').select('status'),
      supabase.from('drafts').select('status'),
    ])
    if (g.error || d.error) return
    const gs = (g.data ?? []).map((r) => r.status)
    const ds = (d.data ?? []).map((r) => r.status)
    setCounts({
      gigsNew: gs.filter((s) => s === 'new').length,
      draftsActive: ds.filter((s) =>
        ['idea', 'outlining', 'drafting', 'editing'].includes(s),
      ).length,
    })
  }

  const isStudio = route.name !== 'home'

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-ink-800/80 bg-ink-950/90 backdrop-blur-md">
        <div className="container-narrow flex h-16 items-center justify-between">
          <div className="flex items-center gap-6">
            <a
              href="#/"
              className="flex items-center gap-3 text-ink-100 transition-colors hover:text-blood-300"
            >
              <span className="relative flex h-7 w-7 items-center justify-center">
                <span className="absolute inset-0 rounded-full border border-blood-600/60" />
                <span className="h-1.5 w-1.5 rounded-full bg-blood-400" />
              </span>
              <span className="font-display text-lg font-semibold">Kimmy</span>
              <span className="hidden font-mono text-[10px] uppercase tracking-[0.3em] text-ink-500 sm:inline">
                // studio
              </span>
            </a>
            {isStudio && (
              <nav className="flex max-w-[52vw] items-center gap-1 overflow-x-auto py-1 md:max-w-none">
                <TabLink
                  href="#/studio"
                  active={route.name === 'studio'}
                  label="Overview"
                />
                <TabLink
                  href="#/studio/gigs"
                  active={route.name === 'gigs'}
                  label="Gigs"
                  count={counts?.gigsNew}
                />
                <TabLink
                  href="#/studio/drafts"
                  active={route.name === 'drafts'}
                  label="Drafts"
                  count={counts?.draftsActive}
                />
              </nav>
            )}
          </div>
          <div className="flex items-center gap-3">
            <a
              href="#/"
              className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-400 transition-colors hover:text-blood-300"
            >
              View Site
            </a>
            <button
              onClick={() => navigate({ name: 'studio' })}
              className="btn-primary !px-4 !py-2 !text-[11px]"
            >
              Studio Home
            </button>
            <button
              onClick={() => navigate({ name: 'hq-command' })}
              className="btn-ghost !px-3 !py-2 !text-[10px]"
            >
              HQ
            </button>
          </div>
        </div>
      </header>
      <main className="container-narrow py-10">{children}</main>
    </div>
  )
}

function TabLink({
  href,
  active,
  label,
  count,
}: {
  href: string
  active: boolean
  label: string
  count?: number
}) {
  return (
    <a
      href={href}
      className={`flex items-center gap-2 rounded-full px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] transition-colors ${
        active
          ? 'bg-blood-700/20 text-blood-300'
          : 'text-ink-400 hover:text-ink-200'
      }`}
    >
      {label}
      {count !== undefined && count > 0 && (
        <span className="rounded-full bg-blood-600/40 px-1.5 text-[9px] text-ink-100">
          {count}
        </span>
      )}
    </a>
  )
}
