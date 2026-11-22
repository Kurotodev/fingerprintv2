import type { FingerprintResult, Signature } from './types'

export interface FiveMOptions {
  endpoint?: string
  resourceName?: string
  fetch?: typeof globalThis.fetch
}

export interface FiveMPayload {
  fingerprint: {
    signature: Record<string, string | number | boolean | null>
  }
}

type FiveMGlobal = typeof globalThis & { GetParentResourceName?: () => string }

export function toFiveMPayload(result: Pick<FingerprintResult, 'signature'>): FiveMPayload {
  return {
    fingerprint: {
      signature: Object.fromEntries(Object.entries(result.signature).map(([key, signal]) => [
        key,
        Array.isArray(signal.value) ? signal.value.join(', ') : signal.value,
      ])) as FiveMPayload['fingerprint']['signature'],
    },
  }
}

export async function sendToFiveM(
  result: Pick<FingerprintResult, 'signature'>,
  options: FiveMOptions = {},
): Promise<Response> {
  const resourceName = options.resourceName
    ?? (globalThis as FiveMGlobal).GetParentResourceName?.()
  if (!resourceName) throw new Error('A FiveM resource name is required')

  const fetchImplementation = options.fetch ?? globalThis.fetch
  if (!fetchImplementation) throw new Error('fetch is unavailable')
  return fetchImplementation(`https://${resourceName}/${options.endpoint ?? 'a2'}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=UTF-8' },
    body: JSON.stringify(toFiveMPayload(result)),
  })
}

export type { Signature }
