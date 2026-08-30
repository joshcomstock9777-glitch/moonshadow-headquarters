# Moonshadow Dock — Architecture & Developer Guide

Dock is the universal connection layer for Moonshadow Headquarters. It lets
the creator register any machine (application, editor, generator, agent,
tool) through one standard interface, prove what it can do, and make it
available to Herman — without redesigning Headquarters for each new tool.

> One Headquarters. One operator. Many replaceable machines. One standard
> way to connect them.

---

## 1. Core Concepts

### Machine
Any application, tool, or service that can do creative work. Registered in
the `dock_machines` table with a Machine Manifest describing who it is, what
it can do, what it accepts, what it returns, where it lives, how to call it,
how it authenticates, and whether it's currently available.

### Adapter
The code that knows how to talk to a specific protocol (REST, webhook, MCP,
web app, GitHub, file, internal). Each adapter implements a `test()` and
`send()` method. New machines pick an adapter type — they don't need custom
code throughout Headquarters.

### Handoff Envelope
A standardized payload that moves work between machines. Carries job ID,
project ID, correlation ID, requested action, creator instructions, asset
references, source/destination machine IDs, expected output, approval state,
provenance, and status. Stored in `dock_handoffs`.

### Capability
A named function a machine can perform (WRITE_STORY, GENERATE_IMAGE,
EDIT_VIDEO, etc.). Capabilities are extensible. Herman can query Dock for
"which available machines can generate an image?" and get truthful candidates.

### Connection Test
A real network call to a machine, with the actual HTTP status, response body,
and latency recorded. The UI never displays "working" without a real test
result. Stored in `dock_connection_tests`.

---

## 2. Database Schema

### dock_machines
The connector registry. Text primary key (machine slug). Columns for
identity, location, adapter type, capabilities, auth, status, health, and
the full Machine Manifest as JSONB.

Key columns:
- `id` — slug (text, primary key)
- `name`, `description` — human-readable identity
- `location_url`, `api_base_url`, `source_repo` — where the machine lives
- `adapter_type` — how to call it (rest, webhook, mcp, file, github, web, internal)
- `capabilities` — text array of capability names
- `accepted_inputs`, `produced_outputs` — text arrays
- `auth_type` — none, api_key, oauth, token, basic, custom
- `credential_ref` — name of the server-side secret (never the secret value)
- `connection_status` — connected, ready-to-connect, auth-required, needs-auth, broken, unknown, development
- `health_status` — healthy, degraded, unhealthy, unknown
- `last_connected_at`, `last_failure_at`, `last_failure_reason` — real test history
- `manifest` — full Machine Manifest as JSONB (exportable/importable)

### dock_handoffs
Universal handoff envelopes. UUID primary key with a `correlation_id` that
stays constant across the entire lifecycle of a routed job.

Key columns:
- `correlation_id` — UUID, constant across the job's lifecycle
- `job_id`, `project_id` — links to Headquarters projects and jobs
- `requested_action` — what the creator wants done
- `payload` — JSONB, the actual content/context
- `asset_refs` — text array of asset references
- `source_machine_id`, `destination_machine_id` — routing
- `approval_state` — not-required, pending, approved, rejected
- `provenance` — text array, the trail of where this envelope has been
- `status` — pending, approved, sent, received, completed, failed, cancelled, retrying
- `result` — JSONB, the response from the destination machine
- `error` — failure reason if any
- `retries` — count of retry attempts

### dock_connection_tests
Test bench results. Each test records the machine, test type, real HTTP
status, response body (truncated to 10KB), latency in ms, success/failure,
and error.

All three tables have RLS enabled with anon + authenticated CRUD policies
(single-tenant, no sign-in).

---

## 3. Machine Manifest Schema

The manifest is both human-readable and machine-readable (stored as JSONB).
It answers 8 questions:

```
WHO I AM          → name + description
WHAT I CAN DO     → capabilities array
WHAT I ACCEPT     → accepted_inputs array
WHAT I RETURN     → produced_outputs array
WHERE I LIVE      → location_url
HOW TO CALL ME    → adapter_type + invocation_detail
HOW I AUTHENTICATE→ auth_type + credential_ref
AM I AVAILABLE    → currently_available boolean
```

The manifest is exportable/importable. A machine's entire connector
definition can be downloaded as JSON and imported into another Dock instance.
Dock itself never becomes a locked platform.

---

## 4. Adapter Interface

```typescript
interface DockAdapter {
  type: AdapterType
  description: string
  test(machine: DockMachine): Promise<AdapterTestResult>
  send(machine: DockMachine, envelope: Record<string, unknown>): Promise<AdapterSendResult>
}
```

### Available Adapters

| Type     | Description                                         | Test Method                          |
|----------|-----------------------------------------------------|--------------------------------------|
| rest     | REST/HTTP API — sends JSON to an API endpoint       | GET request to api_base_url          |
| webhook  | Webhook — sends POST payload to a URL               | POST test payload to URL             |
| mcp      | MCP Server — sends JSON-RPC tool list/call          | tools/list JSON-RPC request          |
| web      | Web Application — checks if a URL responds          | GET request to location_url          |
| github   | GitHub-hosted — checks repo via GitHub API          | GET api.github.com/repos/owner/repo  |
| file     | File Import/Export — no network call                | Verifies file path/URL is configured  |
| internal | Internal Module — Headquarters-internal             | Verifies registration (no network)    |

### Adding a New Adapter

1. Implement the `DockAdapter` interface in `src/lib/dockAdapters.ts`
2. Add the adapter type to `ADAPTER_TYPES` in `src/lib/dockTypes.ts`
3. Register it in the `ADAPTERS` record in `src/lib/dockAdapters.ts`

