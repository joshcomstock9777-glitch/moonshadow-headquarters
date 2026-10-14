import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { navigate } from '../../lib/router'

type Shot = { order?: number; visual?: string; voiceover?: string; seconds?: number }
type Plan = { title?: string; hook?: string; script?: string; caption?: string; shots?: Shot[] }

export default function IdeaBox({ onCreated }: { onCreated?: () => void }) {
  const [idea, setIdea] = useState('')
  const [platform, setPlatform] = useState('YouTube')
  const [duration, setDuration] = useState('60 seconds')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ projectId: string; plan: Plan } | null>(null)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (busy || !idea.trim()) return
    setBusy(true)
    setError('')
    setResult(null)
    const { data, error: invokeError } = await supabase.functions.invoke<{
      project_id?: string
      plan?: Plan
      error?: string
    }>('generate-script', { body: { idea: idea.trim(), platform, duration } })
    setBusy(false)
    if (invokeError || !data?.project_id) {
      setError(
        data?.error ||
          invokeError?.message ||
          'Script writer unavailable. Deploy the generate-script function and set OPENAI_API_KEY.',
      )
      return
    }
    setResult({ projectId: data.project_id, plan: data.plan ?? {} })
    setIdea('')
    onCreated?.()
  }

  return (
    <div className="card space-y-4 p-6">
      <div>
        <p className="section-eyebrow">
          <span className="h-px w-8 bg-blood-700" /> Idea Box
        </p>
        <p className="mt-2 text-sm text-ink-300">
          Drop in a rough idea. The script writer turns it into a hook, script, caption and shot list.
        </p>
      </div>
      <form onSubmit={submit} className="space-y-3">
        <textarea
          value={idea}
          onChange={(event) => setIdea(event.target.value)}
          placeholder="e.g. A lighthouse keeper discovers the light is keeping something in…"
          className="field-textarea"
          rows={3}
          maxLength={4000}
        />
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="field-label">Platform</label>
            <select value={platform} onChange={(event) => setPlatform(event.target.value)} className="field-select">
              {['YouTube', 'Instagram', 'TikTok', 'X'].map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label">Length</label>
            <select value={duration} onChange={(event) => setDuration(event.target.value)} className="field-select">
              {['30 seconds', '60 seconds', '3 minutes', '10 minutes'].map((d) => <option key={d}>{d}</option>)}
            </select>
          </div>
          <button type="submit" disabled={busy || !idea.trim()} className="btn-primary">
            {busy ? 'Writing…' : 'Write Script'}
          </button>
        </div>
      </form>
      {error && (
        <div className="rounded-lg border border-blood-700/60 bg-blood-900/30 px-4 py-3 text-sm text-blood-300">{error}</div>
      )}
      {result && (
        <div className="space-y-3 rounded-lg border border-ink-700 p-4 text-sm text-ink-200">
          <p className="font-display text-lg text-ink-100">{result.plan.title}</p>
          {result.plan.hook && <p><span className="text-ink-500">Hook:</span> {result.plan.hook}</p>}
          {result.plan.script && <p className="whitespace-pre-wrap">{result.plan.script}</p>}
          {result.plan.caption && <p><span className="text-ink-500">Caption:</span> {result.plan.caption}</p>}
          {Array.isArray(result.plan.shots) && (
            <ol className="list-decimal space-y-1 pl-5">
              {result.plan.shots.map((shot, i) => (
                <li key={i}>{shot.visual} {shot.voiceover ? `— “${shot.voiceover}”` : ''} {shot.seconds ? `(${shot.seconds}s)` : ''}</li>
              ))}
            </ol>
          )}
          <button
            onClick={() => navigate({ name: 'hq-project', id: result.projectId })}
            className="btn-ghost !text-xs"
          >
            Open project
          </button>
        </div>
      )}
    </div>
  )
}
