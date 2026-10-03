import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

const directory = new URL('../supabase/functions/roundtable-path-route/', import.meta.url)
const helperSource = await readFile(new URL('conversation.ts', directory), 'utf8')
const compiled = ts.transpileModule(helperSource, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
const { buildConversationMessage } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)
const routeSource = (await readFile(new URL('index.ts', directory), 'utf8')).replace(/^import .*\n/gm, '')
const routeCode = ts.transpileModule(routeSource, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText.replace(/^export \{\};?\s*$/gm, '')

function routeFixture({ rows = [], role = 'owner', readError = false, historyReadError = false } = {}) {
  let handler
  const calls = []
  const clients = []
  const createClient = (url, key, options) => {
    clients.push({ key, options })
    return {
      auth: { getUser: async () => ({ data: { user: { app_metadata: { hq_role: role } } }, error: null }) },
      from() {
        const filters = []
        let count = Infinity
        let single = false
        const query = {
          select() { return query },
          eq(field, value) { filters.push((row) => row[field] === value); return query },
          neq(field, value) { filters.push((row) => row[field] !== value); return query },
          is(field, value) { filters.push((row) => row[field] === value); return query },
          order() { return query },
          limit(value) { count = value; return query },
          result() { return { data: rows.filter((row) => filters.every((filter) => filter(row))).slice(0, count), error: readError || (historyReadError && !single) ? new Error('denied') : null } },
          async single() { single = true; const result = query.result(); return { ...result, data: result.data[0] ?? null } },
          then(resolve, reject) { return Promise.resolve(query.result()).then(resolve, reject) },
        }
        return query
      },
    }
  }
  const deno = { env: { get: (key) => ({ SUPABASE_URL: 'https://example.supabase.co', SUPABASE_ANON_KEY: 'test-anon', SUPABASE_SERVICE_ROLE_KEY: 'test-service' })[key] }, serve: (callback) => { handler = callback } }
  const fetch = async (url, options) => {
    calls.push({ url, body: JSON.parse(options.body) })
    return Response.json({ sessionId: 'test-session', correlationId: 'test-correlation', status: 'final', transcript: [{ body: 'Test reply' }] })
  }
  new Function('createClient', 'buildConversationMessage', 'Deno', 'fetch', 'console', routeCode)(createClient, buildConversationMessage, deno, fetch, { error() {} })
  return { calls, clients, request: (body, headers = { authorization: 'Bearer test-user' }) => handler(new Request('https://example.test/route', { method: 'POST', headers, body: JSON.stringify(body) })), preflight: () => handler(new Request('https://example.test/route', { method: 'OPTIONS' })) }
}

test('later speakers receive earlier replies; a follow-up sees the completed round', () => {
  const firstReply = { role: 'allie', message: 'Use a maintenance mystery as the opening.', path_evidence_verified: true }
  const secondReply = { role: 'challenger', message: 'Keep that opening but show the practical repair.' }
  const secondPrompt = buildConversationMessage('Be Challenger', 'Brainstorm', [firstReply])
  assert.ok(secondPrompt.includes(firstReply.message))
  const followUp = buildConversationMessage('Be Allie', 'Discuss replies', [firstReply, secondReply])
  assert.ok(followUp.indexOf(firstReply.message) < followUp.indexOf(secondReply.message))
  assert.ok(followUp.includes('unverified reply'))
})

test('current creator message is preserved beyond the old 700-character cutoff', () => {
  const message = 'Creative idea '.repeat(150) + 'KEEP THE END'
  assert.ok(buildConversationMessage('Be Allie', message, []).includes(JSON.stringify(message)))
})

test('unicode history is bounded, newest entries survive, and Path JSON stays under 16KB', () => {
  const rows = Array.from({ length: 30 }, (_, i) => ({ role: 'allie', message: `ENTRY-${i} ${'☾🔥'.repeat(3000)}` }))
  const prompt = buildConversationMessage('Be Allie', '🌕'.repeat(1000), rows)
  assert.ok(prompt.includes('ENTRY-29'))
  assert.ok(!prompt.includes('ENTRY-0 '))
  assert.ok(prompt.includes('[excerpt]'))
  assert.ok(Buffer.byteLength(JSON.stringify({ target: 'allie', message: prompt })) <= 16000)
  assert.throws(() => buildConversationMessage('Be Allie', '🌕'.repeat(1600), []), /too long/)
})

test('route loads only the saved message room using the caller JWT; supplied history is ignored', async () => {
  const fixture = routeFixture({ rows: [
    { id: 'anchor', project_id: 'project-a', role: 'creator', message: 'Brainstorm' },
    { id: 'peer', project_id: 'project-a', role: 'allie', message: 'SAME ROOM REPLY' },
    { id: 'other', project_id: 'project-b', role: 'allie', message: 'PRIVATE OTHER PROJECT' },
  ] })
  const response = await fixture.request({ role: 'challenger', message: 'Brainstorm', creatorMessageId: 'anchor', history: [{ message: 'FABRICATED HISTORY' }] })
  assert.equal(response.status, 200)
  assert.ok(fixture.calls[0].body.message.includes('SAME ROOM REPLY'))
  assert.ok(!fixture.calls[0].body.message.includes('PRIVATE OTHER PROJECT'))
  assert.ok(!fixture.calls[0].body.message.includes('FABRICATED HISTORY'))
  assert.equal(fixture.clients[1].key, 'test-anon')
  assert.equal(fixture.clients[1].options.global.headers.Authorization, 'Bearer test-user')
})

test('general room excludes project rooms', async () => {
  const fixture = routeFixture({ rows: [
    { id: 'anchor', project_id: null, role: 'creator', message: 'Hello' },
    { id: 'peer', project_id: null, role: 'allie', message: 'GENERAL REPLY' },
    { id: 'other', project_id: 'project-a', role: 'watcher', message: 'PROJECT REPLY' },
  ] })
  assert.equal((await fixture.request({ role: 'allie', message: 'Hello', creatorMessageId: 'anchor' })).status, 200)
  assert.ok(fixture.calls[0].body.message.includes('GENERAL REPLY'))
  assert.ok(!fixture.calls[0].body.message.includes('PROJECT REPLY'))
})

test('missing/mismatched saved creator message fails before contacting Path', async () => {
  const fixture = routeFixture({ rows: [{ id: 'anchor', project_id: null, role: 'allie', message: 'Hello' }] })
  assert.equal((await fixture.request({ role: 'allie', message: 'Hello', creatorMessageId: 'anchor' })).status, 400)
  assert.equal(fixture.calls.length, 0)
})

test('failed history read, oversized input and missing authentication fail closed', async () => {
  const historyFailure = routeFixture({ historyReadError: true, rows: [{ id: 'anchor', project_id: null, role: 'creator', message: 'Hello' }] })
  assert.equal((await historyFailure.request({ role: 'allie', message: 'Hello', creatorMessageId: 'anchor' })).status, 503)
  assert.equal(historyFailure.calls.length, 0)
  const fixture = routeFixture({ readError: true })
  assert.equal((await fixture.request({ role: 'allie', message: 'Hello', creatorMessageId: 'anchor' })).status, 400)
  assert.equal((await fixture.request({ role: 'allie', message: '🌕'.repeat(1600) })).status, 400)
  assert.equal((await fixture.request({ role: 'allie', message: 'Hello' }, {})).status, 401)
  assert.equal(fixture.calls.length, 0)
  assert.equal((await routeFixture({ role: 'viewer' }).request({ role: 'allie', message: 'Hello' })).status, 403)
})

test('browser preflight works; legacy callers retain their existing route', async () => {
  const fixture = routeFixture()
  const preflight = await fixture.preflight()
  assert.equal(preflight.status, 204)
  assert.match(preflight.headers.get('access-control-allow-headers'), /authorization/)
  const result = await fixture.request({ role: 'watcher', message: 'Check this idea' })
  assert.equal(result.status, 200)
  assert.equal(fixture.calls[0].body.target, 'amber')
  assert.equal(result.headers.get('access-control-allow-origin'), '*')
})
