// Moonshadow Headquarters — shared constants, types, and helpers

// ── Job pipeline stages ─────────────────────────────────────────────────────
export const STAGES = [
  'idea',
  'plan',
  'create',
  'review',
  'edit',
  'package',
  'approve',
  'publish',
  'done',
] as const

export type Stage = (typeof STAGES)[number]

export const STAGE_LABELS: Record<Stage, string> = {
  idea: 'Idea',
  plan: 'Plan',
  create: 'Create',
  review: 'Review',
  edit: 'Edit',
  package: 'Package',
  approve: 'Approve',
  publish: 'Publish',
  done: 'Done',
}

export const STAGE_ORDER: Record<Stage, number> = STAGES.reduce(
  (acc, s, i) => ({ ...acc, [s]: i }),
  {} as Record<Stage, number>,
)

export function stageIndex(s: string): number {
  return STAGE_ORDER[s as Stage] ?? 0
}

export function nextStage(s: string): Stage {
  const i = stageIndex(s)
  return STAGES[Math.min(i + 1, STAGES.length - 1)]
}

export function stageColor(s: string): string {
  const i = stageIndex(s)
  if (i <= 1) return 'text-ink-300'
  if (i <= 3) return 'text-toxic-300'
  if (i <= 5) return 'text-amber-300'
  if (i === 6) return 'text-blood-300'
  if (i === 7) return 'text-blood-400'
  return 'text-blood-500'
}

// ── Roundtable roles ────────────────────────────────────────────────────────
export const ROLES = ['herman', 'allie', 'challenger', 'watcher'] as const
export type Role = (typeof ROLES)[number]

export const ROLE_META: Record<Role, { name: string; title: string; glyph: string }> = {
  herman: { name: 'Herman', title: 'Operator / Router', glyph: '⬡' },
  allie: { name: 'Allie', title: 'Architect / Planner', glyph: '◈' },
  challenger: { name: 'Challenger', title: 'Tester / Critic', glyph: '⊘' },
  watcher: { name: 'Watcher', title: 'Optimizer / Observer', glyph: '◎' },
}

// ── Registered modules / studios ────────────────────────────────────────────
export const MODULES = [
  {
    id: 'studio-go',
    name: 'Studio Go',
    category: 'Capture',
    status: 'needs-auth',
    desc: 'Capture and ingest raw media from shoots, location recordings, and live sessions.',
  },
  {
    id: 'editor',
    name: 'Moonshadow Editor',
    category: 'Edit',
    status: 'needs-auth',
    desc: 'Creative Operating System editor. Load media, open a project, request edits, receive exports.',
  },
  {
    id: 'kimmy',
    name: 'Kimmy',
    category: 'Writing',
    status: 'connected',
    desc: 'Atmospheric horror and sci-fi writing — short stories, scenes, concepts, scripts.',
  },
  {
    id: 'skin-studio',
    name: 'Skin Studio',
    category: 'Image',
    status: 'needs-auth',
    desc: 'Text-to-image generation and editing. Portrait, square, and landscape formats with version history.',
  },
  {
    id: 'content-factory',
    name: 'Content Factory',
    category: 'Production',
    status: 'connected',
    desc: 'Repeatable short-form production jobs. Configurable channels and lanes.',
  },
  {
    id: 'code-lab',
    name: 'Code Lab',
    category: 'Development',
    status: 'needs-auth',
    desc: 'Scripts, tooling, and integrations development environment.',
  },
  {
    id: 'asset-library',
    name: 'Asset Library',
    category: 'Storage',
    status: 'connected',
    desc: 'Project-aware media library with provenance. Images, video, audio, scripts, documents.',
  },
  {
    id: 'publishing',
    name: 'Publishing',
    category: 'Distribution',
    status: 'connected',
    desc: 'Publishing queue with destination connectors and scheduling.',
  },
] as const

export const MODULE_STATUS_STYLES: Record<string, string> = {
  connected: 'border-toxic-700/50 bg-toxic-700/10 text-toxic-300',
  'ready-to-connect': 'border-amber-700/50 bg-amber-700/10 text-amber-300',
  'needs-auth': 'border-blood-700/50 bg-blood-700/10 text-blood-300',
  unavailable: 'border-ink-700 bg-ink-800/40 text-ink-400',
  development: 'border-ink-700 bg-ink-800/40 text-ink-400',
}

export const MODULE_STATUS_LABELS: Record<string, string> = {
  connected: 'Connected',
  'ready-to-connect': 'Ready to Connect',
  'needs-auth': 'Needs Auth',
  unavailable: 'Unavailable',
  development: 'Development',
}

