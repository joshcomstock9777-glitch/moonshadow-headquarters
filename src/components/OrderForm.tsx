import { useState } from 'react'
import { supabase } from '../lib/supabase'

type Status = 'idle' | 'submitting' | 'success' | 'error'

const subGenres = [
  'Cosmic horror',
  'Body horror',
  'Psychological',
  'Dystopian',
  'Post-apocalyptic',
  'Creature / feature',
  'Surprise me',
]

const lengths = [
  'Flash (~500 words)',
  'Short (~1,500 words)',
  'Long short (~3,000 words)',
  'Novella-length (5,000+)',
  'A single scene',
]

const tones = [
  'Slow-building dread',
  'Visceral / intense',
  'Quiet and psychological',
  'Surreal and dreamlike',
  'Bleak and hopeless',
  'Mix — you decide',
]

export default function OrderForm() {
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [form, setForm] = useState({
    name: '',
    email: '',
    sub_genre: '',
    length: '',
    tone: '',
    idea: '',
    elements: '',
  })

  const update =
    (k: keyof typeof form) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >,
    ) =>
      setForm((f) => ({ ...f, [k]: e.target.value }))

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (status === 'submitting') return
    setStatus('submitting')
    setErrorMsg('')
    try {
      const { error } = await supabase.from('story_inquiries').insert({
        name: form.name.trim(),
        email: form.email.trim(),
        sub_genre: form.sub_genre || null,
        length: form.length || null,
        tone: form.tone || null,
        idea: form.idea.trim(),
        elements: form.elements.trim() || null,
      })
      if (error) throw error
      setStatus('success')
      setForm({
        name: '',
        email: '',
        sub_genre: '',
        length: '',
        tone: '',
        idea: '',
        elements: '',
      })
    } catch (err) {
      setStatus('error')
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Something went wrong. Please try again.',
      )
    }
  }

  return (
    <section
      id="order"
      className="relative overflow-hidden border-t border-ink-800/60 py-28 sm:py-36"
    >
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[50vh] w-[80vw] -translate-x-1/2 rounded-full bg-blood-800/10 blur-[140px]" />
      </div>

      <div className="container-narrow grid gap-16 lg:grid-cols-[1fr_1.2fr]">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <p className="section-eyebrow">
            <span className="h-px w-8 bg-blood-700" /> Commission
          </p>
          <h2 className="section-title">
            Send me your
            <span className="italic text-blood-500"> nightmare.</span>
          </h2>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-ink-300">
            Message me first with your idea, preferred length, tone, and any
            specific elements you want included — creatures, settings, themes.
            The more details you give, the better I can make the story.
          </p>

          <ul className="mt-10 space-y-4 text-sm text-ink-300">
            <li className="flex items-start gap-3">
              <span className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-blood-500" />
              <span>
                <span className="text-ink-100">No AI.</span> Every story is
                written by hand.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-blood-500" />
              <span>
                <span className="text-ink-100">Atmosphere first.</span>{' '}
                Grounded, unsettling, never cheap.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-blood-500" />
              <span>
                <span className="text-ink-100">One revision pass</span>{' '}
                included to tighten the dread.
              </span>
            </li>
          </ul>

          <p className="mt-10 font-display text-xl italic text-ink-400">
            &ldquo;Looking forward to writing something dark and unsettling for
            you.&rdquo;
          </p>
        </div>

        <div className="card relative overflow-hidden p-8 sm:p-10">
          {status === 'success' ? (
            <div className="flex min-h-[420px] flex-col items-center justify-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-blood-600/60 bg-blood-700/10">
                <span className="font-display text-3xl text-blood-400">✦</span>
              </div>
              <h3 className="mt-6 font-display text-3xl font-semibold text-ink-100">
                Your inquiry is in.
              </h3>
              <p className="mt-3 max-w-sm text-ink-300">
                I read every brief by hand. Expect a reply at the email you gave
                — usually within a day or two.
              </p>
              <button
                onClick={() => setStatus('idle')}
                className="btn-ghost mt-8"
              >
                Send another
              </button>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-6" noValidate>
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="name" className="field-label">
                    Name / Pen name
                  </label>
                  <input
                    id="name"
                    required
                    value={form.name}
                    onChange={update('name')}
                    className="field-input"
                    placeholder="How should I address you?"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="field-label">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={form.email}
                    onChange={update('email')}
                    className="field-input"
                    placeholder="you@somewhere.dark"
                  />
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-3">
                <div>
                  <label htmlFor="sub_genre" className="field-label">
                    Sub-genre
                  </label>
                  <select
                    id="sub_genre"
                    value={form.sub_genre}
                    onChange={update('sub_genre')}
                    className="field-select"
                  >
                    <option value="">Choose…</option>
                    {subGenres.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="length" className="field-label">
                    Length
                  </label>
                  <select
                    id="length"
                    value={form.length}
                    onChange={update('length')}
                    className="field-select"
                  >
                    <option value="">Choose…</option>
                    {lengths.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="tone" className="field-label">
                    Tone
                  </label>
                  <select
                    id="tone"
                    value={form.tone}
                    onChange={update('tone')}
                    className="field-select"
                  >
                    <option value="">Choose…</option>
                    {tones.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="idea" className="field-label">
                  Your idea <span className="text-blood-500">*</span>
                </label>
                <textarea
                  id="idea"
                  required
                  value={form.idea}
                  onChange={update('idea')}
                  className="field-textarea"
                  placeholder="The premise. The feeling. The thing you can't stop picturing. Be as detailed as you like — detail is fuel."
                />
              </div>

              <div>
                <label htmlFor="elements" className="field-label">
                  Specific elements
                </label>
                <textarea
                  id="elements"
                  value={form.elements}
                  onChange={update('elements')}
                  className="field-textarea !min-h-[80px]"
                  placeholder="Creatures, settings, themes, references, things to avoid…"
                />
              </div>

              {status === 'error' && (
                <div className="rounded-lg border border-blood-700/60 bg-blood-900/30 px-4 py-3 text-sm text-blood-300">
                  {errorMsg}
                </div>
              )}

              <div className="flex flex-col items-start gap-4 pt-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-500">
                  No payment yet — we agree on scope first.
                </p>
                <button
                  type="submit"
                  disabled={status === 'submitting'}
                  className="btn-primary w-full sm:w-auto"
                >
                  {status === 'submitting' ? (
                    <>
                      <span className="h-2 w-2 animate-ping rounded-full bg-ink-100" />
                      Sending…
                    </>
                  ) : (
                    'Send Inquiry'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  )
}
