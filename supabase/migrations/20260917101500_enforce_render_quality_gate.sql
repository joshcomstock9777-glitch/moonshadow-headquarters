/*
  Enforce a render quality gate before publication.

  Goal: prevent average/low-quality AI output from reaching publish state.
  Browser-authenticated operators must record a high-scoring quality review
  before a job can advance into publish.
*/

CREATE TABLE IF NOT EXISTS public.render_quality_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  quality_score integer NOT NULL CHECK (quality_score BETWEEN 0 AND 100),
  originality_score integer NOT NULL CHECK (originality_score BETWEEN 0 AND 100),
  clarity_score integer NOT NULL CHECK (clarity_score BETWEEN 0 AND 100),
  retention_prediction_score integer NOT NULL CHECK (retention_prediction_score BETWEEN 0 AND 100),
  craft_score integer NOT NULL CHECK (craft_score BETWEEN 0 AND 100),
  notes text,
  publish_ready boolean NOT NULL DEFAULT false,
  reviewed_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT render_quality_reviews_job_unique UNIQUE (job_id)
);

ALTER TABLE public.render_quality_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hq_select_render_quality_reviews" ON public.render_quality_reviews;
CREATE POLICY "hq_select_render_quality_reviews"
ON public.render_quality_reviews FOR SELECT TO authenticated
USING (public.has_headquarters_access());

DROP POLICY IF EXISTS "hq_insert_render_quality_reviews" ON public.render_quality_reviews;
CREATE POLICY "hq_insert_render_quality_reviews"
ON public.render_quality_reviews FOR INSERT TO authenticated
WITH CHECK (public.has_headquarters_access());

DROP POLICY IF EXISTS "hq_update_render_quality_reviews" ON public.render_quality_reviews;
CREATE POLICY "hq_update_render_quality_reviews"
ON public.render_quality_reviews FOR UPDATE TO authenticated
USING (public.has_headquarters_access())
WITH CHECK (public.has_headquarters_access());

DROP POLICY IF EXISTS "hq_delete_render_quality_reviews" ON public.render_quality_reviews;
CREATE POLICY "hq_delete_render_quality_reviews"
ON public.render_quality_reviews FOR DELETE TO authenticated
USING (public.has_headquarters_access());

CREATE OR REPLACE FUNCTION public.touch_render_quality_reviews_updated_at()
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

DROP TRIGGER IF EXISTS render_quality_reviews_touch ON public.render_quality_reviews;
CREATE TRIGGER render_quality_reviews_touch
BEFORE UPDATE ON public.render_quality_reviews
FOR EACH ROW EXECUTE FUNCTION public.touch_render_quality_reviews_updated_at();

CREATE OR REPLACE FUNCTION public.flag_failed_render_quality_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.publish_ready = false
     OR NEW.quality_score < 85
     OR NEW.originality_score < 85
     OR NEW.clarity_score < 80
     OR NEW.retention_prediction_score < 80
     OR NEW.craft_score < 80 THEN
    UPDATE public.jobs
    SET error = 'Quality gate failed. Concierge critic pass required with a fix plan before publish.'
    WHERE id = NEW.job_id;

    INSERT INTO public.activity (
      project_id,
      job_id,
      actor,
      action,
      category,
      detail
    ) VALUES (
      NEW.project_id,
      NEW.job_id,
      'AI Concierge',
      'generated quality fix plan request',
      'quality',
      'Quality gate failed. Return to concierge critic pass mode for targeted hook, pacing, clarity, retention, and craft fixes.'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS render_quality_reviews_flag_failed ON public.render_quality_reviews;
CREATE TRIGGER render_quality_reviews_flag_failed
AFTER INSERT OR UPDATE ON public.render_quality_reviews
FOR EACH ROW EXECUTE FUNCTION public.flag_failed_render_quality_review();

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
      WHEN NEW.stage = 'publish' THEN 'Approval and render-quality evidence verified before publish stage.'
      WHEN NEW.stage = 'done' THEN 'External publication evidence verified before completion.'
      ELSE 'Sequential stage transition recorded by database trigger.'
    END
  );

  RETURN NEW;
END;
$$;

COMMENT ON TABLE public.render_quality_reviews IS
  'High-standard render quality evidence required before browser-authenticated jobs may enter publish stage.';

COMMENT ON FUNCTION public.enforce_job_stage_evidence() IS
  'Fails closed on browser-manufactured job state: sequential transitions only, approval + high-quality render evidence required before publish, and trusted publication confirmation required before done.';
