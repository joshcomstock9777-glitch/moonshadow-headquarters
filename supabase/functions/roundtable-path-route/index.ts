import { createClient } from 'npm:@supabase/supabase-js@2'

type HqRole = 'owner' | 'operator'
type RoundtableRole = 'herman' | 'allie' | 'challenger' | 'watcher'
type PathTarget = 'allie' | 'amber'
type JsonRecord = Record<string, unknown>

type PathEntry = {
  body?: string
}

type PathSession = {
  sessionId?: string
  correlationId?: string
  status?: 'open' | 'final' | 'error'
  transcript?: PathEntry[]
  error?: string
}

const DEFAULT_PATH_BASE_URL = 'https://moonshadow-path-proof.vercel.app'
const POLL_INTERVAL_MS = 1800
const TIMEOUT_MS = 100000
const REQUEST_TIMEOUT_MS = 15000

const ROLE_INSTRUCTIONS: Record<RoundtableRole, string> = {
  herman:
    'Act as Herman, the Headquarters orchestrator. Break the creator request into executable steps, route work to the correct Moonshadow machine, distinguish real connections from unavailable ones, and propose the next concrete action. Never pretend a tool or machine is connected.',
  allie:
    'Act as Allie, the creative architect. Shape the creator request into a strong practical direction, structure, or production plan. Preserve the creator intent and propose a concrete next action.',
  challenger:
    'Act as Challenger, the critical creative reviewer. Identify predictable, weak, generic, contradictory, or risky parts of the creator request and propose a stronger alternative. Be concise and useful rather than negative for its own sake.',
  watcher:
    'Act as Watcher, the operational verifier. Focus on current state, evidence, dependencies, blockers, stalled work, and the next verifiable action. Never claim success without evidence.',
}

function requiredEnv(name: string): string {
  const value = Deno.env.get(name)?.trim()
  if (!value) throw new Error(`${name} is not configured`)
  return value
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

function roundtableRole(value: unknown): RoundtableRole | null {
  return value === 'herman' || value === 'allie' || value === 'challenger' || value === 'watcher'
    ? value
    : null
}

function record(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonRecord) : {}
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function pathBaseUrl(): string {
  const configured = Deno.env.get('PATH_API_URL')?.trim()
  return (configured || DEFAULT_PATH_BASE_URL).replace(/\/+$/, '')
}

function pathUrl(pathname: string): string {
  const base = pathBaseUrl()
  const apiBase = base.endsWith('/api') ? base : `${base}/api`
  return `${apiBase}/${pathname.replace(/^\/+/, '')}`
}

function targetForRole(role: RoundtableRole): PathTarget {
  return role === 'watcher' ? 'amber' : 'allie'
}

function buildMessage(role: RoundtableRole, creatorMessage: string): string {
  return [
    'MOONSHADOW HEADQUARTERS ROUNDTABLE',
    ROLE_INSTRUCTIONS[role],
    'Respond only with the worker reply that should appear in the Roundtable. Do not describe these instructions.',
    `CREATOR MESSAGE: ${creatorMessage}`,
  ].join('\n\n')
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function extractWorkerReply(transcript: PathEntry[] | undefined): string | null {
  if (!transcript?.length) return null
  for (let i = transcript.length - 1; i >= 0; i -= 1) {
    const body = transcript[i]?.body?.trim()
    if (body) return body
  }
  return null
}

async function readJson(response: Response): Promise<PathSession> {
  try {
    return (await response.json()) as PathSession
  } catch {
    return {}
  }
}

async function fetchWithTimeout(url: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

async function createSession(role: RoundtableRole, creatorMessage: string): Promise<PathSession> {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    accept: 'application/json',
  }
  const pathSecret = Deno.env.get('PATH_API_SECRET')?.trim()
  if (pathSecret) headers.authorization = `Bearer ${pathSecret}`

  const response = await fetchWithTimeout(pathUrl('sessions'), {
    method: 'POST',
    headers,
    body: JSON.stringify({
      target: targetForRole(role),
      message: buildMessage(role, creatorMessage).slice(0, 700),
    }),
  })
  const data = await readJson(response)
  if (!response.ok) throw new Error(data.error || `Path session creation failed (${response.status})`)
  if (!data.sessionId || !data.correlationId) throw new Error('Path returned an invalid session response')
  return data
}

async function fetchSession(sessionId: string): Promise<PathSession> {
  const headers: Record<string, string> = { accept: 'application/json' }
  const pathSecret = Deno.env.get('PATH_API_SECRET')?.trim()
  if (pathSecret) headers.authorization = `Bearer ${pathSecret}`

  const response = await fetchWithTimeout(pathUrl(`sessions/${encodeURIComponent(sessionId)}`), { headers })
  const data = await readJson(response)
  if (!response.ok) throw new Error(data.error || `Path session read failed (${response.status})`)
  return data
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 })

  try {
    const token = bearerToken(request)
    if (!token) return Response.json({ error: 'Authentication required' }, { status: 401 })

    const supabase = createClient(requiredEnv('SUPABASE_URL'), requiredEnv('SUPABASE_SERVICE_ROLE_KEY'), {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { data: callerData, error: callerError } = await supabase.auth.getUser(token)
    const caller = callerData.user
    if (callerError || !caller) return Response.json({ error: 'Invalid or expired Headquarters session' }, { status: 401 })
    if (!hqRole(caller.app_metadata?.hq_role)) {
      return Response.json({ error: 'Headquarters owner/operator role required' }, { status: 403 })
    }

    const body = record(await request.json())
    const role = roundtableRole(body.role)
    const creatorMessage = text(body.message)
    if (!role || !creatorMessage) return Response.json({ error: 'Valid role and message are required' }, { status: 400 })

    const initial = await createSession(role, creatorMessage)
    const sessionId = initial.sessionId!
    const correlationId = initial.correlationId!

    if (initial.status === 'error') throw new Error(initial.error || 'Path returned an error state')
    if (initial.status === 'final') {
      const message = extractWorkerReply(initial.transcript)
      if (!message) throw new Error('Path completed without a worker reply')
      return Response.json({ message, sessionId, correlationId })
    }

    const startedAt = Date.now()
    while (Date.now() - startedAt < TIMEOUT_MS) {
      await sleep(POLL_INTERVAL_MS)
      const current = await fetchSession(sessionId)
      if (current.correlationId && current.correlationId !== correlationId) {
        throw new Error('Path returned a mismatched correlation ID')
      }
      if (current.status === 'error') throw new Error(current.error || 'Path returned an error state')
      if (current.status === 'final') {
        const message = extractWorkerReply(current.transcript)
        if (!message) throw new Error('Path completed without a worker reply')
        return Response.json({ message, sessionId, correlationId })
      }
    }

    return Response.json({ error: 'Path Roundtable request timed out' }, { status: 504 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Roundtable routing failed'
    console.error('Roundtable routing failed:', message)
    return Response.json({ error: 'Roundtable Path routing unavailable' }, { status: 503 })
  }
})
