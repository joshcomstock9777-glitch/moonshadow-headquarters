-- Control-plane schema baseline
-- Reconstructed from live Supabase project gnjwipcbckiwyeiwczst on 2026-09-02.
-- Non-destructive: CREATE TABLE IF NOT EXISTS everywhere. Safe to run against
-- an empty database. Does NOT apply to production automatically.
--
-- Scope: structure only. No rows, no secrets, no service-role credentials.
-- RLS is enabled on every table with ZERO policies, matching production
-- exactly. That is the correct current state (service-role-only access) —
-- do not add policies here. Amber owns the control-plane authorization model.
--
-- Known gap (not fixed by this migration, flagged for the round table):
-- there are no triggers anywhere in this schema. `updated_at` on `machines`
-- and `workers` is NOT auto-maintained — it only gets its default on INSERT
-- and will go stale unless application code updates it manually or a
-- trigger is added later.

-- =========================================================================
-- machines
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.machines (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  machine_type    text NOT NULL,
  status          text NOT NULL DEFAULT 'offline',
  capabilities    jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_heartbeat  timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT machines_name_key UNIQUE (name),
  CONSTRAINT machines_status_check CHECK (status = ANY (ARRAY['offline','online','busy','error','maintenance']))
);

-- =========================================================================
-- workers
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.workers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  lane          text NOT NULL,
  status        text NOT NULL DEFAULT 'idle',
  contact_meta  jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workers_name_key UNIQUE (name),
  CONSTRAINT workers_status_check CHECK (status = ANY (ARRAY['idle','active','blocked','offline']))
);

-- =========================================================================
-- jobs
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.jobs (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id     uuid REFERENCES public.machines(id),
  worker_id      uuid REFERENCES public.workers(id),
  job_type       text NOT NULL,
  status         text NOT NULL DEFAULT 'queued',
  payload        jsonb NOT NULL DEFAULT '{}'::jsonb,
  result         jsonb,
  error          text,
  started_at     timestamptz,
  completed_at   timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  requested_by   text,
  assigned_at    timestamptz,
  attempt_count  integer NOT NULL DEFAULT 0,
  CONSTRAINT jobs_status_check CHECK (status = ANY (ARRAY['queued','assigned','started','waiting','retrying','succeeded','failed','cancelled']))
);

CREATE INDEX IF NOT EXISTS idx_jobs_machine_id ON public.jobs USING btree (machine_id);
CREATE INDEX IF NOT EXISTS idx_jobs_worker_id  ON public.jobs USING btree (worker_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status     ON public.jobs USING btree (status);

-- =========================================================================
-- job_events
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.job_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id      uuid NOT NULL REFERENCES public.jobs(id),
  event_type  text NOT NULL,
  detail      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_events_job_id ON public.job_events USING btree (job_id);

-- =========================================================================
-- job_attempts
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.job_attempts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id          uuid NOT NULL REFERENCES public.jobs(id),
  attempt_number  integer NOT NULL,
  status          text NOT NULL,
  error           text,
  started_at      timestamptz NOT NULL DEFAULT now(),
  completed_at    timestamptz,
  CONSTRAINT job_attempts_job_id_attempt_number_key UNIQUE (job_id, attempt_number),
  CONSTRAINT job_attempts_status_check CHECK (status = ANY (ARRAY['started','succeeded','failed','cancelled']))
);

CREATE INDEX IF NOT EXISTS idx_job_attempts_job_id ON public.job_attempts USING btree (job_id);

-- =========================================================================
-- handoffs
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.handoffs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id      uuid REFERENCES public.jobs(id),
  from_actor  text NOT NULL,
  to_actor    text NOT NULL,
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- =========================================================================
-- machine_capabilities
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.machine_capabilities (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id  uuid NOT NULL REFERENCES public.machines(id),
  capability  text NOT NULL,
  detail      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT machine_capabilities_machine_id_capability_key UNIQUE (machine_id, capability)
);

CREATE INDEX IF NOT EXISTS idx_machine_capabilities_machine_id ON public.machine_capabilities USING btree (machine_id);

-- =========================================================================
-- machine_health
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.machine_health (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id  uuid NOT NULL REFERENCES public.machines(id),
  status      text NOT NULL,
  latency_ms  integer,
  detail      jsonb NOT NULL DEFAULT '{}'::jsonb,
  checked_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_machine_health_machine_id_checked ON public.machine_health USING btree (machine_id, checked_at DESC);

-- =========================================================================
-- worker_capabilities
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.worker_capabilities (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id   uuid NOT NULL REFERENCES public.workers(id),
  capability  text NOT NULL,
  detail      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT worker_capabilities_worker_id_capability_key UNIQUE (worker_id, capability)
);

CREATE INDEX IF NOT EXISTS idx_worker_capabilities_worker_id ON public.worker_capabilities USING btree (worker_id);

-- =========================================================================
-- worker_health
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.worker_health (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id   uuid NOT NULL REFERENCES public.workers(id),
  status      text NOT NULL,
  detail      jsonb NOT NULL DEFAULT '{}'::jsonb,
  checked_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_worker_health_worker_id_checked ON public.worker_health USING btree (worker_id, checked_at DESC);

-- =========================================================================
-- commissioning_tests
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.commissioning_tests (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_name    text NOT NULL,
  target_type  text NOT NULL,
  target_id    uuid,
  result       text NOT NULL,
  detail       jsonb NOT NULL DEFAULT '{}'::jsonb,
  run_by       text NOT NULL DEFAULT 'Claude',
  run_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT commissioning_tests_target_type_check CHECK (target_type = ANY (ARRAY['machine','worker','job','system'])),
  CONSTRAINT commissioning_tests_result_check CHECK (result = ANY (ARRAY['PASS','FAIL','BLOCKED','NOT_YET_CONNECTED']))
);

CREATE INDEX IF NOT EXISTS idx_commissioning_tests_target ON public.commissioning_tests USING btree (target_type, target_id);

-- =========================================================================
-- evidence
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.evidence (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_type       text NOT NULL,
  ref_id         uuid NOT NULL,
  evidence_type  text NOT NULL,
  detail         jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT evidence_ref_type_check CHECK (ref_type = ANY (ARRAY['job','commissioning_test','handoff']))
);

CREATE INDEX IF NOT EXISTS idx_evidence_ref ON public.evidence USING btree (ref_type, ref_id);

-- =========================================================================
-- repair_tickets
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.repair_tickets (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text NOT NULL,
  description  text NOT NULL,
  severity     text NOT NULL,
  status       text NOT NULL DEFAULT 'open',
  likely_owner text,
  evidence     jsonb NOT NULL DEFAULT '{}'::jsonb,
  opened_by    text NOT NULL DEFAULT 'Wolf',
  opened_at    timestamptz NOT NULL DEFAULT now(),
  resolved_at  timestamptz,
  CONSTRAINT repair_tickets_severity_check CHECK (severity = ANY (ARRAY['low','medium','high','critical'])),
  CONSTRAINT repair_tickets_status_check CHECK (status = ANY (ARRAY['open','in_progress','resolved','escalated']))
);

CREATE INDEX IF NOT EXISTS idx_repair_tickets_status_severity ON public.repair_tickets USING btree (status, severity);

-- =========================================================================
-- Row Level Security — enabled, zero policies (service-role only).
-- This matches production exactly. Do not add policies in this migration.
-- =========================================================================
ALTER TABLE public.machines              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workers               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_events            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_attempts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.handoffs              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machine_capabilities  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machine_health        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_capabilities   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_health         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commissioning_tests   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repair_tickets        ENABLE ROW LEVEL SECURITY;
