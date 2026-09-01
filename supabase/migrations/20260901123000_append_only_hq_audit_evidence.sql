/*
  Make Headquarters audit/AI evidence append-only for browser-authenticated HQ roles.

  `activity` is the human-readable control-plane audit trail and
  `roundtable_messages` carries creator/worker conversation plus Moonshadow Path
  session/correlation evidence. Authorized browser users may continue to read
  and append evidence, but they may not rewrite or erase historical rows after
  insertion. Trusted service-role maintenance remains possible because the
  service role bypasses RLS.
*/

-- Activity log: preserve SELECT + INSERT; remove browser UPDATE/DELETE.
DROP POLICY IF EXISTS "hq_update_activity" ON public.activity;
DROP POLICY IF EXISTS "hq_delete_activity" ON public.activity;
DROP POLICY IF EXISTS "authenticated_update_activity" ON public.activity;
DROP POLICY IF EXISTS "authenticated_delete_activity" ON public.activity;
DROP POLICY IF EXISTS "anon_update_activity" ON public.activity;
DROP POLICY IF EXISTS "anon_delete_activity" ON public.activity;

-- Roundtable/Path evidence: preserve SELECT + INSERT; remove browser UPDATE/DELETE.
DROP POLICY IF EXISTS "hq_update_roundtable_messages" ON public.roundtable_messages;
DROP POLICY IF EXISTS "hq_delete_roundtable_messages" ON public.roundtable_messages;
DROP POLICY IF EXISTS "authenticated_update_roundtable_messages" ON public.roundtable_messages;
DROP POLICY IF EXISTS "authenticated_delete_roundtable_messages" ON public.roundtable_messages;
DROP POLICY IF EXISTS "anon_update_roundtable_messages" ON public.roundtable_messages;
DROP POLICY IF EXISTS "anon_delete_roundtable_messages" ON public.roundtable_messages;

COMMENT ON TABLE public.activity IS
  'Append-only Headquarters control-plane audit evidence for browser-authenticated HQ roles; trusted service-role maintenance may reconcile records.';

COMMENT ON TABLE public.roundtable_messages IS
  'Append-only Headquarters Roundtable conversation and Moonshadow Path execution evidence for browser-authenticated HQ roles; trusted service-role maintenance may reconcile records.';
