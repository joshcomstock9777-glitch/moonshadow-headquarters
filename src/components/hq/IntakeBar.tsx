import { useEffect, useRef, useState } from 'react'
import type { Asset } from '../../lib/hqTypes'
import { MAX_INTAKE_FILE_BYTES } from '../../lib/intakeAttachments'
import { supabase } from '../../lib/supabase'

export interface IntakeSelection {
  files: File[]
  existingAssets: Asset[]
}

const EMPTY_SELECTION: IntakeSelection = { files: [], existingAssets: [] }

export function emptyIntakeSelection(): IntakeSelection {
  return { ...EMPTY_SELECTION }
}

export default function IntakeBar({
  value,
  onChange,
  onAppendText,
  projectId,
  disabled = false,
  allowExisting = true,
}: {
  value: IntakeSelection
  onChange: (value: IntakeSelection) => void
  onAppendText: (text: string) => void
  projectId?: string | null
  disabled?: boolean
  allowExisting?: boolean
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const mediaRef = useRef<HTMLInputElement>(null)
  const [showLibrary, setShowLibrary] = useState(false)
  const [assets, setAssets] = useState<Asset[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!showLibrary) return
    void (async () => {
      let query = supabase.from('assets').select('*').order('created_at', { ascending: false }).limit(30)
      if (projectId) query = query.eq('project_id', projectId)
      const { data, error } = await query
      if (error) {
        setError(error.message)
        return
      }
      setAssets((data ?? []) as Asset[])
    })()
  }, [projectId, showLibrary])

  function addFiles(list: FileList | null) {
    if (!list) return
    const next = Array.from(list)
    const oversized = next.find((file) => file.size > MAX_INTAKE_FILE_BYTES)
    if (oversized) {
      setError(`${oversized.name} is larger than 100 MB.`)
      return
    }
    setError(null)
    onChange({ ...value, files: [...value.files, ...next] })
  }

  async function pasteText() {
    try {
      const text = await navigator.clipboard.readText()
      if (!text) throw new Error('The clipboard does not contain text.')
      onAppendText(text)
      setError(null)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Clipboard access failed. Long-press the text box and choose Paste.')
    }
  }

  function toggleExisting(asset: Asset) {
    const selected = value.existingAssets.some((item) => item.id === asset.id)
    onChange({
      ...value,
      existingAssets: selected
        ? value.existingAssets.filter((item) => item.id !== asset.id)
        : [...value.existingAssets, asset],
    })
  }

  return (
    <div className="mt-3 rounded-lg border border-ink-800 bg-ink-950/30 p-3">
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-secondary !px-3 !py-2 !text-[10px]" onClick={() => void pasteText()} disabled={disabled}>
          Paste
        </button>
        <button type="button" className="btn-secondary !px-3 !py-2 !text-[10px]" onClick={() => fileRef.current?.click()} disabled={disabled}>
          Upload file
        </button>
        <button type="button" className="btn-secondary !px-3 !py-2 !text-[10px]" onClick={() => mediaRef.current?.click()} disabled={disabled}>
          Photo / video
        </button>
        {allowExisting && (
          <button type="button" className="btn-secondary !px-3 !py-2 !text-[10px]" onClick={() => setShowLibrary((open) => !open)} disabled={disabled}>
            Attach existing
          </button>
        )}
        <input ref={fileRef} className="hidden" type="file" multiple onChange={(event) => addFiles(event.target.files)} />
        <input ref={mediaRef} className="hidden" type="file" multiple accept="image/*,video/*,audio/*" onChange={(event) => addFiles(event.target.files)} />
      </div>

      {(value.files.length > 0 || value.existingAssets.length > 0) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {value.files.map((file, index) => (
            <button
              type="button"
              key={`${file.name}-${file.size}-${index}`}
              onClick={() => onChange({ ...value, files: value.files.filter((_, itemIndex) => itemIndex !== index) })}
              className="rounded-full border border-toxic-700/50 bg-toxic-900/10 px-3 py-1 text-xs text-toxic-300"
              title="Remove attachment"
            >
              {file.name} ×
            </button>
          ))}
          {value.existingAssets.map((asset) => (
            <button
              type="button"
              key={asset.id}
              onClick={() => toggleExisting(asset)}
              className="rounded-full border border-amber-700/50 bg-amber-900/10 px-3 py-1 text-xs text-amber-300"
              title="Remove existing asset"
            >
              {asset.name} ×
            </button>
          ))}
        </div>
      )}

      {showLibrary && (
        <div className="mt-3 max-h-40 space-y-1 overflow-y-auto border-t border-ink-800 pt-3">
          {assets.length === 0 ? (
            <p className="text-xs text-ink-500">No existing assets found for this view.</p>
          ) : assets.map((asset) => {
            const selected = value.existingAssets.some((item) => item.id === asset.id)
            return (
              <button
                type="button"
                key={asset.id}
                onClick={() => toggleExisting(asset)}
                className={`block w-full rounded px-3 py-2 text-left text-xs ${selected ? 'bg-amber-900/20 text-amber-200' : 'text-ink-300 hover:bg-ink-900'}`}
              >
                {selected ? '✓ ' : ''}{asset.name} · {asset.kind}
              </button>
            )
          })}
        </div>
      )}

      {error && <p className="mt-2 text-xs text-blood-300" role="alert">{error}</p>}
      <p className="mt-2 text-[11px] text-ink-500">Files are preserved with the project when you submit. Maximum 100 MB each.</p>
    </div>
  )
}
