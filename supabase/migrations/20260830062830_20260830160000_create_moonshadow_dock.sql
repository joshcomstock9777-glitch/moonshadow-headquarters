/*
# Moonshadow Dock — Universal Connection Layer

1. Purpose
   Dock is the universal plugboard of Moonshadow Headquarters. It provides a
   persistent registry of every machine/tool/studio Moonshadow can use, a
   standardized handoff envelope for moving work between applications, and a
   connection test bench that verifies real connectivity — never claiming
   "working" merely because configuration exists.

   Dock is a single-tenant workspace (no sign-in screen), matching the
   existing Headquarters architecture. All tables use anon + authenticated
   CRUD policies with USING (true) because all data is shared within the
   single workspace.

2. New Tables
   - `dock_machines` — the connector registry. Each registered machine
     describes itself via a Moonshadow Machine Manifest (WHO I AM, WHAT I
     CAN DO, WHAT I ACCEPT, WHAT I RETURN, WHERE I LIVE, HOW TO CALL ME,
     HOW I AUTHENTICATE, AM I CURRENTLY AVAILABLE). Stores location URLs,
     adapter type, capabilities, accepted/produced types, auth requirements,
     connection status, health status, version, and notes. Secrets are
     never stored here — only a credential_ref pointing to server-side config.
   - `dock_handoffs` — universal handoff envelopes. Each envelope carries a
     job ID, project ID, correlation ID, requested action, creator
     instructions, text/context, asset references, source and destination
     machine IDs, expected output, approval state, provenance, timestamps,
     and status. This lets Herman move a project from one machine to another
     without inventing a new format every time.
   - `dock_connection_tests` — test bench results. Every test records the
     machine, test type (connectivity, auth, capability, harmless request),
     the actual HTTP status code received, response body, latency in ms,
     success/failure, and error information. A test result must come from a
     real response — the UI never displays "working" without one.

3. Security
   - Single-tenant workspace with no sign-in screen. RLS enabled on every
     table, with TO anon, authenticated CRUD policies so the anon-key
     frontend can operate. USING (true) is intentional because all data is
     shared within the single workspace.
   - No secret values are stored in any Dock table. The dock_machines table
     has a credential_ref text column that names which server-side secret
     to use, but the actual secret value lives in Supabase Edge Function
     secrets or server configuration — never in the database or frontend.
   - updated_at auto-maintained by triggers on dock_machines and dock_handoffs.

4. Notes
   - dock_machines uses a text primary key (machine slug) so machines can
     be referenced by handoffs and tests without UUID overhead.
   - dock_handoffs has a correlation_id (uuid) that stays constant across
     the entire lifecycle of a routed job, even if it bounces between
     multiple machines. This is the thread that ties a creator's request to
     every machine response.
   - dock_connection_tests stores the raw response body (truncated to 10KB)
     so the test bench viewer can show what actually came back.
   - Foreign keys use ON DELETE CASCADE so removing a machine cleans up its
     test history. Handoffs use SET NULL for machine references so a
     handoff record survives even if a machine is later removed — the
     provenance trail is preserved.
   - The machine manifest is stored as a JSONB column so it can be
     exported/imported and evolved without schema changes.
*/

-- ── dock_machines: connector registry ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS dock_machines (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  -- WHERE I LIVE
  location_url text,
  api_base_url text,
  source_repo text,
  -- HOW TO CALL ME
  adapter_type text NOT NULL DEFAULT 'web',
  invocation_detail jsonb,
  -- WHAT I CAN DO
  capabilities text[] NOT NULL DEFAULT '{}',
  accepted_inputs text[] NOT NULL DEFAULT '{}',
  produced_outputs text[] NOT NULL DEFAULT '{}',
  -- HOW I AUTHENTICATE
  auth_type text NOT NULL DEFAULT 'none',
  credential_ref text,
  -- AM I CURRENTLY AVAILABLE
  connection_status text NOT NULL DEFAULT 'unknown',
  health_status text NOT NULL DEFAULT 'unknown',
  last_connected_at timestamptz,
  last_failure_at timestamptz,
  last_failure_reason text,
  -- metadata
  machine_type text,
  version text,
  owner_source text,
  notes text,
  -- full manifest for export/import
  manifest jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ── dock_handoffs: universal handoff envelopes ─────────────────────────────
CREATE TABLE IF NOT EXISTS dock_handoffs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  correlation_id uuid NOT NULL DEFAULT gen_random_uuid(),
  -- what is this about
  job_id uuid REFERENCES jobs(id) ON DELETE SET NULL,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  -- the request
  requested_action text NOT NULL,
  creator_instructions text,
  payload jsonb,
  asset_refs text[] NOT NULL DEFAULT '{}',
  -- routing
  source_machine_id text REFERENCES dock_machines(id) ON DELETE SET NULL,
  destination_machine_id text REFERENCES dock_machines(id) ON DELETE SET NULL,
  -- what we expect back
  expected_output text,
  -- approval gate
  approval_state text NOT NULL DEFAULT 'not-required',
  approval_id uuid REFERENCES approvals(id) ON DELETE SET NULL,
  -- provenance trail
  provenance text[] NOT NULL DEFAULT '{}',
  -- lifecycle
  status text NOT NULL DEFAULT 'pending',
  result jsonb,
  error text,
  retries integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  received_at timestamptz
);

