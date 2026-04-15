export type UniformValue<T> = { value: T }
export const finalMixerModes = ['normalized', 'add', 'screen', 'max'] as const
export type FinalMixerMode = (typeof finalMixerModes)[number]
export const tonemappingModes = ['none', 'neutral', 'aces'] as const
export type TonemappingMode = (typeof tonemappingModes)[number]

export type BranchKey = 'mainArc' | 'coreDisk' | 'mainFx' | 'fragments' | 'filter'
export type StageKey =
  | 'a1'
  | 'a2'
  | 'a3'
  | 'a4'
  | 'a6'
  | 'a7'
  | 'bBase'
  | 'bScale'
  | 'bAlpha'
  | 'bFinal'
  | 'c1'
  | 'd0'
  | 'd1'
  | 'd2'
  | 'd3'
  | 'd4'
  | 'd5'
  | 'd6'
  | 'd7'
  | 'd8'
  | 'd9'
  | 'fx'
export type MainArcPreviewStage = 'a1' | 'a3' | 'a4' | 'a6' | 'a7'
export type CorePreviewStage = 'bBase' | 'bScale' | 'bAlpha' | 'bFinal'
export type FragmentPreviewStage = 'd0' | 'd1' | 'd2' | 'd3' | 'd4' | 'd5' | 'd6' | 'd7' | 'd8' | 'd9'

export type BranchVisibility = Record<BranchKey, boolean>

export type ThemeColor = {
  r: number
  g: number
  b: number
}

export type DebugState = {
  radius: number
  scaleX: number
  scaleY: number
  duration: number
  movementY: number
  randomX: number
  randomY: number
  scaleMin: number
  scaleMax: number
  minCount: number
  maxCount: number
  angleSpanDeg: number
  arcRadius: number
  rotationSpeedDeg: number
  themeColor: ThemeColor
  mainArcWeight: number
  coreDiskWeight: number
  coreDiskColor: ThemeColor
  coreDiskRadius: number
  coreDiskSoftness: number
  coreDiskScaleStart: number
  coreDiskScaleEnd: number
  coreDiskScaleTimeFraction: number
  coreDiskAlphaStart: number
  coreDiskAlphaEnd: number
  coreDiskAlphaFadeStartFraction: number
  c1StartScale: number
  c1EndScale: number
  c1TimeFraction: number
  effectScale: number
  dTriangleSize: number
  d3OuterRadius: number
  d3InnerRadius: number
  d5CountMin: number
  d5CountMax: number
  d5SpeedMin: number
  d5SpeedMax: number
  d5LifetimeMin: number
  d5LifetimeMax: number
  d5SizeMin: number
  d5SizeMax: number
  d6StartScale: number
  d6PeakScale: number
  d6EndScale: number
  d6GrowTimeFraction: number
  d8AlphaMax: number
  d8AlphaMin: number
  d8FlashPeriodMin: number
  d8FlashPeriodMax: number
  d9StartScale: number
  d9EndScale: number
  d9TimeFraction: number
  fragmentsWeight: number
  finalMixerMode: FinalMixerMode
  finalMixerGain: number
  fxBloomThreshold: number
  fxBloomIntensity: number
  fxBloomScatter: number
  fxTonemappingMode: TonemappingMode
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
  flashPeriod: number
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
  branchAStartTime: number
  arcInitialAngle: number
  duration: number
  active: number
  coreDiskRadius: number
  coreDiskSoftness: number
  coreDiskScaleStart: number
  coreDiskScaleEnd: number
  coreDiskScaleTimeFraction: number
  coreDiskAlphaStart: number
  coreDiskAlphaEnd: number
  coreDiskAlphaFadeStartFraction: number
  dTriangleSize: number
  d3OuterRadius: number
  d3InnerRadius: number
  fragmentDuration: number
  fragmentParticles: FragmentParticleState[]
  particles: ParticleState[]
  bounds: BurstBounds
}

export type BurstStore = {
  bursts: BurstState[]
  nextBurstIndex: number
}

export type ControlDefinition = {
  branch: BranchKey
  stage: StageKey
  key: keyof DebugState
  label: string
  min: number
  max: number
  step: number
}

export type BranchDefinition = {
  key: BranchKey
  title: string
  subtitle: string
}

export type StageDefinition = {
  key: StageKey
  branch: BranchKey
  title: string
  subtitle: string
}

export type CorePreviewOption = {
  key: CorePreviewStage
  label: string
}

export type FragmentPreviewOption = {
  key: FragmentPreviewStage
  label: string
}

export type PreviewState = {
  core: CorePreviewStage
  fragment: FragmentPreviewStage
}

export type RuntimeConfig = DebugState

export type RuntimeDebugState = {
  branchVisibility: BranchVisibility
  mainArcPreviewStage: MainArcPreviewStage
  corePreviewStage: CorePreviewStage
  fragmentPreviewStage: FragmentPreviewStage
}

export type CreateClickFxOptions = {
  target: HTMLElement
  listenTarget?: HTMLElement | Window
  config?: Partial<RuntimeConfig>
  pixelRatioCap?: number
  autoBindPointer?: boolean
}

export type ClickFxInstance = {
  canvas: HTMLCanvasElement
  spawnAtClient: (clientX: number, clientY: number) => void
  spawnAtLocal: (x: number, y: number) => void
  updateConfig: (partial: Partial<RuntimeConfig>) => void
  resize: () => void
  dispose: () => void
}