// ── Asset kinds ─────────────────────────────────────────────────────────────
export const ASSET_KINDS = ['image', 'video', 'audio', 'script', 'document', 'reference', 'export'] as const
export type AssetKind = (typeof ASSET_KINDS)[number]

export const ASSET_KIND_LABELS: Record<AssetKind, string> = {
  image: 'Image',
  video: 'Video',
  audio: 'Audio',
  script: 'Script',
  document: 'Document',
  reference: 'Reference',
  export: 'Export',
}

export const ASSET_KIND_GLYPHS: Record<AssetKind, string> = {
  image: '◳',
  video: '▷',
  audio: '♪',
  script: '✎',
  document: '▤',
  reference: '◈',
  export: '↗',
}

// ── Asset sources ───────────────────────────────────────────────────────────
export const ASSET_SOURCES = ['generated', 'uploaded', 'reference', 'export', 'imported'] as const

// ── Connection categories ───────────────────────────────────────────────────
export const CONNECTION_CATEGORIES = [
  'storage',
  'publishing',
  'communication',
  'ai',
  'audio',
  'workspace',
  'development',
  'orchestration',
] as const

export const CONNECTION_STATUS_STYLES: Record<string, string> = {
  connected: 'border-toxic-700/50 bg-toxic-700/10 text-toxic-300',
  'ready-to-connect': 'border-amber-700/50 bg-amber-700/10 text-amber-300',
  'needs-auth': 'border-blood-700/50 bg-blood-700/10 text-blood-300',
  unavailable: 'border-ink-700 bg-ink-800/40 text-ink-400',
  development: 'border-ink-700 bg-ink-800/40 text-ink-400',
}

export const CONNECTION_STATUS_LABELS: Record<string, string> = {
  connected: 'Connected',
  'ready-to-connect': 'Ready to Connect',
  'needs-auth': 'Needs Auth',
  unavailable: 'Unavailable',
  development: 'Development',
}

// ── Publishing destinations ─────────────────────────────────────────────────
export const PUBLISH_DESTINATIONS = ['youtube', 'instagram', 'facebook', 'tiktok', 'x', 'other'] as const
export type PublishDestination = (typeof PUBLISH_DESTINATIONS)[number]

export const DESTINATION_LABELS: Record<PublishDestination, string> = {
  youtube: 'YouTube',
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  x: 'X (Twitter)',
  other: 'Other',
}

export const DESTINATION_AVAILABILITY: Record<PublishDestination, boolean> = {
  youtube: false,
  instagram: false,
  facebook: false,
  tiktok: false,
  x: false,
  other: true,
}

// ── Approval categories ─────────────────────────────────────────────────────
export const APPROVAL_CATEGORIES = ['publish', 'spend', 'destructive', 'private', 'general'] as const
export const APPROVAL_CATEGORY_LABELS: Record<string, string> = {
  publish: 'Publication',
  spend: 'Spend / Cost',
  destructive: 'Destructive',
  private: 'Private Data',
  general: 'General',
}

// ── Project types ───────────────────────────────────────────────────────────
export const PROJECT_TYPES = [
  'short-film',
  'story',
  'scene',
  'concept',
  'song',
  'article',
  'channel-piece',
] as const

export const PROJECT_TYPE_LABELS: Record<string, string> = {
  'short-film': 'Short Film',
  story: 'Story',
  scene: 'Scene',
  concept: 'Concept',
  song: 'Song',
  article: 'Article',
  'channel-piece': 'Channel Piece',
}

export const PROJECT_STATUSES = ['active', 'paused', 'archived'] as const
export const PROJECT_STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  paused: 'Paused',
  archived: 'Archived',
}

// ── Activity categories ─────────────────────────────────────────────────────
export const ACTIVITY_CATEGORY_STYLES: Record<string, string> = {
  info: 'text-ink-300',
  create: 'text-toxic-300',
  approve: 'text-amber-300',
  publish: 'text-blood-300',
  error: 'text-blood-400',
  system: 'text-ink-400',
}

// ── Helpers ─────────────────────────────────────────────────────────────────
export function timeAgo(iso: string): string {
  const d = Date.now() - new Date(iso).getTime()
  const s = Math.floor(d / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const days = Math.floor(h / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

export function logActivity(
  projectId: string | null,
  jobId: string | null,
  actor: string,
  action: string,
  category: string = 'info',
  detail: string | null = null,
) {
  // fire-and-forget insert — caller does not await
  return fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/activity`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      project_id: projectId,
      job_id: jobId,
      actor,
      action,
      category,
      detail,
    }),
  }).catch(() => {})
}

export function countWords(text: string | null): number {
  if (!text) return 0
  return text.trim().split(/\s+/).filter(Boolean).length
}
