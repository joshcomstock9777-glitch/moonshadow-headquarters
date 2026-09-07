import { createClient } from 'npm:@supabase/supabase-js@2'

const REQUEST_TIMEOUT_MS = 15_000
const DEFAULT_PATH_BASE_URL = 'https://moonshadow-path-proof.vercel.app'

type VerifyRequest = {
  messageId?: string
}

type RoundtableRow = {
  id: string
  role: string
  message: string
  path_session_id: string | null
  path_correlation_id: string | null
  path_target: string | null
  path_evidence_verified: boolean
}

type PathTranscriptEntry = {
  from?: string
  to?: string
  identity?: string
  body?: string
}

type PathSession = {
  sessionId?: string
  correlationId?: string
  target?: string
  status?: string
  transcript?: PathTranscriptEntry[]
  error?: string
}

type HqRole = 'owner' | 'operator'

function requiredEnv(name: string): string {
  const value = Deno.env.get(name)?.trim()
  if (!value) throw new Error(`${name} is not configured`)
  return value
}

function pathBaseUrl(): string {
  return (
    Deno.env.get('PATH_API_URL')?.trim()
    || Deno.env.get('MOONSHADOW_PATH_API_URL')?.trim()
    || DEFAULT_PATH_BASE_URL
  ).replace(/\/+$/, '')
}

function pathSessionUrl(sessionId: string): string {
  const base = pathBaseUrl()
  const apiBase = base.endsWith('/api') ? base : `${base}/api`
  return `${apiBase}/sessions/${encodeURIComponent(sessionId)}`
}

function bearerToken(request: Request): string | null {
  const authorization = request.headers.get('authorization')?.trim()
  if (!authorization) return null
  const match = authorization.match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() || null
}

function hqRole(value: unknown): HqRole | null {
  return value === 'owner' || value === 'operator' ? value : null
}

async function fetchPathSession(sessionId: string): Promise<PathSession> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const headers: Record<string, string> = { accept: 'application/json' }
    const pathSecret = Deno.env.get('PATH_API_SECRET')?.trim()
    if (pathSecret) headers.authorization = `Bearer ${pathSecret}`

    const response = await fetch(pathSessionUrl(sessionId), {
      headers,
      signal: controller.signal,
    })
    const data = (await response.json().catch(() => ({}))) as PathSession
    if (!response.ok) {
      throw new Error(data.error || `Path session lookup failed (${response.status})`)
    }
    return data
  } finally {
    clearTimeout(timer)
  }
}

function transcriptContainsExactReply(transcript: PathTranscriptEntry[] | undefined, expected: string): boolean {
  if (!transcript?.length) return false
  const normalizedExpected = expected.trim()
  return transcript.some((entry) => entry.body?.trim() === normalizedExpected)
}

function sessionMatchesRecordedEvidence(row: RoundtableRow, session: PathSession): string | null {
  if (session.status !== 'final') return 'Path session is not final'
  if (session.sessionId && session.sessionId !== row.path_session_id) return 'Path session ID mismatch'
  if (session.correlationId !== row.path_correlation_id) return 'Path correlation ID mismatch'
  if (session.target && row.path_target && session.target !== row.path_target) return 'Path target mismatch'
  if (!transcriptContainsExactReply(session.transcript, row.message)) return 'Recorded Roundtable reply is not present in the Path transcript'
  return null
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 })
  }

  try {
    const token = bearerToken(request)
    if (!token) return Response.json({ error: 'Authentication required' }, { status: 401 })

    const supabase = createClient(requiredEnv('SUPABASE_URL'), requiredEnv('SUPABASE_SERVICE_ROLE_KEY'), {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { data: callerData, error: callerError } = await supabase.auth.getUser(token)
    const caller = callerData.user
    if (callerError || !caller) {
      return Response.json({ error: 'Invalid or expired Headquarters session' }, { status: 401 })
    }

    if (!hqRole(caller.app_metadata?.hq_role)) {
      return Response.json({ error: 'Headquarters owner/operator role required' }, { status: 403 })
    }

    const body = (await request.json().catch(() => ({}))) as VerifyRequest
    const messageId = body.messageId?.trim()
    if (!messageId) return Response.json({ error: 'messageId is required' }, { status: 400 })

    const { data, error } = await supabase
      .from('roundtable_messages')
      .select('id, role, message, path_session_id, path_correlation_id, path_target, path_evidence_verified')
      .eq('id', messageId)
      .single()

    if (error || !data) {
      return Response.json({ error: 'Roundtable message not found' }, { status: 404 })
    }

    const row = data as RoundtableRow
    if (row.role === 'creator') {
      return Response.json({ error: 'Creator messages cannot carry Path verification evidence' }, { status: 400 })
    }
    if (!row.path_session_id || !row.path_correlation_id || !row.path_target) {
      return Response.json({ error: 'Roundtable message is missing recorded Path evidence' }, { status: 409 })
    }
    if (row.path_evidence_verified) {
      return Response.json({ verified: true, messageId: row.id, alreadyVerified: true })
    }

    const session = await fetchPathSession(row.path_session_id)
    const mismatch = sessionMatchesRecordedEvidence(row, session)
    if (mismatch) {
      return Response.json({ verified: false, error: mismatch }, { status: 409 })
    }

    const verifiedAt = new Date().toISOString()
    const { data: updated, error: updateError } = await supabase
      .from('roundtable_messages')
      .update({ path_evidence_verified: true, path_evidence_verified_at: verifiedAt })
      .eq('id', row.id)
      .eq('path_session_id', row.path_session_id)
      .eq('path_correlation_id', row.path_correlation_id)
      .eq('path_evidence_verified', false)
      .select('id')
      .maybeSingle()

    if (updateError) throw updateError
    if (!updated) {
      return Response.json({ verified: false, error: 'Evidence changed before verification could be recorded' }, { status: 409 })
    }

    return Response.json({ verified: true, messageId: row.id, verifiedAt })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Verification failed'
    console.error('Roundtable Path verification failed:', message)
    return Response.json({ error: message }, { status: 500 })
  }
})
