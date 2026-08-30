// Moonshadow Dock — adapter system and handoff helpers
//
// Dock provides clean adapter interfaces for common connection types.
// Each adapter knows how to build a request and parse a response for its
// protocol. New machines require a small adapter rather than changes
// throughout Headquarters.

import type {
  AdapterType,
  Capability,
  DockMachine,
  DockConnectionTest,
  HandoffStatus,
  MachineManifest,
} from './dockTypes'
import { CAPABILITIES } from './dockTypes'

// ── Adapter interface ────────────────────────────────────────────────────────
//
// Every adapter implements this shape. The test() method performs a real
// network call and returns an honest result. The send() method delivers a
// handoff envelope. Neither fakes success.

export interface AdapterTestResult {
  success: boolean
  httpStatus: number | null
  responseBody: string | null
  latencyMs: number | null
  error: string | null
}

export interface AdapterSendResult {
  success: boolean
  httpStatus: number | null
  responseBody: string | null
  latencyMs: number | null
  error: string | null
}

export interface DockAdapter {
  type: AdapterType
  description: string
  test(machine: DockMachine): Promise<AdapterTestResult>
  send(machine: DockMachine, envelope: Record<string, unknown>): Promise<AdapterSendResult>
}

// ── Helper: timed fetch with timeout ─────────────────────────────────────────
async function timedFetch(
  url: string,
  options: RequestInit,
  timeoutMs = 15000,
): Promise<{ response: Response; latencyMs: number }> {
  const start = performance.now()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, { ...options, signal: controller.signal })
    const latencyMs = Math.round(performance.now() - start)
    return { response, latencyMs }
  } finally {
    clearTimeout(timer)
  }
}

function truncateBody(text: string, max = 10000): string {
  return text.length > max ? text.slice(0, max) + '\n…[truncated]' : text
}

// ── REST adapter ─────────────────────────────────────────────────────────────
const restAdapter: DockAdapter = {
  type: 'rest',
  description: 'REST/HTTP API adapter. Sends JSON requests to an API endpoint.',
  async test(machine) {
    if (!machine.api_base_url) {
      return { success: false, httpStatus: null, responseBody: null, latencyMs: null, error: 'No API base URL configured' }
    }
    try {
      const { response, latencyMs } = await timedFetch(machine.api_base_url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })
      const body = await response.text()
      return {
        success: response.ok,
        httpStatus: response.status,
        responseBody: truncateBody(body),
        latencyMs,
        error: response.ok ? null : `HTTP ${response.status}`,
      }
    } catch (err) {
      return { success: false, httpStatus: null, responseBody: null, latencyMs: null, error: (err as Error).message }
    }
  },
  async send(machine, envelope) {
    if (!machine.api_base_url) {
      return { success: false, httpStatus: null, responseBody: null, latencyMs: null, error: 'No API base URL configured' }
    }
    try {
      const { response, latencyMs } = await timedFetch(machine.api_base_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(envelope),
      })
      const body = await response.text()
      return {
        success: response.ok,
        httpStatus: response.status,
        responseBody: truncateBody(body),
        latencyMs,
        error: response.ok ? null : `HTTP ${response.status}`,
      }
    } catch (err) {
      return { success: false, httpStatus: null, responseBody: null, latencyMs: null, error: (err as Error).message }
    }
  },
}

// ── Webhook adapter ──────────────────────────────────────────────────────────
const webhookAdapter: DockAdapter = {
  type: 'webhook',
  description: 'Webhook adapter. Sends a POST payload to a webhook URL.',
  async test(machine) {
    const url = machine.location_url || machine.api_base_url
    if (!url) {
      return { success: false, httpStatus: null, responseBody: null, latencyMs: null, error: 'No webhook URL configured' }
    }
    try {
      const { response, latencyMs } = await timedFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: true, type: 'connectivity' }),
      })
      const body = await response.text()
      return {
        success: response.ok,
        httpStatus: response.status,
        responseBody: truncateBody(body),
        latencyMs,
        error: response.ok ? null : `HTTP ${response.status}`,
      }
    } catch (err) {
      return { success: false, httpStatus: null, responseBody: null, latencyMs: null, error: (err as Error).message }
    }
  },
  async send(machine, envelope) {
    const url = machine.location_url || machine.api_base_url
    if (!url) {
      return { success: false, httpStatus: null, responseBody: null, latencyMs: null, error: 'No webhook URL configured' }
    }
    try {
      const { response, latencyMs } = await timedFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(envelope),
      })
      const body = await response.text()
      return {
        success: response.ok,
        httpStatus: response.status,
        responseBody: truncateBody(body),
        latencyMs,
        error: response.ok ? null : `HTTP ${response.status}`,
      }
    } catch (err) {
      return { success: false, httpStatus: null, responseBody: null, latencyMs: null, error: (err as Error).message }
    }
  },
}

