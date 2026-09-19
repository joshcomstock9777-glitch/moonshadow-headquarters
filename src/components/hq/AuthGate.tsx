import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'

type GateState =
  | { status: 'loading' }
  | { status: 'signed-out' }
  | { status: 'forbidden'; user: User }
  | { status: 'authorized'; user: User }

function hasHeadquartersRole(user: User): boolean {
  const role = user.app_metadata?.hq_role
  return role === 'owner' || role === 'operator'
}

function stateForUser(user: User | null): GateState {
  if (!user) return { status: 'signed-out' }
  return hasHeadquartersRole(user)
    ? { status: 'authorized', user }
    : { status: 'forbidden', user }
}

/**
 * Headquarters is fail-closed. The interface renders only for an authenticated
 * Supabase user whose server-controlled app_metadata.hq_role is owner/operator.
 */
export default function AuthGate({ children }: { children: ReactNode }) {
  const [gate, setGate] = useState<GateState>({ status: 'loading' })
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return
      if (sessionError) {
        setError(`Headquarters authentication check failed: ${sessionError.message}`)
        setGate({ status: 'signed-out' })
        return
      }
      setGate(stateForUser(data.session?.user ?? null))
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setGate(stateForUser(session?.user ?? null))
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  async function sendMagicLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalizedEmail = email.trim()
    if (!normalizedEmail || submitting) return

    setSubmitting(true)
    setError(null)
    setNotice(null)

    const redirectTo = `${window.location.origin}${window.location.pathname}#/hq/roundtable`
    const { error: signInError } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: { emailRedirectTo: redirectTo },
    })

    if (signInError) {
      setError(signInError.message)
    } else {
      setNotice('Check your email for the Headquarters sign-in link. This screen will unlock only after Supabase verifies an owner or operator session.')
    }
    setSubmitting(false)
  }

  async function signOut() {
    setError(null)
    const { error: signOutError } = await supabase.auth.signOut()
    if (signOutError) setError(signOutError.message)
  }

  if (gate.status === 'authorized') return <>{children}</>

  return (
    <div className="relative flex min-h-screen items-center justify-center px-6 py-16">
      <div className="grain" aria-hidden="true" />
      <div className="vignette" aria-hidden="true" />
      <section className="card relative z-10 w-full max-w-lg space-y-6 p-8">
        <div>
          <p className="section-eyebrow">
            <span className="h-px w-8 bg-blood-700" /> Headquarters access
          </p>
          <h1 className="section-title">
            {gate.status === 'loading' ? 'Checking your session…' : 'Sign in to Headquarters.'}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-400">
            Headquarters controls require a verified owner or operator session. Public visitors cannot read or write operational records.
          </p>
        </div>

        {gate.status === 'loading' ? (
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink-500">Authenticating…</p>
        ) : gate.status === 'forbidden' ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-blood-700/50 bg-blood-900/10 px-4 py-3 text-sm text-blood-300">
              This account is signed in but does not have an owner/operator Headquarters role.
            </div>
            <button type="button" onClick={() => void signOut()} className="btn-secondary">
              Sign out
            </button>
          </div>
        ) : (
          <form onSubmit={sendMagicLink} className="space-y-4">
            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-500">Email</span>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="field-input mt-2"
                placeholder="you@example.com"
              />
            </label>
            <button type="submit" disabled={submitting || !email.trim()} className="btn-primary w-full">
              {submitting ? 'Sending secure link…' : 'Email me a sign-in link'}
            </button>
          </form>
        )}

        {notice && (
          <div className="rounded-xl border border-toxic-700/40 bg-toxic-900/10 px-4 py-3 text-sm text-toxic-300">
            {notice}
          </div>
        )}
        {error && (
          <div className="rounded-xl border border-blood-700/50 bg-blood-900/10 px-4 py-3 text-sm text-blood-300">
            {error}
          </div>
        )}
      </section>
    </div>
  )
}
