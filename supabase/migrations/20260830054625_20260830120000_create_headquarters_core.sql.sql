/*
# Moonshadow Headquarters — Core Schema

1. Purpose
   Builds the persistent data layer for Moonshadow Headquarters, a creative
   operating system. Stores projects, production jobs, assets, activity log,
   roundtable conversation, approval gates, publishing queue, and service
   connection status. This is a single-tenant workspace (no sign-in screen),
   so all tables are read/write by the anon-key frontend.

2. New Tables
   - `projects` — a creative project (short film, story, scene). Holds the
     goal, status, type, tone, target platform, duration, and notes. Survives
     across conversations so a creator can leave and return.
   - `jobs` — a production job belonging to a project. Moves through the
     pipeline stages: idea → plan → create → review → edit → package →
     approve → publish → done. Holds script, shots, narration, music,
     captions, edit notes, package metadata, assigned role, and error state.
   - `assets` — project-aware media library. Each asset keeps provenance:
     source (generated/uploaded/reference/export), generating tool, prompt,
     revision number, rights notes. Originals are never overwritten — new
     revisions are new rows.
   - `activity` — human-readable evidence log. Every important action records
     actor, action text, category, and optional detail, plus links to the
     project/job it concerns. Makes it impossible to quietly claim something
     happened when it did not.
   - `roundtable_messages` — persistent Roundtable conversation. Each message
     carries a role (herman, allie, challenger, watcher, creator), the
     addressed-to target, a kind (message/proposal/action), and an optional
     proposed action.
   - `approvals` — approval gates for destructive, expensive, private, or
     public-facing actions. Status moves pending → approved/rejected.
   - `publish_items` — publishing queue. Separates READY TO PUBLISH from
     PUBLISHED. Tracks destination, scheduling, publication time, and rights.
   - `connections` — service connection status (Google Drive, YouTube, etc.).
     Honest status field: connected / ready-to-connect / needs-auth /
     unavailable / development. No secrets stored here — secrets live
     server-side only.

3. Security
   - Single-tenant workspace with no sign-in screen. RLS enabled on every
     table, with `TO anon, authenticated` CRUD policies so the anon-key
     frontend can operate. `USING (true)` is intentional here because all
     data is shared within the single workspace.
   - updated_at auto-maintained by a trigger on projects, jobs, and
     connections.

4. Notes
   - Foreign keys use ON DELETE CASCADE for project-owned children so deleting
     a project cleans up its jobs, assets, activity, messages, approvals, and
     publish items. Assets and publish_items reference jobs with SET NULL so
     a job can be removed without losing the asset/queue entry.
   - Asset revisions are separate rows (revision column) — originals are
     preserved, never overwritten.
*/

CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  goal text,
  status text NOT NULL DEFAULT 'active',
  type text,
  tone text,
  target_platform text,
  duration text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  kind text NOT NULL DEFAULT 'production',
  stage text NOT NULL DEFAULT 'idea',
  brief text,
  script text,
  shots text,
  narration text,
  music text,
  captions text,
  edit_notes text,
  package_title text,
  package_description text,
  thumbnail text,
  rights text,
  assigned_to text,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  job_id uuid REFERENCES jobs(id) ON DELETE SET NULL,
  name text NOT NULL,
  kind text NOT NULL,
  source text,
  tool text,
  prompt text,
  url text,
  revision integer NOT NULL DEFAULT 1,
  rights text,
  meta jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  job_id uuid REFERENCES jobs(id) ON DELETE CASCADE,
  actor text NOT NULL,
  action text NOT NULL,
  category text NOT NULL DEFAULT 'info',
  detail text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS roundtable_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  role text NOT NULL,
  message text NOT NULL,
  addressed_to text,
  kind text NOT NULL DEFAULT 'message',
  proposed_action text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  job_id uuid REFERENCES jobs(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending',
  category text NOT NULL DEFAULT 'general',
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz
);