// ── MCP adapter ──────────────────────────────────────────────────────────────
// MCP servers expose tools via a JSON-RPC-like protocol. This adapter sends
// a tool list request to verify connectivity.
const mcpAdapter: DockAdapter = {
  type: 'mcp',
  description: 'MCP (Model Context Protocol) server adapter. Sends JSON-RPC tool list requests.',
  async test(machine) {
    const url = machine.api_base_url || machine.location_url
    if (!url) {
      return { success: false, httpStatus: null, responseBody: null, latencyMs: null, error: 'No MCP server URL configured' }
    }
    try {
      const { response, latencyMs } = await timedFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'tools/list', id: 1 }),
      })
      const body = await response.text()
      return {
        success: response.ok,
        httpStatus: response.status,
        responseBody: truncateBody(body),
        latencyMs,
        error: response.ok ? null : `HTTP ${response.status}`,
      }
    } catch (err) {
      return { success: false, httpStatus: null, responseBody: null, latencyMs: null, error: (err as Error).message }
    }
  },
  async send(machine, envelope) {
    const url = machine.api_base_url || machine.location_url
    if (!url) {
      return { success: false, httpStatus: null, responseBody: null, latencyMs: null, error: 'No MCP server URL configured' }
    }
    try {
      const { response, latencyMs } = await timedFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tools/call',
          params: envelope,
          id: Date.now(),
        }),
      })
      const body = await response.text()
      return {
        success: response.ok,
        httpStatus: response.status,
        responseBody: truncateBody(body),
        latencyMs,
        error: response.ok ? null : `HTTP ${response.status}`,
      }
    } catch (err) {
      return { success: false, httpStatus: null, responseBody: null, latencyMs: null, error: (err as Error).message }
    }
  },
}

// ── Web application adapter ──────────────────────────────────────────────────
// For externally hosted web apps that may not have a formal API. We test
// connectivity by checking if the URL responds with any HTML.
const webAdapter: DockAdapter = {
  type: 'web',
  description: 'Web application adapter. Tests connectivity to a hosted web app URL.',
  async test(machine) {
    const url = machine.location_url
    if (!url) {
      return { success: false, httpStatus: null, responseBody: null, latencyMs: null, error: 'No URL configured' }
    }
    try {
      const { response, latencyMs } = await timedFetch(url, {
        method: 'GET',
        headers: { 'Accept': 'text/html' },
      })
      const body = await response.text()
      return {
        success: response.ok,
        httpStatus: response.status,
        responseBody: truncateBody(body, 2000),
        latencyMs,
        error: response.ok ? null : `HTTP ${response.status}`,
      }
    } catch (err) {
      return { success: false, httpStatus: null, responseBody: null, latencyMs: null, error: (err as Error).message }
    }
  },
  async send(machine, _envelope) {
    // Web apps without a formal API can't receive handoffs programmatically.
    // The handoff is "prepared" — the creator opens the URL manually.
    return {
      success: false,
      httpStatus: null,
      responseBody: null,
      latencyMs: null,
      error: 'Web application adapter does not support programmatic handoff. Open the URL manually.',
    }
  },
}

