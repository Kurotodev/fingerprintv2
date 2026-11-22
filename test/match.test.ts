import { describe, expect, it } from 'vitest'
import { compareSignatures } from '../src/match'
import type { Signature } from '../src/types'

const base: Signature = {
  audioHash: { value: 'audio-a', weight: 25 },
  canvasHash: { value: 'canvas-a', weight: 25 },
  webglRenderer: { value: 'gpu-a', weight: 20 },
  hardwareConcurrency: { value: 8, weight: 6 },
  videoInput: { value: 1, weight: 4 },
}

describe('compareSignatures', () => {
  it('recognizes identical signatures', () => {
    expect(compareSignatures(base, structuredClone(base))).toMatchObject({ score: 1, decision: 'same' })
  })

  it('tolerates a changing weak signal', () => {
    const changed = structuredClone(base)
    changed.videoInput = { value: 0, weight: 4 }
    const match = compareSignatures(base, changed)
    expect(match.score).toBeCloseTo(0.95)
    expect(match.decision).toBe('likely-same')
  })

  it('rejects differences in strong signals', () => {
    const changed = structuredClone(base)
    changed.audioHash = { value: 'audio-b', weight: 25 }
    changed.canvasHash = { value: 'canvas-b', weight: 25 }
    expect(compareSignatures(base, changed).decision).toBe('different')
  })

  it('reports insufficient comparable data', () => {
    const sparse: Signature = { videoInput: { value: 1, weight: 4 } }
    expect(compareSignatures(sparse, sparse).decision).toBe('insufficient-data')
  })
})
