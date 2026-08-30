import { useEffect, useState } from 'react'

const links = [
  { href: '#work', label: 'The Work' },
  { href: '#genres', label: 'Sub-Genres' },
  { href: '#excerpt', label: 'Excerpt' },
  { href: '#process', label: 'Process' },
  { href: '#order', label: 'Order' },
  { href: '#/studio', label: 'Studio' },
  { href: '#/hq/command', label: 'Headquarters' },
]

export default function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'border-b border-ink-800/80 bg-ink-950/85 backdrop-blur-md'
          : 'border-b border-transparent bg-transparent'
      }`}
    >
      <nav className="container-narrow flex h-16 items-center justify-between">
        <a href="#top" className="group flex items-center gap-3">
          <span className="relative flex h-7 w-7 items-center justify-center">
            <span className="absolute inset-0 rounded-full border border-blood-600/60 transition-all duration-500 group-hover:border-blood-400" />
            <span className="absolute inset-1.5 rounded-full bg-blood-600/30 transition-all duration-500 group-hover:bg-blood-500/60" />
            <span className="h-1.5 w-1.5 rounded-full bg-blood-400 shadow-[0_0_10px_rgba(201,56,56,0.8)]" />
          </span>
          <span className="font-display text-xl font-semibold tracking-wide text-ink-100">
            Kimmy
          </span>
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.3em] text-ink-400 sm:inline">
            // sci-fi horror
          </span>
        </a>

        <ul className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="font-mono text-xs uppercase tracking-[0.2em] text-ink-300 transition-colors duration-200 hover:text-blood-400"
              >
                {l.label}
              </a>
            </li>
          ))}
          <li>
            <a href="#order" className="btn-primary !px-5 !py-2 !text-xs">
              Commission
            </a>
          </li>
        </ul>

        <button
          aria-label="Toggle menu"
          onClick={() => setOpen((v) => !v)}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-ink-700 text-ink-200 md:hidden"
        >
          <span className="relative block h-4 w-5">
            <span
              className={`absolute left-0 top-0 h-px w-5 bg-current transition-all duration-300 ${
                open ? 'translate-y-2 rotate-45' : ''
              }`}
            />
            <span
              className={`absolute left-0 top-2 h-px w-5 bg-current transition-all duration-300 ${
                open ? 'opacity-0' : ''
              }`}
            />
            <span
              className={`absolute left-0 top-4 h-px w-5 bg-current transition-all duration-300 ${
                open ? '-translate-y-2 -rotate-45' : ''
              }`}
            />
          </span>
        </button>
      </nav>

      <div
        className={`overflow-hidden border-t border-ink-800/60 bg-ink-950/95 backdrop-blur-md transition-all duration-500 md:hidden ${
          open ? 'max-h-96' : 'max-h-0 border-t-transparent'
        }`}
      >
        <ul className="container-narrow flex flex-col gap-1 py-4">
          {links.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                onClick={() => setOpen(false)}
                className="block rounded-lg px-3 py-3 font-mono text-xs uppercase tracking-[0.2em] text-ink-200 transition-colors hover:bg-ink-800 hover:text-blood-400"
              >
                {l.label}
              </a>
            </li>
          ))}
          <li className="px-3 pt-2">
            <a
              href="#order"
              onClick={() => setOpen(false)}
              className="btn-primary w-full"
            >
              Commission a Story
            </a>
          </li>
        </ul>
      </div>
    </header>
  )
}
