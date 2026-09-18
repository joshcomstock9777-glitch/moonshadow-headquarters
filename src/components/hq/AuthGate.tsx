import type { ReactNode } from 'react'

/**
 * Public single-tenant app: Headquarters no longer requires a Supabase login
 * before rendering the client UI.
 *
 * Server-side Edge Functions and any database policies remain responsible for
 * protecting operations that still require authorization.
 */
export default function AuthGate({ children }: { children: ReactNode }) {
  return <>{children}</>
}
