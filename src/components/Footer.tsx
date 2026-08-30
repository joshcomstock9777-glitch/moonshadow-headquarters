export default function Footer() {
  return (
    <footer className="relative border-t border-ink-800/60 bg-ink-950">
      <div className="container-narrow py-16">
        <div className="flex flex-col items-start justify-between gap-10 sm:flex-row">
          <div className="max-w-sm">
            <div className="flex items-center gap-3">
              <span className="relative flex h-7 w-7 items-center justify-center">
                <span className="absolute inset-0 rounded-full border border-blood-600/60" />
                <span className="h-1.5 w-1.5 rounded-full bg-blood-400" />
              </span>
              <span className="font-display text-xl font-semibold text-ink-100">
                Kimmy
              </span>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-ink-400">
              Custom science fiction horror short stories and scenes, written
              by hand. Atmosphere, tension, and dread — no AI, ever.
            </p>
          </div>

          <nav className="flex flex-col gap-3 sm:items-end">
            <a
              href="#order"
              className="font-mono text-xs uppercase tracking-[0.2em] text-ink-300 transition-colors hover:text-blood-400"
            >
              Commission a Story
            </a>
            <a
              href="#excerpt"
              className="font-mono text-xs uppercase tracking-[0.2em] text-ink-300 transition-colors hover:text-blood-400"
            >
              Read an Excerpt
            </a>
            <a
              href="#top"
              className="font-mono text-xs uppercase tracking-[0.2em] text-ink-300 transition-colors hover:text-blood-400"
            >
              Back to the top
            </a>
          </nav>
        </div>

        <div className="divider-rune">✦</div>

        <p className="text-center font-mono text-[10px] uppercase tracking-[0.3em] text-ink-500">
          Written by hand · No AI · {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  )
}
