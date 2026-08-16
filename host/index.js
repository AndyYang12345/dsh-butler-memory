/**
 * Host half of the dsh-butler-memory plugin.
 *
 * Registers package-private RPC endpoints (harness.handle) that proxy the
 * loopback panel API of the `butler-memory-mcp` bridge. The browser half
 * calls them through host.call(method, args) — verified pairing from the
 * DSH client runner: "register a handler there with harness.handle(method,
 * fn) and call it here via host.call(method, args)".
 *
 * VERIFY-STEP (first integration): run `cordis_inspect_list` in a DSH agent
 * and confirm the `harness` service inject name and `handle(method, fn)`
 * signature on this exact DSH version before relying on it.
 */
export const name = 'dsh-butler-memory'

export const inject = ['harness']

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
    throw new Error(`butler memory panel ${response.status}: ${detail || response.statusText}`)
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

export function apply(ctx) {
  ctx.harness.handle('butler-memory.list', (args = {}) =>
    panelRequest(`/v1/memories${queryString(args)}`),
  )

  ctx.harness.handle('butler-memory.search', (args = {}) =>
    panelRequest(`/v1/memories/search${queryString(args)}`),
  )

  ctx.harness.handle('butler-memory.revisions', (args = {}) =>
    panelRequest(`/v1/memories/${args.memoryId}/revisions`),
  )

  ctx.harness.handle('butler-memory.candidates', (args = {}) =>
    panelRequest(`/v1/memory-candidates${queryString(args)}`),
  )

  ctx.harness.handle('butler-memory.acceptCandidate', (args = {}) =>
    panelRequest(`/v1/memory-candidates/${args.candidateId}/accept`, {
      method: 'POST',
    }),
  )

  ctx.harness.handle('butler-memory.rejectCandidate', (args = {}) =>
    panelRequest(`/v1/memory-candidates/${args.candidateId}/reject`, {
      method: 'POST',
    }),
  )
}
