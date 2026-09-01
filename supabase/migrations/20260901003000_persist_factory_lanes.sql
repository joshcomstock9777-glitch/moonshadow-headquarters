/*
  Persist Content Factory lane configuration in the Headquarters control plane.

  Browser localStorage is not shared operational state. This table and atomic
  replacement function make lane configuration durable, role-gated, and
  available to every authorized Headquarters session.
*/

CREATE TABLE IF NOT EXISTS public.factory_lanes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE CHECK (length(trim(name)) > 0),
  position integer NOT NULL CHECK (position >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.factory_lanes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hq_select_factory_lanes" ON public.factory_lanes;
CREATE POLICY "hq_select_factory_lanes"
ON public.factory_lanes FOR SELECT TO authenticated
USING (public.has_headquarters_access());

DROP POLICY IF EXISTS "hq_insert_factory_lanes" ON public.factory_lanes;
CREATE POLICY "hq_insert_factory_lanes"
ON public.factory_lanes FOR INSERT TO authenticated
WITH CHECK (public.has_headquarters_access());

DROP POLICY IF EXISTS "hq_update_factory_lanes" ON public.factory_lanes;
CREATE POLICY "hq_update_factory_lanes"
ON public.factory_lanes FOR UPDATE TO authenticated
USING (public.has_headquarters_access())
WITH CHECK (public.has_headquarters_access());

DROP POLICY IF EXISTS "hq_delete_factory_lanes" ON public.factory_lanes;
CREATE POLICY "hq_delete_factory_lanes"
ON public.factory_lanes FOR DELETE TO authenticated
USING (public.has_headquarters_access());

INSERT INTO public.factory_lanes (name, position)
VALUES
  ('Short Film', 0),
  ('Story', 1),
  ('Channel Piece', 2),
  ('Social Clip', 3)
ON CONFLICT (name) DO NOTHING;

CREATE OR REPLACE FUNCTION public.replace_factory_lanes(lane_names text[])
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
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
GRANT EXECUTE ON FUNCTION public.replace_factory_lanes(text[]) TO authenticated;
