/*
  Roundtable evidence hardening.

  Headquarters currently records real Moonshadow Path replies from the browser.
  Those rows are useful, but browser-authenticated clients must not be able to
  assert that Path evidence has been independently verified. Only trusted
  backend/service-role reconciliation may set path_evidence_verified = true.
*/

ALTER TABLE public.roundtable_messages
  ADD COLUMN IF NOT EXISTS path_evidence_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS path_evidence_verified_at timestamptz;

ALTER TABLE public.roundtable_messages
  DROP CONSTRAINT IF EXISTS roundtable_path_verification_consistency;

ALTER TABLE public.roundtable_messages
  ADD CONSTRAINT roundtable_path_verification_consistency CHECK (
    (path_evidence_verified = false AND path_evidence_verified_at IS NULL)
    OR
    (
      path_evidence_verified = true
      AND path_evidence_verified_at IS NOT NULL
      AND path_session_id IS NOT NULL
      AND path_correlation_id IS NOT NULL
      AND path_target IS NOT NULL
      AND role <> 'creator'
    )
  );

CREATE OR REPLACE FUNCTION public.guard_roundtable_path_verification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'authenticated' THEN
    IF NEW.path_evidence_verified IS DISTINCT FROM false
       OR NEW.path_evidence_verified_at IS NOT NULL THEN
      RAISE EXCEPTION 'Roundtable Path verification is backend-controlled';
    END IF;

    IF TG_OP = 'UPDATE'
       AND (
         NEW.path_evidence_verified IS DISTINCT FROM OLD.path_evidence_verified
         OR NEW.path_evidence_verified_at IS DISTINCT FROM OLD.path_evidence_verified_at
       ) THEN
      RAISE EXCEPTION 'Roundtable Path verification is backend-controlled';
    END IF;
  END IF;

  IF NEW.role = 'creator' AND (
    NEW.path_session_id IS NOT NULL
    OR NEW.path_correlation_id IS NOT NULL
    OR NEW.path_target IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Creator messages cannot carry Path worker evidence';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_roundtable_path_verification ON public.roundtable_messages;
CREATE TRIGGER guard_roundtable_path_verification
BEFORE INSERT OR UPDATE ON public.roundtable_messages
FOR EACH ROW EXECUTE FUNCTION public.guard_roundtable_path_verification();

COMMENT ON COLUMN public.roundtable_messages.path_evidence_verified IS
  'True only after trusted backend/service-role reconciliation confirms the recorded Path session evidence.';
COMMENT ON COLUMN public.roundtable_messages.path_evidence_verified_at IS
  'Timestamp of trusted backend verification. Browser clients cannot set this field.';
