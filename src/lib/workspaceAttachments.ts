import { supabase } from './supabase'

export const WORKSPACE_UPLOAD_BUCKET = 'headquarters-intake'
export const MAX_WORKSPACE_FILE_BYTES = 200 * 1024 * 1024

export type WorkspaceAttachment = {
  assetId: string
  name: string
  kind: 'image' | 'video' | 'audio' | 'document' | 'reference'
  mimeType: string
  sizeBytes: number
  storagePath: string
  likeness: boolean
}

function assetKind(file: File): WorkspaceAttachment['kind'] {
  if (file.type.startsWith('image/')) return 'image'
  if (file.type.startsWith('video/')) return 'video'
  if (file.type.startsWith('audio/')) return 'audio'
  return 'document'
}

function safeFileName(name: string): string {
  const cleaned = name
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return cleaned || 'upload'
}

function uploadPath(userId: string, file: File): string {
  const day = new Date().toISOString().slice(0, 10)
  const unique = crypto.randomUUID()
  return `${userId}/${day}/${unique}-${safeFileName(file.name)}`
}

export function attachmentReference(attachment: WorkspaceAttachment): string {
  const label = attachment.likeness ? 'Likeness reference' : 'Asset'
  return `[${label}: ${attachment.name} | asset:${attachment.assetId}]`
}

export async function uploadWorkspaceFiles({
  files,
  projectId,
  likeness,
}: {
  files: File[]
  projectId?: string | null
  likeness?: boolean
}): Promise<WorkspaceAttachment[]> {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) throw new Error('A verified Headquarters session is required to upload files.')

  const uploaded: WorkspaceAttachment[] = []

  for (const file of files) {
    if (file.size <= 0) throw new Error(`${file.name} is empty.`)
    if (file.size > MAX_WORKSPACE_FILE_BYTES) throw new Error(`${file.name} is larger than 200 MB.`)
    if (likeness && !file.type.startsWith('image/')) {
      throw new Error('A likeness reference must be an image.')
    }

    const storagePath = uploadPath(userData.user.id, file)
    const { error: uploadError } = await supabase.storage
      .from(WORKSPACE_UPLOAD_BUCKET)
      .upload(storagePath, file, { contentType: file.type || 'application/octet-stream', upsert: false })
    if (uploadError) throw new Error(`Could not upload ${file.name}: ${uploadError.message}`)

    const kind = assetKind(file)
    const { data: asset, error: assetError } = await supabase
      .from('assets')
      .insert({
        project_id: projectId || null,
        name: file.name,
        kind,
        source: 'uploaded',
        tool: 'Headquarters intake',
        url: `storage://${WORKSPACE_UPLOAD_BUCKET}/${storagePath}`,
        revision: 1,
        meta: {
          storage_bucket: WORKSPACE_UPLOAD_BUCKET,
          storage_path: storagePath,
          mime_type: file.type || 'application/octet-stream',
          size_bytes: file.size,
          likeness_reference: Boolean(likeness),
        },
      })
      .select('id')
      .single()

    if (assetError) {
      throw new Error(`${file.name} was preserved in storage, but its Asset Library record failed: ${assetError.message}`)
    }

    uploaded.push({
      assetId: asset.id,
      name: file.name,
      kind,
      mimeType: file.type || 'application/octet-stream',
      sizeBytes: file.size,
      storagePath,
      likeness: Boolean(likeness),
    })
  }

  return uploaded
}

export async function linkAttachmentsToProject(
  attachments: WorkspaceAttachment[],
  projectId: string,
): Promise<void> {
  if (!attachments.length) return
  const { error } = await supabase
    .from('assets')
    .update({ project_id: projectId })
    .in('id', attachments.map((attachment) => attachment.assetId))
  if (error) throw new Error(`Files uploaded, but project linking failed: ${error.message}`)
}

export async function signedAttachmentUrl(storagePath: string, expiresIn = 3600): Promise<string> {
  const { data, error } = await supabase.storage
    .from(WORKSPACE_UPLOAD_BUCKET)
    .createSignedUrl(storagePath, expiresIn)
  if (error || !data?.signedUrl) throw new Error(error?.message || 'Attachment preview unavailable')
  return data.signedUrl
}
