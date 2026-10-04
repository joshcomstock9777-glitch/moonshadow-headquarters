/*
  Reconcile the duplicate machine registries.

  Canonical registry: public.dock_machines (text slug primary key).
  Compatibility registry: public.machines (UUID primary key).

  No rows are deleted. The UUID registry is retained only for compatibility with
  the existing dispatch ledger. Machine availability is read from dock_machines.
*/

ALTER TABLE public.machines
  ADD COLUMN IF NOT EXISTS dock_machine_id text;

-- Preserve every legacy-only machine by creating an honestly unverified Dock row.
-- Existing rich Dock rows win; ON CONFLICT never overwrites their configuration.
INSERT INTO public.dock_machines (
  id,
  name,
  description,
  adapter_type,
  capabilities,
  accepted_inputs,
  produced_outputs,
  auth_type,
  connection_status,
  health_status,
  machine_type,
  owner_source,
  notes,
  manifest
)
SELECT
  CASE m.name
    WHEN 'Comedy Studio' THEN 'comedy-studio'
    WHEN 'Editor' THEN 'moonshadow-editor'
    WHEN 'Headquarters' THEN 'headquarters'
    WHEN 'Idea Lab' THEN 'idea-lab'
    WHEN 'Story Culture Studio' THEN 'story-culture-studio'
    WHEN 'Studio Go' THEN 'studio-go'
  END,
  m.name,
  'Migrated from the legacy UUID machine registry. Connection must be proven through Dock.',
  'internal',
  CASE
    WHEN jsonb_typeof(m.capabilities) = 'array'
      THEN ARRAY(SELECT jsonb_array_elements_text(m.capabilities))
    WHEN jsonb_typeof(m.capabilities) = 'object'
      THEN ARRAY(SELECT key FROM jsonb_each(m.capabilities) WHERE value <> 'false'::jsonb)
    ELSE ARRAY[]::text[]
  END,
  ARRAY[]::text[],
  ARRAY[]::text[],
  'none',
  'unknown',
  'unknown',
  m.machine_type,
  'legacy machines registry migration',
  'Compatibility import only. Do not mark connected without live Dock evidence.',
  jsonb_build_object(
    'who', m.name,
    'what_can_do', ARRAY[]::text[],
    'what_accepts', ARRAY[]::text[],
    'what_returns', ARRAY[]::text[],
    'where_lives', 'Not configured',
    'how_to_call', 'Not configured',
    'how_authenticates', 'Not configured',
    'currently_available', false,
    'legacy_machine_id', m.id
  )
FROM public.machines AS m
WHERE m.name IN (
  'Comedy Studio',
  'Editor',
  'Headquarters',
  'Idea Lab',
  'Story Culture Studio',
  'Studio Go'
)
ON CONFLICT (id) DO NOTHING;

UPDATE public.machines
SET dock_machine_id = CASE name
  WHEN 'Comedy Studio' THEN 'comedy-studio'
  WHEN 'Editor' THEN 'moonshadow-editor'
  WHEN 'Headquarters' THEN 'headquarters'
  WHEN 'Idea Lab' THEN 'idea-lab'
  WHEN 'Story Culture Studio' THEN 'story-culture-studio'
  WHEN 'Studio Go' THEN 'studio-go'
END
WHERE name IN (
  'Comedy Studio',
  'Editor',
  'Headquarters',
  'Idea Lab',
  'Story Culture Studio',
  'Studio Go'
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.machines WHERE dock_machine_id IS NULL) THEN
    RAISE EXCEPTION 'Registry reconciliation is incomplete: an unmapped machines row remains';
  END IF;
END $$;

ALTER TABLE public.machines
  ALTER COLUMN dock_machine_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS machines_dock_machine_id_key
  ON public.machines (dock_machine_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'machines_dock_machine_id_fkey'
      AND conrelid = 'public.machines'::regclass
  ) THEN
    ALTER TABLE public.machines
      ADD CONSTRAINT machines_dock_machine_id_fkey
      FOREIGN KEY (dock_machine_id)
      REFERENCES public.dock_machines(id)
      ON UPDATE CASCADE
      ON DELETE RESTRICT;
  END IF;
END $$;

COMMENT ON TABLE public.machines IS
  'Legacy UUID compatibility index. public.dock_machines is the authoritative machine registry.';
COMMENT ON COLUMN public.machines.dock_machine_id IS
  'Required one-to-one link to the authoritative public.dock_machines registry.';

ALTER TABLE public.dispatch_jobs
  ADD COLUMN IF NOT EXISTS dock_machine_id text;

UPDATE public.dispatch_jobs AS job
SET dock_machine_id = machine.dock_machine_id
FROM public.machines AS machine
WHERE job.machine_id = machine.id
  AND job.dock_machine_id IS NULL;

CREATE INDEX IF NOT EXISTS dispatch_jobs_dock_machine_id_idx
  ON public.dispatch_jobs (dock_machine_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'dispatch_jobs_dock_machine_id_fkey'
      AND conrelid = 'public.dispatch_jobs'::regclass
  ) THEN
    ALTER TABLE public.dispatch_jobs
      ADD CONSTRAINT dispatch_jobs_dock_machine_id_fkey
      FOREIGN KEY (dock_machine_id)
      REFERENCES public.dock_machines(id)
      ON UPDATE CASCADE
      ON DELETE RESTRICT;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.enforce_dispatch_machine_registry_link()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  linked_slug text;
  linked_uuid uuid;
BEGIN
  IF NEW.machine_id IS NOT NULL THEN
    SELECT dock_machine_id INTO linked_slug
    FROM public.machines
    WHERE id = NEW.machine_id;

    IF linked_slug IS NULL THEN
      RAISE EXCEPTION 'Unknown legacy machine UUID: %', NEW.machine_id;
    END IF;

    IF NEW.dock_machine_id IS NULL THEN
      NEW.dock_machine_id := linked_slug;
    ELSIF NEW.dock_machine_id <> linked_slug THEN
      RAISE EXCEPTION 'Machine registry mismatch: UUID % maps to %, not %',
        NEW.machine_id, linked_slug, NEW.dock_machine_id;
    END IF;
  ELSIF NEW.dock_machine_id IS NOT NULL THEN
    SELECT id INTO linked_uuid
    FROM public.machines
    WHERE dock_machine_id = NEW.dock_machine_id;

    -- Dock-only machines are valid. Populate the UUID only when a legacy link exists.
    IF linked_uuid IS NOT NULL THEN
      NEW.machine_id := linked_uuid;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS dispatch_jobs_enforce_machine_registry_link
  ON public.dispatch_jobs;
CREATE TRIGGER dispatch_jobs_enforce_machine_registry_link
  BEFORE INSERT OR UPDATE OF machine_id, dock_machine_id
  ON public.dispatch_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_dispatch_machine_registry_link();

COMMENT ON COLUMN public.dispatch_jobs.dock_machine_id IS
  'Canonical destination machine slug from public.dock_machines.';

-- Migration evidence: these queries return the post-migration counts and exact links.
SELECT
  (SELECT count(*) FROM public.machines) AS legacy_machine_count,
  (SELECT count(*) FROM public.dock_machines) AS canonical_machine_count,
  (SELECT count(*) FROM public.machines WHERE dock_machine_id IS NOT NULL) AS linked_legacy_count;

SELECT
  m.id AS legacy_uuid,
  m.name AS legacy_name,
  m.dock_machine_id,
  d.name AS canonical_name,
  d.connection_status,
  d.health_status
FROM public.machines AS m
JOIN public.dock_machines AS d ON d.id = m.dock_machine_id
ORDER BY m.name;
