/*
  Studio upgrade foundations:
  - Multi-provider plugin orchestrator (OpenAI/Anthropic/Google/local/media)
  - Free-first / cheapest-paid queue policy and generation telemetry
  - Social promotion autopilot jobs + per-platform variants
  - Rights/compliance hard gate evidence
  - Retention/conversion intelligence signals
  - ROI-focused command center queue view
*/

CREATE TABLE IF NOT EXISTS public.plugin_providers (
  id text PRIMARY KEY,
  label text NOT NULL,
  provider_kind text NOT NULL CHECK (provider_kind IN ('llm', 'image', 'video', 'audio', 'social', 'local', 'other')),
  auth_env_ref text NOT NULL,
  status text NOT NULL DEFAULT 'needs-auth' CHECK (status IN ('connected', 'ready-to-connect', 'needs-auth', 'development', 'unavailable')),
  supports_tasks text[] NOT NULL DEFAULT '{}',
  is_free_tier boolean NOT NULL DEFAULT false,
  estimated_cost_rank integer NOT NULL DEFAULT 100 CHECK (estimated_cost_rank > 0),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.generator_queue_policies (
  id text PRIMARY KEY,
  label text NOT NULL,
  task_types text[] NOT NULL DEFAULT '{}',
  provider_order text[] NOT NULL DEFAULT '{}',
  fallback_mode text NOT NULL DEFAULT 'free-first-cheapest-paid' CHECK (fallback_mode IN ('free-first-cheapest-paid', 'fixed-order', 'manual')),
  premium_escalation_rule text NOT NULL DEFAULT 'roi-required',
  active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.generation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  job_id uuid REFERENCES public.jobs(id) ON DELETE CASCADE,
  house_id text,
  task_type text NOT NULL,
  provider_id text REFERENCES public.plugin_providers(id) ON DELETE RESTRICT,
  queue_policy_id text REFERENCES public.generator_queue_policies(id) ON DELETE SET NULL,
  attempt integer NOT NULL DEFAULT 1 CHECK (attempt > 0),
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'succeeded', 'failed', 'cancelled')),
  estimated_cost_usd numeric(10,4) NOT NULL DEFAULT 0,
  actual_cost_usd numeric(10,4),
  roi_justified boolean NOT NULL DEFAULT false,
  quality_score integer CHECK (quality_score BETWEEN 0 AND 100),
  output_asset_id uuid REFERENCES public.assets(id) ON DELETE SET NULL,
  failure_reason text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.social_promotion_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  job_id uuid REFERENCES public.jobs(id) ON DELETE CASCADE,
  house_id text,
  source_publish_item_id uuid REFERENCES public.publish_items(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'blocked', 'published', 'failed', 'cancelled')),
  platforms text[] NOT NULL DEFAULT '{}',
  generated_variants jsonb NOT NULL DEFAULT '[]'::jsonb,
  hashtag_pack text[] NOT NULL DEFAULT '{}',
  hook_texts text[] NOT NULL DEFAULT '{}',
  cost_usd numeric(10,4) NOT NULL DEFAULT 0,
  blocked_reason text,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.rights_compliance_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  music_rights_ok boolean NOT NULL DEFAULT false,
  image_rights_ok boolean NOT NULL DEFAULT false,
  clip_rights_ok boolean NOT NULL DEFAULT false,
  policy_safety_ok boolean NOT NULL DEFAULT false,
  violations text[] NOT NULL DEFAULT '{}',
  notes text,
  publish_allowed boolean NOT NULL DEFAULT false,
  reviewed_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rights_compliance_reviews_job_unique UNIQUE (job_id)
);

CREATE TABLE IF NOT EXISTS public.retention_conversion_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  job_id uuid REFERENCES public.jobs(id) ON DELETE CASCADE,
  house_id text,
  platform text NOT NULL,
  hook_retention_pct numeric(5,2) CHECK (hook_retention_pct BETWEEN 0 AND 100),
  watch_time_drop_points jsonb NOT NULL DEFAULT '[]'::jsonb,
  ctr_pct numeric(5,2) CHECK (ctr_pct BETWEEN 0 AND 100),
  rpm_usd numeric(10,4),
  conversion_rate_pct numeric(5,2) CHECK (conversion_rate_pct BETWEEN 0 AND 100),
  measured_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.plugin_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generator_queue_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_promotion_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rights_compliance_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retention_conversion_signals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hq_select_plugin_providers" ON public.plugin_providers;
