/**
 * Shared handle to the package-private client→host RPC, set once during
 * apply(). Separated from the panel so the component never holds Context.
 *
 * VERIFY-STEP: confirm the `host` service accessor (`ctx.host.call`) for
 * static client packages against the live catalog.
 */
type HostCall = (method: string, args?: unknown) => Promise<unknown>

let callHost: HostCall | null = null

export function setHostCall(host: { call: HostCall }) {
  callHost = host.call.bind(host)
}

export function hostCall(method: string, args?: unknown): Promise<unknown> {
  if (callHost === null) {
    throw new Error('dsh-butler-memory: host RPC is not available')
  }
  return callHost(method, args)
}
