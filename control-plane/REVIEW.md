# Control-plane review — 2026-09-01

Reviewed against the reconstructed snapshot and against
`joshcomstock9777-glitch/moonshadow-headquarters` on `main`.

## Verdict

The packet is internally consistent and matches its own README. It is
**not** the Headquarters schema. Do not merge it into
`supabase/migrations`.

| Database | Ref | Owns |
|---|---|---|
| Headquarters / Dock | `pxmwpqhpdbooxzhcfndh` | `jobs` (pipeline), `dock_machines`, `dock_handoffs`, HQ RLS |
| Control-plane ops | `gnjwipcbckiwyeiwczst` | `machines`, `workers`, queue-shaped `jobs`, service-role-only RLS |

Same English words, different tables.

## What is solid

- Dependency order is correct: machines/workers → jobs → events/attempts/handoffs → capability/health children → evidence/tickets.
- Check constraints on status enums are tight and readable.
- Unique names on machines and workers match the seed `ON CONFLICT (name)`.
- Composite uniques on capability rows and attempt numbers are right.
- Health indexes on `(id, checked_at DESC)` are the query you actually want.
- RLS-on / policies-zero is documented instead of "fixed" in place. Correct.

## Gaps worth the round table

1. **`jobs.machine_id` and `jobs.worker_id` are nullable, no ON DELETE.** Queueing an unassigned job is fine. Deleting a machine while jobs point at it is not defined.
2. **`job_events` / `job_attempts` have no ON DELETE CASCADE.** You cannot delete a job while children exist. That may be intentional (evidence trail). Say so or add restrict/cascade explicitly.
3. **Polymorphic refs have no FK:** `evidence.ref_id`, `commissioning_tests.target_id`. Expected for mixed types; orphans will accumulate.
4. **Two capability stores.** `machines.capabilities` jsonb plus `machine_capabilities` rows. Same split on workers. One will lie first.
5. **`jobs` has no `updated_at`.** Status flips will not show freshness except via events.
6. **`last_heartbeat` is unindexed.** Fleet views that sort/filter on it will seq-scan once the table grows.
7. **Seed ≠ Dock seed.** Control-plane: Headquarters, Studio Go, Editor, Comedy Studio, Story Culture Studio, Idea Lab. Dock: moonshadow-path, studio-go, moonshadow-editor, kimmy, skin-studio, content-factory, code-lab. Different registries. Do not reconcile by renaming in this baseline.
8. **Workers seeded:** Amber idle / headquarters-control-plane, Ellie idle / studio-go-editor-factory, Claude active / infrastructure-hq-commissioning-dock, Grok idle / production-services-publishing-qa.
9. **Service-role-only is a lockout.** Anon key returns zero rows. Fine until someone wires a browser client at this project and thinks the tables are empty.

## What I did not do

- Did not add Amber's policies.
- Did not rewrite the baseline.
- Did not run SQL against production.
- Did not put these files in `supabase/migrations`.
