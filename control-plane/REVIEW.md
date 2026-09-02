# Control-plane review — 2026-09-02

Reviewed against the reconstructed control-plane snapshot and the active
Moonshadow Headquarters commissioning state.

## Current verdict

The `control-plane/` packet is internally consistent as a historical schema
snapshot/reference. It is **not** evidence that Moonshadow currently operates two
separate Supabase projects.

The only Supabase project directly verified and adopted for current work is:

| Role | Verified project ref |
|---|---|
| Moonshadow Headquarters / control-plane commissioning | `gnjwipcbckiwyeiwczst` |

Earlier repository notes named `pxmwpqhpdbooxzhcfndh` as a separate
Headquarters/Dock database. That assumption is superseded. Do not target or recreate
that second-project split unless new live evidence proves it and the operating map
is deliberately changed.

The separate `control-plane/` directory remains useful because its historical
schema includes a queue-shaped `jobs` table and related operational tables whose
shape differs from Headquarters migrations. Keep the restoration material isolated
for migration safety; do not interpret that isolation as proof of a second live
project.

## What is solid in the snapshot

- Dependency order is correct: machines/workers → jobs → events/attempts/handoffs → capability/health children → evidence/tickets.
- Check constraints on status enums are tight and readable.
- Unique names on machines and workers match the seed `ON CONFLICT (name)`.
- Composite uniques on capability rows and attempt numbers are coherent.
- Health indexes on `(id, checked_at DESC)` match the expected query pattern.
- The captured RLS state is documented rather than silently rewritten.

## Gaps worth the round table

1. **`jobs.machine_id` and `jobs.worker_id` are nullable, no ON DELETE.** Queueing an unassigned job is fine; deletion behavior remains undefined.
2. **`job_events` / `job_attempts` have no ON DELETE CASCADE.** This preserves evidence by default but should be an explicit contract.
3. **Polymorphic refs have no FK:** `evidence.ref_id`, `commissioning_tests.target_id`. Orphans can accumulate.
4. **Two capability stores.** `machines.capabilities` jsonb plus `machine_capabilities` rows, likewise for workers. One can drift from the other.
5. **`jobs` has no `updated_at`.** Status freshness depends on related event evidence.
6. **`last_heartbeat` is unindexed.** Fleet views can degrade as the table grows.
7. **Snapshot seed ≠ current Dock authority.** Do not reconcile registries by renaming or inventing machines without live evidence.
8. **Snapshot worker assignments are historical.** Current ownership comes from the team operating packet, not this seed.
9. **The captured service-role-only state is not a browser authorization design.** Current live RLS/authentication must be verified independently.

## What this review does not claim

- It does not claim a second Supabase project exists.
- It does not claim the historical snapshot has been applied to production.
- It does not claim live RLS policies/functions match the snapshot.
- It does not convert repository configuration into connection evidence.

Current production claims require direct live verification.
