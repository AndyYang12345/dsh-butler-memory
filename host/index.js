/**
 * Host half of the dsh-butler-memory plugin.
 *
 * Data channels:
 * - Agent tools: the `dsh-mcp-client` row in cordis.patch.yml spawns
 *   `ai-butler-memory-mcp --transport stdio` (DSH-managed lifecycle).
 * - Panel: this plugin spawns ITS OWN stdio bridge (lazy, restarted on
 *   demand after a crash) and answers the /butler-memory RPC channel by
 *   forwarding tools/call over JSON-RPC — nothing needs to run manually.
 *   Setting BUTLER_MEMORY_PANEL_URL opts back into the loopback HTTP mode.
 *
 * RPC pairing (verified against the DSH connection contract): the host
 * half registers with ctx.connection.rpc.handle and the browser half calls
 * ctx.connection.rpc.call(channel, endpoint, payload). Handlers return the
 * RpcResult envelope; `authority: 'loopback'` matches the panel's binding.
 *
 * The butler-memory skill is installed at RUNTIME (idempotent copy into
 * $DSH_HOME/skills) instead of a postinstall script: pnpm blocks dependency
 * build scripts by default and dsh treats that block as an install failure.
 */
import { spawn } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { createInterface } from 'node:readline'
import { fileURLToPath } from 'node:url'

export const name = 'dsh-butler-memory'

export const inject = []

// ── runtime skill installation ────────────────────────────────────────────

function ensureSkillInstalled() {
  try {
    const source = fileURLToPath(
      new URL('../skills/butler-memory/SKILL.md', import.meta.url),
    )
    const skillDir = join(
      process.env.DSH_HOME || join(homedir(), '.dsh'),
      'skills',
      'butler-memory',
    )
    const target = join(skillDir, 'SKILL.md')
    const upToDate =
      existsSync(target) && readFileSync(target).equals(readFileSync(source))
    if (!upToDate) {
      mkdirSync(skillDir, { recursive: true })
      copyFileSync(source, target)
    }
  } catch (cause) {
    // Skill installation is an enhancement: never break the plugin over it.
    console.warn(
      '[dsh-butler-memory] could not install the butler-memory skill:',
      cause instanceof Error ? cause.message : cause,
    )
  }
}

// ── minimal MCP stdio client (tools/call only) ────────────────────────────

const INIT_ID = 'bm-init'
const HANDSHAKE_TIMEOUT_MS = 8000
const CALL_TIMEOUT_MS = 10000

class StdioBridge {
  constructor(command) {
    this.command = command
    this.child = null
    this.starting = null
    this.nextId = 1
    this.pending = new Map()
    this.healthy = false
    this.disposed = false
  }

  _write(frame) {
    if (this.child === null || this.disposed) return
    this.child.stdin.write(`${JSON.stringify(frame)}\n`)
  }

  _failAll(message) {
    for (const entry of this.pending.values()) {
      entry.reject(new Error(message))
    }
    this.pending.clear()
    this.healthy = false
  }

  _handleLine(line) {
    let message
    try {
      message = JSON.parse(line)
    } catch {
      return
    }
    if (message === null || typeof message !== 'object') return
    const id = String(message.id ?? '')
    if (id === INIT_ID) {
      const init = this.pending.get(INIT_ID)
      if (init === undefined) return
      this.pending.delete(INIT_ID)
      if (message.error !== undefined) {
        init.reject(
          new Error(`bridge initialize failed: ${message.error.message}`),
        )
        return
      }
      this.healthy = true
      this._write({ jsonrpc: '2.0', method: 'notifications/initialized' })
      init.resolve(true)
      return
    }
    const entry = this.pending.get(id)
    if (entry === undefined) return
    this.pending.delete(id)
    if (message.error !== undefined) {
      entry.reject(new Error(`bridge error: ${message.error.message}`))
      return
    }
    const result = message.result ?? {}
    if (result.isError === true) {
      entry.reject(
        new Error(
          `bridge tool failed: ${result.content?.[0]?.text ?? 'unknown'}`,
        ),
      )
      return
    }
    const text = result.content?.[0]?.text
    let value = null
    try {
      value = text === undefined ? null : JSON.parse(text)
    } catch {
      value = { raw: text }
    }
    entry.resolve(value)
  }

  async ensureStarted() {
    if (this.disposed) throw new Error('butler-memory bridge is disposed')
    if (this.healthy && this.child !== null) return
    if (this.starting !== null) return this.starting
    this.starting = this._start().finally(() => {
      this.starting = null
    })
    return this.starting
  }

  async _start() {
    this._failAll('bridge restarting')
    const child = spawn(this.command, ['--transport', 'stdio'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: process.env,
    })
    this.child = child
    child.stderr.on('data', (chunk) => {
      process.stderr.write(`[dsh-butler-memory bridge] ${chunk}`)
    })
    child.on('error', (error) => {
      this.healthy = false
      this._failAll(`bridge spawn failed: ${error.message}`)
    })
    child.on('exit', () => {
      this.healthy = false
      this.child = null
      this._failAll('bridge exited; it will restart on the next call')
    })
    const lines = createInterface({ input: child.stdout })
    lines.on('line', (line) => this._handleLine(line))

    const init = new Promise((resolve, reject) => {
      this.pending.set(INIT_ID, { resolve, reject })
      this._write({
        jsonrpc: '2.0',
        id: INIT_ID,
        method: 'initialize',
        params: {
          protocolVersion: '2025-11-25',
          capabilities: {},
          clientInfo: { name: 'dsh-butler-memory', version: '0.1.2' },
        },
      })
    })
    const timeout = new Promise((_, reject) => {
      setTimeout(
        () =>
          reject(
            new Error(
              'bridge handshake timed out; is ai-butler-memory-mcp on PATH?',
            ),
          ),
        HANDSHAKE_TIMEOUT_MS,
      )
    })
    return Promise.race([init, timeout])
  }

