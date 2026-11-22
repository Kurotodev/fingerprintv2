# fingerprintv2

Transparent browser fingerprinting with exact identifiers and weighted, change-tolerant matching. Built exclusively for web browsers with zero runtime dependencies.

> A browser fingerprint is a probabilistic anti-abuse signal, not proof of a person's identity. Obtain appropriate consent and comply with privacy laws that apply to you.

## Why v2?

An exact hash changes when any input changes. `fingerprintv2` returns both:

- `visitorId`: a deterministic SHA-256 hash of all available components.
- `signature`: selected signals with weights for tolerant server-side comparison.

It never makes network requests, stores data, or requests camera/microphone permission. Device labels are excluded by default and can only include labels the browser already exposes.

## Install

```bash
npm install fingerprintv2
```

## Browser usage

```ts
import FingerprintV2 from 'fingerprintv2'

const agent = await FingerprintV2.load()
const result = await agent.get()

console.log(result.visitorId)
console.log(result.confidence)
console.log(result.signature)
```

Collection starts only when `get()` is called. To include device labels that are already available:

```ts
const agent = await FingerprintV2.load({ includeDeviceLabels: true })
```

## Weighted matching

Store the signature on your server and compare it there:

```ts
import { compareSignatures } from 'fingerprintv2'

const match = compareSignatures(previous.signature, current.signature)

if (match.decision === 'same' || match.decision === 'likely-same') {
  console.log(match.score)
}
```

The default threshold is `0.72`. Missing signals are not counted as mismatches, and a result with less than 25 comparable points is `insufficient-data`.

```ts
compareSignatures(left, right, {
  threshold: 0.8,
  minimumComparableWeight: 30,
})
```

## Signals

The collector can use canvas, offline audio, WebGL, installed-font measurements, screen and viewport properties, timezone, hardware concurrency, memory hints, media-device counts, and network hints. Browser privacy protections may hide or normalize any of them.

Strong signals receive more weight than device counts and hardware limits. Exported `DEFAULT_WEIGHTS` can be inspected, while each signature can be transformed before storage if your application requires a custom policy.

## Security and privacy

- Never use a fingerprint as the sole authentication factor or as an automatic ban decision.
- Hashing does not anonymize data that can be linked back to a person.
- Minimize retention, restrict access, disclose collection, and support deletion requests.
- Expect spoofing: all client-side signals can be modified by a determined client.
- Version stored fingerprints. Algorithm updates may change `visitorId`.

## Development

```bash
npm install
npm run check
```

## License

MIT
