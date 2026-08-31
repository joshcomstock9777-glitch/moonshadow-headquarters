/*
  Headquarters authorization hardening.

  Authentication is necessary but not sufficient for the control plane. Only
  users whose server-controlled app_metadata.hq_role is "owner" or "operator"
  may read or mutate Headquarters control-plane tables.

  app_metadata is used deliberately: unlike user_metadata, clients cannot
  self-assign it through normal Supabase Auth profile updates.
*/

CREATE OR REPLACE FUNCTION public.has_headquarters_access()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COALESCE((auth.jwt() -> 'app_metadata' ->> 'hq_role') IN ('owner', 'operator'), false);
$$;

REVOKE ALL ON FUNCTION public.has_headquarters_access() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_headquarters_access() TO authenticated;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'projects',
    'jobs',
    'assets',
    'activity',
    'roundtable_messages',
    'approvals',
    'publish_items',
    'connections'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "authenticated_select_%s" ON %I', t, t);
    EXECUTE format('CREATE POLICY "hq_select_%s" ON %I FOR SELECT TO authenticated USING (public.has_headquarters_access())', t, t);

    EXECUTE format('DROP POLICY IF EXISTS "authenticated_insert_%s" ON %I', t, t);
    EXECUTE format('CREATE POLICY "hq_insert_%s" ON %I FOR INSERT TO authenticated WITH CHECK (public.has_headquarters_access())', t, t);

    EXECUTE format('DROP POLICY IF EXISTS "authenticated_update_%s" ON %I', t, t);
    EXECUTE format('CREATE POLICY "hq_update_%s" ON %I FOR UPDATE TO authenticated USING (public.has_headquarters_access()) WITH CHECK (public.has_headquarters_access())', t, t);

    EXECUTE format('DROP POLICY IF EXISTS "authenticated_delete_%s" ON %I', t, t);
    EXECUTE format('CREATE POLICY "hq_delete_%s" ON %I FOR DELETE TO authenticated USING (public.has_headquarters_access())', t, t);
  END LOOP;
END $$;
