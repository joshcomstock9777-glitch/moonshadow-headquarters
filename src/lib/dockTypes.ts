// Moonshadow Dock — TypeScript types for the universal connection layer

// ── Connection / health statuses ─────────────────────────────────────────────
export const DOCK_STATUSES = [
  'connected',
  'ready-to-connect',
  'auth-required',
  'needs-auth',
  'broken',
  'unknown',
  'development',
] as const
export type DockStatus = (typeof DOCK_STATUSES)[number]

export const DOCK_STATUS_LABELS: Record<DockStatus, string> = {
  connected: 'Connected',
  'ready-to-connect': 'Ready to Connect',
  'auth-required': 'Auth Required',
  'needs-auth': 'Needs Auth',
  broken: 'Broken',
  unknown: 'Unknown',
  development: 'Development',
}

export const DOCK_STATUS_STYLES: Record<DockStatus, string> = {
  connected: 'border-toxic-700/50 bg-toxic-700/10 text-toxic-300',
  'ready-to-connect': 'border-amber-700/50 bg-amber-700/10 text-amber-300',
  'auth-required': 'border-blood-700/50 bg-blood-700/10 text-blood-300',
  'needs-auth': 'border-blood-700/50 bg-blood-700/10 text-blood-300',
  broken: 'border-blood-800/60 bg-blood-900/30 text-blood-400',
  unknown: 'border-ink-700 bg-ink-800/40 text-ink-400',
  development: 'border-ink-700 bg-ink-800/40 text-ink-400',
}

export const DOCK_HEALTH_LABELS: Record<string, string> = {
  healthy: 'Healthy',
  degraded: 'Degraded',
  unhealthy: 'Unhealthy',
  unknown: 'Unknown',
}

// ── Adapter types ────────────────────────────────────────────────────────────
export const ADAPTER_TYPES = [
  'rest',
  'webhook',
  'mcp',
  'file',
  'github',
  'web',
  'internal',
] as const
export type AdapterType = (typeof ADAPTER_TYPES)[number]

export const ADAPTER_TYPE_LABELS: Record<AdapterType, string> = {
  rest: 'REST / HTTP API',
  webhook: 'Webhook',
  mcp: 'MCP Server',
  file: 'File Import/Export',
  github: 'GitHub-Hosted',
  web: 'Web Application',
  internal: 'Internal Module',
}

// ── Auth types ───────────────────────────────────────────────────────────────
export const AUTH_TYPES = ['none', 'api_key', 'oauth', 'token', 'basic', 'custom'] as const
export type AuthType = (typeof AUTH_TYPES)[number]

export const AUTH_TYPE_LABELS: Record<AuthType, string> = {
  none: 'No Auth',
  api_key: 'API Key',
  oauth: 'OAuth',
  token: 'Bearer Token',
  basic: 'Basic Auth',
  custom: 'Custom',
}

// ── Capabilities (extensible) ────────────────────────────────────────────────
export const CAPABILITIES = [
  'WRITE_STORY',
  'WRITE_SCRIPT',
  'GENERATE_IMAGE',
  'EDIT_IMAGE',
  'GENERATE_VIDEO',
  'EDIT_VIDEO',
  'RENDER_ART_FRAME',
  'RENDER_CLIP',
  'RENDER_REEL',
  'RENDER_LONG_FORM',
  'CONCIERGE_DO_WITH_YOU',
  'CONCIERGE_TEACH_YOU',
  'CONCIERGE_DO_FOR_YOU',
  'GENERATE_AUDIO',
  'TRANSCRIBE',
  'APPLY_NSFW_EFFECTS_PACKET',
  'APPLY_BLOOD_GORE_PACKET',
  'APPLY_EXPLOSION_PACKET',
  'STORE_ASSET',
  'SEARCH_ASSETS',
  'PACKAGE_PROJECT',
  'PUBLISH',
  'RUN_CODE',
  'ROUTE_JOB',
] as const
export type Capability = (typeof CAPABILITIES)[number]

