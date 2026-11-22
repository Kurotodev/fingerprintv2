import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { compareSignatures } from '../dist/index.js'

const base = {
  audioHash: { value: 'audio-a', weight: 25 },
  canvasHash: { value: 'canvas-a', weight: 25 },
  webglRenderer: { value: 'gpu-a', weight: 20 },
  hardwareConcurrency: { value: 8, weight: 6 },
  videoInput: { value: 1, weight: 4 },
}

describe('compareSignatures', () => {
  it('recognizes identical signatures', () => {
    const match = compareSignatures(base, structuredClone(base))
    assert.equal(match.score, 1)
    assert.equal(match.decision, 'same')
  })

  it('tolerates a changing weak signal', () => {
    const changed = structuredClone(base)
    changed.videoInput = { value: 0, weight: 4 }
    const match = compareSignatures(base, changed)
    assert.equal(match.score, 0.95)
    assert.equal(match.decision, 'likely-same')
  })

  it('rejects differences in strong signals', () => {
    const changed = structuredClone(base)
    changed.audioHash = { value: 'audio-b', weight: 25 }
    changed.canvasHash = { value: 'canvas-b', weight: 25 }
    assert.equal(compareSignatures(base, changed).decision, 'different')
  })

  it('reports insufficient comparable data', () => {
    const sparse = { videoInput: { value: 1, weight: 4 } }
    assert.equal(compareSignatures(sparse, sparse).decision, 'insufficient-data')
  })
})
