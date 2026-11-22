import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { sendToFiveM, toFiveMPayload } from '../dist/fivem.js'

const result = {
  signature: {
    canvasHash: { value: 'abc', weight: 25 },
    deviceLabels: { value: ['Mic', 'Camera'], weight: 20 },
  },
}

describe('FiveM adapter', () => {
  it('creates the legacy-compatible payload', () => {
    assert.deepEqual(toFiveMPayload(result), {
      fingerprint: { signature: { canvasHash: 'abc', deviceLabels: 'Mic, Camera' } },
    })
  })

  it('posts only when explicitly called', async () => {
    const calls = []
    const fetchMock = async (...args) => {
      calls.push(args)
      return new Response(null, { status: 204 })
    }
    const response = await sendToFiveM(result, { resourceName: 'guard', fetch: fetchMock })
    assert.equal(response.status, 204)
    assert.equal(calls.length, 1)
    assert.equal(calls[0][0], 'https://guard/a2')
    assert.equal(calls[0][1].method, 'POST')
  })
})
