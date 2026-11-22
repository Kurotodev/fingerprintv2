import { describe, expect, it } from 'vitest'
import { hashComponents } from '../src/hash'

describe('hashComponents', () => {
  it('is stable regardless of object key order', async () => {
    const first = await hashComponents({ screen: '1920x1080', cores: 8 })
    const second = await hashComponents({ cores: 8, screen: '1920x1080' })
    expect(first).toBe(second)
    expect(first).toMatch(/^[a-f0-9]{64}$/)
  })

  it('changes when a component changes', async () => {
    await expect(hashComponents({ cores: 8 })).resolves.not.toBe(await hashComponents({ cores: 4 }))
  })
})