CREATE TABLE IF NOT EXISTS publish_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  job_id uuid REFERENCES jobs(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  caption text,
  thumbnail text,
  destination text,
  status text NOT NULL DEFAULT 'ready',
  scheduled_for timestamptz,
  published_at timestamptz,
  rights text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS connections (
  id text PRIMARY KEY,
  name text NOT NULL,
  category text NOT NULL,
  status text NOT NULL DEFAULT 'needs-auth',
  detail text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- updated_at trigger
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS projects_touch ON projects;
CREATE TRIGGER projects_touch BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS jobs_touch ON jobs;
CREATE TRIGGER jobs_touch BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS connections_touch ON connections;
CREATE TRIGGER connections_touch BEFORE UPDATE ON connections
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_jobs_project_id ON jobs(project_id);
CREATE INDEX IF NOT EXISTS idx_jobs_stage ON jobs(stage);
CREATE INDEX IF NOT EXISTS idx_assets_project_id ON assets(project_id);
CREATE INDEX IF NOT EXISTS idx_activity_project_id ON activity(project_id);
CREATE INDEX IF NOT EXISTS idx_activity_created_at ON activity(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_roundtable_project_id ON roundtable_messages(project_id);
CREATE INDEX IF NOT EXISTS idx_approvals_project_id ON approvals(project_id);
CREATE INDEX IF NOT EXISTS idx_approvals_status ON approvals(status);
CREATE INDEX IF NOT EXISTS idx_publish_status ON publish_items(status);

-- RLS: single-tenant, anon + authenticated CRUD
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE roundtable_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE publish_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['projects','jobs','assets','activity','roundtable_messages','approvals','publish_items','connections'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "anon_select_%s" ON %s', t, t);
    EXECUTE format('CREATE POLICY "anon_select_%s" ON %s FOR SELECT TO anon, authenticated USING (true)', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "anon_insert_%s" ON %s', t, t);
    EXECUTE format('CREATE POLICY "anon_insert_%s" ON %s FOR INSERT TO anon, authenticated WITH CHECK (true)', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "anon_update_%s" ON %s', t, t);
    EXECUTE format('CREATE POLICY "anon_update_%s" ON %s FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true)', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "anon_delete_%s" ON %s', t, t);
    EXECUTE format('CREATE POLICY "anon_delete_%s" ON %s FOR DELETE TO anon, authenticated USING (true)', t, t);
  END LOOP;
END $$;

-- Seed default connections
INSERT INTO connections (id, name, category, status, detail) VALUES
  ('google-drive', 'Google Drive', 'storage', 'needs-auth', 'Connect a Google service account to read and write project files.'),
  ('gmail', 'Gmail', 'communication', 'needs-auth', 'OAuth to send and receive email from Headquarters.'),
  ('youtube', 'YouTube', 'publishing', 'needs-auth', 'OAuth to publish videos and manage uploads.'),
  ('instagram', 'Instagram', 'publishing', 'unavailable', 'Graph API required; not yet available.'),
  ('facebook', 'Facebook', 'publishing', 'unavailable', 'Graph API required; not yet available.'),
  ('tiktok', 'TikTok', 'publishing', 'unavailable', 'Content Posting API access required.'),
  ('x', 'X (Twitter)', 'publishing', 'unavailable', 'API v2 write access required.'),
  ('openai', 'OpenAI / ChatGPT-compatible', 'ai', 'needs-auth', 'Server-side API key required to route generation jobs.'),
  ('slack', 'Slack', 'communication', 'needs-auth', 'Bot token to post activity and approvals.'),
  ('notion', 'Notion', 'workspace', 'needs-auth', 'Internal integration token to sync project notes.'),
  ('spotify', 'Spotify Audio', 'audio', 'needs-auth', 'Audio licensing / catalog access.'),
  ('github', 'GitHub', 'development', 'needs-auth', 'Personal access token for Code Lab.'),
  ('moonshadow-path', 'Moonshadow Path', 'orchestration', 'development', 'Existing backend routing system. Adapter boundary prepared; API contract required before wiring.')
ON CONFLICT (id) DO NOTHING;
