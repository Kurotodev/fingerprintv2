function stableValue(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stableValue).join(',')}]`

  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, entryValue]) => `${JSON.stringify(key)}:${stableValue(entryValue)}`)
  return `{${entries.join(',')}}`
}

function fallbackHash(input: string): string {
  const seeds = [0x811c9dc5, 0x9e3779b9, 0x85ebca6b, 0xc2b2ae35]
  return seeds
    .map((seed) => {
      let hash = seed >>> 0
      for (let index = 0; index < input.length; index += 1) {
        hash ^= input.charCodeAt(index)
        hash = Math.imul(hash, 0x01000193) >>> 0
      }
      return hash.toString(16).padStart(8, '0')
    })
    .join('')
}

export async function hash(input: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle
  if (!subtle) return fallbackHash(input)

  const bytes = new TextEncoder().encode(input)
  const digest = await subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function hashComponents(components: Record<string, unknown>): Promise<string> {
  return hash(stableValue(components))
}

export function canonicalize(value: unknown): string {
  return stableValue(value)
}
