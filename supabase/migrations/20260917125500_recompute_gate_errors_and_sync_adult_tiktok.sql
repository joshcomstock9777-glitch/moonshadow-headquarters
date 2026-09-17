/*
  Keep jobs.error aligned with all publish gates together.
  Also ensure Adult AI TikTok publishing connection exists for path-routed metadata.
*/

CREATE OR REPLACE FUNCTION public.recompute_publish_gate_error(job_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  gate_error text;
BEGIN
  SELECT CASE
    WHEN EXISTS (
      SELECT 1
      FROM public.render_quality_reviews r
      WHERE r.job_id = job_uuid
        AND (
          r.publish_ready = false
          OR r.quality_score < 85
          OR r.originality_score < 85
          OR r.clarity_score < 80
          OR r.retention_prediction_score < 80
          OR r.craft_score < 80
        )
    ) THEN 'Quality gate failed. Concierge critic pass required with a fix plan before publish.'
    WHEN EXISTS (
      SELECT 1
      FROM public.rights_compliance_reviews rr
      WHERE rr.job_id = job_uuid
        AND (
          rr.publish_allowed = false
          OR rr.music_rights_ok = false
          OR rr.image_rights_ok = false
          OR rr.clip_rights_ok = false
          OR rr.policy_safety_ok = false
        )
    ) THEN 'Rights/compliance gate failed. No rights, no publish.'
    WHEN EXISTS (
      SELECT 1
      FROM public.continuity_checks cc
      WHERE cc.job_id = job_uuid
        AND (
          cc.publish_ready = false
          OR cc.continuity_score < 85
        )
    ) THEN 'Continuity gate failed. Update against continuity Bible before publish.'
    ELSE NULL
  END
  INTO gate_error;

  UPDATE public.jobs
  SET error = gate_error
  WHERE id = job_uuid
    AND (error IS DISTINCT FROM gate_error);
END;
$$;

DROP TRIGGER IF EXISTS render_quality_reviews_flag_failed ON public.render_quality_reviews;
DROP TRIGGER IF EXISTS rights_compliance_reviews_flag_failed ON public.rights_compliance_reviews;
DROP TRIGGER IF EXISTS continuity_checks_flag_failed ON public.continuity_checks;

DROP FUNCTION IF EXISTS public.flag_failed_render_quality_review();
DROP FUNCTION IF EXISTS public.flag_failed_rights_compliance_review();
DROP FUNCTION IF EXISTS public.flag_failed_continuity_check();

CREATE FUNCTION public.flag_failed_render_quality_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  target_job_id uuid;
BEGIN
  target_job_id := coalesce(NEW.job_id, OLD.job_id);
  PERFORM public.recompute_publish_gate_error(target_job_id);

  IF TG_OP <> 'DELETE'
     AND (
       NEW.publish_ready = false
       OR NEW.quality_score < 85
       OR NEW.originality_score < 85
       OR NEW.clarity_score < 80
       OR NEW.retention_prediction_score < 80
       OR NEW.craft_score < 80
     ) THEN
    IF TG_OP = 'INSERT'
       OR (
         OLD.publish_ready = true
         AND OLD.quality_score >= 85
         AND OLD.originality_score >= 85
         AND OLD.clarity_score >= 80
         AND OLD.retention_prediction_score >= 80
         AND OLD.craft_score >= 80
       ) THEN
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
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER render_quality_reviews_flag_failed
AFTER INSERT OR UPDATE OR DELETE ON public.render_quality_reviews
FOR EACH ROW EXECUTE FUNCTION public.flag_failed_render_quality_review();

CREATE FUNCTION public.flag_failed_rights_compliance_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  target_job_id uuid;
BEGIN
  target_job_id := coalesce(NEW.job_id, OLD.job_id);
  PERFORM public.recompute_publish_gate_error(target_job_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER rights_compliance_reviews_flag_failed
AFTER INSERT OR UPDATE OR DELETE ON public.rights_compliance_reviews
FOR EACH ROW EXECUTE FUNCTION public.flag_failed_rights_compliance_review();

CREATE FUNCTION public.flag_failed_continuity_check()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  target_job_id uuid;
BEGIN
  target_job_id := coalesce(NEW.job_id, OLD.job_id);
  PERFORM public.recompute_publish_gate_error(target_job_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER continuity_checks_flag_failed
AFTER INSERT OR UPDATE OR DELETE ON public.continuity_checks
FOR EACH ROW EXECUTE FUNCTION public.flag_failed_continuity_check();

INSERT INTO public.connections (id, name, category, status, detail)
VALUES (
  'tiktok-adult-house',
  'TikTok — Adult AI House',
  'publishing',
  'needs-auth',
  'Path-routed house-level TikTok promotion route for Adult AI House with continuity checks.'
)
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

COMMENT ON FUNCTION public.recompute_publish_gate_error(uuid) IS
  'Recomputes a job-level blocked error message using quality, rights, and continuity publish gates together.';