CREATE POLICY "hq_select_plugin_providers"
ON public.plugin_providers FOR SELECT TO authenticated
USING (public.has_headquarters_access());
DROP POLICY IF EXISTS "hq_insert_plugin_providers" ON public.plugin_providers;
CREATE POLICY "hq_insert_plugin_providers"
ON public.plugin_providers FOR INSERT TO authenticated
WITH CHECK (public.has_headquarters_access());
DROP POLICY IF EXISTS "hq_update_plugin_providers" ON public.plugin_providers;
CREATE POLICY "hq_update_plugin_providers"
ON public.plugin_providers FOR UPDATE TO authenticated
USING (public.has_headquarters_access())
WITH CHECK (public.has_headquarters_access());
DROP POLICY IF EXISTS "hq_delete_plugin_providers" ON public.plugin_providers;
CREATE POLICY "hq_delete_plugin_providers"
ON public.plugin_providers FOR DELETE TO authenticated
USING (public.has_headquarters_access());

DROP POLICY IF EXISTS "hq_select_generator_queue_policies" ON public.generator_queue_policies;
CREATE POLICY "hq_select_generator_queue_policies"
ON public.generator_queue_policies FOR SELECT TO authenticated
USING (public.has_headquarters_access());
DROP POLICY IF EXISTS "hq_insert_generator_queue_policies" ON public.generator_queue_policies;
CREATE POLICY "hq_insert_generator_queue_policies"
ON public.generator_queue_policies FOR INSERT TO authenticated
WITH CHECK (public.has_headquarters_access());
DROP POLICY IF EXISTS "hq_update_generator_queue_policies" ON public.generator_queue_policies;
CREATE POLICY "hq_update_generator_queue_policies"
ON public.generator_queue_policies FOR UPDATE TO authenticated
USING (public.has_headquarters_access())
WITH CHECK (public.has_headquarters_access());
DROP POLICY IF EXISTS "hq_delete_generator_queue_policies" ON public.generator_queue_policies;
CREATE POLICY "hq_delete_generator_queue_policies"
ON public.generator_queue_policies FOR DELETE TO authenticated
USING (public.has_headquarters_access());

DROP POLICY IF EXISTS "hq_select_generation_runs" ON public.generation_runs;
CREATE POLICY "hq_select_generation_runs"
ON public.generation_runs FOR SELECT TO authenticated
USING (public.has_headquarters_access());
DROP POLICY IF EXISTS "hq_insert_generation_runs" ON public.generation_runs;
CREATE POLICY "hq_insert_generation_runs"
ON public.generation_runs FOR INSERT TO authenticated
WITH CHECK (public.has_headquarters_access());
DROP POLICY IF EXISTS "hq_update_generation_runs" ON public.generation_runs;
CREATE POLICY "hq_update_generation_runs"
ON public.generation_runs FOR UPDATE TO authenticated
USING (public.has_headquarters_access())
WITH CHECK (public.has_headquarters_access());
DROP POLICY IF EXISTS "hq_delete_generation_runs" ON public.generation_runs;
CREATE POLICY "hq_delete_generation_runs"
ON public.generation_runs FOR DELETE TO authenticated
USING (public.has_headquarters_access());

DROP POLICY IF EXISTS "hq_select_social_promotion_jobs" ON public.social_promotion_jobs;
CREATE POLICY "hq_select_social_promotion_jobs"
ON public.social_promotion_jobs FOR SELECT TO authenticated
USING (public.has_headquarters_access());
DROP POLICY IF EXISTS "hq_insert_social_promotion_jobs" ON public.social_promotion_jobs;
CREATE POLICY "hq_insert_social_promotion_jobs"
ON public.social_promotion_jobs FOR INSERT TO authenticated
WITH CHECK (public.has_headquarters_access());
DROP POLICY IF EXISTS "hq_update_social_promotion_jobs" ON public.social_promotion_jobs;
CREATE POLICY "hq_update_social_promotion_jobs"
ON public.social_promotion_jobs FOR UPDATE TO authenticated
USING (public.has_headquarters_access())
WITH CHECK (public.has_headquarters_access());
DROP POLICY IF EXISTS "hq_delete_social_promotion_jobs" ON public.social_promotion_jobs;
CREATE POLICY "hq_delete_social_promotion_jobs"
ON public.social_promotion_jobs FOR DELETE TO authenticated
USING (public.has_headquarters_access());

