export type UniformValue<T> = { value: T }

export const mixerModes = ['add', 'screen', 'max'] as const
export type MixerMode = (typeof mixerModes)[number]

export const tonemappingModes = ['none', 'neutral', 'aces'] as const
export type TonemappingMode = (typeof tonemappingModes)[number]

export const bloomDownscaleModes = ['half', 'quarter'] as const
export type BloomDownscaleMode = (typeof bloomDownscaleModes)[number]

export const layerPreviewModes = ['composite', 'arc', 'disk', 'shards', 'postfxOff'] as const
export type LayerPreviewMode = (typeof layerPreviewModes)[number]

export type ColorRgb = {
  r: number
  g: number
  b: number
}

export type ArcConfig = {
  source: {
    radius: number
    scaleX: number
    scaleY: number
  }
  motion: {
    duration: number
    movementY: number
  }
  emitter: {
    randomX: number
    randomY: number
    scaleMin: number
    scaleMax: number
    minCount: number
    maxCount: number
  }
  warp: {
    angleSpanDeg: number
    radius: number
  }
  rotation: {
    speedDeg: number
  }
  alpha: {
    multiplier: number
  }
  color: ColorRgb
}

export type DiskConfig = {
  shape: {
    radius: number
    softness: number
  }
  scale: {
    start: number
    end: number
    timeFraction: number
  }
  alpha: {
    start: number
    end: number
    fadeStartFraction: number
  }
  color: ColorRgb
}

export type ShardsConfig = {
  shape: {
    triangleSize: number
  }
  distribution: {
    outerRadius: number
    innerRadius: number
  }
  burst: {
    countMin: number
    countMax: number
    speedMin: number
    speedMax: number
    lifetimeMin: number
    lifetimeMax: number
    sizeMin: number
    sizeMax: number
  }
  scaleOverLife: {
    start: number
    peak: number
    end: number
    growTimeFraction: number
  }
  initScale: {
    start: number
    end: number
    timeFraction: number
  }
  alpha: {
    max: number
    min: number
    flashTimeWarpMin: number
    flashTimeWarpMax: number
  }
  color: {
    tint: ColorRgb
    peakBoost: number
  }
}

export type CompositorConfig = {
  sharedScale: {
    start: number
    end: number
    timeFraction: number
  }
  handoff: {
    arcDelayFromDiskScale: number
  }
  effectScale: number
}

export type MixerConfig = {
  arcWeight: number
  diskWeight: number
  shardsWeight: number
  mode: MixerMode
  gain: number
}

export type PostfxConfig = {
  enabled: boolean
  alpha: {
    bloomStrength: number
    bloomClamp: number
  }
  bloom: {
    enabled: boolean
    threshold: number
    intensity: number
    scatter: number
    clamp: number
    tint: ColorRgb
    highQualityFiltering: boolean
    downscale: BloomDownscaleMode
    maxIterations: number
  }
  tonemapping: {
    mode: TonemappingMode
  }
}

export type RuntimeConfig = {
  arc: ArcConfig
  disk: DiskConfig
  shards: ShardsConfig
  compositor: CompositorConfig
  mixer: MixerConfig
  postfx: PostfxConfig
}

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K]
}

export type RuntimeConfigPatch = DeepPartial<RuntimeConfig>

export type RuntimeDebugState = {
  previewMode: LayerPreviewMode
}

export type ParticleState = {
  startTime: number
  duration: number
  offsetX: number
  offsetY: number
  scaleMultiplier: number
  movementY: number
  radius: number
  scaleX: number
  scaleY: number
  enabled: number
}

export type FragmentParticleState = {
  startTime: number
  lifetime: number
  spawnX: number
  spawnY: number
  dirX: number
  dirY: number
  speed: number
  rotation: number
  spriteIndex: number
  sizeMultiplier: number
  flashTimeWarp: number
  enabled: number
}

export type BurstBounds = {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

export type BurstState = {
  originX: number
  originY: number
  startTime: number
  arcStartTime: number
  arcInitialAngle: number
  duration: number
  active: number
  diskRadius: number
  diskSoftness: number
  diskScaleStart: number
  diskScaleEnd: number
  diskScaleTimeFraction: number
  diskAlphaStart: number
  diskAlphaEnd: number
  diskAlphaFadeStartFraction: number
  shardsTriangleSize: number
  shardsOuterRadius: number
  shardsInnerRadius: number
  shardsDuration: number
  shardParticles: FragmentParticleState[]
  arcParticles: ParticleState[]
  bounds: BurstBounds
}

export type BurstStore = {
  bursts: BurstState[]
  nextBurstIndex: number
}

export type CreateClickFxOptions = {
  target: HTMLElement
  listenTarget?: HTMLElement | Window
  config?: RuntimeConfigPatch
  pixelRatioCap?: number
  autoBindPointer?: boolean
}

export type ClickFxInstance = {
  canvas: HTMLCanvasElement
  spawnAtClient: (clientX: number, clientY: number) => void
  spawnAtLocal: (x: number, y: number) => void
  updateConfig: (partial: RuntimeConfigPatch) => void
  resize: () => void
  dispose: () => void
}
