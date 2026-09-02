import { createClient } from 'npm:@supabase/supabase-js@2'

type HqRole = 'owner' | 'operator'
type JsonRecord = Record<string, unknown>

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

function record(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonRecord) : {}
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function uuidOrNull(value: unknown): string | null {
  const candidate = text(value)
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(candidate)
    ? candidate
    : null
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

    const body = record(await request.json())
    if (text(body.action) !== 'queue_handoff') {
      return Response.json({ error: 'Unsupported Dock write action' }, { status: 400 })
    }

    const jobType = text(body.jobType)
    const fromActor = text(body.fromActor)
    const toActor = text(body.toActor)
    const note = text(body.note) || null
    const payload = record(body.payload)
    const machineId = body.machineId == null ? null : uuidOrNull(body.machineId)

    if (!jobType || !fromActor || !toActor) {
      return Response.json({ error: 'jobType, fromActor, and toActor are required' }, { status: 400 })
    }
    if (body.machineId != null && !machineId) {
      return Response.json({ error: 'machineId must be a valid UUID' }, { status: 400 })
    }

    if (machineId) {
      const { data: machine, error: machineError } = await supabase
        .from('machines')
        .select('id,status')
        .eq('id', machineId)
        .maybeSingle()

      if (machineError) {
        console.error('Dock machine lookup failed:', machineError.message)
        return Response.json({ error: 'Live Dock registry unavailable' }, { status: 503 })
      }
      if (!machine) return Response.json({ error: 'Destination machine is not registered' }, { status: 409 })
      if (machine.status !== 'online') {
        return Response.json({ error: 'Destination machine is not online' }, { status: 409 })
      }
    }

    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert({
        machine_id: machineId,
        job_type: jobType,
        status: 'queued',
        payload,
        requested_by: caller.id,
      })
      .select('id,status,created_at')
      .single()

    if (jobError || !job) {
      console.error('Dock job insert failed:', jobError?.message || 'no row returned')
      return Response.json({ error: 'Dock queue write failed' }, { status: 503 })
    }

    const { data: handoff, error: handoffError } = await supabase
      .from('handoffs')
      .insert({
        job_id: job.id,
        from_actor: fromActor,
        to_actor: toActor,
        note,
      })
      .select('id,job_id,from_actor,to_actor,note,created_at')
      .single()

    if (handoffError || !handoff) {
      console.error('Dock handoff insert failed:', handoffError?.message || 'no row returned')
      const { error: cleanupError } = await supabase.from('jobs').delete().eq('id', job.id).eq('status', 'queued')
      if (cleanupError) console.error('Dock orphan cleanup failed:', cleanupError.message)
      return Response.json({ error: 'Dock handoff write failed' }, { status: 503 })
    }

    const { error: eventError } = await supabase.from('job_events').insert({
      job_id: job.id,
      event_type: 'handoff_queued',
      detail: {
        handoff_id: handoff.id,
        from_actor: fromActor,
        to_actor: toActor,
        machine_id: machineId,
      },
    })

    if (eventError) {
      console.error('Dock job event insert failed:', eventError.message)
      return Response.json(
        {
          error: 'Dock handoff queued but event evidence could not be persisted',
          jobId: job.id,
          handoffId: handoff.id,
        },
        { status: 503 },
      )
    }

    return Response.json({
      accepted: true,
      dispatchState: 'queued',
      job: { id: job.id, status: job.status, createdAt: job.created_at },
      handoff,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Dock write failed'
    console.error('Dock write failed:', message)
    return Response.json({ error: 'Dock write unavailable' }, { status: 500 })
  }
})
