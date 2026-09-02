import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import Dock from './Dock'
import DockHandoffRetryPanel from './DockHandoffRetryPanel'

type GateState = 'checking' | 'ready' | 'unavailable'

export default function DockLiveGate() {
  const [state, setState] = useState<GateState>('checking')
  const [failedReads, setFailedReads] = useState<string[]>([])

  const verifyLiveReads = useCallback(async () => {
    setState('checking')
    setFailedReads([])

    // The adopted control-plane schema intentionally uses unprefixed names.
    // A successful read proves both the live table and current RLS authorization.
    const [machines, handoffs, tests] = await Promise.all([
      supabase.from('machines').select('id').limit(1),
      supabase.from('handoffs').select('id').limit(1),
      supabase.from('commissioning_tests').select('id').limit(1),
    ])

    const failures = [
      machines.error ? 'machine registry' : null,
      handoffs.error ? 'handoff ledger' : null,
      tests.error ? 'commissioning-test evidence' : null,
    ].filter((value): value is string => value !== null)

    if (failures.length > 0) {
      setFailedReads(failures)
      setState('unavailable')
      return
    }

    setState('ready')
  }, [])

  useEffect(() => {
    void verifyLiveReads()
  }, [verifyLiveReads])

  if (state === 'checking') {
    return (
      <div className="card p-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-500">
          Verifying live Dock evidence…
        </p>
      </div>
    )
  }

  if (state === 'unavailable') {
    return (
      <div className="space-y-6">
        <div>
          <p className="section-eyebrow">
            <span className="h-px w-8 bg-blood-700" /> Moonshadow Dock
          </p>
          <h1 className="section-title">
            Live Dock evidence
            <span className="italic text-blood-500"> unavailable.</span>
          </h1>
        </div>

        <div className="card border-blood-700/50 p-6">
          <p className="text-sm leading-relaxed text-ink-200">
            Headquarters could not verify the live Dock control-plane reads, so it will not
            present an empty registry as if zero machines were registered.
          </p>
          <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.15em] text-blood-300">
            Failed evidence: {failedReads.join(', ')}
          </p>
          <button onClick={() => void verifyLiveReads()} className="btn-secondary mt-5">
            Retry live evidence
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <DockHandoffRetryPanel />
      <Dock />
    </div>
  )
}
