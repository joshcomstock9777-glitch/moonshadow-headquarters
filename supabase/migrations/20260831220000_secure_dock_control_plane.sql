/*
  Extend Headquarters authorization to the Dock control plane.

  Dock stores machine configuration, handoff payloads, test responses, and
  health evidence. Those records must follow the same server-issued
  app_metadata.hq_role boundary as the rest of Headquarters.
*/

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'dock_machines',
    'dock_handoffs',
    'dock_connection_tests'
  ] LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      RAISE NOTICE 'Skipping missing Dock table: %', t;
      CONTINUE;
    END IF;

    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);

    EXECUTE format('DROP POLICY IF EXISTS "anon_select_%s" ON %I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "anon_insert_%s" ON %I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "anon_update_%s" ON %I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "anon_delete_%s" ON %I', t, t);

    EXECUTE format('DROP POLICY IF EXISTS "authenticated_select_%s" ON %I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "authenticated_insert_%s" ON %I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "authenticated_update_%s" ON %I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "authenticated_delete_%s" ON %I', t, t);

    EXECUTE format('DROP POLICY IF EXISTS "hq_select_%s" ON %I', t, t);
    EXECUTE format('CREATE POLICY "hq_select_%s" ON %I FOR SELECT TO authenticated USING (public.has_headquarters_access())', t, t);

    EXECUTE format('DROP POLICY IF EXISTS "hq_insert_%s" ON %I', t, t);
    EXECUTE format('CREATE POLICY "hq_insert_%s" ON %I FOR INSERT TO authenticated WITH CHECK (public.has_headquarters_access())', t, t);

    EXECUTE format('DROP POLICY IF EXISTS "hq_update_%s" ON %I', t, t);
    EXECUTE format('CREATE POLICY "hq_update_%s" ON %I FOR UPDATE TO authenticated USING (public.has_headquarters_access()) WITH CHECK (public.has_headquarters_access())', t, t);

    EXECUTE format('DROP POLICY IF EXISTS "hq_delete_%s" ON %I', t, t);
    EXECUTE format('CREATE POLICY "hq_delete_%s" ON %I FOR DELETE TO authenticated USING (public.has_headquarters_access())', t, t);
  END LOOP;
END $$;
