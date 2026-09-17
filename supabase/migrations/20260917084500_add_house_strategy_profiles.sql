/*
  House strategy profiles for monetization-first studio operations.
  Includes baseline house set plus Kids and Music Video expansions.
*/

CREATE TABLE IF NOT EXISTS public.house_strategy_profiles (
  id text PRIMARY KEY,
  label text NOT NULL,
  monetization_priority integer NOT NULL CHECK (monetization_priority > 0),
  rollout_phase integer NOT NULL CHECK (rollout_phase > 0),
  monetization_notes text NOT NULL,
  safety_rule text NOT NULL,
  focus_categories text[] NOT NULL DEFAULT '{}',
  output_formats text[] NOT NULL DEFAULT '{}',
  promotion_channels text[] NOT NULL DEFAULT '{}',
  generator_priority jsonb NOT NULL DEFAULT '{}'::jsonb,
  audio_system_profile jsonb NOT NULL DEFAULT '{}'::jsonb,
  success_targets jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.house_strategy_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hq_select_house_strategy_profiles" ON public.house_strategy_profiles;
CREATE POLICY "hq_select_house_strategy_profiles"
ON public.house_strategy_profiles FOR SELECT TO authenticated
USING (public.has_headquarters_access());

DROP POLICY IF EXISTS "hq_insert_house_strategy_profiles" ON public.house_strategy_profiles;
CREATE POLICY "hq_insert_house_strategy_profiles"
ON public.house_strategy_profiles FOR INSERT TO authenticated
WITH CHECK (public.has_headquarters_access());

DROP POLICY IF EXISTS "hq_update_house_strategy_profiles" ON public.house_strategy_profiles;
CREATE POLICY "hq_update_house_strategy_profiles"
ON public.house_strategy_profiles FOR UPDATE TO authenticated
USING (public.has_headquarters_access())
WITH CHECK (public.has_headquarters_access());

DROP POLICY IF EXISTS "hq_delete_house_strategy_profiles" ON public.house_strategy_profiles;
CREATE POLICY "hq_delete_house_strategy_profiles"
ON public.house_strategy_profiles FOR DELETE TO authenticated
USING (public.has_headquarters_access());

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
VALUES
  (
    'financial-house',
    'Financial House',
    1,
    1,
    'Highest expected CPM/RPM baseline; prioritize ad-friendly educational finance content and fraud prevention tracks.',
    'Keep compliance-safe language and avoid misleading claims; fraud coverage must be factual and evidence-backed.',
    ARRAY['personal finance basics', 'fraud prevention', 'scam breakdowns', 'side-hustle systems', 'business breakdowns'],
    ARRAY['clips', 'reels', 'long-form'],
    ARRAY['youtube', 'instagram', 'facebook', 'tiktok', 'x'],
    jsonb_build_object('ordering', ARRAY['free', 'cheapest-paid'], 'enrollment_hub', 'social-promotion-hub'),
    jsonb_build_object('required', true, 'mode', 'voiceover+music-bed', 'rights', 'royalty-safe'),
    jsonb_build_object('ad_friendly_rate_target', 0.95, 'weekly_long_form_target', 2, 'weekly_short_form_target', 12)
  ),
  (
    'technology-house',
    'Technology House',
    2,
    1,
    'Strong monetization category with software, AI, and workflow content; prioritize sponsor-safe explainers and tutorials.',
    'No fabricated benchmarks; tool comparisons must clearly identify assumptions and data limits.',
    ARRAY['ai tutorials', 'automation workflows', 'product explainers', 'tool comparisons'],
    ARRAY['clips', 'reels', 'long-form'],
    ARRAY['youtube', 'instagram', 'facebook', 'tiktok', 'x'],
    jsonb_build_object('ordering', ARRAY['free', 'cheapest-paid'], 'enrollment_hub', 'social-promotion-hub'),
    jsonb_build_object('required', true, 'mode', 'voiceover+music-bed', 'rights', 'royalty-safe'),
    jsonb_build_object('ad_friendly_rate_target', 0.92, 'weekly_long_form_target', 2, 'weekly_short_form_target', 10)
  ),
  (
    'comedy-house',
    'Comedy House',
    3,
    2,
    'Fast growth via short-form volume; convert winners into longer episodic formats.',
    'Avoid explicit NSFW if monetization is primary; keep promotion-safe edits for social feeds.',
    ARRAY['sketches', 'reactions', 'meme edits', 'character shorts'],
    ARRAY['clips', 'reels', 'long-form'],
    ARRAY['youtube', 'instagram', 'facebook', 'tiktok', 'x'],
    jsonb_build_object('ordering', ARRAY['free', 'cheapest-paid'], 'enrollment_hub', 'social-promotion-hub'),
    jsonb_build_object('required', true, 'mode', 'dialog+stings', 'rights', 'royalty-safe'),
    jsonb_build_object('ad_friendly_rate_target', 0.9, 'weekly_long_form_target', 1, 'weekly_short_form_target', 16)
  ),
  (
    'horror-house',
    'Horror House',
    4,
    2,
    'Narrative-driven growth category; maintain ad-safe edits for monetized distribution while preserving core creative tone.',
    'Maintain ad-friendly versions for publish paths; avoid explicit NSFW cuts on monetized channels.',
    ARRAY['story episodes', 'lore explainers', 'cinematic shorts', 'found-footage series'],
    ARRAY['clips', 'reels', 'long-form'],
    ARRAY['youtube', 'instagram', 'facebook', 'tiktok', 'x'],
    jsonb_build_object('ordering', ARRAY['free', 'cheapest-paid'], 'enrollment_hub', 'social-promotion-hub'),
    jsonb_build_object('required', true, 'mode', 'atmo+sfx+score', 'rights', 'royalty-safe'),
    jsonb_build_object('ad_friendly_rate_target', 0.85, 'weekly_long_form_target', 1, 'weekly_short_form_target', 10)
  ),
  (
    'kids-house',
    'Kids House',
    5,
    2,
    'Family-safe catalog growth focus; prioritize evergreen educational loops and music-backed episodes.',
    'Strictly child-safe and policy-safe content for every output and promo surface.',
    ARRAY['educational stories', 'singalong loops', 'character learning segments', 'family-safe shorts'],
    ARRAY['clips', 'reels', 'long-form'],
    ARRAY['youtube', 'instagram', 'facebook', 'tiktok'],
    jsonb_build_object('ordering', ARRAY['free', 'cheapest-paid'], 'enrollment_hub', 'social-promotion-hub'),
    jsonb_build_object('required', true, 'mode', 'narration+children-safe-music', 'rights', 'strict-child-safe'),
    jsonb_build_object('ad_friendly_rate_target', 0.99, 'weekly_long_form_target', 2, 'weekly_short_form_target', 14)
  ),
  (
    'music-video-house',
    'Music Video House',
    6,
    2,
    'Build reusable audio-visual catalog and promote clips/reels from full tracks.',
    'Ensure rights-safe music and metadata before any social promotion publish call.',
    ARRAY['music videos', 'lyric clips', 'visualizer loops', 'live-session edits'],
    ARRAY['clips', 'reels', 'long-form'],
    ARRAY['youtube', 'instagram', 'facebook', 'tiktok', 'x'],
    jsonb_build_object('ordering', ARRAY['free', 'cheapest-paid'], 'enrollment_hub', 'social-promotion-hub'),
    jsonb_build_object('required', true, 'mode', 'full-mix+stems+master', 'rights', 'music-rights-required'),
    jsonb_build_object('ad_friendly_rate_target', 0.93, 'weekly_long_form_target', 1, 'weekly_short_form_target', 12)
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

INSERT INTO public.factory_lanes (name, position)
SELECT lane_name, lane_position
FROM (
  VALUES
    ('Comedy House', 30),
    ('Horror House', 31),
    ('Technology House', 32),
    ('Financial House', 33),
    ('Kids House', 34),
    ('Music Video House', 35)
) AS lanes(lane_name, lane_position)
ON CONFLICT (name) DO UPDATE
SET position = EXCLUDED.position;
