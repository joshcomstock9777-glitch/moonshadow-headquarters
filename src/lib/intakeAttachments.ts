import type { Asset } from './hqTypes'
import { supabase } from './supabase'

export const INTAKE_BUCKET = 'hq-intake'
export const MAX_INTAKE_FILE_BYTES = 100 * 1024 * 1024
const TEXT_EXCERPT_LIMIT = 40_000

export type IntakeContext = 'create' | 'roundtable' | 'job' | 'asset-library'

export interface PersistIntakeOptions {
  files: File[]
  existingAssets?: Asset[]
  projectId: string
  jobId?: string | null
  context: IntakeContext
}

export interface PersistedIntake {
  assets: Asset[]
  contextBlock: string
}

function safeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'attachment'
}

function kindForFile(file: File): string {
  if (file.type.startsWith('image/')) return 'image'
  if (file.type.startsWith('video/')) return 'video'
  if (file.type.startsWith('audio/')) return 'audio'
  return 'document'
}

function isReadableText(file: File): boolean {
  return file.type.startsWith('text/') || /\.(md|txt|csv|json|yaml|yml|log)$/i.test(file.name)
}

function storagePathFromAsset(asset: Asset): string | null {
  const value = asset.meta?.storage_path
  return typeof value === 'string' && value.length > 0 ? value : null
}

async function referenceUrl(asset: Asset): Promise<string | null> {
  const storagePath = storagePathFromAsset(asset)
  if (storagePath) {
    const { data, error } = await supabase.storage
      .from(INTAKE_BUCKET)
      .createSignedUrl(storagePath, 60 * 60)
    if (error) throw error
    return data.signedUrl
  }
  return asset.url
}

export async function persistIntakeAttachments({
  files,
  existingAssets = [],
  projectId,
  jobId = null,
  context,
}: PersistIntakeOptions): Promise<PersistedIntake> {
  if (!projectId) throw new Error('Choose a project before attaching files.')

  const uploaded: Asset[] = []
  const contextLines: string[] = []

  for (const file of files) {
    if (file.size > MAX_INTAKE_FILE_BYTES) {
      throw new Error(`${file.name} is larger than the 100 MB intake limit.`)
    }

    const storagePath = `${projectId}/${crypto.randomUUID()}-${safeFileName(file.name)}`
    const { error: uploadError } = await supabase.storage
      .from(INTAKE_BUCKET)
      .upload(storagePath, file, { contentType: file.type || undefined, upsert: false })
    if (uploadError) throw uploadError

    const { data: row, error: assetError } = await supabase
      .from('assets')
      .insert({
        project_id: projectId,
        job_id: jobId,
        name: file.name,
        kind: kindForFile(file),
        source: 'uploaded',
        tool: 'Headquarters Intake',
        url: `storage://${INTAKE_BUCKET}/${storagePath}`,
        revision: 1,
        meta: {
          storage_bucket: INTAKE_BUCKET,
          storage_path: storagePath,
          mime_type: file.type || 'application/octet-stream',
          size_bytes: file.size,
          intake_context: context,
        },
      })
      .select('*')
      .single()
    if (assetError) {
      await supabase.storage.from(INTAKE_BUCKET).remove([storagePath])
      throw assetError
    }

    uploaded.push(row as Asset)
    const { data: signed, error: signedError } = await supabase.storage
      .from(INTAKE_BUCKET)
      .createSignedUrl(storagePath, 60 * 60)
    if (signedError) throw signedError

    contextLines.push(`- ${file.name} (${file.type || 'file'}, ${file.size} bytes): ${signed.signedUrl}`)
    if (isReadableText(file)) {
      const text = await file.text()
      const excerpt = text.slice(0, TEXT_EXCERPT_LIMIT)
      contextLines.push(`\n[TEXT ATTACHMENT: ${file.name}]\n${excerpt}${text.length > excerpt.length ? '\n[Attachment excerpt truncated; full file is stored with the project.]' : ''}\n[/TEXT ATTACHMENT]`)
    }
  }

  for (const asset of existingAssets) {
    const url = await referenceUrl(asset)
    contextLines.push(`- Existing asset: ${asset.name}${url ? `: ${url}` : ''}`)
  }

  return {
    assets: uploaded,
    contextBlock: contextLines.length > 0
      ? `\n\nATTACHED PROJECT MATERIALS\n${contextLines.join('\n')}`
      : '',
  }
}