  async call(tool, payload, timeoutMs = CALL_TIMEOUT_MS) {
    await this.ensureStarted()
    const id = String(this.nextId++)
    const response = new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      this._write({
        jsonrpc: '2.0',
        id,
        method: 'tools/call',
        params: { name: tool, arguments: payload ?? {} },
      })
    })
    const timeout = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`bridge call ${tool} timed out`)), timeoutMs)
    })
    return Promise.race([response, timeout])
  }

  dispose() {
    this.disposed = true
    this._failAll('bridge disposed')
    if (this.child !== null) {
      this.child.kill()
      this.child = null
    }
    this.healthy = false
  }
}

// ── HTTP fallback mode (BUTLER_MEMORY_PANEL_URL set) ──────────────────────

const PANEL_URL = () => process.env.BUTLER_MEMORY_PANEL_URL

async function panelRequest(path, { method = 'GET', body } = {}) {
  const response = await fetch(`${PANEL_URL()}${path}`, {
    method,
    headers: { 'content-type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
  if (!response.ok) {
    let detail = ''
    try {
      detail = JSON.stringify(await response.json())
    } catch {
      /* keep the status line */
    }
    throw new Error(
      `butler memory panel ${response.status}: ${detail || response.statusText}`,
    )
  }
  return response.json()
}

function queryString(params) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== null) search.set(key, String(value))
  }
  const text = search.toString()
  return text ? `?${text}` : ''
}

const HTTP_ENDPOINTS = {
  'memory/health': () =>
    fetch(`${PANEL_URL()}/health/live`, { method: 'GET' })
      .then((response) => ({ ok: response.ok }))
      .catch(() => ({ ok: false })),
  'memory/list': (payload = {}) =>
    panelRequest(`/v1/memories${queryString(payload)}`),
  'memory/search': (payload = {}) =>
    panelRequest(`/v1/memories/search${queryString(payload)}`),
  'memory/revisions': (payload = {}) =>
    panelRequest(`/v1/memories/${payload.memoryId}/revisions`),
  'memory/candidates': (payload = {}) =>
    panelRequest(`/v1/memory-candidates${queryString(payload)}`),
  'memory/candidates/accept': (payload = {}) =>
    panelRequest(`/v1/memory-candidates/${payload.candidateId}/accept`, {
      method: 'POST',
    }),
  'memory/candidates/reject': (payload = {}) =>
    panelRequest(`/v1/memory-candidates/${payload.candidateId}/reject`, {
      method: 'POST',
    }),
}

// ── stdio mode endpoints (default) ────────────────────────────────────────

function stdioEndpoints(bridge) {
  return {
    'memory/health': async () => {
      try {
        await bridge.ensureStarted()
        return { ok: bridge.healthy }
      } catch {
        return { ok: false }
      }
    },
    'memory/list': (payload = {}) => bridge.call('memory_list', payload),
    'memory/search': (payload = {}) => bridge.call('memory_search', payload),
    'memory/revisions': (payload = {}) =>
      bridge.call('memory_revisions', payload),
    'memory/candidates': (payload = {}) =>
      bridge.call('memory_candidates', payload),
    'memory/candidates/accept': (payload = {}) =>
      bridge.call('memory_candidate_accept', payload),
    'memory/candidates/reject': (payload = {}) =>
      bridge.call('memory_candidate_reject', payload),
  }
}

// ── plugin body ───────────────────────────────────────────────────────────

export function apply(ctx) {
  ensureSkillInstalled()

  const panelUrl = process.env.BUTLER_MEMORY_PANEL_URL
  const bridge =
    panelUrl === undefined
      ? new StdioBridge(
          process.env.AI_BUTLER_MEMORY_MCP_COMMAND || 'ai-butler-memory-mcp',
        )
      : null
  const endpoints = bridge !== null ? stdioEndpoints(bridge) : HTTP_ENDPOINTS

  // Official pattern (verified in dsh-api-gateway): declare the dependency
  // with ctx.inject so the callback receives a context that resolves both
  // `connection` and the `webServer` the route registration needs. In
  // profiles without the web stack the callback simply never runs.
  ctx.inject(['connection'], (connectionCtx) => {
    connectionCtx.connection.rpc.handle(
      '/butler-memory',
      async (endpoint, payload) => {
        const handler = endpoints[endpoint]
        if (handler === undefined) {
          return {
            ok: false,
            error: {
              code: 'internal',
              message: `unknown butler-memory endpoint: ${endpoint}`,
              details: {},
            },
          }
        }
        try {
          return { ok: true, value: await handler(payload ?? {}) }
        } catch (cause) {
          const message =
            cause instanceof Error ? cause.message : String(cause ?? 'panel error')
          return {
            ok: false,
            error: { code: 'internal', message, details: {} },
          }
        }
      },
      { authority: 'loopback' },
    )
  })

  if (bridge !== null) {
    ctx.effect(() => bridge.dispose, 'butler-memory: stdio panel bridge')
  }
}