export const CAPABILITY_LABELS: Record<Capability, string> = {
  WRITE_STORY: 'Write Story',
  WRITE_SCRIPT: 'Write Script',
  GENERATE_IMAGE: 'Generate Image',
  EDIT_IMAGE: 'Edit Image',
  GENERATE_VIDEO: 'Generate Video',
  EDIT_VIDEO: 'Edit Video',
  RENDER_ART_FRAME: 'Render Art Frame',
  RENDER_CLIP: 'Render Clip',
  RENDER_REEL: 'Render Reel',
  RENDER_LONG_FORM: 'Render Long-Form',
  CONCIERGE_DO_WITH_YOU: 'Concierge: Do With You',
  CONCIERGE_TEACH_YOU: 'Concierge: Teach You',
  CONCIERGE_DO_FOR_YOU: 'Concierge: Do It Himself',
  GENERATE_AUDIO: 'Generate Audio',
  TRANSCRIBE: 'Transcribe',
  APPLY_NSFW_EFFECTS_PACKET: 'Apply NSFW Effects Packet',
  APPLY_BLOOD_GORE_PACKET: 'Apply Blood & Gore Packet',
  APPLY_EXPLOSION_PACKET: 'Apply Explosion Packet',
  STORE_ASSET: 'Store Asset',
  SEARCH_ASSETS: 'Search Assets',
  PACKAGE_PROJECT: 'Package Project',
  PUBLISH: 'Publish',
  RUN_CODE: 'Run Code',
  ROUTE_JOB: 'Route Job',
}

// ── Handoff status ───────────────────────────────────────────────────────────
export const HANDOFF_STATUSES = [
  'pending',
  'approved',
  'sent',
  'received',
  'completed',
  'failed',
  'cancelled',
  'retrying',
] as const
export type HandoffStatus = (typeof HANDOFF_STATUSES)[number]

export const HANDOFF_STATUS_LABELS: Record<HandoffStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  sent: 'Sent',
  received: 'Received',
  completed: 'Completed',
  failed: 'Failed',
  cancelled: 'Cancelled',
  retrying: 'Retrying',
}

export const HANDOFF_STATUS_STYLES: Record<HandoffStatus, string> = {
  pending: 'border-ink-700 bg-ink-800/40 text-ink-300',
  approved: 'border-amber-700/50 bg-amber-700/10 text-amber-300',
  sent: 'border-toxic-700/50 bg-toxic-700/10 text-toxic-300',
  received: 'border-toxic-700/50 bg-toxic-700/10 text-toxic-300',
  completed: 'border-toxic-700/50 bg-toxic-700/10 text-toxic-300',
  failed: 'border-blood-700/50 bg-blood-700/10 text-blood-400',
  cancelled: 'border-ink-700 bg-ink-800/40 text-ink-400',
  retrying: 'border-amber-700/50 bg-amber-700/10 text-amber-300',
}

// ── Test types ───────────────────────────────────────────────────────────────
export const TEST_TYPES = ['connectivity', 'auth', 'capability', 'harmless'] as const
export type TestType = (typeof TEST_TYPES)[number]

export const TEST_TYPE_LABELS: Record<TestType, string> = {
  connectivity: 'Connectivity Test',
  auth: 'Authentication Test',
  capability: 'Capability Test',
  harmless: 'Harmless Request',
}

// ── Database row types ───────────────────────────────────────────────────────
export interface DockMachine {
  id: string
  name: string
  description: string | null
  location_url: string | null
  api_base_url: string | null
  source_repo: string | null
  adapter_type: string
  invocation_detail: Record<string, unknown> | null
  capabilities: string[]
  accepted_inputs: string[]
  produced_outputs: string[]
  auth_type: string
  credential_ref: string | null
  connection_status: string
  health_status: string
  last_connected_at: string | null
  last_failure_at: string | null
  last_failure_reason: string | null
  machine_type: string | null
  version: string | null
  owner_source: string | null
  notes: string | null
  manifest: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export interface DockHandoff {
  id: string
  correlation_id: string
  job_id: string | null
  project_id: string | null
  requested_action: string
  creator_instructions: string | null
  payload: Record<string, unknown> | null
  asset_refs: string[]
  source_machine_id: string | null
  destination_machine_id: string | null
  expected_output: string | null
  approval_state: string
  approval_id: string | null
  provenance: string[]
  status: string
  result: Record<string, unknown> | null
  error: string | null
  retries: number
  created_at: string
  updated_at: string
  sent_at: string | null
  received_at: string | null
}

export interface DockConnectionTest {
  id: string
  machine_id: string
  test_type: string
  http_status: number | null
  response_body: string | null
  latency_ms: number | null
  success: boolean
  error: string | null
  created_at: string
}

// ── Machine Manifest (human + machine readable) ──────────────────────────────
export interface MachineManifest {
  who: string
  what_can_do: string[]
  what_accepts: string[]
  what_returns: string[]
  where_lives: string
  how_to_call: string
  how_authenticates: string
  currently_available: boolean
}