A new adapter only needs to know how to test connectivity and send a
handoff envelope. The rest of Dock (UI, persistence, capability discovery)
works automatically.

---

## 5. Handoff Envelope

```typescript
interface HandoffEnvelope {
  correlation_id: string   // UUID, constant across lifecycle
  job_id: string | null    // links to Headquarters job
  project_id: string | null // links to Headquarters project
  requested_action: string // what to do
  creator_instructions: string | null
  payload: Record<string, unknown> | null
  asset_refs: string[]
  source_machine_id: string | null
  destination_machine_id: string | null
  expected_output: string | null
  approval_state: string   // not-required, pending, approved, rejected
  provenance: string[]     // trail of machines this has passed through
  status: string           // pending → sent → received → completed
  result: Record<string, unknown> | null
  error: string | null
  retries: number
  created_at, updated_at, sent_at, received_at: string
}
```

The `buildHandoffEnvelope()` function in `src/lib/dockAdapters.ts` creates
a new envelope with a fresh correlation ID. The envelope is saved to
`dock_handoffs` and can be updated as it moves through its lifecycle.

---

## 6. Capability Registry

Capabilities are defined in `src/lib/dockTypes.ts`:

```typescript
const CAPABILITIES = [
  'WRITE_STORY', 'WRITE_SCRIPT',
  'GENERATE_IMAGE', 'EDIT_IMAGE',
  'GENERATE_VIDEO', 'EDIT_VIDEO',
  'GENERATE_AUDIO', 'TRANSCRIBE',
  'STORE_ASSET', 'SEARCH_ASSETS',
  'PACKAGE_PROJECT', 'PUBLISH',
  'RUN_CODE', 'ROUTE_JOB',
] as const
```

To add a new capability, add it to the `CAPABILITIES` array and the
`CAPABILITY_LABELS` record. The capability search UI updates automatically.

### Herman Query Functions

- `findMachinesByCapability(machines, capability)` — returns machines with
  the capability that are connected or ready-to-connect
- `findConnectedMachinesByCapability(machines, capability)` — returns only
  connected machines with the capability

---

## 7. Secret Handling

Secret values are NEVER stored in the database or exposed to the browser.

- `dock_machines.credential_ref` stores only the NAME of the server-side
  secret (e.g., "openai_api_key"), not the value
- Actual secrets belong in Supabase Edge Function secrets or server
  configuration
- The UI shows AUTHENTICATED, AUTH REQUIRED, or EXPIRED — never the credential
- When an adapter needs a secret, it's provided server-side via an Edge
  Function that proxies the request

---

## 8. Failure & Recovery

Dock is designed for connections that fail:

- **Timeout** — all adapter calls have a 15-second timeout via AbortController
- **Retry** — handoff envelopes track `retries` count; failed handoffs can be retried
- **Auth failure** — test results record HTTP 401/403; machine status shows auth-required
- **Machine unavailable** — test results record connection errors; machine health shows unhealthy
- **Malformed response** — adapter records the actual response body for inspection
- **Capability mismatch** — capability query only returns machines that declared the capability
- **Job cancellation** — handoff status can be set to `cancelled`; job state is preserved
- **Partial completion** — handoff status `received` vs `completed` distinguishes partial from full

Machine `last_failure_at` and `last_failure_reason` are updated on test
failure. The activity log records every test and its result.

Herman can select an alternate compatible machine when appropriate, but
important substitutions remain visible to the creator via the activity log.

---

## 9. Adding a New Machine

### Through the UI
1. Navigate to Dock (`/#/hq/dock`)
2. Click "Add Machine"
3. Follow the 4-step wizard: Identity → Location → Capabilities → Review
4. The machine is registered with status "unknown"
5. Run a connection test to verify it for real
6. Status updates automatically based on the real test result

### Through Code (Seeding)
Add an `INSERT INTO dock_machines` statement in a Supabase migration with
the machine manifest as JSONB. See the initial seed in
`20260830160000_create_moonshadow_dock.sql` for the pattern.

### From a Recovered Application
1. Register it in Dock with whatever information is known
2. Set status to "unknown" or "ready-to-connect" — never claim "connected"
3. Run connectivity and capability tests
4. Only after a successful real test does the status become "connected"
5. Herman can then route work to it

---

## 10. Herman Routing (Future)

Once the registry, manifest, handoff envelope, and adapters exist, Herman
connects to Dock:

```
Creator → Herman → Dock → Machine
Machine → Dock → Herman → Project
```

Herman chooses from registered capabilities and availability. Approval is
required for paid, destructive, private, or public-facing actions. Every
route and result is recorded in the Headquarters activity/evidence log.

The routing logic lives in the Roundtable component
(`src/components/hq/Roundtable.tsx`) and uses the `findMachinesByCapability`
function from `src/lib/dockAdapters.ts`.

---

## 11. File Locations

| Component              | File                                          |
|------------------------|-----------------------------------------------|
| Dock types & constants | `src/lib/dockTypes.ts`                        |
| Adapters & helpers     | `src/lib/dockAdapters.ts`                     |
| Dock UI                | `src/components/hq/Dock.tsx`                  |
| Router entry           | `src/lib/router.ts` (route: `hq-dock`)        |
| Nav entry              | `src/components/hq/HqShell.tsx`               |
| App wiring             | `src/App.tsx`                                 |
| Database migration     | `supabase/migrations/20260830160000_*.sql`    |
| Portability docs       | `PORTABILITY.md`                              |
| This document          | `DOCK.md`                                     |