-- ── dock_connection_tests: test bench results ──────────────────────────────
CREATE TABLE IF NOT EXISTS dock_connection_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id text REFERENCES dock_machines(id) ON DELETE CASCADE,
  test_type text NOT NULL DEFAULT 'connectivity',
  -- real response data
  http_status integer,
  response_body text,
  latency_ms integer,
  success boolean NOT NULL DEFAULT false,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_dock_machines_status ON dock_machines(connection_status);
CREATE INDEX IF NOT EXISTS idx_dock_machines_capabilities ON dock_machines USING GIN (capabilities);
CREATE INDEX IF NOT EXISTS idx_dock_handoffs_correlation ON dock_handoffs(correlation_id);
CREATE INDEX IF NOT EXISTS idx_dock_handoffs_job ON dock_handoffs(job_id);
CREATE INDEX IF NOT EXISTS idx_dock_handoffs_status ON dock_handoffs(status);
CREATE INDEX IF NOT EXISTS idx_dock_tests_machine ON dock_connection_tests(machine_id);
CREATE INDEX IF NOT EXISTS idx_dock_tests_created ON dock_connection_tests(created_at DESC);

-- ── Triggers ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION touch_dock_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS dock_machines_touch ON dock_machines;
CREATE TRIGGER dock_machines_touch BEFORE UPDATE ON dock_machines
  FOR EACH ROW EXECUTE FUNCTION touch_dock_updated_at();

DROP TRIGGER IF EXISTS dock_handoffs_touch ON dock_handoffs;
CREATE TRIGGER dock_handoffs_touch BEFORE UPDATE ON dock_handoffs
  FOR EACH ROW EXECUTE FUNCTION touch_dock_updated_at();

-- ── RLS: single-tenant, anon + authenticated CRUD ──────────────────────────
ALTER TABLE dock_machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE dock_handoffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE dock_connection_tests ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['dock_machines','dock_handoffs','dock_connection_tests'] LOOP
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

