/*
  Headquarters security hardening.

  The original HQ core migration intentionally granted anon CRUD across the
  control-plane tables. Headquarters now has a Supabase Auth gate, so control
  data must require an authenticated JWT. The public landing/studio tables are
  not changed by this migration.
*/

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
    EXECUTE format('DROP POLICY IF EXISTS "anon_select_%s" ON %I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "anon_insert_%s" ON %I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "anon_update_%s" ON %I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "anon_delete_%s" ON %I', t, t);

    EXECUTE format('DROP POLICY IF EXISTS "authenticated_select_%s" ON %I', t, t);
    EXECUTE format('CREATE POLICY "authenticated_select_%s" ON %I FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL)', t, t);

    EXECUTE format('DROP POLICY IF EXISTS "authenticated_insert_%s" ON %I', t, t);
    EXECUTE format('CREATE POLICY "authenticated_insert_%s" ON %I FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL)', t, t);

    EXECUTE format('DROP POLICY IF EXISTS "authenticated_update_%s" ON %I', t, t);
    EXECUTE format('CREATE POLICY "authenticated_update_%s" ON %I FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL)', t, t);

    EXECUTE format('DROP POLICY IF EXISTS "authenticated_delete_%s" ON %I', t, t);
    EXECUTE format('CREATE POLICY "authenticated_delete_%s" ON %I FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL)', t, t);
  END LOOP;
END $$;
