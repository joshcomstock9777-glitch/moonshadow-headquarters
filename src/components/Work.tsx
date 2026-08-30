const services = [
  {
    title: 'Custom Short Stories',
    body: 'Complete, self-contained sci-fi horror shorts built from your premise — paced to land the dread and finished with an ending that lingers.',
    tag: '01 / Story',
  },
  {
    title: 'Scenes for Your Novel',
    body: 'Drop-in horror scenes for a novel or series you are already writing. I match your voice and continuity, then sharpen the tension.',
    tag: '02 / Scene',
  },
  {
    title: 'Original Concepts',
    body: 'Hand me a half-formed idea — a creature, a setting, a feeling — and I will build a working concept and story around it from scratch.',
    tag: '03 / Concept',
  },
  {
    title: 'Atmosphere & Tension',
    body: 'The point is never the jumpscare. It is the room that feels wrong before anything moves. Slow-building dread, written with care.',
    tag: '04 / Tone',
  },
]

export default function Work() {
  return (
    <section id="work" className="relative py-28 sm:py-36">
      <div className="container-narrow">
        <div className="max-w-3xl">
          <p className="section-eyebrow">
            <span className="h-px w-8 bg-blood-700" /> The Work
          </p>
          <h2 className="section-title">
            Fiction that feels grounded,
            <span className="text-ink-400"> not </span>
            <span className="italic text-blood-500">cheap.</span>
          </h2>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-300">
            I focus on stories that feel grounded and unsettling rather than
            relying on cheap jumpscares. I can write in a wide range of tones —
            from slow-building dread to intense and visceral horror.
          </p>
        </div>

        <div className="mt-16 grid gap-4 sm:grid-cols-2">
          {services.map((s) => (
            <article
              key={s.title}
              className="card card-hover group relative overflow-hidden p-8"
            >
              <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-blood-700/5 blur-3xl transition-opacity duration-500 group-hover:bg-blood-700/10" />
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-blood-500">
                {s.tag}
              </p>
              <h3 className="mt-5 font-display text-2xl font-semibold text-ink-100">
                {s.title}
              </h3>
              <p className="mt-3 leading-relaxed text-ink-300">{s.body}</p>
              <span className="mt-6 inline-block h-px w-10 bg-ink-700 transition-all duration-500 group-hover:w-20 group-hover:bg-blood-700" />
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
