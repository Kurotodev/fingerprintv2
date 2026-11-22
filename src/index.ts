import { buildSignature, collectComponents, getConfidence, identify } from './collect'
import { hashComponents } from './hash'
import { compareSignatures, DEFAULT_WEIGHTS } from './match'
import type { Agent, FingerprintResult, LoadOptions } from './types'

export const version = '0.1.0'

function settle(delayFallback: number): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(() => resolve(), { timeout: delayFallback })
    } else {
      setTimeout(resolve, delayFallback)
    }
  })
}

export async function collectFingerprint(options: LoadOptions = {}): Promise<FingerprintResult> {
  const components = await collectComponents(options)
  const signature = buildSignature(components)
  const result: FingerprintResult = {
    visitorId: await identify(components),
    confidence: getConfidence(signature),
    components,
    signature,
    version,
  }
  if (options.debug) console.debug('[fingerprintv2]', result)
  return result
}

export async function load(options: LoadOptions = {}): Promise<Agent> {
  await settle(options.delayFallback ?? 50)
  return { get: () => collectFingerprint(options) }
}

export { compareSignatures, DEFAULT_WEIGHTS, hashComponents }
export type {
  Agent,
  Component,
  Components,
  Confidence,
  FingerprintResult,
  LoadOptions,
  MatchDecision,
  MatchOptions,
  MatchResult,
  Signature,
  SignatureSignal,
} from './types'

export default { load, collectFingerprint, compareSignatures, hashComponents, version }
