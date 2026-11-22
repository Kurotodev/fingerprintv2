import { canonicalize } from './hash'
import type { MatchOptions, MatchResult, Signature, SignatureSignal } from './types'

export const DEFAULT_WEIGHTS: Readonly<Record<string, number>> = Object.freeze({
  audioHash: 25,
  canvasHash: 25,
  webglRenderer: 20,
  deviceLabels: 20,
  audioSum: 8,
  hardwareConcurrency: 6,
  audioInput: 4,
  audioOutput: 4,
  videoInput: 4,
  webglMaxRenderBufferSize: 3,
})

function hasValue(signal: SignatureSignal | undefined): signal is SignatureSignal {
  if (!signal) return false
  const { value } = signal
  return value !== null && value !== '' && (!Array.isArray(value) || value.length > 0)
}

function valuesMatch(key: string, left: SignatureSignal, right: SignatureSignal): boolean {
  if (key === 'audioSum' && typeof left.value === 'number' && typeof right.value === 'number') {
    const scale = Math.max(Math.abs(left.value), Math.abs(right.value), 1)
    return Math.abs(left.value - right.value) / scale <= 0.000001
  }
  return canonicalize(left.value) === canonicalize(right.value)
}

export function compareSignatures(
  left: Signature,
  right: Signature,
  options: MatchOptions = {},
): MatchResult {
  const threshold = options.threshold ?? 0.72
  const minimumComparableWeight = options.minimumComparableWeight ?? 25
  const keys = [...new Set([...Object.keys(left), ...Object.keys(right)])].sort()
  let matchedWeight = 0
  let comparableWeight = 0
  const details = []

  for (const key of keys) {
    const leftSignal = left[key]
    const rightSignal = right[key]
    if (!hasValue(leftSignal) || !hasValue(rightSignal)) continue

    const weight = Math.min(leftSignal.weight, rightSignal.weight)
    const matched = valuesMatch(key, leftSignal, rightSignal)
    comparableWeight += weight
    if (matched) matchedWeight += weight
    details.push({ key, weight, matched })
  }

  const score = comparableWeight === 0 ? 0 : matchedWeight / comparableWeight
  let decision: MatchResult['decision']
  if (comparableWeight < minimumComparableWeight) decision = 'insufficient-data'
  else if (score === 1) decision = 'same'
  else if (score >= threshold) decision = 'likely-same'
  else decision = 'different'

  return { score, matchedWeight, comparableWeight, decision, details }
}
