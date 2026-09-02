/*
  Harden Moonshadow Dock authorization.

  The original Dock migration allowed anon + authenticated CRUD. Dock is part
  of the Headquarters control plane, so only authenticated users with the
  server-controlled app_metadata.hq_role of owner/operator may read or mutate
  these tables. public.has_headquarters_access() is defined by the preceding
  Headquarters authorization migration.
*/

ALTER TABLE public.dock_machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dock_handoffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dock_connection_tests ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.dock_machines FROM anon;
REVOKE ALL ON TABLE public.dock_handoffs FROM anon;
REVOKE ALL ON TABLE public.dock_connection_tests FROM anon;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'dock_machines',
    'dock_handoffs',
    'dock_connection_tests'
  ] LOOP
    -- Remove the permissive policies created by the original Dock migration.
    EXECUTE format('DROP POLICY IF EXISTS "anon_select_%s" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "anon_insert_%s" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "anon_update_%s" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "anon_delete_%s" ON public.%I', t, t);

    -- Remove any older authenticated policy names before installing the
    -- Headquarters role-aware policies.
    EXECUTE format('DROP POLICY IF EXISTS "authenticated_select_%s" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "authenticated_insert_%s" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "authenticated_update_%s" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "authenticated_delete_%s" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "hq_select_%s" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "hq_insert_%s" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "hq_update_%s" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "hq_delete_%s" ON public.%I', t, t);

    EXECUTE format(
      'CREATE POLICY "hq_select_%s" ON public.%I FOR SELECT TO authenticated USING (public.has_headquarters_access())',
      t,
      t
    );
    EXECUTE format(
      'CREATE POLICY "hq_insert_%s" ON public.%I FOR INSERT TO authenticated WITH CHECK (public.has_headquarters_access())',
      t,
      t
    );
    EXECUTE format(
      'CREATE POLICY "hq_update_%s" ON public.%I FOR UPDATE TO authenticated USING (public.has_headquarters_access()) WITH CHECK (public.has_headquarters_access())',
      t,
      t
    );
    EXECUTE format(
      'CREATE POLICY "hq_delete_%s" ON public.%I FOR DELETE TO authenticated USING (public.has_headquarters_access())',
      t,
      t
    );
  END LOOP;
END $$;
