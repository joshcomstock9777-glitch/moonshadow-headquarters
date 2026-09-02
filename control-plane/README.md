# Control-plane schema baseline

Reconstructed directly from live Supabase project `gnjwipcbckiwyeiwczst`
on 2026-09-02, via `information_schema`, `pg_constraint`, `pg_indexes`,
and `information_schema.triggers`.

## Production project authority

As of the September 2, 2026 commissioning checkpoint, `gnjwipcbckiwyeiwczst`
is the only Supabase project that has been directly verified as real and available
for Moonshadow Headquarters/control-plane work.

Earlier notes in this repository referred to a separate Headquarters/Dock project
(`pxmwpqhpdbooxzhcfndh`). That split is **not** an approved production assumption.
Do not provision, target, or migrate a second Dock database from those historical
notes unless new direct evidence establishes that project and Codex/Josh explicitly
adopt it.

The files under `control-plane/` remain a historical schema snapshot/reference.
They are intentionally kept separate from `supabase/migrations` because their
`jobs` shape and restoration semantics differ from the Headquarters migrations.
That file-layout boundary is about migration safety, not proof of a second live
Supabase project.

## Restoration order

Use this packet only for an explicitly approved empty restoration/clone of the
control-plane schema. Do not run it blindly against the live Headquarters project:

1. `migrations/20260902000000_control_plane_schema_baseline.sql` — structure only.
2. `migrations/20260902001000_touch_updated_at.sql` — optional follow-on.
   Adds `touch_control_plane_updated_at()` on `machines` and `workers`.
   This changes runtime behavior. Baseline stays a clean snapshot.
3. `seed/seed_operational_baseline.sql` — optional. Machines and workers captured
   at the 2026-09-02 snapshot. Idempotent (`ON CONFLICT DO NOTHING`), but review
   before using because operational values can go stale.

Order matters because `jobs` references `machines` and `workers`, and several
other tables reference `jobs`, `machines`, or `workers` in turn.

## RLS state captured by the historical snapshot

The baseline recorded every table with RLS enabled and no policies at the time of
that introspection. That means browser anon/authenticated clients would not have a
usable path through the snapshot schema; service-role access would bypass RLS.

This historical baseline intentionally preserves the captured state. Do not infer
that the current live Headquarters authorization model should remain policy-free.
Amber's active Headquarters migrations and live verification are authoritative for
current authentication/RLS behavior.

## Known gap the baseline does NOT fix

There were no triggers or functions in the captured schema. `updated_at` on
`machines` and `workers` was set at INSERT and not automatically refreshed.

`20260902001000_touch_updated_at.sql` is the explicit historical follow-on, kept
separate so the snapshot file stays honest.

## Safety rule

Treat this directory as evidence and restoration material, not as a second live
control plane. Commissioning claims must come from current live-project evidence,
not repository text alone.
