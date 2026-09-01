/*
  Secure the legacy Kimmy studio workspace.

  The original gigs/drafts migration intentionally granted anonymous full CRUD
  because the early Studio prototype had no sign-in screen. Headquarters now
  has authenticated owner/operator authorization, so retaining anonymous access
  would expose private briefs, client details, notes, and draft copy and would
  allow unauthenticated mutation or deletion.

  This migration removes every legacy anonymous policy and moves both tables
  behind the same server-controlled app_metadata.hq_role boundary used by the
  rest of Headquarters.

  If a standalone Kimmy client is commissioned later, it must authenticate as
  an authorized principal or use a dedicated server-side adapter. Do not restore
  public browser CRUD as a compatibility shortcut.
*/

ALTER TABLE public.gigs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_gigs" ON public.gigs;
DROP POLICY IF EXISTS "anon_insert_gigs" ON public.gigs;
DROP POLICY IF EXISTS "anon_update_gigs" ON public.gigs;
DROP POLICY IF EXISTS "anon_delete_gigs" ON public.gigs;

DROP POLICY IF EXISTS "anon_select_drafts" ON public.drafts;
DROP POLICY IF EXISTS "anon_insert_drafts" ON public.drafts;
DROP POLICY IF EXISTS "anon_update_drafts" ON public.drafts;
DROP POLICY IF EXISTS "anon_delete_drafts" ON public.drafts;

DROP POLICY IF EXISTS "hq_select_gigs" ON public.gigs;
CREATE POLICY "hq_select_gigs"
  ON public.gigs
  FOR SELECT
  TO authenticated
  USING (public.has_headquarters_access());

DROP POLICY IF EXISTS "hq_insert_gigs" ON public.gigs;
CREATE POLICY "hq_insert_gigs"
  ON public.gigs
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_headquarters_access());

DROP POLICY IF EXISTS "hq_update_gigs" ON public.gigs;
CREATE POLICY "hq_update_gigs"
  ON public.gigs
  FOR UPDATE
  TO authenticated
  USING (public.has_headquarters_access())
  WITH CHECK (public.has_headquarters_access());

DROP POLICY IF EXISTS "hq_delete_gigs" ON public.gigs;
CREATE POLICY "hq_delete_gigs"
  ON public.gigs
  FOR DELETE
  TO authenticated
  USING (public.has_headquarters_access());

DROP POLICY IF EXISTS "hq_select_drafts" ON public.drafts;
CREATE POLICY "hq_select_drafts"
  ON public.drafts
  FOR SELECT
  TO authenticated
  USING (public.has_headquarters_access());

DROP POLICY IF EXISTS "hq_insert_drafts" ON public.drafts;
CREATE POLICY "hq_insert_drafts"
  ON public.drafts
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_headquarters_access());

DROP POLICY IF EXISTS "hq_update_drafts" ON public.drafts;
CREATE POLICY "hq_update_drafts"
  ON public.drafts
  FOR UPDATE
  TO authenticated
  USING (public.has_headquarters_access())
  WITH CHECK (public.has_headquarters_access());

DROP POLICY IF EXISTS "hq_delete_drafts" ON public.drafts;
CREATE POLICY "hq_delete_drafts"
  ON public.drafts
  FOR DELETE
  TO authenticated
  USING (public.has_headquarters_access());

REVOKE ALL ON TABLE public.gigs FROM anon;
REVOKE ALL ON TABLE public.drafts FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.gigs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.drafts TO authenticated;
