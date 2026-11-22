import { describe, expect, it, vi } from 'vitest'
import { sendToFiveM, toFiveMPayload } from '../src/fivem'

const result = {
  signature: {
    canvasHash: { value: 'abc', weight: 25 },
    deviceLabels: { value: ['Mic', 'Camera'], weight: 20 },
  },
}

describe('FiveM adapter', () => {
  it('creates the legacy-compatible payload', () => {
    expect(toFiveMPayload(result)).toEqual({
      fingerprint: { signature: { canvasHash: 'abc', deviceLabels: 'Mic, Camera' } },
    })
  })

  it('posts only when explicitly called', async () => {
    const response = new Response(null, { status: 204 })
    const fetchMock = vi.fn().mockResolvedValue(response)
    await expect(sendToFiveM(result, { resourceName: 'guard', fetch: fetchMock })).resolves.toBe(response)
    expect(fetchMock).toHaveBeenCalledWith('https://guard/a2', expect.objectContaining({ method: 'POST' }))
  })
})
