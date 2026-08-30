/*
# Create story_inquiries table (single-tenant, no auth)

## Purpose
Stores incoming commission inquiries for custom sci-fi horror fiction.
Visitors submit their story idea, preferred length, tone, sub-genre, and any
specific elements they want included. The writer reviews inquiries from the
Supabase dashboard.

## New Tables
- `story_inquiries`
  - `id` (uuid, primary key)
  - `name` (text, not null) — pen name or contact name of the requester
  - `email` (text, not null) — reply contact
  - `sub_genre` (text, nullable) — preferred sub-genre (cosmic, body, psychological, etc.)
  - `length` (text, nullable) — preferred word count / length bucket
  - `tone` (text, nullable) — preferred tone (slow dread, visceral, etc.)
  - `idea` (text, not null) — the story concept / brief from the requester
  - `elements` (text, nullable) — specific creatures, settings, themes to include
  - `status` (text, not null default 'new') — workflow status: new / reviewing / accepted / declined
  - `created_at` (timestamptz, default now())

## Security
- RLS enabled on `story_inquiries`.
- The site has no sign-in screen, so the anon-key frontend must be able to INSERT
  new inquiries. Reads/writes beyond the initial insert are intentionally public
  to this single-tenant app — the table is the writer's inbox.
- Policies use `TO anon, authenticated` so the anon client can insert rows.
- SELECT/UPDATE/DELETE are also opened to anon, authenticated because the data
  is intentionally shared across this single-tenant app (no per-user ownership).
*/

CREATE TABLE IF NOT EXISTS story_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  sub_genre text,
  length text,
  tone text,
  idea text NOT NULL,
  elements text,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE story_inquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_inquiries" ON story_inquiries;
CREATE POLICY "anon_select_inquiries" ON story_inquiries FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_inquiries" ON story_inquiries;
CREATE POLICY "anon_insert_inquiries" ON story_inquiries FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_inquiries" ON story_inquiries;
CREATE POLICY "anon_update_inquiries" ON story_inquiries FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_inquiries" ON story_inquiries;
CREATE POLICY "anon_delete_inquiries" ON story_inquiries FOR DELETE
  TO anon, authenticated USING (true);
