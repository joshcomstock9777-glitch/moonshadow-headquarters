import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import React from 'react'
import ts from 'typescript'

const source = await readFile(new URL('../src/components/hq/Roundtable.tsx', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText
const roles = ['herman', 'allie', 'challenger', 'watcher']
const names = { herman: 'Herman', allie: 'Allie', challenger: 'Challenger', watcher: 'Watcher' }

// Exercise the actual component's event handlers with controlled hook state.
// This proves dispatch behavior, not browser layout or live model availability.
function roomFixture({ rejectRole, pauseRole } = {}) {
  const states = [], refs = [], calls = [], rows = []
  let stateIndex = 0, refIndex = 0, requestCount = 0
  let resume
  const hookReact = {
    ...React,
    useState(initial) {
      const index = stateIndex++
      if (!(index in states)) states[index] = initial
      return [states[index], (value) => { states[index] = typeof value === 'function' ? value(states[index]) : value }]
    },
    useRef(initial) { const index = refIndex++; return refs[index] ??= { current: initial } },
    useCallback(callback) { return callback },
    useEffect() {},
  }
  const supabase = {
    from(table) {
      let inserted, descending = false
      const filters = []
      const query = {
        select() { return query },
        order(_, options) { descending = options.ascending === false; return query },
        limit() { return query },
        eq(key, value) { filters.push([key, value]); return query },
        is(key, value) { filters.push([key, value]); return query },
        insert(row) { inserted = { ...row, id: `row-${rows.length}`, created_at: '2026-10-11T22:00:00Z' }; rows.push(inserted); return query },
        async single() { return { data: inserted, error: null } },
        then(resolve, reject) {
          const data = table === 'projects' ? [] : rows.filter(row => filters.every(([key, value]) => row[key] === value))
          return Promise.resolve({ data: descending ? [...data].reverse() : data, error: null }).then(resolve, reject)
        },
      }
      return query
    },
    functions: { invoke: async () => ({ data: { verified: true }, error: null }) },
  }
  const dependencies = {
    react: hookReact,
    'react/jsx-runtime': awaitRuntime,
    '../../lib/supabase': { supabase },
    '../../lib/hq': { ROLES: roles, ROLE_META: Object.fromEntries(roles.map(role => [role, { name: names[role], title: role }])), logActivity: async () => {}, timeAgo: () => 'Just now' },
    '../../lib/router': { navigate() {} },
    '../../lib/pathRoundtable': { async requestRoundtableReply(role, message, options) {
      calls.push({ role, message, options })
      if (role === pauseRole) await new Promise(resolve => { resume = resolve })
      if (role === rejectRole) throw new Error('Sample service failure')
      return { message: `${names[role]} sample reply\nSecond line`, sessionId: `session-${++requestCount}`, correlationId: `correlation-${requestCount}` }
    } },
  }
  const module = { exports: {} }
  new Function('require', 'module', 'exports', compiled)(name => {
    assert.ok(name in dependencies, `Unexpected dependency: ${name}`)
    return dependencies[name]
  }, module, module.exports)
  function expand(node) {
    if (node == null || typeof node !== 'object') return node
    if (Array.isArray(node)) return node.map(expand)
    if (typeof node.type === 'function') return expand(node.type(node.props))
    return { ...node, props: { ...node.props, children: expand(node.props.children) } }
  }
  function render() { stateIndex = refIndex = 0; return expand(module.exports.default({})) }
  function nodes(node) {
    if (arguments.length === 0) node = render()
    if (node == null || typeof node !== 'object') return []
    if (Array.isArray(node)) return node.flatMap(item => nodes(item))
    return [node, ...nodes(node.props.children)]
  }
  function text(node) { return node == null ? '' : typeof node === 'object' ? Array.isArray(node) ? node.map(text).join('') : text(node.props.children) : String(node) }
  const button = label => nodes().find(node => node.type === 'button' && (node.props['aria-label']?.startsWith(label + ':') || text(node) === label))
  const input = () => nodes().find(node => node.type === 'textarea')
  const submit = () => nodes().find(node => node.type === 'form').props.onSubmit({ preventDefault() {} })
  return { calls, rows, render, nodes, text, button, input, submit, release: () => resume() }
}
const awaitRuntime = await import('react/jsx-runtime')

test('only lit participants receive the message; everybody off disables send', async () => {
  const room = roomFixture()
  room.button('Herman').props.onClick()
  room.button('Challenger').props.onClick()
  room.input().props.onChange({ target: { value: 'Continue the story' } })
  await room.submit()
  assert.deepEqual(room.calls.map(call => call.role), ['allie', 'watcher'])
  assert.ok(room.calls.every(call => call.options.creatorMessageId === 'row-0'))
  room.button('Allie').props.onClick()
  room.button('Watcher').props.onClick()
  room.input().props.onChange({ target: { value: 'Nobody should receive this' } })
  assert.equal(room.button('Send').props.disabled, true)
  await room.submit()
  assert.equal(room.calls.length, 2)
})

test('a direct reply targets its speaker and includes the chosen comment', async () => {
  const room = roomFixture()
  room.rows.push({ id: 'original', project_id: null, role: 'allie', message: 'Use three knocks.\nThen silence.', created_at: '2026-10-11T22:00:00Z' })
  room.button('Refresh').props.onClick()
  await new Promise(resolve => setImmediate(resolve))
  room.button('Reply to Allie').props.onClick()
  room.input().props.onChange({ target: { value: 'Keep that ending.' } })
  await room.submit()
  assert.deepEqual(room.calls.map(call => call.role), ['allie'])
  assert.match(room.calls[0].message, /comment original/)
  assert.match(room.calls[0].message, /Use three knocks\.\nThen silence/)
  assert.match(room.calls[0].message, /Keep that ending/)
  assert.equal(room.button('Cancel reply'), undefined)
})

test('Draft script prepares an editable request for Allie without sending', async () => {
  const room = roomFixture()
  room.button('Allie').props.onClick()
  room.input().props.onChange({ target: { value: 'A red door opens on an empty floor' } })
  room.button('Draft script').props.onClick()
  assert.equal(room.calls.length, 0)
  assert.match(room.input().props.value, /Write a complete script.*red door/)
  assert.match(room.input().props.value, /character list/)
  assert.equal(room.button('Allie').props['aria-pressed'], true)
  assert.equal(room.button('Herman').props['aria-pressed'], false)
  await room.submit()
  assert.deepEqual(room.calls.map(call => call.role), ['allie'])
})

test('request indicator tracks the active role and clears after failure', async () => {
  const room = roomFixture({ rejectRole: 'herman', pauseRole: 'herman' })
  room.input().props.onChange({ target: { value: 'Discuss this idea' } })
  const pending = room.submit()
  await new Promise(resolve => setImmediate(resolve))
  assert.match(room.text(room.render()), /Herman is preparing a reply/)
  assert.ok(room.text(room.button('Herman')).includes('Replying…'))
  assert.equal(room.button('Herman').props.disabled, true)
  room.release()
  await pending
  assert.match(room.text(room.render()), /Herman: Sample service failure/)
  assert.ok(!room.text(room.render()).includes('Replying…'))
  assert.equal(room.button('Herman').props.disabled, false)
  assert.deepEqual(room.calls.map(call => call.role), roles)
})