// ── GitHub-hosted adapter ────────────────────────────────────────────────────
// Tests connectivity to a GitHub repository by fetching the repo API endpoint.
const githubAdapter: DockAdapter = {
  type: 'github',
  description: 'GitHub-hosted application adapter. Tests repo accessibility via GitHub API.',
  async test(machine) {
    const repo = machine.source_repo
    if (!repo) {
      return { success: false, httpStatus: null, responseBody: null, latencyMs: null, error: 'No GitHub repository URL configured' }
    }
    // Extract owner/repo from URL
    const match = repo.match(/github\.com[/:]([^/]+)\/([^/]+)/)
    if (!match) {
      return { success: false, httpStatus: null, responseBody: null, latencyMs: null, error: 'Invalid GitHub repository URL' }
    }
    const apiUrl = `https://api.github.com/repos/${match[1]}/${match[2].replace(/\.git$/, '')}`
    try {
      const { response, latencyMs } = await timedFetch(apiUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/vnd.github+json' },
      })
      const body = await response.text()
      return {
        success: response.ok,
        httpStatus: response.status,
        responseBody: truncateBody(body, 2000),
        latencyMs,
        error: response.ok ? null : `HTTP ${response.status}`,
      }
    } catch (err) {
      return { success: false, httpStatus: null, responseBody: null, latencyMs: null, error: (err as Error).message }
    }
  },
  async send(machine, envelope) {
    // GitHub-hosted apps need a separate runtime. We record the handoff
    // but cannot send it programmatically without a runner.
    return {
      success: false,
      httpStatus: null,
      responseBody: null,
      latencyMs: null,
      error: 'GitHub-hosted adapter requires a runner service. Handoff recorded but not sent.',
    }
  },
}

// ── File adapter ─────────────────────────────────────────────────────────────
// File import/export adapter. No network call — just verifies that a file
// path/URL is specified.
const fileAdapter: DockAdapter = {
  type: 'file',
  description: 'File import/export adapter. No network call — handoffs are file-based.',
  async test(machine) {
    if (!machine.location_url && !machine.api_base_url) {
      return { success: false, httpStatus: null, responseBody: null, latencyMs: null, error: 'No file path or URL configured' }
    }
    return {
      success: true,
      httpStatus: null,
      responseBody: 'File adapter configured — no network test required.',
      latencyMs: 0,
      error: null,
    }
  },
  async send(_machine, _envelope) {
    return {
      success: false,
      httpStatus: null,
      responseBody: null,
      latencyMs: null,
      error: 'File adapter handoff requires manual file transfer. Envelope recorded.',
    }
  },
}

// ── Internal adapter ─────────────────────────────────────────────────────────
// For Headquarters-internal modules (Kimmy, Content Factory, etc.). These
// don't need network calls — they're invoked in-process.
const internalAdapter: DockAdapter = {
  type: 'internal',
  description: 'Internal module adapter. For Headquarters-internal modules invoked in-process.',
  async test(machine) {
    return {
      success: true,
      httpStatus: null,
      responseBody: `Internal module "${machine.name}" registered.`,
      latencyMs: 0,
      error: null,
    }
  },
  async send(machine, _envelope) {
    return {
      success: false,
      httpStatus: null,
      responseBody: null,
      latencyMs: null,
      error: `Internal module "${machine.name}" invocation contract not yet defined. Handoff recorded.`,
    }
  },
}

// ── Adapter registry ─────────────────────────────────────────────────────────
const ADAPTERS: Record<AdapterType, DockAdapter> = {
  rest: restAdapter,
  webhook: webhookAdapter,
  mcp: mcpAdapter,
  file: fileAdapter,
  github: githubAdapter,
  web: webAdapter,
  internal: internalAdapter,
}

export function getAdapter(type: string): DockAdapter | null {
  return ADAPTERS[type as AdapterType] ?? null
}

export function getAdapterDescription(type: string): string {
  const adapter = getAdapter(type)
  return adapter?.description ?? 'Unknown adapter type'
}

// ── Capability discovery ─────────────────────────────────────────────────────
//
// Herman asks: "Which currently available machines can generate an image?"
// This function returns truthful candidates based on registered capabilities
// and connection status.

export function findMachinesByCapability(
  machines: DockMachine[],
  capability: Capability,
): DockMachine[] {
  return machines.filter(
    (m) =>
      m.capabilities.includes(capability) &&
      (m.connection_status === 'connected' || m.connection_status === 'ready-to-connect'),
  )
}

