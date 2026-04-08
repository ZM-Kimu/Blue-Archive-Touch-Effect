export type UniformValue<T> = { value: T }
export const blendModes = ['normal', 'add', 'screen'] as const
export type BlendMode = (typeof blendModes)[number]

export type BranchKey = 'mainArc' | 'coreDisk' | 'mainFx' | 'fragments' | 'filter'
export type StageKey = 'a1' | 'a2' | 'a3' | 'a4' | 'a6' | 'a7' | 'b0' | 'b1' | 'b2' | 'b3' | 'b4' | 'c1' | 'd0' | 'd1' | 'd2' | 'd3' | 'd4' | 'd5' | 'd6' | 'd7' | 'd8' | 'd9' | 'fx'
export type CorePreviewStage = 'b0' | 'b1' | 'b2' | 'b3' | 'b4'
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
  mainArcAlphaMix: number
  mainArcBlendMode: BlendMode
  coreDiskBlendMode: BlendMode
  b0Radius: number
  b0Softness: number
  b1Radius: number
  b2StartScale: number
  b2EndScale: number
  b2TimeFraction: number
  b3GrayMultiplier: number
  b3AlphaMultiplier: number
  b4Alpha: number
  coreDiskAlphaMix: number
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
  fragmentsAlphaMix: number
  fragmentsBlendMode: BlendMode
  fxBlurRadius: number
  fxBlurMix: number
  fxBloomThresholdLow: number
  fxBloomThresholdHigh: number
  fxBloomIntensity: number
  fxScreenMix: number
  filterBlendMode: BlendMode
  globalAlpha: number
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
  duration: number
  active: number
  b0Radius: number
  b0Softness: number
  b1Radius: number
  b2StartScale: number
  b2EndScale: number
  b2TimeFraction: number
  b3GrayMultiplier: number
  b3AlphaMultiplier: number
  b4Alpha: number
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