DROP POLICY IF EXISTS "hq_select_rights_compliance_reviews" ON public.rights_compliance_reviews;
CREATE POLICY "hq_select_rights_compliance_reviews"
ON public.rights_compliance_reviews FOR SELECT TO authenticated
USING (public.has_headquarters_access());
DROP POLICY IF EXISTS "hq_insert_rights_compliance_reviews" ON public.rights_compliance_reviews;
CREATE POLICY "hq_insert_rights_compliance_reviews"
ON public.rights_compliance_reviews FOR INSERT TO authenticated
WITH CHECK (public.has_headquarters_access());
DROP POLICY IF EXISTS "hq_update_rights_compliance_reviews" ON public.rights_compliance_reviews;
CREATE POLICY "hq_update_rights_compliance_reviews"
ON public.rights_compliance_reviews FOR UPDATE TO authenticated
USING (public.has_headquarters_access())
WITH CHECK (public.has_headquarters_access());
DROP POLICY IF EXISTS "hq_delete_rights_compliance_reviews" ON public.rights_compliance_reviews;
CREATE POLICY "hq_delete_rights_compliance_reviews"
ON public.rights_compliance_reviews FOR DELETE TO authenticated
USING (public.has_headquarters_access());

DROP POLICY IF EXISTS "hq_select_retention_conversion_signals" ON public.retention_conversion_signals;
CREATE POLICY "hq_select_retention_conversion_signals"
ON public.retention_conversion_signals FOR SELECT TO authenticated
USING (public.has_headquarters_access());
DROP POLICY IF EXISTS "hq_insert_retention_conversion_signals" ON public.retention_conversion_signals;
CREATE POLICY "hq_insert_retention_conversion_signals"
ON public.retention_conversion_signals FOR INSERT TO authenticated
WITH CHECK (public.has_headquarters_access());
DROP POLICY IF EXISTS "hq_update_retention_conversion_signals" ON public.retention_conversion_signals;
CREATE POLICY "hq_update_retention_conversion_signals"
ON public.retention_conversion_signals FOR UPDATE TO authenticated
USING (public.has_headquarters_access())
WITH CHECK (public.has_headquarters_access());
DROP POLICY IF EXISTS "hq_delete_retention_conversion_signals" ON public.retention_conversion_signals;
CREATE POLICY "hq_delete_retention_conversion_signals"
ON public.retention_conversion_signals FOR DELETE TO authenticated
USING (public.has_headquarters_access());

CREATE OR REPLACE FUNCTION public.touch_hq_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS plugin_providers_touch ON public.plugin_providers;
CREATE TRIGGER plugin_providers_touch
BEFORE UPDATE ON public.plugin_providers
FOR EACH ROW EXECUTE FUNCTION public.touch_hq_updated_at();

DROP TRIGGER IF EXISTS generator_queue_policies_touch ON public.generator_queue_policies;
CREATE TRIGGER generator_queue_policies_touch
BEFORE UPDATE ON public.generator_queue_policies
FOR EACH ROW EXECUTE FUNCTION public.touch_hq_updated_at();

DROP TRIGGER IF EXISTS generation_runs_touch ON public.generation_runs;
CREATE TRIGGER generation_runs_touch
BEFORE UPDATE ON public.generation_runs
FOR EACH ROW EXECUTE FUNCTION public.touch_hq_updated_at();

DROP TRIGGER IF EXISTS social_promotion_jobs_touch ON public.social_promotion_jobs;
CREATE TRIGGER social_promotion_jobs_touch
BEFORE UPDATE ON public.social_promotion_jobs
FOR EACH ROW EXECUTE FUNCTION public.touch_hq_updated_at();

DROP TRIGGER IF EXISTS rights_compliance_reviews_touch ON public.rights_compliance_reviews;
CREATE TRIGGER rights_compliance_reviews_touch
BEFORE UPDATE ON public.rights_compliance_reviews
FOR EACH ROW EXECUTE FUNCTION public.touch_hq_updated_at();

