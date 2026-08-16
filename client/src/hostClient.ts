/**
 * Shared handle to the generic client→host Connection RPC, set once during
 * apply(). The browser half calls the host-registered channel
 * `/butler-memory` and unwraps the RpcResult envelope.
 */
interface RpcCaller {
  call(
    channel: string,
    endpoint: string,
    payload?: unknown,
    signal?: AbortSignal,
  ): Promise<{ ok: boolean; value?: unknown; error?: { message: string } }>
}

let rpc: RpcCaller | null = null

export function setRpc(caller: RpcCaller) {
  rpc = caller
}

export async function hostCall(endpoint: string, payload?: unknown): Promise<unknown> {
  if (rpc === null) {
    throw new Error('dsh-butler-memory: connection RPC is not available')
  }
  const result = await rpc.call('/butler-memory', endpoint, payload ?? {})
  if (!result.ok) {
    throw new Error(result.error?.message ?? 'butler-memory RPC failed')
  }
  return result.value
}
