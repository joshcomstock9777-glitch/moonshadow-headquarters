# Control-plane schema baseline

Reconstructed directly from live Supabase project `gnjwipcbckiwyeiwczst`
on 2026-09-02, via `information_schema`, `pg_constraint`, `pg_indexes`,
and `information_schema.triggers`. This was previously undocumented —
zero migration files existed for *this* database.

Landed in `moonshadow-headquarters` under `control-plane/` so it is
**not** picked up by `supabase/migrations` for Headquarters
(`pxmwpqhpdbooxzhcfndh`). Those are two different projects. HQ already
owns `public.jobs`, `dock_machines`, and `dock_handoffs`. Applying this
packet there would collide or no-op on the wrong `jobs` table.

## Restoration order

Run these against an **empty** control-plane database (`gnjwipcbckiwyeiwczst`
clone or fresh project), never against HQ:

1. `migrations/20260902000000_control_plane_schema_baseline.sql` — structure only.
2. `migrations/20260902001000_touch_updated_at.sql` — optional follow-on.
   Adds `touch_control_plane_updated_at()` on `machines` and `workers`.
   This changes runtime behavior. Baseline stays a clean snapshot.
3. `seed/seed_operational_baseline.sql` — optional. Current machines and
   workers as of 2026-09-02. Idempotent (`ON CONFLICT DO NOTHING`), but
   review before running against a live database — these values can go
   stale.

Order matters because `jobs` references `machines` and `workers`, and
five other tables reference `jobs`, `machines`, or `workers` in turn.

## Why RLS is enabled with zero policies

This is not an oversight — it's the actual, verified production state.
Every table has RLS enabled and no policies exist, which means only the
Supabase service-role key (which bypasses RLS entirely) can read or write
anything. No anon or authenticated-role path exists yet.

This migration intentionally reproduces that as-is. **Do not add policies
here.** The control-plane authorization model belongs to Amber's lane —
adding policies in this baseline would preempt a decision that hasn't
been made yet.

## Known gap the baseline does NOT fix

There were no triggers or functions in the live schema on 2026-09-02.
`updated_at` on `machines` and `workers` was set once at INSERT and never
touched again automatically.

`20260902001000_touch_updated_at.sql` is the explicit fix, kept separate
so the snapshot file stays honest.

## What could not be reproduced safely

Nothing was excluded for safety reasons — the live schema had no RLS
policies, no triggers, and no functions to omit. Everything found is
included. If a future schema read turns up policies, triggers, or
functions that didn't exist on 2026-09-02, regenerate the baseline the
same way (live introspection, not guessed).
