-- Make Headquarters approval decisions explicit, attributable, and terminal.
-- Service-role requests bypass this trigger so trusted server workflows can perform
-- administrative reconciliation without exposing that power to browser clients.

ALTER TABLE approvals
  ADD COLUMN IF NOT EXISTS decided_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS decision_reason text;

CREATE INDEX IF NOT EXISTS idx_approvals_decided_by ON approvals(decided_by);

CREATE OR REPLACE FUNCTION enforce_approval_decision_evidence()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  requester_role text := coalesce(auth.role(), '');
BEGIN
  IF requester_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'pending' THEN
      RAISE EXCEPTION 'New approvals must start pending';
    END IF;
    NEW.decided_at := NULL;
    NEW.decided_by := NULL;
    RETURN NEW;
  END IF;

  IF OLD.status IN ('approved', 'rejected') THEN
    IF NEW.status IS DISTINCT FROM OLD.status
       OR NEW.decided_at IS DISTINCT FROM OLD.decided_at
       OR NEW.decided_by IS DISTINCT FROM OLD.decided_by
       OR NEW.decision_reason IS DISTINCT FROM OLD.decision_reason THEN
      RAISE EXCEPTION 'Terminal approval decisions cannot be rewritten by client sessions';
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.status = 'pending' AND NEW.status IN ('approved', 'rejected') THEN
    NEW.decided_at := now();
    NEW.decided_by := auth.uid();
    IF NEW.decided_by IS NULL THEN
      RAISE EXCEPTION 'Approval decisions require an authenticated user';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'Invalid approval status transition: % -> %', OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS approvals_decision_evidence ON approvals;
CREATE TRIGGER approvals_decision_evidence
BEFORE INSERT OR UPDATE ON approvals
FOR EACH ROW
EXECUTE FUNCTION enforce_approval_decision_evidence();

COMMENT ON COLUMN approvals.decided_by IS
  'Authenticated Headquarters user who made the terminal approval decision.';
COMMENT ON COLUMN approvals.decision_reason IS
  'Optional human-readable rationale preserved with the terminal decision.';
