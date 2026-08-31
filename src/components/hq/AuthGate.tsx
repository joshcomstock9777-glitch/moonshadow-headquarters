import { FormEvent, ReactNode, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'

export default function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return
      if (sessionError) setError(sessionError.message)
      setSession(data.session)
      setLoading(false)
    })

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return
      setSession(nextSession)
      setLoading(false)
    })

    return () => {
      active = false
      subscription.subscription.unsubscribe()
    }
  }, [])

  async function signIn(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) setError(signInError.message)
    setSubmitting(false)
  }

  if (loading) {
    return <div className="min-h-screen grid place-items-center text-ink-300">Verifying Headquarters session…</div>
  }

  if (!session) {
    return (
      <div className="min-h-screen grid place-items-center px-6">
        <form onSubmit={signIn} className="w-full max-w-sm border border-ink-700 bg-ink-900/90 p-6 space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-amber-300">Moonshadow Headquarters</p>
            <h1 className="mt-2 text-xl text-ink-100">Authentication required</h1>
            <p className="mt-2 text-sm text-ink-400">HQ data and control actions require an authenticated Supabase session.</p>
          </div>

          <label className="block text-sm text-ink-300">
            Email
            <input
              className="mt-1 w-full border border-ink-700 bg-ink-950 px-3 py-2 text-ink-100"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <label className="block text-sm text-ink-300">
            Password
            <input
              className="mt-1 w-full border border-ink-700 bg-ink-950 px-3 py-2 text-ink-100"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          {error ? <p className="text-sm text-blood-300" role="alert">{error}</p> : null}

          <button
            className="w-full border border-toxic-700/60 bg-toxic-700/10 px-4 py-2 text-toxic-300 disabled:opacity-50"
            type="submit"
            disabled={submitting}
          >
            {submitting ? 'Signing in…' : 'Enter Headquarters'}
          </button>
        </form>
      </div>
    )
  }

  return <>{children}</>
}
