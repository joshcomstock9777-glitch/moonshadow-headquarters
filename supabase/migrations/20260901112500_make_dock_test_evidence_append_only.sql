/*
  Preserve Dock connection-test history as audit evidence.

  Browser-authenticated Headquarters operators may read existing test evidence
  and append new real test results, but they must not be able to rewrite or
  delete an already-recorded response after the fact. Trusted server/service
  role maintenance remains possible because Supabase service_role bypasses RLS.

  This migration assumes public.has_headquarters_access() was introduced by
  the Headquarters role migration and that the Dock tables already exist.
*/

DO $$
BEGIN
  IF to_regclass('public.dock_connection_tests') IS NULL THEN
    RAISE NOTICE 'Skipping missing Dock table: dock_connection_tests';
    RETURN;
  END IF;

  ALTER TABLE public.dock_connection_tests ENABLE ROW LEVEL SECURITY;

  -- Remove any legacy broad authenticated/anonymous mutation paths that could
  -- allow historical test evidence to be rewritten or erased from the client.
  DROP POLICY IF EXISTS "anon_update_dock_connection_tests" ON public.dock_connection_tests;
  DROP POLICY IF EXISTS "anon_delete_dock_connection_tests" ON public.dock_connection_tests;
  DROP POLICY IF EXISTS "authenticated_update_dock_connection_tests" ON public.dock_connection_tests;
  DROP POLICY IF EXISTS "authenticated_delete_dock_connection_tests" ON public.dock_connection_tests;
  DROP POLICY IF EXISTS "hq_update_dock_connection_tests" ON public.dock_connection_tests;
  DROP POLICY IF EXISTS "hq_delete_dock_connection_tests" ON public.dock_connection_tests;

  -- Reassert the only client-side evidence permissions: authorized HQ users
  -- can inspect history and append a newly observed test result.
  DROP POLICY IF EXISTS "hq_select_dock_connection_tests" ON public.dock_connection_tests;
  CREATE POLICY "hq_select_dock_connection_tests"
    ON public.dock_connection_tests
    FOR SELECT TO authenticated
    USING (public.has_headquarters_access());

  DROP POLICY IF EXISTS "hq_insert_dock_connection_tests" ON public.dock_connection_tests;
  CREATE POLICY "hq_insert_dock_connection_tests"
    ON public.dock_connection_tests
    FOR INSERT TO authenticated
    WITH CHECK (public.has_headquarters_access());
END $$;
