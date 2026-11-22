import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { hashComponents } from '../dist/index.js'

describe('hashComponents', () => {
  it('is stable regardless of object key order', async () => {
    const first = await hashComponents({ screen: '1920x1080', cores: 8 })
    const second = await hashComponents({ cores: 8, screen: '1920x1080' })
    assert.equal(first, second)
    assert.match(first, /^[a-f0-9]{64}$/)
  })

  it('changes when a component changes', async () => {
    assert.notEqual(await hashComponents({ cores: 8 }), await hashComponents({ cores: 4 }))
  })
})
