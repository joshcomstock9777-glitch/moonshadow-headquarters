-- Keep control-plane heartbeat metadata honest.
--
-- The live schema baseline reconstructed on 2026-09-02 showed that machines
-- and workers have updated_at columns but no triggers. Without a trigger,
-- updates can leave updated_at stale and make Dock/health evidence misleading.
--
-- This migration is idempotent and contains no secrets or row data.

CREATE OR REPLACE FUNCTION public.control_plane_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS machines_touch_updated_at ON public.machines;
CREATE TRIGGER machines_touch_updated_at
BEFORE UPDATE ON public.machines
FOR EACH ROW
EXECUTE FUNCTION public.control_plane_touch_updated_at();

DROP TRIGGER IF EXISTS workers_touch_updated_at ON public.workers;
CREATE TRIGGER workers_touch_updated_at
BEFORE UPDATE ON public.workers
FOR EACH ROW
EXECUTE FUNCTION public.control_plane_touch_updated_at();
