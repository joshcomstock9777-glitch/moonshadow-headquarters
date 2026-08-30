export default function Excerpt() {
  return (
    <section id="excerpt" className="relative py-28 sm:py-36">
      <div className="container-prose">
        <div className="mb-12 text-center">
          <p className="section-eyebrow justify-center">
            <span className="h-px w-8 bg-blood-700" /> Excerpt
            <span className="h-px w-8 bg-blood-700" />
          </p>
          <h2 className="section-title">
            A taste of the
            <span className="italic text-blood-500"> tone.</span>
          </h2>
          <p className="mt-4 font-mono text-xs uppercase tracking-[0.2em] text-ink-400">
            From &ldquo;The Listening Station&rdquo; — cosmic horror, ~1,200 words
          </p>
        </div>

        <article className="card relative overflow-hidden p-8 sm:p-12">
          <div className="pointer-events-none absolute -left-20 -top-20 h-60 w-60 rounded-full bg-blood-700/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -right-20 h-60 w-60 rounded-full bg-toxic-700/10 blur-3xl" />

          <div className="prose-horror relative">
            <p>
              The signal had been playing for eleven hours when Mira finally
              understood that it was not a signal. The array fed it through
              four filters, three of them designed to strip out anything that
              looked like a voice, and what remained was still a voice —
              patient, low, and in no language she had ever been trained to
              lose.
            </p>
            <p>
              She recorded herself listening to it. She did not remember
              deciding to. The tape showed her sitting very still for nineteen
              minutes, her mouth slightly open, her breath slowing to match a
              rhythm she could not have heard. When she played it back the
              rhythm was gone. Only the breath remained, and the breath was
              wrong.
            </p>
            <p>
              The station log said the dish had been pointed at a patch of sky
              that was not, technically, there. She read the entry twice and
              then a third time, because the third time the coordinates had
              changed, and the change was the kind of small that meant
              something had moved, and the something was not the dish.
            </p>
            <p>
              She thought: it is not transmitting. She thought: it is
              <em> remembering.</em> And then, quieter, in a voice she did not
              recognize as her own until the tape confirmed it later: it is
              remembering <em>me.</em>
            </p>
          </div>

          <div className="divider-rune mt-10 text-xs">✦</div>

          <p className="text-center font-mono text-[10px] uppercase tracking-[0.3em] text-ink-500">
            Excerpt ends — the rest of the story is for the commissioner.
          </p>
        </article>
      </div>
    </section>
  )
}
