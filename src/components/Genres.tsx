const genres = [
  {
    name: 'Cosmic Horror',
    blurb:
      'Things older than the light. The universe does not hate you — it simply does not notice you exist.',
    glyph: '◯',
  },
  {
    name: 'Body Horror',
    blurb:
      'The body as a site of wrong rewrite. Flesh that remembers a shape it was never meant to hold.',
    glyph: '⌬',
  },
  {
    name: 'Psychological',
    blurb:
      'The unreliable room. The narrator who is not lying, only wrong. The slow erosion of what you were sure of.',
    glyph: '◐',
  },
  {
    name: 'Dystopian',
    blurb:
      'Systems that wore a human face once. Now the face is the mask, and the system is hungry.',
    glyph: '⊞',
  },
  {
    name: 'Post-Apocalyptic',
    blurb:
      'After the end, the small new ends. Quiet ruins, quiet people, and the thing in the quiet that learned to wait.',
    glyph: '⌧',
  },
  {
    name: 'Creature / Feature',
    blurb:
      'Something with a body and a want. The horror of being prey, written with teeth and patience.',
    glyph: '✶',
  },
]

export default function Genres() {
  return (
    <section
      id="genres"
      className="relative overflow-hidden border-y border-ink-800/60 bg-ink-900/20 py-28 sm:py-36"
    >
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(201,56,56,0.05),transparent_60%)]" />
      <div className="container-narrow">
        <div className="max-w-3xl">
          <p className="section-eyebrow">
            <span className="h-px w-8 bg-blood-700" /> Sub-Genres
          </p>
          <h2 className="section-title">
            Pick your flavor of
            <span className="italic text-blood-500"> dread.</span>
          </h2>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-300">
            Each sub-genre is a different kind of unease. Tell me which one
            lives in your idea — or let me choose the one that fits it best.
          </p>
        </div>

        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {genres.map((g) => (
            <article
              key={g.name}
              className="card card-hover group relative flex flex-col p-7"
            >
              <div className="mb-6 flex items-center justify-between">
                <span className="font-display text-4xl text-blood-700 transition-colors duration-500 group-hover:text-blood-500">
                  {g.glyph}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-500">
                  sub-genre
                </span>
              </div>
              <h3 className="font-display text-2xl font-semibold text-ink-100">
                {g.name}
              </h3>
              <p className="mt-3 leading-relaxed text-ink-300">{g.blurb}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
