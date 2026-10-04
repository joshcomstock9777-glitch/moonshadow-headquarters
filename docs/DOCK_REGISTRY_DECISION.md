# Dock machine registry decision

Date: 2026-09-18

`dock_machines` is the authoritative Moonshadow machine registry.

It owns stable text identities, connection and health state, adapter and authentication
configuration, locations, capabilities, and manifests. Those are the fields required to
connect and invoke a machine. The older `machines` table is retained as a UUID compatibility
index for the existing dispatch ledger; it is no longer a source of machine availability.

The enforced relationship is:

- every legacy `machines` row has exactly one non-null, unique `dock_machine_id` referencing
  `dock_machines(id)`;
- `dispatch_jobs` records the canonical `dock_machine_id` and may also retain the legacy UUID;
- a database trigger rejects mismatched UUID/slug pairs and fills the missing side when a
  valid compatibility mapping exists;
- the Headquarters frontend and both Dock edge functions read availability from
  `dock_machines` only.

No registry row is deleted. Four legacy-only machines are migrated into `dock_machines` with
honest `unknown` connection and health state. Existing richer Dock rows are preserved. Only
the two unambiguous existing pairs are linked automatically: `Editor` to
`moonshadow-editor`, and `Studio Go` to `studio-go`.
