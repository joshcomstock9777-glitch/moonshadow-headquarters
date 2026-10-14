import { createClient } from 'npm:@supabase/supabase-js@2'

function requiredEnv(name: string): string {
  const value = Deno.env.get(name)?.trim()
  if (!value) throw new Error(`${name} is not configured`)
  return value
}

function bearerToken(request: Request): string | null {
  const match = request.headers.get('authorization')?.trim().match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() || null
}

const SYSTEM_PROMPT = `You are the Moonshadow script writer. Turn a rough idea into a short-form video plan.
Return ONLY JSON: {"title": string, "hook": string, "script": string, "caption": string, "shots": [{"order": number, "visual": string, "voiceover": string, "seconds": number, "destination": string, "character_shot": boolean, "characterShot": boolean}]}`

Deno.serve(async (request) => {
  if (request.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 })
  try {
    const token = bearerToken(request)
    if (!token) return Response.json({ error: 'Authentication required' }, { status: 401 })

    const supabase = createClient(requiredEnv('SUPABASE_URL'), requiredEnv('SUPABASE_SERVICE_ROLE_KEY'), {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data: callerData, error: callerError } = await supabase.auth.getUser(token)
    const role = callerData.user?.app_metadata?.hq_role
    if (callerError || !callerData.user) return Response.json({ error: 'Invalid or expired session' }, { status: 401 })
    if (role !== 'owner' && role !== 'operator') {
      return Response.json({ error: 'Headquarters owner/operator role required' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const idea = typeof body?.idea === 'string' ? body.idea.trim().slice(0, 4000) : ''
    const platform = typeof body?.platform === 'string' ? body.platform.trim().slice(0, 40) : 'YouTube'
    const duration = typeof body?.duration === 'string' ? body.duration.trim().slice(0, 40) : '60 seconds'
    if (!idea) return Response.json({ error: 'idea is required' }, { status: 400 })

    const llm = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + requiredEnv('OPENAI_API_KEY') },
      body: JSON.stringify({
        model: Deno.env.get('OPENAI_MODEL')?.trim() || 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Platform: ${platform}\nTarget length: ${duration}\nIdea: ${idea}` },
        ],
      }),
    })
    if (!llm.ok) return Response.json({ error: `Model request failed (${llm.status})` }, { status: 502 })
    const completion = await llm.json()
    let plan: Record<string, unknown>
    try {
      plan = JSON.parse(completion?.choices?.[0]?.message?.content ?? '')
    } catch {
      return Response.json({ error: 'Model returned invalid JSON' }, { status: 502 })
    }

    const title = typeof plan.title === 'string' && plan.title.trim() ? plan.title.trim() : idea.slice(0, 80)
    const { data: project, error } = await supabase
      .from('projects')
      .insert({
        title,
        goal: idea,
        type: 'clip',
        target_platform: platform,
        duration,
        notes: JSON.stringify(plan),
      })
      .select('id')
      .single()
    if (error) return Response.json({ error: error.message }, { status: 500 })

    return Response.json({ project_id: project.id, plan })
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Unexpected error' }, { status: 500 })
  }
})