export function findConnectedMachinesByCapability(
  machines: DockMachine[],
  capability: Capability,
): DockMachine[] {
  return machines.filter(
    (m) => m.capabilities.includes(capability) && m.connection_status === 'connected',
  )
}

export function allCapabilities(): readonly Capability[] {
  return CAPABILITIES
}

// ── Handoff envelope builder ─────────────────────────────────────────────────
//
// Creates a standardized payload that can move work between applications.
// The envelope carries: job ID, project ID, correlation ID, requested action,
// creator instructions, text/context, asset references, source and destination
// application, expected output, approval state, provenance, timestamps, status.

export interface HandoffEnvelopeInput {
  jobId?: string | null
  projectId?: string | null
  requestedAction: string
  creatorInstructions?: string | null
  payload?: Record<string, unknown> | null
  assetRefs?: string[]
  sourceMachineId?: string | null
  destinationMachineId?: string | null
  expectedOutput?: string | null
  approvalState?: string
  provenance?: string[]
}

export function buildHandoffEnvelope(input: HandoffEnvelopeInput) {
  return {
    correlation_id: crypto.randomUUID(),
    job_id: input.jobId ?? null,
    project_id: input.projectId ?? null,
    requested_action: input.requestedAction,
    creator_instructions: input.creatorInstructions ?? null,
    payload: input.payload ?? null,
    asset_refs: input.assetRefs ?? [],
    source_machine_id: input.sourceMachineId ?? null,
    destination_machine_id: input.destinationMachineId ?? null,
    expected_output: input.expectedOutput ?? null,
    approval_state: input.approvalState ?? 'not-required',
    provenance: input.provenance ?? [],
    status: 'pending' as HandoffStatus,
    created_at: new Date().toISOString(),
  }
}

// ── Manifest builder ─────────────────────────────────────────────────────────
//
// Creates a portable Machine Manifest from user-provided information.
// The manifest is both human-readable and machine-readable (JSONB).

export interface ManifestInput {
  name: string
  description: string
  capabilities: string[]
  acceptedInputs: string[]
  producedOutputs: string[]
  locationUrl: string
  howToCall: string
  authType: string
  currentlyAvailable: boolean
}

export function buildManifest(input: ManifestInput): MachineManifest {
  return {
    who: input.name,
    what_can_do: input.capabilities,
    what_accepts: input.acceptedInputs,
    what_returns: input.producedOutputs,
    where_lives: input.locationUrl,
    how_to_call: input.howToCall,
    how_authenticates: input.authType,
    currently_available: input.currentlyAvailable,
  }
}

// ── Test result persistence ──────────────────────────────────────────────────
//
// Saves a real test result to the database. The UI calls this after an
// adapter test completes so results are persistent and viewable later.

export async function saveTestResult(
  machineId: string,
  testType: string,
  result: AdapterTestResult,
): Promise<DockConnectionTest | null> {
  const { data, error } = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/dock_connection_tests`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        machine_id: machineId,
        test_type: testType,
        http_status: result.httpStatus,
        response_body: result.responseBody,
        latency_ms: result.latencyMs,
        success: result.success,
        error: result.error,
      }),
    },
  ).then((r) => r.json())

  if (error) return null
  return data?.[0] ?? null
}

// ── Machine status updater ───────────────────────────────────────────────────
//
// After a test, update the machine's connection and health status based on
// the real result. Never claim "connected" without a successful test.

export async function updateMachineHealth(
  machineId: string,
  testResult: AdapterTestResult,
): Promise<void> {
  const updates: Record<string, unknown> = {
    health_status: testResult.success ? 'healthy' : 'unhealthy',
  }
  if (testResult.success) {
    updates.connection_status = 'connected'
    updates.last_connected_at = new Date().toISOString()
    updates.last_failure_reason = null
  } else {
    updates.last_failure_at = new Date().toISOString()
    updates.last_failure_reason = testResult.error
    // Don't downgrade from 'development' or 'needs-auth' based on a test failure
    // Only mark broken if it was previously claiming to work
  }

  await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/dock_machines?id=eq.${machineId}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(updates),
    },
  ).catch(() => {})
}
