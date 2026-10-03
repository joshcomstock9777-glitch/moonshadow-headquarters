import { createClient } from 'npm:@supabase/supabase-js@2'
import { buildConversationMessage, type ConversationMessage } from './conversation.ts'

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
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(data: unknown, init: ResponseInit = {}): Response {
  return Response.json(data, { ...init, headers: { ...CORS_HEADERS, ...init.headers } })
}

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

async function createSession(role: RoundtableRole, creatorMessage: string, history: ConversationMessage[]): Promise<PathSession> {
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
      message: buildConversationMessage(ROLE_INSTRUCTIONS[role], creatorMessage, history),
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
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS })
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, { status: 405 })

  try {
    const token = bearerToken(request)
    if (!token) return json({ error: 'Authentication required' }, { status: 401 })

    const supabase = createClient(requiredEnv('SUPABASE_URL'), requiredEnv('SUPABASE_SERVICE_ROLE_KEY'), {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { data: callerData, error: callerError } = await supabase.auth.getUser(token)
    const caller = callerData.user
    if (callerError || !caller) return json({ error: 'Invalid or expired Headquarters session' }, { status: 401 })
    if (!hqRole(caller.app_metadata?.hq_role)) {
      return json({ error: 'Headquarters owner/operator role required' }, { status: 403 })
    }

    const body = record(await request.json())
    const role = roundtableRole(body.role)
    const creatorMessage = text(body.message)
    if (!role || !creatorMessage) return json({ error: 'Valid role and message are required' }, { status: 400 })
    if (new TextEncoder().encode(creatorMessage).length > 6000) {
      return json({ error: 'Message is too long. Split it into shorter messages.' }, { status: 400 })
    }

    let history: ConversationMessage[] = []
    const creatorMessageId = text(body.creatorMessageId)
    if (creatorMessageId) {
      // Reuse the caller's identity for reads, so RLS also governs context.
      const roomClient = createClient(requiredEnv('SUPABASE_URL'), requiredEnv('SUPABASE_ANON_KEY'), {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      })
      const { data: anchor, error: anchorError } = await roomClient
        .from('roundtable_messages')
        .select('id, project_id, role, message')
        .eq('id', creatorMessageId)
        .single()
      if (anchorError || !anchor || anchor.role !== 'creator' || anchor.message.trim() !== creatorMessage) {
        return json({ error: 'The saved creator message could not be read or did not match.' }, { status: 400 })
      }
      let query = roomClient.from('roundtable_messages')
        .select('role, message, path_evidence_verified')
        .neq('id', creatorMessageId)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(12)
      query = anchor.project_id ? query.eq('project_id', anchor.project_id) : query.is('project_id', null)
      const { data: rows, error: historyError } = await query
      if (historyError) throw new Error('Shared conversation could not be read')
      history = (rows ?? []).reverse()
    }

    const initial = await createSession(role, creatorMessage, history)
    const sessionId = initial.sessionId!
    const correlationId = initial.correlationId!

    if (initial.status === 'error') throw new Error(initial.error || 'Path returned an error state')
    if (initial.status === 'final') {
      const message = extractWorkerReply(initial.transcript)
      if (!message) throw new Error('Path completed without a worker reply')
      return json({ message, sessionId, correlationId })
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
        return json({ message, sessionId, correlationId })
      }
    }

    return json({ error: 'Path Roundtable request timed out' }, { status: 504 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Roundtable routing failed'
    console.error('Roundtable routing failed:', message)
    return json({ error: 'Roundtable Path routing unavailable' }, { status: 503 })
  }
})
