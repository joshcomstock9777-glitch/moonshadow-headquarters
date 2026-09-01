/*
  Enforce atomic Content Factory lane configuration.

  Headquarters already exposes replace_factory_lanes(text[]) as the validated
  control-plane mutation. Direct browser INSERT/UPDATE/DELETE policies allowed
  clients to bypass that atomic replacement path and leave partial or malformed
  lane ordering behind. Keep browser reads, but route all browser mutations
  through the single validated function.
*/

DROP POLICY IF EXISTS "hq_insert_factory_lanes" ON public.factory_lanes;
DROP POLICY IF EXISTS "hq_update_factory_lanes" ON public.factory_lanes;
DROP POLICY IF EXISTS "hq_delete_factory_lanes" ON public.factory_lanes;

CREATE OR REPLACE FUNCTION public.replace_factory_lanes(lane_names text[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lane_name text;
  lane_position integer := 0;
  normalized text[] := ARRAY[]::text[];
BEGIN
  IF NOT public.has_headquarters_access() THEN
    RAISE EXCEPTION 'Headquarters authorization required';
  END IF;

  IF lane_names IS NULL OR cardinality(lane_names) = 0 THEN
    RAISE EXCEPTION 'At least one factory lane is required';
  END IF;

  FOREACH lane_name IN ARRAY lane_names LOOP
    lane_name := trim(lane_name);
    IF lane_name = '' THEN
      RAISE EXCEPTION 'Factory lane names cannot be blank';
    END IF;
    IF lane_name = ANY(normalized) THEN
      RAISE EXCEPTION 'Factory lane names must be unique';
    END IF;
    normalized := array_append(normalized, lane_name);
  END LOOP;

  DELETE FROM public.factory_lanes;

  FOREACH lane_name IN ARRAY normalized LOOP
    INSERT INTO public.factory_lanes (name, position)
    VALUES (lane_name, lane_position);
    lane_position := lane_position + 1;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.replace_factory_lanes(text[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.replace_factory_lanes(text[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.replace_factory_lanes(text[]) TO authenticated;

COMMENT ON FUNCTION public.replace_factory_lanes(text[]) IS
  'Only browser mutation path for Content Factory lane configuration; validates authorization, non-empty unique names, and replaces the ordered set atomically.';
