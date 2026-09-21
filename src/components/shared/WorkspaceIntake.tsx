import { useRef, useState } from 'react'
import {
  attachmentReference,
  uploadWorkspaceFiles,
  type WorkspaceAttachment,
} from '../../lib/workspaceAttachments'

type IntakeMode = 'file' | 'photo' | 'video' | 'likeness'

export default function WorkspaceIntake({
  projectId,
  attachments,
  onChange,
  onInsertText,
  compact = false,
}: {
  projectId?: string | null
  attachments: WorkspaceAttachment[]
  onChange: (attachments: WorkspaceAttachment[]) => void
  onInsertText: (text: string) => void
  compact?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [mode, setMode] = useState<IntakeMode>('file')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  function openPicker(nextMode: IntakeMode) {
    setMode(nextMode)
    setError('')
    window.setTimeout(() => inputRef.current?.click(), 0)
  }

  async function ingest(files: File[], nextMode = mode) {
    if (!files.length || uploading) return
    setUploading(true)
    setError('')
    try {
      const added = await uploadWorkspaceFiles({
        files,
        projectId,
        likeness: nextMode === 'likeness',
      })
      onChange([...attachments, ...added])
      onInsertText(added.map(attachmentReference).join('\n'))
    } catch (ingestError) {
      setError(ingestError instanceof Error ? ingestError.message : 'Upload failed.')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  function acceptFor(nextMode: IntakeMode): string | undefined {
    if (nextMode === 'photo' || nextMode === 'likeness') return 'image/*'
    if (nextMode === 'video') return 'video/*'
    return undefined
  }

  return (
    <div className={`rounded-xl border border-dashed border-ink-700 bg-ink-950/30 ${compact ? 'p-2.5' : 'p-3'}`}>
      <input
        ref={inputRef}
        type="file"
        multiple={mode !== 'likeness'}
        accept={acceptFor(mode)}
        className="sr-only"
        onChange={(event) => void ingest(Array.from(event.target.files ?? []))}
      />

      <div
        tabIndex={0}
        className="rounded-lg outline-none focus:ring-1 focus:ring-blood-500"
        onPaste={(event) => {
          const pastedFiles = Array.from(event.clipboardData.files)
          if (pastedFiles.length) {
            event.preventDefault()
            void ingest(pastedFiles, 'file')
            return
          }
          const pastedText = event.clipboardData.getData('text/plain')
          if (pastedText) {
            event.preventDefault()
            onInsertText(pastedText)
          }
        }}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault()
          void ingest(Array.from(event.dataTransfer.files), 'file')
        }}
        aria-label="Paste or drop text and media"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink-500">
            {uploading ? 'Uploading…' : 'Paste or drop here'}
          </span>
          <button type="button" onClick={() => openPicker('file')} disabled={uploading} className="btn-ghost !px-2.5 !py-1 !text-[9px]">File</button>
          <button type="button" onClick={() => openPicker('photo')} disabled={uploading} className="btn-ghost !px-2.5 !py-1 !text-[9px]">Photo</button>
          <button type="button" onClick={() => openPicker('video')} disabled={uploading} className="btn-ghost !px-2.5 !py-1 !text-[9px]">Video</button>
          <button type="button" onClick={() => openPicker('likeness')} disabled={uploading} className="btn-ghost !px-2.5 !py-1 !text-[9px]">Likeness</button>
        </div>
      </div>

      {attachments.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {attachments.map((attachment) => (
            <span key={attachment.assetId} className="inline-flex items-center gap-1 rounded-full border border-ink-700 px-2 py-1 text-[10px] text-ink-300">
              {attachment.likeness ? 'Likeness' : attachment.kind} · {attachment.name}
              <button
                type="button"
                className="ml-1 text-ink-500 hover:text-blood-300"
                aria-label={`Remove ${attachment.name}`}
                onClick={() => onChange(attachments.filter((item) => item.assetId !== attachment.assetId))}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {error && <p className="mt-2 text-xs text-blood-300">{error}</p>}
    </div>
  )
}
