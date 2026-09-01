export type RoundtableRole = 'herman' | 'allie' | 'challenger' | 'watcher'

type PathTarget = 'allie' | 'amber'

type PathEntry = {
  from?: string
  to?: string
  identity?: string
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
const TIMEOUT_MS = 120000
const REQUEST_TIMEOUT_MS = 15000
const SESSION_READ_ATTEMPTS = 3
const SESSION_READ_BACKOFF_MS = 750

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

function pathBaseUrl(): string {
  const configured = import.meta.env.VITE_PATH_API_URL?.trim()
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
    `CREATOR MESSAGE: ${creatorMessage.trim()}`,
  ].join('\n\n')
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
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(`Path request timed out after ${REQUEST_TIMEOUT_MS / 1000}s`)
    }
    throw error
  } finally {
    clearTimeout(timer)
  }
}

async function createSession(role: RoundtableRole, creatorMessage: string): Promise<PathSession> {
  // Do not automatically retry this POST. If Path accepted the request but the
  // response was lost, retrying here could create a duplicate session.
  const response = await fetchWithTimeout(pathUrl('sessions'), {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      target: targetForRole(role),
      message: buildMessage(role, creatorMessage).slice(0, 700),
    }),
  })

  const data = await readJson(response)
  if (!response.ok) {
    throw new Error(data.error || `Path session creation failed (${response.status})`)
  }
  if (!data.sessionId || !data.correlationId) {
    throw new Error('Path returned an invalid session response')
  }
  return data
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500
}

async function fetchSessionOnce(sessionId: string): Promise<PathSession> {
  const response = await fetchWithTimeout(pathUrl(`sessions/${encodeURIComponent(sessionId)}`), {
    headers: { accept: 'application/json' },
  })
  const data = await readJson(response)
  if (!response.ok) {
    const error = new Error(data.error || `Path session read failed (${response.status})`)
    ;(error as Error & { retryable?: boolean }).retryable = isRetryableStatus(response.status)
    throw error
  }
  return data
}

async function fetchSession(sessionId: string): Promise<PathSession> {
  let lastError: unknown = null

  for (let attempt = 1; attempt <= SESSION_READ_ATTEMPTS; attempt += 1) {
    try {
      return await fetchSessionOnce(sessionId)
    } catch (error) {
      lastError = error
      const retryable = !(error instanceof Error) ||
        (error as Error & { retryable?: boolean }).retryable !== false

      if (!retryable || attempt === SESSION_READ_ATTEMPTS) break
      await sleep(SESSION_READ_BACKOFF_MS * attempt)
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Path session read failed')
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

export async function requestRoundtableReply(
  role: RoundtableRole,
  creatorMessage: string,
): Promise<{ message: string; sessionId: string; correlationId: string }> {
  const initial = await createSession(role, creatorMessage)
  const sessionId = initial.sessionId!
  const correlationId = initial.correlationId!

  if (initial.status === 'error') {
    throw new Error(initial.error || 'Path returned an error state')
  }
  if (initial.status === 'final') {
    const message = extractWorkerReply(initial.transcript)
    if (!message) throw new Error('Path completed without a worker reply')
    return { message, sessionId, correlationId }
  }

  const startedAt = Date.now()
  while (Date.now() - startedAt < TIMEOUT_MS) {
    await sleep(POLL_INTERVAL_MS)
    const current = await fetchSession(sessionId)
    if (current.correlationId && current.correlationId !== correlationId) {
      throw new Error('Path returned a mismatched correlation ID')
    }
    if (current.status === 'error') {
      throw new Error(current.error || 'Path returned an error state')
    }
    if (current.status === 'final') {
      const message = extractWorkerReply(current.transcript)
      if (!message) throw new Error('Path completed without a worker reply')
      return { message, sessionId, correlationId }
    }
  }

  throw new Error('Path Roundtable request timed out')
}
