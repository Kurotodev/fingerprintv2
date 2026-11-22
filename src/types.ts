export type ComponentValue = string | number | boolean | string[] | null

export interface Component<T extends ComponentValue = ComponentValue> {
  value?: T
  error?: string
  duration: number
}

export type Components = Record<string, Component>

export interface SignatureSignal<T extends ComponentValue = ComponentValue> {
  value: T
  weight: number
}

export type Signature = Record<string, SignatureSignal>

export interface Confidence {
  score: number
  availableWeight: number
  totalWeight: number
  comment: string
}

export interface FingerprintResult {
  visitorId: string
  confidence: Confidence
  components: Components
  signature: Signature
  version: string
}

export interface LoadOptions {
  /** Delay collection until the page has settled. */
  delayFallback?: number
  /** Include device labels already exposed by the browser. Never prompts. */
  includeDeviceLabels?: boolean
  /** Maximum time to wait for the offline audio renderer. */
  audioTimeout?: number
  debug?: boolean
}

export interface Agent {
  get(): Promise<FingerprintResult>
}

export interface MatchOptions {
  threshold?: number
  minimumComparableWeight?: number
}

export interface SignalComparison {
  key: string
  weight: number
  matched: boolean
}

export type MatchDecision = 'same' | 'likely-same' | 'different' | 'insufficient-data'

export interface MatchResult {
  score: number
  matchedWeight: number
  comparableWeight: number
  decision: MatchDecision
  details: SignalComparison[]
}
