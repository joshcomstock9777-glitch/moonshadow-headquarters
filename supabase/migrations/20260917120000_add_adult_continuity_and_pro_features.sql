/*
  Adult studio lane + continuity enforcement + compact pro features:
  1) Continuity Bible + publish gate enforcement
  2) Hook Lab variants
  3) Thumbnail Duel variants
  4) Social autopilot playbooks (lean preset layer)
*/

CREATE TABLE IF NOT EXISTS public.continuity_bibles (
  id text PRIMARY KEY,
  label text NOT NULL,
  house_id text,
  canon jsonb NOT NULL DEFAULT '{}'::jsonb,
  style_rules text[] NOT NULL DEFAULT '{}',
  blocked_topics text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.continuity_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  continuity_bible_id text NOT NULL REFERENCES public.continuity_bibles(id) ON DELETE RESTRICT,
  continuity_score integer NOT NULL CHECK (continuity_score BETWEEN 0 AND 100),
  issues text[] NOT NULL DEFAULT '{}',
  fix_plan text,
  publish_ready boolean NOT NULL DEFAULT false,
  reviewed_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT continuity_checks_job_unique UNIQUE (job_id)
);

CREATE TABLE IF NOT EXISTS public.hook_labs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  job_id uuid REFERENCES public.jobs(id) ON DELETE CASCADE,
  platform text NOT NULL,
  variants jsonb NOT NULL DEFAULT '[]'::jsonb,
  winning_variant text,
  predicted_retention_gain_pct numeric(5,2),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.thumbnail_duels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  job_id uuid REFERENCES public.jobs(id) ON DELETE CASCADE,
  destination text NOT NULL DEFAULT 'youtube',
  variants jsonb NOT NULL DEFAULT '[]'::jsonb,
  winner_variant text,
  winner_ctr_pct numeric(5,2),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.social_autopilot_playbooks (
  id text PRIMARY KEY,
  house_id text NOT NULL,
  label text NOT NULL,
  transformations jsonb NOT NULL DEFAULT '{}'::jsonb,
  hashtag_policy jsonb NOT NULL DEFAULT '{}'::jsonb,
  hook_policy jsonb NOT NULL DEFAULT '{}'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.continuity_bibles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.continuity_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hook_labs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thumbnail_duels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_autopilot_playbooks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hq_select_continuity_bibles" ON public.continuity_bibles;
CREATE POLICY "hq_select_continuity_bibles"
ON public.continuity_bibles FOR SELECT TO authenticated
USING (public.has_headquarters_access());
DROP POLICY IF EXISTS "hq_insert_continuity_bibles" ON public.continuity_bibles;
CREATE POLICY "hq_insert_continuity_bibles"
ON public.continuity_bibles FOR INSERT TO authenticated
WITH CHECK (public.has_headquarters_access());
DROP POLICY IF EXISTS "hq_update_continuity_bibles" ON public.continuity_bibles;
CREATE POLICY "hq_update_continuity_bibles"
ON public.continuity_bibles FOR UPDATE TO authenticated
USING (public.has_headquarters_access())
WITH CHECK (public.has_headquarters_access());
DROP POLICY IF EXISTS "hq_delete_continuity_bibles" ON public.continuity_bibles;
CREATE POLICY "hq_delete_continuity_bibles"
ON public.continuity_bibles FOR DELETE TO authenticated
USING (public.has_headquarters_access());

DROP POLICY IF EXISTS "hq_select_continuity_checks" ON public.continuity_checks;
CREATE POLICY "hq_select_continuity_checks"
ON public.continuity_checks FOR SELECT TO authenticated
USING (public.has_headquarters_access());
DROP POLICY IF EXISTS "hq_insert_continuity_checks" ON public.continuity_checks;
CREATE POLICY "hq_insert_continuity_checks"
ON public.continuity_checks FOR INSERT TO authenticated
WITH CHECK (public.has_headquarters_access());
DROP POLICY IF EXISTS "hq_update_continuity_checks" ON public.continuity_checks;
CREATE POLICY "hq_update_continuity_checks"
ON public.continuity_checks FOR UPDATE TO authenticated
USING (public.has_headquarters_access())
WITH CHECK (public.has_headquarters_access());
DROP POLICY IF EXISTS "hq_delete_continuity_checks" ON public.continuity_checks;
CREATE POLICY "hq_delete_continuity_checks"
ON public.continuity_checks FOR DELETE TO authenticated
USING (public.has_headquarters_access());

DROP POLICY IF EXISTS "hq_select_hook_labs" ON public.hook_labs;
CREATE POLICY "hq_select_hook_labs"
ON public.hook_labs FOR SELECT TO authenticated
USING (public.has_headquarters_access());
DROP POLICY IF EXISTS "hq_insert_hook_labs" ON public.hook_labs;
CREATE POLICY "hq_insert_hook_labs"
ON public.hook_labs FOR INSERT TO authenticated
WITH CHECK (public.has_headquarters_access());
DROP POLICY IF EXISTS "hq_update_hook_labs" ON public.hook_labs;
CREATE POLICY "hq_update_hook_labs"
ON public.hook_labs FOR UPDATE TO authenticated
USING (public.has_headquarters_access())
WITH CHECK (public.has_headquarters_access());
DROP POLICY IF EXISTS "hq_delete_hook_labs" ON public.hook_labs;
CREATE POLICY "hq_delete_hook_labs"
ON public.hook_labs FOR DELETE TO authenticated
USING (public.has_headquarters_access());

DROP POLICY IF EXISTS "hq_select_thumbnail_duels" ON public.thumbnail_duels;
CREATE POLICY "hq_select_thumbnail_duels"
ON public.thumbnail_duels FOR SELECT TO authenticated
USING (public.has_headquarters_access());
DROP POLICY IF EXISTS "hq_insert_thumbnail_duels" ON public.thumbnail_duels;
CREATE POLICY "hq_insert_thumbnail_duels"
ON public.thumbnail_duels FOR INSERT TO authenticated
WITH CHECK (public.has_headquarters_access());
DROP POLICY IF EXISTS "hq_update_thumbnail_duels" ON public.thumbnail_duels;
CREATE POLICY "hq_update_thumbnail_duels"
ON public.thumbnail_duels FOR UPDATE TO authenticated
USING (public.has_headquarters_access())
WITH CHECK (public.has_headquarters_access());
DROP POLICY IF EXISTS "hq_delete_thumbnail_duels" ON public.thumbnail_duels;
CREATE POLICY "hq_delete_thumbnail_duels"
ON public.thumbnail_duels FOR DELETE TO authenticated
USING (public.has_headquarters_access());

DROP POLICY IF EXISTS "hq_select_social_autopilot_playbooks" ON public.social_autopilot_playbooks;
CREATE POLICY "hq_select_social_autopilot_playbooks"
ON public.social_autopilot_playbooks FOR SELECT TO authenticated
USING (public.has_headquarters_access());
DROP POLICY IF EXISTS "hq_insert_social_autopilot_playbooks" ON public.social_autopilot_playbooks;
CREATE POLICY "hq_insert_social_autopilot_playbooks"
ON public.social_autopilot_playbooks FOR INSERT TO authenticated
WITH CHECK (public.has_headquarters_access());
DROP POLICY IF EXISTS "hq_update_social_autopilot_playbooks" ON public.social_autopilot_playbooks;
CREATE POLICY "hq_update_social_autopilot_playbooks"
ON public.social_autopilot_playbooks FOR UPDATE TO authenticated
USING (public.has_headquarters_access())
WITH CHECK (public.has_headquarters_access());
DROP POLICY IF EXISTS "hq_delete_social_autopilot_playbooks" ON public.social_autopilot_playbooks;
CREATE POLICY "hq_delete_social_autopilot_playbooks"
ON public.social_autopilot_playbooks FOR DELETE TO authenticated
USING (public.has_headquarters_access());

DROP TRIGGER IF EXISTS continuity_bibles_touch ON public.continuity_bibles;
CREATE TRIGGER continuity_bibles_touch
BEFORE UPDATE ON public.continuity_bibles
FOR EACH ROW EXECUTE FUNCTION public.touch_hq_updated_at();

DROP TRIGGER IF EXISTS continuity_checks_touch ON public.continuity_checks;
CREATE TRIGGER continuity_checks_touch
BEFORE UPDATE ON public.continuity_checks
FOR EACH ROW EXECUTE FUNCTION public.touch_hq_updated_at();

DROP TRIGGER IF EXISTS hook_labs_touch ON public.hook_labs;
CREATE TRIGGER hook_labs_touch
BEFORE UPDATE ON public.hook_labs
FOR EACH ROW EXECUTE FUNCTION public.touch_hq_updated_at();

DROP TRIGGER IF EXISTS thumbnail_duels_touch ON public.thumbnail_duels;
CREATE TRIGGER thumbnail_duels_touch
BEFORE UPDATE ON public.thumbnail_duels
FOR EACH ROW EXECUTE FUNCTION public.touch_hq_updated_at();

DROP TRIGGER IF EXISTS social_autopilot_playbooks_touch ON public.social_autopilot_playbooks;
CREATE TRIGGER social_autopilot_playbooks_touch
BEFORE UPDATE ON public.social_autopilot_playbooks
FOR EACH ROW EXECUTE FUNCTION public.touch_hq_updated_at();

CREATE OR REPLACE FUNCTION public.flag_failed_continuity_check()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.publish_ready = false OR NEW.continuity_score < 85 THEN
    UPDATE public.jobs
    SET error = 'Continuity gate failed. Update against continuity Bible before publish.'
    WHERE id = NEW.job_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS continuity_checks_flag_failed ON public.continuity_checks;
CREATE TRIGGER continuity_checks_flag_failed
AFTER INSERT OR UPDATE ON public.continuity_checks
FOR EACH ROW EXECUTE FUNCTION public.flag_failed_continuity_check();

CREATE OR REPLACE FUNCTION public.enforce_job_stage_evidence()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  stages constant text[] := array[
    'idea', 'plan', 'create', 'review', 'edit', 'package', 'approve', 'publish', 'done'
  ];
  old_index integer;
  new_index integer;
  has_approval boolean;
  has_publication boolean;
  has_quality_gate boolean;
  has_rights_gate boolean;
  has_continuity_gate boolean;
BEGIN
  IF NEW.stage IS NULL OR NOT (NEW.stage = ANY(stages)) THEN
    RAISE EXCEPTION 'invalid Headquarters job stage: %', coalesce(NEW.stage, '<null>');
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF auth.role() IS DISTINCT FROM 'service_role' AND NEW.stage <> 'idea' THEN
      RAISE EXCEPTION 'new browser-created jobs must begin at idea stage';
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.stage IS NOT DISTINCT FROM NEW.stage THEN
    RETURN NEW;
  END IF;

  old_index := array_position(stages, OLD.stage);
  new_index := array_position(stages, NEW.stage);

  IF old_index IS NULL THEN
    RAISE EXCEPTION 'existing job has unknown stage: %', OLD.stage;
  END IF;

  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    IF new_index <> old_index + 1 THEN
      RAISE EXCEPTION 'browser job transitions must advance exactly one stage (% -> % rejected)', OLD.stage, NEW.stage;
    END IF;

    IF NEW.stage = 'publish' THEN
      SELECT EXISTS (
        SELECT 1
        FROM public.approvals a
        WHERE a.job_id = NEW.id
          AND a.status = 'approved'
          AND a.decided_at IS NOT NULL
      ) INTO has_approval;

      IF NOT has_approval THEN
        RAISE EXCEPTION 'publish stage requires recorded approved approval evidence';
      END IF;

      SELECT EXISTS (
        SELECT 1
        FROM public.render_quality_reviews r
        WHERE r.job_id = NEW.id
          AND r.publish_ready = true
          AND r.quality_score >= 85
          AND r.originality_score >= 85
          AND r.clarity_score >= 80
          AND r.retention_prediction_score >= 80
          AND r.craft_score >= 80
      ) INTO has_quality_gate;

      IF NOT has_quality_gate THEN
        RAISE EXCEPTION 'publish stage requires high-quality render evidence (quality/originality >= 85, clarity/retention prediction/craft >= 80, publish-ready=true)';
      END IF;

      SELECT EXISTS (
        SELECT 1
        FROM public.rights_compliance_reviews rr
        WHERE rr.job_id = NEW.id
          AND rr.publish_allowed = true
          AND rr.music_rights_ok = true
          AND rr.image_rights_ok = true
          AND rr.clip_rights_ok = true
          AND rr.policy_safety_ok = true
      ) INTO has_rights_gate;

      IF NOT has_rights_gate THEN
        RAISE EXCEPTION 'publish stage requires rights/compliance evidence (no rights, no publish)';
      END IF;

      SELECT EXISTS (
        SELECT 1
        FROM public.continuity_checks cc
        WHERE cc.job_id = NEW.id
          AND cc.publish_ready = true
          AND cc.continuity_score >= 85
      ) INTO has_continuity_gate;

      IF NOT has_continuity_gate THEN
        RAISE EXCEPTION 'publish stage requires continuity Bible evidence with continuity_score >= 85';
      END IF;
    END IF;

    IF NEW.stage = 'done' THEN
      SELECT EXISTS (
        SELECT 1
        FROM public.publish_items p
        WHERE p.job_id = NEW.id
          AND p.status = 'published'
          AND p.published_at IS NOT NULL
      ) INTO has_publication;

      IF NOT has_publication THEN
        RAISE EXCEPTION 'done stage requires trusted external publication confirmation';
      END IF;
    END IF;
  END IF;

  INSERT INTO public.activity (
    project_id,
    job_id,
    actor,
    action,
    category,
    detail
  ) VALUES (
    NEW.project_id,
    NEW.id,
    'Headquarters control plane',
    format('advanced job from %s to %s', OLD.stage, NEW.stage),
    'system',
    CASE
      WHEN NEW.stage = 'publish' THEN 'Approval, quality, rights, and continuity evidence verified before publish stage.'
      WHEN NEW.stage = 'done' THEN 'External publication evidence verified before completion.'
      ELSE 'Sequential stage transition recorded by database trigger.'
    END
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS jobs_stage_evidence ON public.jobs;
CREATE TRIGGER jobs_stage_evidence
BEFORE INSERT OR UPDATE OF stage ON public.jobs
FOR EACH ROW
EXECUTE FUNCTION public.enforce_job_stage_evidence();

INSERT INTO public.house_strategy_profiles (
  id,
  label,
  monetization_priority,
  rollout_phase,
  monetization_notes,
  safety_rule,
  focus_categories,
  output_formats,
  promotion_channels,
  generator_priority,
  audio_system_profile,
  success_targets
)
VALUES (
  'adult-house',
  'Adult AI House',
  7,
  3,
  'Age-gated adult catalog with continuity and compliance controls before distribution.',
  'Strictly 18+ segmentation, legal policy compliance by region, and continuity Bible enforcement for all outputs.',
  ARRAY['adult visual stories', 'adult shorts', 'adult character continuity', 'adult dialogue scenes'],
  ARRAY['clips', 'reels', 'long-form'],
  ARRAY['youtube', 'instagram', 'facebook', 'x'],
  jsonb_build_object('ordering', ARRAY['free', 'cheapest-paid'], 'enrollment_hub', 'social-promotion-hub', 'gated', true),
  jsonb_build_object('required', true, 'mode', 'narration+music-bed+foley', 'rights', 'adult-rights-required'),
  jsonb_build_object('ad_friendly_rate_target', 0.6, 'weekly_long_form_target', 1, 'weekly_short_form_target', 10)
)
ON CONFLICT (id) DO UPDATE
SET
  label = EXCLUDED.label,
  monetization_priority = EXCLUDED.monetization_priority,
  rollout_phase = EXCLUDED.rollout_phase,
  monetization_notes = EXCLUDED.monetization_notes,
  safety_rule = EXCLUDED.safety_rule,
  focus_categories = EXCLUDED.focus_categories,
  output_formats = EXCLUDED.output_formats,
  promotion_channels = EXCLUDED.promotion_channels,
  generator_priority = EXCLUDED.generator_priority,
  audio_system_profile = EXCLUDED.audio_system_profile,
  success_targets = EXCLUDED.success_targets;

UPDATE public.factory_lanes AS existing
SET position = lanes.lane_position
FROM (
  VALUES ('Adult AI House', 36)
) AS lanes(lane_name, lane_position)
WHERE existing.name = lanes.lane_name;

INSERT INTO public.factory_lanes (name, position)
SELECT lane_name, lane_position
FROM (
  VALUES ('Adult AI House', 36)
) AS lanes(lane_name, lane_position)
WHERE NOT EXISTS (
  SELECT 1 FROM public.factory_lanes existing WHERE existing.name = lanes.lane_name
);

INSERT INTO public.continuity_bibles (id, label, house_id, canon, style_rules, blocked_topics)
VALUES
  (
    'moonshadow-master-bible',
    'Moonshadow Master Continuity Bible',
    NULL,
    jsonb_build_object('version', 1, 'scope', 'global', 'rule', 'All houses inherit baseline continuity'),
    ARRAY['No contradiction with established canon.', 'Character identity, timeline, and lore must stay consistent.'],
    ARRAY['Contradictory canon rewrites without explicit revision']
  ),
  (
    'adult-house-bible',
    'Adult AI House Continuity Bible',
    'adult-house',
    jsonb_build_object('version', 1, 'scope', 'adult-house', 'rule', 'Adult house keeps separate age-gated canon with explicit continuity checks'),
    ARRAY['Keep continuity of recurring characters and scenes.', 'Maintain age-gated metadata and rights records for every output.'],
    ARRAY['Cross-posting adult assets into kids/family-safe lanes']
  )
ON CONFLICT (id) DO UPDATE
SET
  label = EXCLUDED.label,
  house_id = EXCLUDED.house_id,
  canon = EXCLUDED.canon,
  style_rules = EXCLUDED.style_rules,
  blocked_topics = EXCLUDED.blocked_topics;

INSERT INTO public.social_autopilot_playbooks (
  id,
  house_id,
  label,
  transformations,
  hashtag_policy,
  hook_policy,
  active
)
VALUES
  (
    'playbook-default-viral',
    'technology-house',
    'Default Viral Playbook',
    jsonb_build_object('youtube_long', true, 'shorts', true, 'reels', true, 'tiktok', true, 'x_clip', true),
    jsonb_build_object('pack_count', 3, 'max_tags', 12),
    jsonb_build_object('hook_variants', 5, 'style', 'problem-solution-curiosity'),
    true
  ),
  (
    'playbook-adult-house',
    'adult-house',
    'Adult House Continuity Playbook',
    jsonb_build_object('youtube_long', true, 'shorts', true, 'reels', true, 'facebook', true, 'x_clip', true),
    jsonb_build_object('pack_count', 2, 'max_tags', 10),
    jsonb_build_object('hook_variants', 4, 'style', 'story-continuity-tease'),
    true
  )
ON CONFLICT (id) DO UPDATE
SET
  house_id = EXCLUDED.house_id,
  label = EXCLUDED.label,
  transformations = EXCLUDED.transformations,
  hashtag_policy = EXCLUDED.hashtag_policy,
  hook_policy = EXCLUDED.hook_policy,
  active = EXCLUDED.active;

INSERT INTO public.connections (id, name, category, status, detail)
VALUES
  ('adult-ai-hub', 'Adult AI Hub', 'ai', 'needs-auth', 'Isolated 18+ tools lane for adult text/image/video workflows with continuity and rights gating.'),
  ('adult-text-engine', 'Adult Text Engine', 'ai', 'development', 'Adult-focused text generation lane (age-gated) integrated with continuity Bible checks.'),
  ('adult-image-engine', 'Adult Image Engine', 'ai', 'development', 'Adult-focused image generation lane (age-gated) integrated with continuity Bible checks.'),
  ('youtube-adult-house', 'YouTube — Adult AI House', 'publishing', 'needs-auth', 'Path-routed house-level YouTube publishing route for Adult AI House with continuity and rights checks.'),
  ('instagram-adult-house', 'Instagram — Adult AI House', 'publishing', 'needs-auth', 'Path-routed house-level Instagram promotion route for Adult AI House with continuity checks.'),
  ('facebook-adult-house', 'Facebook — Adult AI House', 'publishing', 'needs-auth', 'Path-routed house-level Facebook promotion route for Adult AI House continuity rollouts.'),
  ('tiktok-adult-house', 'TikTok — Adult AI House', 'publishing', 'needs-auth', 'Path-routed house-level TikTok promotion route for Adult AI House with continuity checks.'),
  ('x-adult-house', 'X — Adult AI House', 'publishing', 'needs-auth', 'Path-routed house-level X promotion route for Adult AI House with continuity checks.')
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  status = CASE
    WHEN public.connections.status IN ('connected', 'ready-to-connect', 'development') THEN public.connections.status
    ELSE EXCLUDED.status
  END,
  detail = CASE
    WHEN public.connections.status IN ('connected', 'ready-to-connect', 'development')
      AND public.connections.detail IS NOT NULL
      AND btrim(public.connections.detail) <> ''
    THEN public.connections.detail
    ELSE EXCLUDED.detail
  END;

COMMENT ON TABLE public.continuity_bibles IS
  'Canonical continuity records ("the Bible") used by all houses and lanes.';

COMMENT ON TABLE public.continuity_checks IS
  'Per-job continuity gate evidence required before publish.';

COMMENT ON TABLE public.hook_labs IS
  'High-impact add-on #1: testable hook variant workspace tied to retention predictions.';

COMMENT ON TABLE public.thumbnail_duels IS
  'High-impact add-on #2: thumbnail variant duels with winner signal.';

COMMENT ON TABLE public.social_autopilot_playbooks IS
  'High-impact add-on #3: compact playbook presets for social promotion autopilot.';
