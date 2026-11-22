import { hash, hashComponents } from './hash'
import { DEFAULT_WEIGHTS } from './match'
import type {
  Component,
  Components,
  ComponentValue,
  Confidence,
  LoadOptions,
  Signature,
} from './types'

type NavigatorWithExtras = Navigator & {
  deviceMemory?: number
  connection?: { effectiveType?: string; downlink?: number }
  mozConnection?: { effectiveType?: string; downlink?: number }
  webkitConnection?: { effectiveType?: string; downlink?: number }
}

type PerformanceWithMemory = Performance & {
  memory?: { jsHeapSizeLimit?: number }
}

async function measure<T extends ComponentValue>(collector: () => T | Promise<T>): Promise<Component<T>> {
  const startedAt = performance.now()
  try {
    return { value: await collector(), duration: performance.now() - startedAt }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : String(error),
      duration: performance.now() - startedAt,
    }
  }
}

function requireBrowser(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined' || typeof navigator === 'undefined') {
    throw new Error('fingerprintv2 must collect inside a browser or WebView')
  }
}

async function canvasSignals(): Promise<{ canvasHash: string; canvasDataLength: number }> {
  const canvas = document.createElement('canvas')
  canvas.width = 280
  canvas.height = 60
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas 2D is unavailable')

  context.textBaseline = 'top'
  context.font = "14px 'Arial'"
  context.fillStyle = '#f60'
  context.fillRect(125, 1, 62, 20)
  context.fillStyle = '#069'
  context.fillText('fingerprintv2 ⚡ canvas', 2, 15)
  context.fillStyle = 'rgba(102, 204, 0, 0.7)'
  context.fillText('fingerprintv2 ⚡ canvas', 4, 17)

  const data = canvas.toDataURL()
  return { canvasHash: await hash(data), canvasDataLength: data.length }
}

function webglSignals(): Record<string, ComponentValue> {
  const canvas = document.createElement('canvas')
  const gl = (canvas.getContext('webgl') ?? canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null
  if (!gl) throw new Error('WebGL is unavailable')

  const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
  const dimensions = gl.getParameter(gl.MAX_VIEWPORT_DIMS) as Int32Array
  const output: Record<string, ComponentValue> = {
    webglVendor: debugInfo
      ? String(gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL))
      : String(gl.getParameter(gl.VENDOR)),
    webglRenderer: debugInfo
      ? String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL))
      : String(gl.getParameter(gl.RENDERER)),
    webglVersion: String(gl.getParameter(gl.VERSION)),
    webglShadingLanguageVersion: String(gl.getParameter(gl.SHADING_LANGUAGE_VERSION)),
    webglMaxTextureSize: Number(gl.getParameter(gl.MAX_TEXTURE_SIZE)),
    webglMaxRenderBufferSize: Number(gl.getParameter(gl.MAX_RENDERBUFFER_SIZE)),
    webglMaxViewportDimensions: Array.from(dimensions).join('x'),
  }
  gl.getExtension('WEBGL_lose_context')?.loseContext()
  return output
}

async function audioSignals(timeout: number): Promise<{ audioHash: string; audioSum: number }> {
  const AudioContextClass = window.OfflineAudioContext
    ?? (window as typeof window & { webkitOfflineAudioContext?: typeof OfflineAudioContext }).webkitOfflineAudioContext
  if (!AudioContextClass) throw new Error('OfflineAudioContext is unavailable')

  const context = new AudioContextClass(1, 44_100, 44_100)
  const oscillator = context.createOscillator()
  const compressor = context.createDynamicsCompressor()
  oscillator.type = 'triangle'
  oscillator.frequency.value = 10_000
  oscillator.connect(compressor)
  compressor.connect(context.destination)
  oscillator.start(0)

  const rendered = await Promise.race([
    context.startRendering(),
    new Promise<never>((_resolve, reject) => {
      setTimeout(() => reject(new Error('Audio rendering timed out')), timeout)
    }),
  ])
  const samples = rendered.getChannelData(0)
  let sum = 0
  for (const sample of samples) sum += Math.abs(sample)
  return { audioHash: await hash(sum.toString()), audioSum: sum }
}

function fontSignals(): { fonts: string[]; fontCount: number } {
  if (!document.body) throw new Error('document.body is unavailable')
  const baseFonts = ['monospace', 'sans-serif', 'serif']
  const candidates = [
    'Arial', 'Arial Black', 'Calibri', 'Cambria', 'Comic Sans MS', 'Consolas',
    'Courier New', 'Georgia', 'Impact', 'Lucida Console', 'Segoe UI', 'Tahoma',
    'Times New Roman', 'Trebuchet MS', 'Verdana', 'MS Gothic', 'Malgun Gothic', 'SimSun',
  ]
  const span = document.createElement('span')
  span.style.cssText = 'position:absolute;left:-9999px;font-size:72px'
  span.textContent = 'mmmmmmmmmmlli'
  document.body.appendChild(span)

  try {
    const baseline = new Map<string, string>()
    for (const baseFont of baseFonts) {
      span.style.fontFamily = baseFont
      baseline.set(baseFont, `${span.offsetWidth}x${span.offsetHeight}`)
    }
    const fonts = candidates.filter((candidate) => baseFonts.some((baseFont) => {
      span.style.fontFamily = `'${candidate}',${baseFont}`
      return `${span.offsetWidth}x${span.offsetHeight}` !== baseline.get(baseFont)
    }))
    return { fonts, fontCount: fonts.length }
  } finally {
    span.remove()
  }
}

