/**
 * Host half of the dsh-butler-memory plugin.
 *
 * Registers a logical RPC channel (ctx.connection.rpc.handle) that proxies
 * the loopback panel API of `butler-memory-mcp` for the browser half, which
 * calls it through ctx.connection.rpc.call(channel, endpoint, payload).
 * Verified against the DSH connection contract (HostConnectionRpc /
 * ClientConnectionRpc in @deepseek-ai/dsh-client-connection): channels are
 * absolute names, handlers return the RpcResult envelope, and `authority`
 * picks the trust fence — `loopback` matches the panel API's own binding.
 *
 * The plugin is deliberately OPTIONAL: it declares no inject, so profiles
 * without the web stack (headless) still boot; the MCP tool row works
 * independently.
 *
 * The butler-memory skill is installed at RUNTIME (idempotent copy into
 * $DSH_HOME/skills) instead of a postinstall script: pnpm blocks dependency
 * build scripts by default and dsh treats that block as an install failure.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const name = 'dsh-butler-memory'

export const inject = []

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

const PANEL_URL = () =>
  process.env.BUTLER_MEMORY_PANEL_URL ?? 'http://127.0.0.1:8771'

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

const ENDPOINTS = {
  'memory/health': () =>
    fetch(`${PANEL_URL()}/health/live`, { method: 'GET' })
      .then((response) => (response.ok ? { ok: true } : { ok: false }))
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

export function apply(ctx) {
  ensureSkillInstalled()
  // Official pattern (verified in dsh-api-gateway): declare the dependency
  // with ctx.inject so the callback receives a context that resolves both
  // `connection` and the `webServer` the route registration needs. In
  // profiles without the web stack the callback simply never runs, which is
  // the intended optional behavior.
  ctx.inject(['connection'], (connectionCtx) => {
    connectionCtx.connection.rpc.handle(
      '/butler-memory',
      async (endpoint, payload) => {
        const handler = ENDPOINTS[endpoint]
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
}
