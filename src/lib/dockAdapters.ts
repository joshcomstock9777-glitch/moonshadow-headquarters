// Moonshadow Dock — adapter system and handoff helpers
//
// Dock provides clean adapter interfaces for common connection types.
// Each adapter knows how to build a request and parse a response for its
// protocol. New machines require a small adapter rather than changes
// throughout Headquarters.

import { supabase } from './supabase'
import type {
  AdapterType,
  Capability,
  DockMachine,
  DockConnectionTest,
  HandoffStatus,
  MachineManifest,
} from './dockTypes'
import { CAPABILITIES } from './dockTypes'

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
    return { response, latencyMs: Math.round(performance.now() - start) }
  } finally {
    clearTimeout(timer)
  }
}

function truncateBody(text: string, max = 10000): string {
  return text.length > max ? `${text.slice(0, max)}\n…[truncated]` : text
}

async function requestResult(
  url: string,
  options: RequestInit,
  bodyLimit = 10000,
): Promise<AdapterTestResult> {
  try {
    const { response, latencyMs } = await timedFetch(url, options)
    const body = await response.text()
    return {
      success: response.ok,
      httpStatus: response.status,
      responseBody: truncateBody(body, bodyLimit),
      latencyMs,
      error: response.ok ? null : `HTTP ${response.status}`,
    }
  } catch (err) {
    return {
      success: false,
      httpStatus: null,
      responseBody: null,
      latencyMs: null,
      error: (err as Error).message,
    }
  }
}

const restAdapter: DockAdapter = {
  type: 'rest',
  description: 'REST/HTTP API adapter. Sends JSON requests to an API endpoint.',
  async test(machine) {
    if (!machine.api_base_url) {
      return { success: false, httpStatus: null, responseBody: null, latencyMs: null, error: 'No API base URL configured' }
    }
    return requestResult(machine.api_base_url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })
  },
  async send(machine, envelope) {
    if (!machine.api_base_url) {
      return { success: false, httpStatus: null, responseBody: null, latencyMs: null, error: 'No API base URL configured' }
    }
    return requestResult(machine.api_base_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(envelope),
    })
  },
}

const webhookAdapter: DockAdapter = {
  type: 'webhook',
  description: 'Webhook adapter. Sends a POST payload to a webhook URL.',
  async test(machine) {
    const url = machine.location_url || machine.api_base_url
    if (!url) {
      return { success: false, httpStatus: null, responseBody: null, latencyMs: null, error: 'No webhook URL configured' }
    }
    return requestResult(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: true, type: 'connectivity' }),
    })
  },
  async send(machine, envelope) {
    const url = machine.location_url || machine.api_base_url
    if (!url) {
      return { success: false, httpStatus: null, responseBody: null, latencyMs: null, error: 'No webhook URL configured' }
    }
    return requestResult(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(envelope),
    })
  },
}

const mcpAdapter: DockAdapter = {
  type: 'mcp',
  description: 'MCP (Model Context Protocol) server adapter. Sends JSON-RPC tool list requests.',
  async test(machine) {
    const url = machine.api_base_url || machine.location_url
    if (!url) {
      return { success: false, httpStatus: null, responseBody: null, latencyMs: null, error: 'No MCP server URL configured' }
    }
    return requestResult(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'tools/list', id: 1 }),
    })
  },
  async send(machine, envelope) {
    const url = machine.api_base_url || machine.location_url
    if (!url) {
      return { success: false, httpStatus: null, responseBody: null, latencyMs: null, error: 'No MCP server URL configured' }
    }
    return requestResult(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'tools/call', params: envelope, id: Date.now() }),
    })
  },
}

const webAdapter: DockAdapter = {
  type: 'web',
  description: 'Web application adapter. Tests connectivity to a hosted web app URL.',
  async test(machine) {
    if (!machine.location_url) {
      return { success: false, httpStatus: null, responseBody: null, latencyMs: null, error: 'No URL configured' }
    }
    return requestResult(
      machine.location_url,
      { method: 'GET', headers: { Accept: 'text/html' } },
      2000,
    )
  },
  async send() {
    return {
      success: false,
      httpStatus: null,
      responseBody: null,
      latencyMs: null,
      error: 'Web application adapter does not support programmatic handoff. Open the URL manually.',
    }
  },
}

