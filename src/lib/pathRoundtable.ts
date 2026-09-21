import { supabase } from './supabase'
import type { WorkspaceAttachment } from './workspaceAttachments'

export type RoundtableRole = 'herman' | 'allie' | 'challenger' | 'watcher'

type RoundtableRouteResult = {
  message?: string
  sessionId?: string
  correlationId?: string
  error?: string
}

export async function requestRoundtableReply(
  role: RoundtableRole,
  creatorMessage: string,
  attachments: WorkspaceAttachment[] = [],
): Promise<{ message: string; sessionId: string; correlationId: string }> {
  const message = creatorMessage.trim()
  if (!message) throw new Error('Roundtable message is required')

  const { data, error } = await supabase.functions.invoke<RoundtableRouteResult>('roundtable-path-route', {
    body: { role, message, attachments },
  })

  if (error) throw error
  if (data?.error) throw new Error(data.error)
  if (!data?.message || !data?.sessionId || !data?.correlationId) {
    throw new Error('Roundtable server returned incomplete Path evidence')
  }

  return {
    message: data.message,
    sessionId: data.sessionId,
    correlationId: data.correlationId,
  }
}
