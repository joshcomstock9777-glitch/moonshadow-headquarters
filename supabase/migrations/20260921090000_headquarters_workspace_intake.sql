/* Durable intake for Headquarters collaboration surfaces. */

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('headquarters-intake', 'headquarters-intake', false, 209715200)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = 209715200;

DROP POLICY IF EXISTS "hq_read_workspace_uploads" ON storage.objects;
CREATE POLICY "hq_read_workspace_uploads"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'headquarters-intake' AND public.has_headquarters_access());

DROP POLICY IF EXISTS "hq_insert_workspace_uploads" ON storage.objects;
CREATE POLICY "hq_insert_workspace_uploads"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'headquarters-intake'
  AND public.has_headquarters_access()
  AND (storage.foldername(name))[1] = auth.uid()::text
);

ALTER TABLE public.roundtable_messages
  ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.roundtable_messages
  DROP CONSTRAINT IF EXISTS roundtable_messages_attachments_array;

ALTER TABLE public.roundtable_messages
  ADD CONSTRAINT roundtable_messages_attachments_array
  CHECK (jsonb_typeof(attachments) = 'array' AND jsonb_array_length(attachments) <= 12);

COMMENT ON COLUMN public.roundtable_messages.attachments IS
  'Stable Asset Library references uploaded through Headquarters intake. Storage objects remain private.';
