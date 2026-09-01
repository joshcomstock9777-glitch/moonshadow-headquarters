/*
  External connection status is operational evidence, not browser-editable metadata.

  Headquarters surfaces `connections` read-only. A browser-authenticated owner/operator
  must not be able to manufacture `connected`, health, or credential-ready state by
  inserting, updating, or deleting rows directly. Trusted backend/service-role
  integration workers remain able to reconcile status because service-role access
  bypasses RLS.
*/

ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;

-- Remove historical broad browser mutation policies, including names used by
-- the original bootstrap and later auth/role-hardening migrations.
DROP POLICY IF EXISTS "anon_insert_connections" ON public.connections;
DROP POLICY IF EXISTS "anon_update_connections" ON public.connections;
DROP POLICY IF EXISTS "anon_delete_connections" ON public.connections;
DROP POLICY IF EXISTS "authenticated_insert_connections" ON public.connections;
DROP POLICY IF EXISTS "authenticated_update_connections" ON public.connections;
DROP POLICY IF EXISTS "authenticated_delete_connections" ON public.connections;
DROP POLICY IF EXISTS "hq_insert_connections" ON public.connections;
DROP POLICY IF EXISTS "hq_update_connections" ON public.connections;
DROP POLICY IF EXISTS "hq_delete_connections" ON public.connections;

-- Preserve read access for authorized Headquarters operators only. Recreate the
-- policy defensively so this migration is deterministic regardless of prior state.
DROP POLICY IF EXISTS "hq_select_connections" ON public.connections;
CREATE POLICY "hq_select_connections"
  ON public.connections
  FOR SELECT
  TO authenticated
  USING (public.has_headquarters_access());

COMMENT ON TABLE public.connections IS
  'Verified external-service connection evidence. Browser HQ roles are read-only; trusted backend/service-role integrations reconcile status.';
