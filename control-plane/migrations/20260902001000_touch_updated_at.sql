-- Follow-on to 20260902000000_control_plane_schema_baseline.sql
-- Project: gnjwipcbckiwyeiwczst
--
-- The baseline is a verified live snapshot. It has no triggers.
-- This file is the deliberate behavior change: keep updated_at current
-- on machines and workers. Do not fold this back into the baseline.
--
-- Not applied to production by landing in this repo. Review, then run
-- against the control-plane database only — never against
-- moonshadow-headquarters (pxmwpqhpdbooxzhcfndh). That project already
-- has public.jobs with a different shape.

CREATE OR REPLACE FUNCTION public.touch_control_plane_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS machines_touch_updated_at ON public.machines;
CREATE TRIGGER machines_touch_updated_at
  BEFORE UPDATE ON public.machines
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_control_plane_updated_at();

DROP TRIGGER IF EXISTS workers_touch_updated_at ON public.workers;
CREATE TRIGGER workers_touch_updated_at
  BEFORE UPDATE ON public.workers
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_control_plane_updated_at();
