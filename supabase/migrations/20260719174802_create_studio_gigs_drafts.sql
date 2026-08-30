/*
# Create studio tables: gigs + drafts (single-tenant, no auth)

## Purpose
The "Studio" is Kimmy's private workspace for managing freelance writing leads
and the drafts she produces from them. It is a single-tenant app with no sign-in
screen — the anon-key frontend must be able to read and write every row.

## New Tables

### gigs
Tracks freelance leads aggregated by the (manual or feed-assisted) scout.
- `id` (uuid, primary key)
- `source` (text, nullable) — where the lead came from (Upwork, Fiverr, paste, RSS, etc.)
- `url` (text, nullable) — link to the original posting
- `client` (text, nullable) — client / poster name
- `title` (text, not null) — short title of the gig
- `genre` (text, not null) — one of: short-story, erotica, horror-sci-fi, sci-fi, romance, poetry, songwriting, article
- `brief` (text, nullable) — full description / requirements
- `word_count` (integer, nullable) — requested length in words
- `budget_usd` (numeric, nullable) — stated budget
- `deadline` (date, nullable) — stated deadline
- `status` (text, not null default 'new') — new / triaged / applied / accepted / declined / invoiced / paid
- `notes` (text, nullable) — Kimmy's private notes
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())

### drafts
Drafts produced from gigs (or standalone). Each draft has a brief, an outline,
and a first-draft scaffold that Kimmy rewrites into final copy.
- `id` (uuid, primary key)
- `gig_id` (uuid, nullable, FK -> gigs.id ON DELETE SET NULL) — optional link to a gig
- `title` (text, not null)
- `genre` (text, not null) — same genre enum as gigs
- `brief` (text, nullable) — what the client wants
- `outline` (text, nullable) — structured outline / beat sheet
- `scaffold` (text, nullable) — first-draft scaffolding to rewrite
- `final_copy` (text, nullable) — the polished, hand-edited version
- `word_count_target` (integer, nullable)
- `status` (text, not null default 'idea') — idea / outlining / drafting / editing / delivered / paid
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())

## Security
- RLS enabled on both tables.
- Single-tenant, no sign-in: policies use `TO anon, authenticated` so the
  anon-key frontend can perform full CRUD. The data is intentionally shared
  across this single-tenant studio app — there is no per-user ownership.
- `updated_at` is bumped via triggers on UPDATE.

## Important Notes
1. The genre field is a free-text field constrained by the frontend dropdown,
   not a Postgres enum, so Kimmy can add new genres without a migration.
2. `gigs.url` and `drafts.gig_id` are nullable because some drafts are
   self-initiated (no inbound gig).
3. Trigger functions keep `updated_at` in sync without app code.
*/

CREATE TABLE IF NOT EXISTS gigs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text,
  url text,
  client text,
  title text NOT NULL,
  genre text NOT NULL,
  brief text,
  word_count integer,
  budget_usd numeric(10, 2),
  deadline date,
  status text NOT NULL DEFAULT 'new',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE gigs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_gigs" ON gigs;
CREATE POLICY "anon_select_gigs" ON gigs FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_gigs" ON gigs;
CREATE POLICY "anon_insert_gigs" ON gigs FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_gigs" ON gigs;
CREATE POLICY "anon_update_gigs" ON gigs FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_gigs" ON gigs;
CREATE POLICY "anon_delete_gigs" ON gigs FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gig_id uuid REFERENCES gigs(id) ON DELETE SET NULL,
  title text NOT NULL,
  genre text NOT NULL,
  brief text,
  outline text,
  scaffold text,
  final_copy text,
  word_count_target integer,
  status text NOT NULL DEFAULT 'idea',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_drafts" ON drafts;
CREATE POLICY "anon_select_drafts" ON drafts FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_drafts" ON drafts;
CREATE POLICY "anon_insert_drafts" ON drafts FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_drafts" ON drafts;
CREATE POLICY "anon_update_drafts" ON drafts FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_drafts" ON drafts;
CREATE POLICY "anon_delete_drafts" ON drafts FOR DELETE
  TO anon, authenticated USING (true);

CREATE OR REPLACE FUNCTION bump_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS gigs_bump_updated_at ON gigs;
CREATE TRIGGER gigs_bump_updated_at
  BEFORE UPDATE ON gigs
  FOR EACH ROW EXECUTE FUNCTION bump_updated_at();

DROP TRIGGER IF EXISTS drafts_bump_updated_at ON drafts;
CREATE TRIGGER drafts_bump_updated_at
  BEFORE UPDATE ON drafts
  FOR EACH ROW EXECUTE FUNCTION bump_updated_at();

CREATE INDEX IF NOT EXISTS gigs_status_idx ON gigs (status);
CREATE INDEX IF NOT EXISTS gigs_genre_idx ON gigs (genre);
CREATE INDEX IF NOT EXISTS drafts_status_idx ON drafts (status);
CREATE INDEX IF NOT EXISTS drafts_genre_idx ON drafts (genre);
CREATE INDEX IF NOT EXISTS drafts_gig_id_idx ON drafts (gig_id);
