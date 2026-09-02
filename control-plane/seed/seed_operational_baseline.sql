-- OPTIONAL seed data — current operational rows as of 2026-09-02.
-- Kept separate from the schema migration on purpose: structure and
-- operational state are different concerns. Safe to run more than once
-- (ON CONFLICT DO NOTHING) but still touches real rows — review before
-- running against production, and never run against production without
-- confirming these values are still accurate.

INSERT INTO public.machines (name, machine_type, status, capabilities) VALUES
  ('Headquarters', 'headquarters', 'online',
    '{"role": "control-plane, routes jobs to studio machines"}'::jsonb),
  ('Studio Go', 'studio_go', 'online',
    '{"role": "mobile/independent studio surface"}'::jsonb),
  ('Editor', 'editor', 'online',
    '{"role": "creative editor tool/plugin surface"}'::jsonb),
  ('Comedy Studio', 'comedy_studio', 'offline',
    '{"role": "comedy content production machine", "status_note": "build packet exists, not yet commissioned"}'::jsonb),
  ('Story Culture Studio', 'story_culture_studio', 'offline',
    '{"role": "story + culture content production machine", "status_note": "build packet exists, not yet commissioned"}'::jsonb),
  ('Idea Lab', 'idea_lab', 'offline',
    '{"role": "idea generation and vetting: brainstorms, round-table sessions, product/invention pitches", "status_note": "concept stage, not yet commissioned"}'::jsonb)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.workers (name, lane, status, contact_meta) VALUES
  ('Amber', 'headquarters-control-plane', 'idle', '{}'::jsonb),
  ('Ellie', 'studio-go-editor-factory', 'idle', '{}'::jsonb),
  ('Claude', 'infrastructure-hq-commissioning-dock', 'active', '{}'::jsonb),
  ('Grok', 'production-services-publishing-qa', 'idle', '{}'::jsonb)
ON CONFLICT (name) DO NOTHING;