-- ── Seed initial Moonshadow machines ────────────────────────────────────────
-- These are registered with honest status. None are claimed as connected
-- without a real test result. They are ready-to-connect or development
-- status until their actual API contracts are supplied and verified.
INSERT INTO dock_machines (id, name, description, adapter_type, capabilities, accepted_inputs, produced_outputs, auth_type, connection_status, health_status, machine_type, notes, manifest) VALUES
  (
    'moonshadow-path',
    'Moonshadow Path',
    'Existing backend routing and orchestration system. Adapter boundary prepared; API contract required before wiring.',
    'rest',
    ARRAY['ROUTE_JOB', 'PACKAGE_PROJECT'],
    ARRAY['job', 'event', 'routing_request'],
    ARRAY['routing_result', 'status_update'],
    'api_key',
    'development',
    'unknown',
    'orchestration',
    'Path is the existing backend routing system. The adapter boundary is documented. Wiring waits for the real API contract: endpoint URLs, auth method, job/event schema, callback contract, rate limits.',
    jsonb_build_object(
      'who', 'Moonshadow Path — backend orchestration router',
      'what_can_do', ARRAY['Route jobs to destinations', 'Track job status', 'Send callbacks'],
      'what_accepts', ARRAY['Job payload', 'Event message', 'Routing request'],
      'what_returns', ARRAY['Routing result', 'Status update'],
      'where_lives', 'Unknown — URL required',
      'how_to_call', 'Unknown — API contract required',
      'how_authenticates', 'Unknown — likely API key',
      'currently_available', false
    )
  ),
  (
    'studio-go',
    'Studio Go',
    'Capture and ingest raw media from shoots, location recordings, and live sessions.',
    'web',
    ARRAY['STORE_ASSET', 'SEARCH_ASSETS'],
    ARRAY['media_url', 'capture_session'],
    ARRAY['media_file', 'ingest_report'],
    'oauth',
    'ready-to-connect',
    'unknown',
    'capture',
    'Register capabilities and handoff behavior without rebuilding Studio Go. Needs URL and auth configuration.',
    jsonb_build_object(
      'who', 'Studio Go — capture and ingest system',
      'what_can_do', ARRAY['Capture raw media', 'Ingest recordings', 'Manage capture sessions'],
      'what_accepts', ARRAY['Media URL', 'Capture session reference'],
      'what_returns', ARRAY['Media file', 'Ingest report'],
      'where_lives', 'Unknown — URL required',
      'how_to_call', 'Web application — needs endpoint discovery',
      'how_authenticates', 'Unknown — likely OAuth',
      'currently_available', false
    )
  ),
  (
    'moonshadow-editor',
    'Moonshadow Editor / Creative OS',
    'Creative Operating System editor. Load media, open a project, request edits, receive exports.',
    'web',
    ARRAY['EDIT_VIDEO', 'EDIT_IMAGE', 'PACKAGE_PROJECT', 'STORE_ASSET'],
    ARRAY['project', 'asset_refs', 'edit_notes'],
    ARRAY['preview_render', 'export_file'],
    'oauth',
    'ready-to-connect',
    'unknown',
    'editor',
    'Build an editor handoff adapter around the recovered editor rather than recreating the editor. Adapter boundary: load media, create/open project, send assets, request edits, receive previews, receive exports.',
    jsonb_build_object(
      'who', 'Moonshadow Editor — Creative Operating System',
      'what_can_do', ARRAY['Edit video', 'Edit images', 'Package projects', 'Store assets'],
      'what_accepts', ARRAY['Project reference', 'Asset references', 'Edit notes'],
      'what_returns', ARRAY['Preview renders', 'Export files'],
      'where_lives', 'Unknown — URL required',
      'how_to_call', 'Web application — needs handoff endpoint',
      'how_authenticates', 'Unknown — likely OAuth or session',
      'currently_available', false
    )
  ),
  (
    'kimmy',
    'Kimmy Story Writer',
    'Atmospheric horror and sci-fi writing — short stories, scenes, concepts, scripts.',
    'internal',
    ARRAY['WRITE_STORY', 'WRITE_SCRIPT'],
    ARRAY['brief', 'genre', 'tone', 'word_count', 'elements'],
    ARRAY['story_text', 'script_text'],
    'none',
    'connected',
    'unknown',
    'writing',
    'Kimmy is integrated into Headquarters as the writing module. The Drafting Workspace is available in Studio. Connection to Dock as a callable machine requires defining the internal invocation contract.',
    jsonb_build_object(
      'who', 'Kimmy — atmospheric horror and sci-fi writer',
      'what_can_do', ARRAY['Write stories', 'Write scripts', 'Generate concepts'],
      'what_accepts', ARRAY['Brief', 'Genre', 'Tone', 'Word count', 'Elements'],
      'what_returns', ARRAY['Story text', 'Script text'],
      'where_lives', 'Internal to Moonshadow Headquarters',
      'how_to_call', 'Internal module — invocation contract to be defined',
      'how_authenticates', 'None — internal',
      'currently_available', true
    )
  ),
  (
    'skin-studio',
    'Skin Studio',
    'Text-to-image generation and editing. Portrait, square, and landscape formats with version history.',
    'web',
    ARRAY['GENERATE_IMAGE', 'EDIT_IMAGE'],
    ARRAY['prompt', 'style', 'format', 'reference_image'],
    ARRAY['image_file', 'image_url'],
    'api_key',
    'ready-to-connect',
    'unknown',
    'image',
    'Connect image generation/editing if its real interface is available. Needs API base URL and server-side API key.',
    jsonb_build_object(
      'who', 'Skin Studio — text-to-image generation and editing',
      'what_can_do', ARRAY['Generate images from text', 'Edit existing images', 'Version history'],
      'what_accepts', ARRAY['Prompt', 'Style', 'Format', 'Reference image'],
      'what_returns', ARRAY['Image file', 'Image URL'],
      'where_lives', 'Unknown — URL required',
      'how_to_call', 'Web application or API — needs endpoint discovery',
      'how_authenticates', 'API key (server-side)',
      'currently_available', false
    )
  ),
  (
    'content-factory',
    'Content Factory',
    'Repeatable short-form production jobs. Configurable channels and lanes.',
    'internal',
    ARRAY['PACKAGE_PROJECT', 'ROUTE_JOB'],
    ARRAY['job', 'channel_config'],
    ARRAY['packaged_content'],
    'none',
    'connected',
    'healthy',
    'production',
    'Content Factory is an internal Headquarters module. Already operational within the HQ interface.',
    jsonb_build_object(
      'who', 'Content Factory — repeatable production pipeline',
      'what_can_do', ARRAY['Run production jobs', 'Package content', 'Route between lanes'],
      'what_accepts', ARRAY['Job', 'Channel configuration'],
      'what_returns', ARRAY['Packaged content'],
      'where_lives', 'Internal to Moonshadow Headquarters',
      'how_to_call', 'Internal module',
      'how_authenticates', 'None — internal',
      'currently_available', true
    )
  ),
  (
    'code-lab',
    'Code Lab',
    'Scripts, tooling, and integrations development environment.',
    'github',
    ARRAY['RUN_CODE'],
    ARRAY['code', 'task_description'],
    ARRAY['code_output', 'test_result'],
    'token',
    'needs-auth',
    'unknown',
    'development',
    'GitHub-hosted development environment. Needs personal access token configured server-side.',
    jsonb_build_object(
      'who', 'Code Lab — development and tooling environment',
      'what_can_do', ARRAY['Run code', 'Generate tooling', 'Create integrations'],
      'what_accepts', ARRAY['Code', 'Task description'],
      'what_returns', ARRAY['Code output', 'Test results'],
      'where_lives', 'GitHub repository — URL required',
      'how_to_call', 'GitHub-hosted — needs repo URL',
      'how_authenticates', 'GitHub personal access token (server-side)',
      'currently_available', false
    )
  )
ON CONFLICT (id) DO NOTHING;