async function mediaSignals(includeLabels: boolean): Promise<Record<string, ComponentValue>> {
  if (!navigator.mediaDevices?.enumerateDevices) throw new Error('enumerateDevices is unavailable')
  const devices = await navigator.mediaDevices.enumerateDevices()
  const byKind = {
    audioinput: devices.filter((device) => device.kind === 'audioinput'),
    audiooutput: devices.filter((device) => device.kind === 'audiooutput'),
    videoinput: devices.filter((device) => device.kind === 'videoinput'),
  }
  const labels = includeLabels
    ? devices.map((device) => device.label).filter(Boolean).sort()
    : []
  return {
    audioInput: byKind.audioinput.length,
    audioOutput: byKind.audiooutput.length,
    videoInput: byKind.videoinput.length,
    deviceLabels: labels,
  }
}

function addGroup(components: Components, group: Record<string, ComponentValue>, duration: number): void {
  for (const [key, value] of Object.entries(group)) components[key] = { value, duration }
}

async function measuredGroup(collector: () => Record<string, ComponentValue> | Promise<Record<string, ComponentValue>>) {
  const startedAt = performance.now()
  try {
    return { values: await collector(), duration: performance.now() - startedAt }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : String(error),
      duration: performance.now() - startedAt,
    }
  }
}

export async function collectComponents(options: LoadOptions = {}): Promise<Components> {
  requireBrowser()
  const nav = navigator as NavigatorWithExtras
  const screenObject = window.screen
  const connection = nav.connection ?? nav.mozConnection ?? nav.webkitConnection
  const components: Components = {}

  const basicCollectors: Record<string, () => ComponentValue> = {
    hardwareConcurrency: () => navigator.hardwareConcurrency ?? null,
    deviceMemory: () => nav.deviceMemory ?? null,
    doNotTrack: () => navigator.doNotTrack ?? null,
    screenResolution: () => `${screenObject.width}x${screenObject.height}`,
    availableScreenResolution: () => `${screenObject.availWidth}x${screenObject.availHeight}`,
    colorDepth: () => screenObject.colorDepth,
    pixelDepth: () => screenObject.pixelDepth,
    devicePixelRatio: () => window.devicePixelRatio,
    viewport: () => `${window.innerWidth}x${window.innerHeight}`,
    timezone: () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    timezoneOffset: () => new Date().getTimezoneOffset(),
    jsHeapSizeLimit: () => (performance as PerformanceWithMemory).memory?.jsHeapSizeLimit ?? null,
    connectionType: () => connection?.effectiveType ?? null,
    connectionDownlink: () => connection?.downlink ?? null,
  }

  await Promise.all(Object.entries(basicCollectors).map(async ([key, collector]) => {
    components[key] = await measure(collector)
  }))

  const [canvas, webgl, audio, fonts, media] = await Promise.all([
    measuredGroup(canvasSignals),
    measuredGroup(webglSignals),
    measuredGroup(() => audioSignals(options.audioTimeout ?? 1_500)),
    measuredGroup(fontSignals),
    measuredGroup(() => mediaSignals(options.includeDeviceLabels ?? false)),
  ])

  for (const [name, group] of Object.entries({ canvas, webgl, audio, fonts, media })) {
    if (group.values) addGroup(components, group.values, group.duration)
    else components[`${name}Error`] = { error: group.error ?? 'Unavailable', duration: group.duration }
  }

  return components
}

export function buildSignature(components: Components): Signature {
  const signature: Signature = {}
  for (const [key, weight] of Object.entries(DEFAULT_WEIGHTS)) {
    const component = components[key]
    if (component && 'value' in component && component.value !== undefined) {
      signature[key] = { value: component.value, weight }
    }
  }
  return signature
}

export function getConfidence(signature: Signature): Confidence {
  const totalWeight = Object.values(DEFAULT_WEIGHTS).reduce((sum, weight) => sum + weight, 0)
  const availableWeight = Object.values(signature).reduce((sum, signal) => {
    const present = signal.value !== null && signal.value !== ''
      && (!Array.isArray(signal.value) || signal.value.length > 0)
    return sum + (present ? signal.weight : 0)
  }, 0)
  const score = availableWeight / totalWeight
  return {
    score,
    availableWeight,
    totalWeight,
    comment: score >= 0.75 ? 'Most stable signals are available.' : 'Some stable signals are unavailable.',
  }
}

export async function identify(components: Components) {
  const values = Object.fromEntries(
    Object.entries(components)
      .filter((entry): entry is [string, Component & { value: ComponentValue }] => entry[1].value !== undefined)
      .map(([key, component]) => [key, component.value]),
  )
  return hashComponents(values)
}
