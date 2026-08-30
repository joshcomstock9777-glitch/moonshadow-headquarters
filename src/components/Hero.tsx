import Starfield from './Starfield'

export default function Hero() {
  return (
    <section id="top" className="relative isolate overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <Starfield />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-ink-950/40 to-ink-950" />
        <div className="absolute left-1/2 top-1/3 h-[60vh] w-[60vh] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blood-700/10 blur-[120px] animate-pulse-slow" />
        <div className="absolute right-[10%] top-[20%] h-[30vh] w-[30vh] rounded-full bg-toxic-700/10 blur-[100px] animate-drift" />
      </div>

      <div className="container-narrow flex min-h-[100svh] flex-col items-center justify-center pt-24 pb-16 text-center">
        <p className="mb-6 inline-flex items-center gap-3 rounded-full border border-ink-700/80 bg-ink-900/40 px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.3em] text-ink-300 backdrop-blur-sm animate-fade-in">
          <span className="h-1.5 w-1.5 rounded-full bg-blood-500 shadow-[0_0_8px_rgba(201,56,56,0.9)]" />
          Written by hand — no AI
        </p>

        <h1 className="animate-fade-up font-display text-5xl font-semibold leading-[1.05] text-ink-100 sm:text-7xl md:text-8xl">
          Stories that creep
          <br />
          <span className="text-gradient-blood italic">under your skin.</span>
        </h1>

        <p className="mt-8 max-w-2xl animate-fade-up text-lg leading-relaxed text-ink-200 [animation-delay:120ms] opacity-0 [animation-fill-mode:forwards] sm:text-xl">
          Custom science fiction horror short stories and scenes with strong
          atmosphere, tension, and dread. Cosmic horror, body horror,
          psychological sci-fi, dystopian nightmares — built around your idea,
          written by hand.
        </p>

        <div className="mt-10 flex animate-fade-up flex-col items-center gap-4 [animation-delay:240ms] opacity-0 [animation-fill-mode:forwards] sm:flex-row">
          <a href="#order" className="btn-primary">
            Commission a Story
          </a>
          <a href="#excerpt" className="btn-ghost">
            Read an Excerpt
          </a>
        </div>

        <div className="mt-20 grid w-full max-w-3xl grid-cols-2 gap-px overflow-hidden rounded-2xl border border-ink-800/80 sm:grid-cols-4">
          {[
            ['100%', 'Hand-written'],
            ['0%', 'AI generated'],
            ['5+', 'Sub-genres'],
            ['∞', 'Bad dreams'],
          ].map(([n, l]) => (
            <div
              key={l}
              className="bg-ink-900/40 px-4 py-5 text-center backdrop-blur-sm"
            >
              <div className="font-display text-2xl font-semibold text-blood-400">
                {n}
              </div>
              <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-400">
                {l}
              </div>
            </div>
          ))}
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-ink-500">
          <div className="flex flex-col items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.3em]">
              Descend
            </span>
            <span className="block h-10 w-px bg-gradient-to-b from-ink-500 to-transparent" />
          </div>
        </div>
      </div>
    </section>
  )
}
