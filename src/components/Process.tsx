const steps = [
  {
    n: '01',
    title: 'Message me first',
    body: 'Send your idea, preferred length, tone, and any specific elements — creatures, settings, themes. The more detail you give, the better I can make the story.',
  },
  {
    n: '02',
    title: 'We agree on the shape',
    body: 'I will reply with a quick read on feasibility, a proposed length, and a quote. Once we agree, you commission the piece and I begin.',
  },
  {
    n: '03',
    title: 'I write by hand',
    body: 'No AI. Every sentence is written by hand with care and attention to tone and pacing. Atmosphere first, dread throughout, a memorable ending.',
  },
  {
    n: '04',
    title: 'You receive the story',
    body: 'Delivered as a clean document. One revision pass is included to tighten the dread where you want it sharper.',
  },
]

export default function Process() {
  return (
    <section
      id="process"
      className="relative border-t border-ink-800/60 py-28 sm:py-36"
    >
      <div className="container-narrow">
        <div className="max-w-3xl">
          <p className="section-eyebrow">
            <span className="h-px w-8 bg-blood-700" /> Process
          </p>
          <h2 className="section-title">
            How an order
            <span className="italic text-blood-500"> unfolds.</span>
          </h2>
        </div>

        <ol className="mt-16 grid gap-4 sm:grid-cols-2">
          {steps.map((s) => (
            <li
              key={s.n}
              className="card card-hover group relative flex gap-5 p-7"
            >
              <span className="font-display text-5xl font-semibold text-ink-700 transition-colors duration-500 group-hover:text-blood-700">
                {s.n}
              </span>
              <div>
                <h3 className="font-display text-xl font-semibold text-ink-100">
                  {s.title}
                </h3>
                <p className="mt-2 leading-relaxed text-ink-300">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