const githubAdapter: DockAdapter = {
  type: 'github',
  description: 'GitHub-hosted application adapter. Tests repo accessibility via GitHub API.',
  async test(machine) {
    const repo = machine.source_repo
    if (!repo) {
      return { success: false, httpStatus: null, responseBody: null, latencyMs: null, error: 'No GitHub repository URL configured' }
    }
    const match = repo.match(/github\.com[/:]([^/]+)\/([^/]+)/)
    if (!match) {
      return { success: false, httpStatus: null, responseBody: null, latencyMs: null, error: 'Invalid GitHub repository URL' }
    }
    const apiUrl = `https://api.github.com/repos/${match[1]}/${match[2].replace(/\.git$/, '')}`
    return requestResult(apiUrl, { method: 'GET', headers: { Accept: 'application/vnd.github+json' } }, 2000)
  },
  async send() {
    return {
      success: false,
      httpStatus: null,
      responseBody: null,
      latencyMs: null,
      error: 'GitHub-hosted adapter requires a runner service. Handoff recorded but not sent.',
    }
  },
}

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
  async send() {
    return {
      success: false,
      httpStatus: null,
      responseBody: null,
      latencyMs: null,
      error: 'File adapter handoff requires manual file transfer. Envelope recorded.',
    }
  },
}

// Registration is metadata, not proof of an executable internal integration.
// Until Headquarters has a concrete in-process invocation registry, both test
// and send fail honestly so Dock cannot promote metadata-only modules.
const internalAdapter: DockAdapter = {
  type: 'internal',
  description: 'Internal module adapter. Requires a concrete in-process invocation contract before it can report healthy.',
  async test(machine) {
    return {
      success: false,
      httpStatus: null,
      responseBody: null,
      latencyMs: 0,
      error: `Internal module "${machine.name}" is registered but has no executable invocation contract.`,
    }
  },
  async send(machine) {
    return {
      success: false,
      httpStatus: null,
      responseBody: null,
      latencyMs: null,
      error: `Internal module "${machine.name}" invocation contract not yet defined. Handoff recorded.`,
    }
  },
}

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
  return getAdapter(type)?.description ?? 'Unknown adapter type'
}

export function findMachinesByCapability(
  machines: DockMachine[],
  capability: Capability,
): DockMachine[] {
  return machines.filter(
    (machine) =>
      machine.capabilities.includes(capability) &&
      (machine.connection_status === 'connected' || machine.connection_status === 'ready-to-connect'),
  )
}

export function findConnectedMachinesByCapability(
  machines: DockMachine[],
  capability: Capability,
): DockMachine[] {
  return machines.filter(
    (machine) => machine.capabilities.includes(capability) && machine.connection_status === 'connected',
  )
}

export function allCapabilities(): readonly Capability[] {
  return CAPABILITIES
}

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

async function requireAuthenticatedDockSession(): Promise<void> {
  const { data, error } = await supabase.auth.getSession()
  if (error) {
    throw new Error(`Dock authentication check failed: ${error.message}`)
  }
  if (!data.session?.access_token) {
    throw new Error('Dock evidence persistence requires an authenticated Headquarters session.')
  }
}

export async function saveTestResult(
  machineId: string,
  testType: string,
  result: AdapterTestResult,
): Promise<DockConnectionTest | null> {
  await requireAuthenticatedDockSession()

  const { data, error } = await supabase
    .from('dock_connection_tests')
    .insert({
      machine_id: machineId,
      test_type: testType,
      http_status: result.httpStatus,
      response_body: result.responseBody,
      latency_ms: result.latencyMs,
      success: result.success,
      error: result.error,
    })
    .select('*')
    .single()

  if (error) {
    throw new Error(`Failed to persist Dock connection-test evidence: ${error.message}`)
  }
  return (data as DockConnectionTest | null) ?? null
}

export async function updateMachineHealth(
  machineId: string,
  testResult: AdapterTestResult,
): Promise<void> {
  await requireAuthenticatedDockSession()

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
  }

  const { error } = await supabase.from('dock_machines').update(updates).eq('id', machineId)
  if (error) {
    throw new Error(`Failed to persist Dock machine health: ${error.message}`)
  }
}
