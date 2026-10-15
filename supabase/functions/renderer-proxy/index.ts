import { createClient } from 'npm:@supabase/supabase-js@2'

// Proxies Headquarters requests to the moonshadow-renderer FFmpeg worker.
// Supabase Edge Function secrets (never exposed to the browser):
//   RENDERER_BASE_URL      e.g. https://<app>.fly.dev
//   RENDERER_WORKER_TOKEN  bearer token the worker expects

// Durations the worker accepts today (targetDurationSec must be 15 or 60).
// Add 30 / 120 / long-form here once the worker supports them.
const ALLOWED_DURATIONS = [15, 60]
const RENDER_TIMEOUT_MS = 120_000

function requiredEnv(name: string): string {
  const value = Deno.env.get(name)?.trim()
  if (!value) throw new Error(`${name} is not configured`)
  return value
}

function bearerToken(request: Request): string | null {
  const match = request.headers.get('authorization')?.trim().match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() || null
}

async function callWorker(path: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const base = requiredEnv('RENDERER_BASE_URL').replace(/\/+$/, '')
  const workerToken = requiredEnv('RENDERER_WORKER_TOKEN')
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(`${base}${path}`, {
      ...init,
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer ' + workerToken,
      },
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timer)
  }
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
    const { data, error } = await supabase.auth.getUser(token)
    if (error || !data.user) {
      return Response.json({ error: 'Invalid or expired Headquarters session' }, { status: 401 })
    }
    const role = data.user.app_metadata?.hq_role
    if (role !== 'owner' && role !== 'operator') {
      return Response.json({ error: 'Headquarters owner/operator role required' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))

    if (body?.action === 'health') {
      const res = await callWorker('/health', { method: 'GET' }, 15_000)
      return Response.json({ ok: res.ok, status: res.status, worker: await res.json().catch(() => null) })
    }

    if (body?.action === 'render') {
      const { projectAssetId, outputName, projectName, mimeType, inputUri, targetDurationSec } = body
      if (typeof projectAssetId !== 'string' || typeof outputName !== 'string') {
        return Response.json({ error: 'projectAssetId and outputName are required' }, { status: 400 })
      }
      if (targetDurationSec != null && !ALLOWED_DURATIONS.includes(targetDurationSec)) {
        return Response.json(
          { error: `targetDurationSec must be one of ${ALLOWED_DURATIONS.join(', ')}` },
          { status: 400 },
        )
      }
      const res = await callWorker(
        '/renders',
        {
          method: 'POST',
          body: JSON.stringify({ projectAssetId, outputName, projectName, mimeType, inputUri, targetDurationSec }),
        },
        RENDER_TIMEOUT_MS,
      )
      return Response.json(
        { ok: res.ok, status: res.status, render: await res.json().catch(() => null) },
        { status: res.ok ? 200 : 502 },
      )
    }

    return Response.json({ error: "action must be 'health' or 'render'" }, { status: 400 })
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Renderer proxy failed' }, { status: 500 })
  }
})
