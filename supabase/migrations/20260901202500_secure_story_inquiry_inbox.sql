/*
  Secure the public story inquiry inbox without breaking submissions.

  Visitors may submit a new inquiry anonymously, but inquiry contents include
  contact information and must not be anonymously readable, rewritable, or
  deletable. Headquarters owner/operator roles retain review access through the
  existing server-controlled app_metadata.hq_role authorization helper.
*/

ALTER TABLE public.story_inquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_inquiries" ON public.story_inquiries;
DROP POLICY IF EXISTS "anon_update_inquiries" ON public.story_inquiries;
DROP POLICY IF EXISTS "anon_delete_inquiries" ON public.story_inquiries;

-- Preserve the public submission boundary only.
DROP POLICY IF EXISTS "anon_insert_inquiries" ON public.story_inquiries;
CREATE POLICY "anon_insert_inquiries"
ON public.story_inquiries
FOR INSERT
TO anon
WITH CHECK (
  status = 'new'
  AND name IS NOT NULL
  AND length(trim(name)) > 0
  AND email IS NOT NULL
  AND length(trim(email)) > 0
  AND idea IS NOT NULL
  AND length(trim(idea)) > 0
);

-- Authenticated users are not implicitly trusted; only Headquarters roles may
-- inspect or manage the inbox.
DROP POLICY IF EXISTS "hq_select_story_inquiries" ON public.story_inquiries;
CREATE POLICY "hq_select_story_inquiries"
ON public.story_inquiries
FOR SELECT
TO authenticated
USING (public.has_headquarters_access());

DROP POLICY IF EXISTS "hq_update_story_inquiries" ON public.story_inquiries;
CREATE POLICY "hq_update_story_inquiries"
ON public.story_inquiries
FOR UPDATE
TO authenticated
USING (public.has_headquarters_access())
WITH CHECK (public.has_headquarters_access());

DROP POLICY IF EXISTS "hq_delete_story_inquiries" ON public.story_inquiries;
CREATE POLICY "hq_delete_story_inquiries"
ON public.story_inquiries
FOR DELETE
TO authenticated
USING (public.has_headquarters_access());
