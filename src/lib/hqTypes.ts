export interface Project {
  id: string
  title: string
  goal: string | null
  status: string
  type: string | null
  tone: string | null
  target_platform: string | null
  duration: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Job {
  id: string
  project_id: string | null
  title: string
  kind: string
  stage: string
  brief: string | null
  script: string | null
  shots: string | null
  narration: string | null
  music: string | null
  captions: string | null
  edit_notes: string | null
  package_title: string | null
  package_description: string | null
  thumbnail: string | null
  rights: string | null
  assigned_to: string | null
  error: string | null
  created_at: string
  updated_at: string
}

export interface Asset {
  id: string
  project_id: string | null
  job_id: string | null
  name: string
  kind: string
  source: string | null
  tool: string | null
  prompt: string | null
  url: string | null
  revision: number
  rights: string | null
  meta: Record<string, unknown> | null
  created_at: string
}

export interface Activity {
  id: string
  project_id: string | null
  job_id: string | null
  actor: string
  action: string
  category: string
  detail: string | null
  created_at: string
}

export interface RoundtableMessage {
  id: string
  project_id: string | null
  role: string
  message: string
  addressed_to: string | null
  kind: string
  proposed_action: string | null
  path_session_id: string | null
  path_correlation_id: string | null
  path_target: string | null
  path_evidence_verified: boolean
  path_evidence_verified_at: string | null
  created_at: string
}

export interface Approval {
  id: string
  project_id: string | null
  job_id: string | null
  title: string
  description: string | null
  status: string
  category: string
  created_at: string
  decided_at: string | null
}

export interface PublishItem {
  id: string
  project_id: string | null
  job_id: string | null
  title: string
  description: string | null
  caption: string | null
  thumbnail: string | null
  destination: string | null
  status: string
  scheduled_for: string | null
  published_at: string | null
  rights: string | null
  created_at: string
}

export interface Connection {
  id: string
  name: string
  category: string
  status: string
  detail: string | null
  updated_at: string
}

export interface RenderQualityReview {
  id: string
  project_id: string | null
  job_id: string
  quality_score: number
  originality_score: number
  clarity_score: number
  retention_prediction_score: number
  craft_score: number
  notes: string | null
  publish_ready: boolean
  reviewed_by: string | null
  created_at: string
  updated_at: string
}