CREATE OR REPLACE FUNCTION public.flag_failed_rights_compliance_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.publish_allowed = false
     OR NEW.music_rights_ok = false
     OR NEW.image_rights_ok = false
     OR NEW.clip_rights_ok = false
     OR NEW.policy_safety_ok = false THEN
    UPDATE public.jobs
    SET error = 'Rights/compliance gate failed. No rights, no publish.'
    WHERE id = NEW.job_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS rights_compliance_reviews_flag_failed ON public.rights_compliance_reviews;
CREATE TRIGGER rights_compliance_reviews_flag_failed
AFTER INSERT OR UPDATE ON public.rights_compliance_reviews
FOR EACH ROW EXECUTE FUNCTION public.flag_failed_rights_compliance_review();

DROP VIEW IF EXISTS public.command_center_roi_queue;

CREATE OR REPLACE FUNCTION public.get_command_center_roi_queue(p_limit integer DEFAULT 6)
RETURNS TABLE (
  house_id text,
  house_label text,
  monetization_priority integer,
  rollout_phase integer,
  active_jobs integer,
  blocked_jobs integer,
  avg_ctr_pct numeric(5,2),
  avg_rpm_usd numeric(10,4),
  avg_conversion_rate_pct numeric(5,2),
  highest_roi_next_action text
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'anon' OR NOT public.has_headquarters_access() THEN
    RAISE EXCEPTION 'Headquarters access required for ROI queue';
  END IF;

  RETURN QUERY
  WITH house_jobs AS (
    SELECT
      p.type AS house_id,
      count(j.id) FILTER (WHERE j.stage <> 'done')::integer AS active_jobs,
      count(j.id) FILTER (WHERE j.error IS NOT NULL AND btrim(j.error) <> '')::integer AS blocked_jobs
    FROM public.projects p
    LEFT JOIN public.jobs j ON j.project_id = p.id
    GROUP BY p.type
  ),
  house_retention AS (
    SELECT
      p.type AS house_id,
      coalesce(avg(r.ctr_pct), 0)::numeric(5,2) AS avg_ctr_pct,
      coalesce(avg(r.rpm_usd), 0)::numeric(10,4) AS avg_rpm_usd,
      coalesce(avg(r.conversion_rate_pct), 0)::numeric(5,2) AS avg_conversion_rate_pct
    FROM public.projects p
    LEFT JOIN public.retention_conversion_signals r ON r.project_id = p.id
    GROUP BY p.type
  )
  SELECT
    h.id AS house_id,
    h.label AS house_label,
    h.monetization_priority,
    h.rollout_phase,
    coalesce(j.active_jobs, 0) AS active_jobs,
    coalesce(j.blocked_jobs, 0) AS blocked_jobs,
    coalesce(r.avg_ctr_pct, 0)::numeric(5,2) AS avg_ctr_pct,
    coalesce(r.avg_rpm_usd, 0)::numeric(10,4) AS avg_rpm_usd,
    coalesce(r.avg_conversion_rate_pct, 0)::numeric(5,2) AS avg_conversion_rate_pct,
    format(
      'Prioritize %s next: run free-first queue, clear blocked items, and push highest-retention cut.',
      h.label
    ) AS highest_roi_next_action
  FROM public.house_strategy_profiles h
  LEFT JOIN house_jobs j ON j.house_id = h.id
  LEFT JOIN house_retention r ON r.house_id = h.id
  ORDER BY h.monetization_priority ASC
  LIMIT GREATEST(coalesce(p_limit, 6), 1);
END;
$$;

INSERT INTO public.plugin_providers (
  id, label, provider_kind, auth_env_ref, status, supports_tasks, is_free_tier, estimated_cost_rank, metadata
)
VALUES
  ('openai', 'OpenAI', 'llm', 'OPENAI_API_KEY', 'needs-auth', ARRAY['script', 'hooks', 'captions', 'promotion-copy', 'critic-pass'], false, 30, jsonb_build_object('routing', 'quality-priority')),
  ('anthropic', 'Anthropic', 'llm', 'ANTHROPIC_API_KEY', 'needs-auth', ARRAY['script', 'editing-notes', 'teaching', 'critic-pass'], false, 35, jsonb_build_object('routing', 'reasoning-priority')),
  ('google', 'Google Gemini', 'llm', 'GOOGLE_API_KEY', 'needs-auth', ARRAY['script', 'summaries', 'multimodal-review'], false, 25, jsonb_build_object('routing', 'speed-priority')),
  ('local-models', 'Local Models', 'local', 'LOCAL_MODEL_ENDPOINT', 'development', ARRAY['script', 'captions', 'rough-cuts'], true, 10, jsonb_build_object('routing', 'free-first')),
  ('media-toolkit', 'Media Toolkit APIs', 'video', 'MEDIA_TOOLKIT_API_KEY', 'needs-auth', ARRAY['thumbnail', 'clip-render', 'transcode', 'waveform'], false, 20, jsonb_build_object('routing', 'media-specialist')),
  ('social-promotion', 'Social Promotion Provider', 'social', 'SOCIAL_PROMOTION_HUB_API_KEY', 'needs-auth', ARRAY['short-variant', 'hashtags', 'hook-lines', 'cross-post'], false, 15, jsonb_build_object('routing', 'autopilot'))
ON CONFLICT (id) DO UPDATE
SET
  label = EXCLUDED.label,
  provider_kind = EXCLUDED.provider_kind,
  auth_env_ref = EXCLUDED.auth_env_ref,
  status = CASE
    WHEN public.plugin_providers.status = 'connected' THEN public.plugin_providers.status
    ELSE EXCLUDED.status
  END,
  supports_tasks = EXCLUDED.supports_tasks,
  is_free_tier = EXCLUDED.is_free_tier,
  estimated_cost_rank = EXCLUDED.estimated_cost_rank,
  metadata = EXCLUDED.metadata;

INSERT INTO public.generator_queue_policies (
  id, label, task_types, provider_order, fallback_mode, premium_escalation_rule, active, metadata
)
VALUES
  (
    'hq-default-free-first',
    'HQ Default Free-First Queue',
    ARRAY['script', 'thumbnail', 'edit', 'music', 'captions', 'promotion'],
    ARRAY['local-models', 'google', 'media-toolkit', 'openai', 'anthropic'],
    'free-first-cheapest-paid',
    'escalate only if projected retention or conversion gain exceeds cost threshold',
    true,
    jsonb_build_object('roi_threshold_min_delta_pct', 3.5, 'max_premium_attempts', 1)
  )
ON CONFLICT (id) DO UPDATE
SET
  label = EXCLUDED.label,
  task_types = EXCLUDED.task_types,
  provider_order = EXCLUDED.provider_order,
  fallback_mode = EXCLUDED.fallback_mode,
  premium_escalation_rule = EXCLUDED.premium_escalation_rule,
  active = EXCLUDED.active,
  metadata = EXCLUDED.metadata;

INSERT INTO public.connections (id, name, category, status, detail)
VALUES
  ('plugin-orchestrator', 'Plugin Orchestrator', 'orchestration', 'needs-auth', 'Task-routed provider layer for OpenAI, Anthropic, Google, local models, and media APIs.'),
  ('quality-gate-engine', 'Quality Gate Engine', 'orchestration', 'development', 'Hard publish gate requiring originality, clarity, retention prediction, craft, and rights evidence.'),
  ('music-editor-engine', 'Music Editor Engine', 'audio', 'development', 'Music composition workflows with note-by-note, lick-by-lick, and full-arrangement support.'),
  ('retention-intelligence', 'Retention Intelligence', 'ai', 'development', 'Collects hook retention, drop points, CTR, RPM, and conversion signals for strategy feedback.')
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  status = CASE
    WHEN public.connections.status IN ('connected', 'ready-to-connect') THEN public.connections.status
    ELSE EXCLUDED.status
  END,
  detail = CASE
    WHEN public.connections.status IN ('connected', 'ready-to-connect')
      AND public.connections.detail IS NOT NULL
      AND btrim(public.connections.detail) <> ''
    THEN public.connections.detail
    ELSE EXCLUDED.detail
  END;

COMMENT ON FUNCTION public.get_command_center_roi_queue(integer) IS
  'ROI-prioritized per-house queue for Command Center 2.0, combining active workload, block rate, and retention/conversion performance.';
