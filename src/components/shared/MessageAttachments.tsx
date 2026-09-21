import { useEffect, useState } from 'react'
import { signedAttachmentUrl, type WorkspaceAttachment } from '../../lib/workspaceAttachments'

export default function MessageAttachments({ attachments }: { attachments: WorkspaceAttachment[] }) {
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let active = true
    setFailed(false)
    void Promise.all(
      attachments.map(async (attachment) => [attachment.assetId, await signedAttachmentUrl(attachment.storagePath)] as const),
    )
      .then((entries) => {
        if (active) setUrls(Object.fromEntries(entries))
      })
      .catch(() => {
        if (active) setFailed(true)
      })
    return () => {
      active = false
    }
  }, [attachments])

  if (!attachments.length) return null

  return (
    <div className="mt-3 grid gap-2 sm:grid-cols-2">
      {attachments.map((attachment) => {
        const url = urls[attachment.assetId]
        return (
          <a
            key={attachment.assetId}
            href={url || undefined}
            target="_blank"
            rel="noreferrer"
            className="overflow-hidden rounded-lg border border-ink-700 bg-ink-950/40 text-xs text-ink-300"
          >
            {url && attachment.kind === 'image' && (
              <img src={url} alt={attachment.name} className="max-h-48 w-full object-contain" />
            )}
            {url && attachment.kind === 'video' && (
              <video src={url} controls preload="metadata" className="max-h-48 w-full" />
            )}
            {url && attachment.kind === 'audio' && (
              <audio src={url} controls preload="metadata" className="w-full" />
            )}
            <span className="block truncate px-3 py-2">
              {attachment.likeness ? 'Likeness · ' : ''}{attachment.name}
            </span>
          </a>
        )
      })}
      {failed && <p className="text-xs text-blood-300">Attachment preview unavailable.</p>}
    </div>
  )
}
