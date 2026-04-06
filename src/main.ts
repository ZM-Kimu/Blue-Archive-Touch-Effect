import { Mesh, Program, Renderer, Triangle } from 'ogl'
import fragment from './shaders/click-fx.frag'
import vertex from './shaders/click-fx.vert'
import './styles.css'

const MAX_BURSTS = 8
const PARTICLES_PER_BURST = 3
const MAX_ACTIVE_PARTICLES = MAX_BURSTS * PARTICLES_PER_BURST
const DEG_TO_RAD = Math.PI / 180
const BOUNDS_SAMPLE_COUNT = 96

type UniformValue<T> = { value: T }
type BranchKey = 'mainArc' | 'coreDisk' | 'mainFx'
type StageKey = 'a1' | 'a2' | 'a3' | 'a4' | 'a6' | 'a7' | 'b0' | 'b1' | 'b2' | 'b3' | 'b4' | 'c1'
type CorePreviewStage = 'b0' | 'b1' | 'b2' | 'b3' | 'b4'

type BranchVisibility = Record<BranchKey, boolean>

type DebugState = {
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
  arcColorR: number
  arcColorG: number
  arcColorB: number
  b0Radius: number
  b0Softness: number
  b1Radius: number
  b2StartScale: number
  b2EndScale: number
  b2TimeFraction: number
  b3GrayMultiplier: number
  b3AlphaMultiplier: number
  b4Alpha: number
  c1StartScale: number
  c1EndScale: number
  c1TimeFraction: number
}

type ParticleState = {
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

type BurstBounds = {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

type BurstState = {
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
  particles: ParticleState[]
  bounds: BurstBounds
}

type ControlDefinition = {
  branch: BranchKey
  stage: StageKey
  key: keyof DebugState
  label: string
  min: number
  max: number
  step: number
}

type BranchDefinition = {
  key: BranchKey
  title: string
  subtitle: string
}

type StageDefinition = {
  key: StageKey
  branch: BranchKey
  title: string
  subtitle: string
}

type CorePreviewOption = {
  key: CorePreviewStage
  label: string
}

const app = document.querySelector<HTMLDivElement>('#app')

if (!app)
{
  throw new Error('App root not found')
}

const config: DebugState = {
  radius: 0.1,
  scaleX: 0.09,
  scaleY: 1,
  duration: 0.55,
  movementY: -0.2,
  randomX: 0.01,
  randomY: 0.08,
  scaleMin: 0.53,
  scaleMax: 1,
  minCount: 2,
  maxCount: 3,
  angleSpanDeg: 360,
  arcRadius: 0.177,
  rotationSpeedDeg: -90,
  arcColorR: 0.18,
  arcColorG: 0.87,
  arcColorB: 1,
  b0Radius: 0.18,
  b0Softness: 1,
  b1Radius: 0.175,
  b2StartScale: 0.25,
  b2EndScale: 1,
  b2TimeFraction: 0.3,
  b3GrayMultiplier: 1.23,
  b3AlphaMultiplier: 0.54,
  b4Alpha: 1,
  c1StartScale: 0.2,
  c1EndScale: 1,
  c1TimeFraction: 0.85,
}

const controls: ControlDefinition[] = [
  { branch: 'mainArc', stage: 'a1', key: 'radius', label: 'Radius', min: 0.07, max: 0.13, step: 0.0025 },
  { branch: 'mainArc', stage: 'a1', key: 'scaleX', label: 'Scale X', min: 0.06, max: 0.2, step: 0.005 },
  { branch: 'mainArc', stage: 'a1', key: 'scaleY', label: 'Scale Y', min: 0.7, max: 1.3, step: 0.01 },
  { branch: 'mainArc', stage: 'a2', key: 'duration', label: 'Duration', min: 0.4, max: 0.9, step: 0.025 },
  { branch: 'mainArc', stage: 'a2', key: 'movementY', label: 'Move Y', min: -0.3, max: 0.0, step: 0.005 },
  { branch: 'mainArc', stage: 'a3', key: 'randomX', label: 'Random X', min: 0.0, max: 0.05, step: 0.0025 },
  { branch: 'mainArc', stage: 'a3', key: 'randomY', label: 'Random Y', min: 0.0, max: 0.12, step: 0.0025 },
  { branch: 'mainArc', stage: 'a3', key: 'scaleMin', label: 'Scale Min', min: 0.4, max: 0.8, step: 0.01 },
  { branch: 'mainArc', stage: 'a3', key: 'scaleMax', label: 'Scale Max', min: 0.8, max: 1.2, step: 0.01 },
  { branch: 'mainArc', stage: 'a3', key: 'minCount', label: 'Min Count', min: 1, max: 3, step: 1 },
  { branch: 'mainArc', stage: 'a3', key: 'maxCount', label: 'Max Count', min: 1, max: 3, step: 1 },
  { branch: 'mainArc', stage: 'a4', key: 'angleSpanDeg', label: 'Angle', min: 0, max: 360, step: 1 },
  { branch: 'mainArc', stage: 'a4', key: 'arcRadius', label: 'Arc Radius', min: 0.14, max: 0.26, step: 0.0025 },
  { branch: 'mainArc', stage: 'a6', key: 'rotationSpeedDeg', label: 'Rotate', min: -180, max: 180, step: 0.5 },
  { branch: 'mainArc', stage: 'a7', key: 'arcColorR', label: 'Color R', min: 0, max: 1, step: 0.01 },
  { branch: 'mainArc', stage: 'a7', key: 'arcColorG', label: 'Color G', min: 0, max: 1, step: 0.01 },
  { branch: 'mainArc', stage: 'a7', key: 'arcColorB', label: 'Color B', min: 0, max: 1, step: 0.01 },
  { branch: 'coreDisk', stage: 'b0', key: 'b0Radius', label: 'B0 Radius', min: 0.06, max: 0.22, step: 0.0025 },
  { branch: 'coreDisk', stage: 'b0', key: 'b0Softness', label: 'B0 Soft', min: 0.1, max: 1, step: 0.01 },
  { branch: 'coreDisk', stage: 'b1', key: 'b1Radius', label: 'B1 Radius', min: 0.06, max: 0.18, step: 0.0025 },
  { branch: 'coreDisk', stage: 'b2', key: 'b2StartScale', label: 'Start Scale', min: 0.05, max: 1, step: 0.01 },
  { branch: 'coreDisk', stage: 'b2', key: 'b2EndScale', label: 'End Scale', min: 0.25, max: 1.5, step: 0.01 },
  { branch: 'coreDisk', stage: 'b2', key: 'b2TimeFraction', label: 'Time Frac', min: 0.1, max: 1, step: 0.01 },
  { branch: 'coreDisk', stage: 'b3', key: 'b3GrayMultiplier', label: 'Gray Mult', min: 0, max: 2, step: 0.01 },
  { branch: 'coreDisk', stage: 'b3', key: 'b3AlphaMultiplier', label: 'Alpha Mult', min: 0, max: 2, step: 0.01 },
  { branch: 'coreDisk', stage: 'b4', key: 'b4Alpha', label: 'Alpha', min: 0, max: 1, step: 0.01 },
  { branch: 'mainFx', stage: 'c1', key: 'c1StartScale', label: 'Start Scale', min: 0.1, max: 1, step: 0.01 },
  { branch: 'mainFx', stage: 'c1', key: 'c1EndScale', label: 'End Scale', min: 0.5, max: 1.5, step: 0.01 },
  { branch: 'mainFx', stage: 'c1', key: 'c1TimeFraction', label: 'Time Frac', min: 0.1, max: 1, step: 0.01 },
]

const branchDefinitions: BranchDefinition[] = [
  { key: 'mainArc', title: 'Branch A', subtitle: 'MainArc / A7' },
  { key: 'coreDisk', title: 'Branch B', subtitle: 'CoreDisk / B4' },
  { key: 'mainFx', title: 'Branch C', subtitle: 'MainFX / C1' },
]

const stageDefinitions: StageDefinition[] = [
  { key: 'a1', branch: 'mainArc', title: 'A1', subtitle: 'Ellipse Prefab' },
  { key: 'a2', branch: 'mainArc', title: 'A2', subtitle: 'Movement' },
  { key: 'a3', branch: 'mainArc', title: 'A3', subtitle: 'Particleize' },
  { key: 'a4', branch: 'mainArc', title: 'A4', subtitle: 'Polar Warp' },
  { key: 'a6', branch: 'mainArc', title: 'A6', subtitle: 'Rotation' },
  { key: 'a7', branch: 'mainArc', title: 'A7', subtitle: 'Colorize' },
  { key: 'b0', branch: 'coreDisk', title: 'B0', subtitle: 'Height Reference' },
  { key: 'b1', branch: 'coreDisk', title: 'B1', subtitle: 'Solid Output' },
  { key: 'b2', branch: 'coreDisk', title: 'B2', subtitle: 'Scale Animation (ease-out)' },
  { key: 'b3', branch: 'coreDisk', title: 'B3', subtitle: 'Threshold / Gray+Alpha' },
  { key: 'b4', branch: 'coreDisk', title: 'B4', subtitle: 'Replace Color' },
  { key: 'c1', branch: 'mainFx', title: 'C1', subtitle: 'Composite Scale (ease-out)' },
]

const corePreviewOptions: CorePreviewOption[] = [
  { key: 'b0', label: 'B0' },
  { key: 'b1', label: 'B1' },
  { key: 'b2', label: 'B2' },
  { key: 'b3', label: 'B3' },
  { key: 'b4', label: 'B4' },
]

const branchVisibility: BranchVisibility = {
  mainArc: true,
  coreDisk: true,
  mainFx: true,
}

let corePreviewStage: CorePreviewStage = 'b4'

const formatValue = (key: keyof DebugState, value: number) =>
{
  if (key === 'minCount' || key === 'maxCount' || key === 'angleSpanDeg')
  {
    return String(Math.round(value))
  }

  if (key === 'rotationSpeedDeg')
  {
    return value.toFixed(1)
  }

  if (key === 'radius' || key === 'arcRadius' || key === 'b0Radius' || key === 'b1Radius')
  {
    return value.toFixed(3)
  }

  return value.toFixed(2)
}

const createControlMarkup = ({ key, label, min, max, step }: ControlDefinition) => `
  <label class="debug-control">
    <span>${label}</span>
    <input
      data-field="${key}"
      type="range"
      min="${min}"
      max="${max}"
      step="${step}"
      value="${config[key]}"
    />
    <output data-output="${key}">${formatValue(key, config[key])}</output>
  </label>
`

const createStageMarkup = ({ key, title, subtitle }: StageDefinition) => `
  <section class="debug-stage">
    <div class="debug-stage__header">
      <strong>${title}</strong>
      <span>${subtitle}</span>
    </div>
    <div class="debug-stage__controls">
      ${controls.filter((control) => control.stage === key).map(createControlMarkup).join('')}
    </div>
  </section>
`

const createCorePreviewMarkup = () => `
  <label class="debug-preview">
    <span>Preview</span>
    <select data-core-preview>
      ${corePreviewOptions
    .map(({ key, label }) => `<option value="${key}" ${corePreviewStage === key ? 'selected' : ''}>${label}</option>`)
    .join('')}
    </select>
  </label>
`

const createBranchMarkup = ({ key, title, subtitle }: BranchDefinition) => `
  <section class="debug-branch">
    <div class="debug-branch__header">
      <div class="debug-branch__copy">
        <strong>${title}</strong>
        <span>${subtitle}</span>
      </div>
      <label class="debug-toggle">
        <input data-visibility="${key}" type="checkbox" ${branchVisibility[key] ? 'checked' : ''} />
        <span>Visible</span>
      </label>
    </div>
    <div class="debug-branch__controls">
      ${key === 'coreDisk' ? createCorePreviewMarkup() : ''}
      ${stageDefinitions.filter((stage) => stage.branch === key).map(createStageMarkup).join('')}
    </div>
  </section>
`

const shell = document.createElement('main')
shell.className = 'app-shell'

const panel = document.createElement('aside')
panel.className = 'debug-panel'
panel.innerHTML = `
  <div class="debug-panel__header">
    <strong>Click FX</strong>
    <span>Stage controls for the current preview stack.</span>
  </div>
  <div class="debug-branches">
    ${branchDefinitions.map(createBranchMarkup).join('')}
  </div>
  <p class="debug-hint">Most generation parameters apply on next click. Visibility, A7 color, and C1 controls update immediately.</p>
`

shell.appendChild(panel)
app.appendChild(shell)

const renderer = new Renderer({
  alpha: true,
  antialias: true,
  dpr: Math.min(window.devicePixelRatio, 2),
})

const gl = renderer.gl
gl.clearColor(0, 0, 0, 1)
renderer.setSize(window.innerWidth, window.innerHeight)

gl.canvas.className = 'app-canvas'
shell.prepend(gl.canvas)

const geometry = new Triangle(gl)

const burstData = new Array<number>(MAX_BURSTS * 4).fill(0)
const burstCoreData = new Array<number>(MAX_BURSTS * 4).fill(0)
const burstCoreAnimData = new Array<number>(MAX_BURSTS * 4).fill(0)
const burstCoreToneData = new Array<number>(MAX_BURSTS * 4).fill(0)
const burstBounds = new Array<number>(MAX_BURSTS * 4).fill(0)
const particleSlotData = Array.from({ length: PARTICLES_PER_BURST }, () => ({
  a: new Array<number>(MAX_BURSTS * 4).fill(0),
  b: new Array<number>(MAX_BURSTS * 4).fill(0),
  c: new Array<number>(MAX_BURSTS * 4).fill(0),
}))

const uniforms: Record<string, UniformValue<number | number[]>> = {
  uTime: { value: 0 },
  uResolution: { value: [window.innerWidth, window.innerHeight] },
  uBurstData: { value: burstData },
  uBurstCoreData: { value: burstCoreData },
  uBurstCoreAnimData: { value: burstCoreAnimData },
  uBurstCoreToneData: { value: burstCoreToneData },
  uBurstBounds: { value: burstBounds },
  uParticleA0: { value: particleSlotData[0].a },
  uParticleB0: { value: particleSlotData[0].b },
  uParticleC0: { value: particleSlotData[0].c },
  uParticleA1: { value: particleSlotData[1].a },
  uParticleB1: { value: particleSlotData[1].b },
  uParticleC1: { value: particleSlotData[1].c },
  uParticleA2: { value: particleSlotData[2].a },
  uParticleB2: { value: particleSlotData[2].b },
  uParticleC2: { value: particleSlotData[2].c },
  uPolarParams: { value: [config.angleSpanDeg * DEG_TO_RAD, config.arcRadius] },
  uRotationSpeedRad: { value: config.rotationSpeedDeg * DEG_TO_RAD },
  uArcColor: { value: [config.arcColorR, config.arcColorG, config.arcColorB] },
  uCompositeScaleParams: { value: [config.c1StartScale, config.c1EndScale, config.c1TimeFraction] },
  uCorePreviewStage: { value: 4 },
  uBranchVisibility: { value: [1, 1, 1] },
}

const program = new Program(gl, {
  vertex,
  fragment,
  uniforms,
})

const mesh = new Mesh(gl, { geometry, program })

const createParticleState = (): ParticleState => ({
  startTime: -100,
  duration: 0,
  offsetX: 0,
  offsetY: 0,
  scaleMultiplier: 1,
  movementY: 0,
  radius: 0,
  scaleX: 0,
  scaleY: 0,
  enabled: 0,
})

const createBurstState = (): BurstState => ({
  originX: 0.5,
  originY: 0.5,
  startTime: -100,
  branchAStartTime: -100,
  duration: 0,
  active: 0,
  b0Radius: 0,
  b0Softness: 1,
  b1Radius: 0,
  b2StartScale: 0.25,
  b2EndScale: 1,
  b2TimeFraction: 0.5,
  b3GrayMultiplier: 1,
  b3AlphaMultiplier: 1,
  b4Alpha: 1,
  particles: Array.from({ length: PARTICLES_PER_BURST }, createParticleState),
  bounds: { minX: 0, maxX: 0, minY: 0, maxY: 0 },
})

const bursts = Array.from({ length: MAX_BURSTS }, createBurstState)

let nextBurstIndex = 0
let currentTime = 0

const controlElements = new Map<keyof DebugState, { input: HTMLInputElement; output: HTMLOutputElement }>()
const visibilityElements = new Map<BranchKey, HTMLInputElement>()
const corePreviewElement = panel.querySelector<HTMLSelectElement>('select[data-core-preview]')

controls.forEach((control) =>
{
  const input = panel.querySelector<HTMLInputElement>(`input[data-field="${control.key}"]`)
  const output = panel.querySelector<HTMLOutputElement>(`output[data-output="${control.key}"]`)

  if (!input || !output)
  {
    throw new Error(`Missing control for ${control.key}`)
  }

  controlElements.set(control.key, { input, output })
})

branchDefinitions.forEach(({ key }) =>
{
  const input = panel.querySelector<HTMLInputElement>(`input[data-visibility="${key}"]`)

  if (!input)
  {
    throw new Error(`Missing visibility toggle for ${key}`)
  }

  visibilityElements.set(key, input)
})

if (!corePreviewElement)
{
  throw new Error('Missing core preview selector')
}

const getCorePreviewStageValue = (stage: CorePreviewStage) =>
{
  if (stage === 'b0')
  {
    return 0
  }

  if (stage === 'b1')
  {
    return 1
  }

  if (stage === 'b2')
  {
    return 2
  }

  if (stage === 'b3')
  {
    return 3
  }

  return 4
}

const syncControls = () =>
{
  controls.forEach(({ key }) =>
  {
    const element = controlElements.get(key)

    if (!element)
    {
      return
    }

    element.input.value = String(config[key])
    element.output.value = formatValue(key, config[key])
  })

  uniforms.uPolarParams.value = [config.angleSpanDeg * DEG_TO_RAD, config.arcRadius]
  uniforms.uRotationSpeedRad.value = config.rotationSpeedDeg * DEG_TO_RAD
  uniforms.uArcColor.value = [config.arcColorR, config.arcColorG, config.arcColorB]
  uniforms.uCompositeScaleParams.value = [config.c1StartScale, config.c1EndScale, config.c1TimeFraction]
  uniforms.uCorePreviewStage.value = getCorePreviewStageValue(corePreviewStage)
  uniforms.uBranchVisibility.value = [
    branchVisibility.mainArc ? 1 : 0,
    branchVisibility.coreDisk ? 1 : 0,
    branchVisibility.mainFx ? 1 : 0,
  ]

  corePreviewElement.value = corePreviewStage

  branchDefinitions.forEach(({ key }) =>
  {
    const input = visibilityElements.get(key)

    if (!input)
    {
      return
    }

    input.checked = branchVisibility[key]
  })
}

const applyControlConstraints = (changedKey: keyof DebugState) =>
{
  if (config.scaleMin > config.scaleMax)
  {
    if (changedKey === 'scaleMin')
    {
      config.scaleMax = config.scaleMin
    } else if (changedKey === 'scaleMax')
    {
      config.scaleMin = config.scaleMax
    }
  }

  if (config.minCount > config.maxCount)
  {
    if (changedKey === 'minCount')
    {
      config.maxCount = config.minCount
    } else if (changedKey === 'maxCount')
    {
      config.minCount = config.maxCount
    }
  }
}

controls.forEach(({ key }) =>
{
  const element = controlElements.get(key)

  if (!element)
  {
    return
  }

  const handleInput = () =>
  {
    config[key] = Number(element.input.value)
    applyControlConstraints(key)
    syncControls()
  }

  element.input.addEventListener('input', handleInput)
  element.input.addEventListener('change', handleInput)
})

branchDefinitions.forEach(({ key }) =>
{
  const input = visibilityElements.get(key)

  if (!input)
  {
    return
  }

  const handleToggle = () =>
  {
    branchVisibility[key] = input.checked
    syncControls()
  }

  input.addEventListener('input', handleToggle)
  input.addEventListener('change', handleToggle)
})

const handleCorePreviewChange = () =>
{
  const nextValue = corePreviewElement.value as CorePreviewStage

  if (nextValue === 'b0' || nextValue === 'b1' || nextValue === 'b2' || nextValue === 'b3' || nextValue === 'b4')
  {
    corePreviewStage = nextValue
    syncControls()
  }
}

corePreviewElement.addEventListener('input', handleCorePreviewChange)
corePreviewElement.addEventListener('change', handleCorePreviewChange)

const clamp01 = (value: number) => Math.min(Math.max(value, 0), 1)

const easeInOutSine = (value: number) => -(Math.cos(Math.PI * value) - 1) * 0.5

const easeInQuad = (value: number) => value * value

const randomBetween = (min: number, max: number) => min + (max - min) * Math.random()

const randomSigned = (range: number) => randomBetween(-range, range)

const randomIntInclusive = (min: number, max: number) =>
{
  const lower = Math.ceil(min)
  const upper = Math.floor(max)
  return Math.floor(randomBetween(lower, upper + 1))
}

const resetParticle = (particle: ParticleState) =>
{
  particle.startTime = -100
  particle.duration = 0
  particle.offsetX = 0
  particle.offsetY = 0
  particle.scaleMultiplier = 1
  particle.movementY = 0
  particle.radius = 0
  particle.scaleX = 0
  particle.scaleY = 0
  particle.enabled = 0
}

const resetBurstBounds = (burst: BurstState) =>
{
  burst.bounds.minX = 0
  burst.bounds.maxX = 0
  burst.bounds.minY = 0
  burst.bounds.maxY = 0
}

const precomputeBurstBounds = (burst: BurstState) =>
{
  let hasParticle = false
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity

  burst.particles.forEach((particle) =>
  {
    if (!particle.enabled || particle.duration <= 0)
    {
      return
    }

    const baseHalfWidth = particle.radius * particle.scaleX * particle.scaleMultiplier
    const baseHalfHeight = particle.radius * particle.scaleY * particle.scaleMultiplier

    minX = Math.min(minX, particle.offsetX - baseHalfWidth)
    maxX = Math.max(maxX, particle.offsetX + baseHalfWidth)

    for (let sampleIndex = 0; sampleIndex <= BOUNDS_SAMPLE_COUNT; sampleIndex += 1)
    {
      const progress = sampleIndex / BOUNDS_SAMPLE_COUNT
      const movementEase = easeInOutSine(progress)
      const scaleEase = 1 - easeInQuad(progress)
      const centerY = particle.offsetY + particle.movementY * particle.scaleMultiplier * movementEase
      const halfHeight = baseHalfHeight * scaleEase

      minY = Math.min(minY, centerY - halfHeight)
      maxY = Math.max(maxY, centerY + halfHeight)
    }

    hasParticle = true
  })

  if (!hasParticle)
  {
    resetBurstBounds(burst)
    return
  }

  burst.bounds.minX = minX
  burst.bounds.maxX = maxX
  burst.bounds.minY = minY
  burst.bounds.maxY = maxY
}

const findBurstSlot = () =>
{
  for (let step = 0; step < MAX_BURSTS; step += 1)
  {
    const index = (nextBurstIndex + step) % MAX_BURSTS
    if (!bursts[index].active)
    {
      nextBurstIndex = (index + 1) % MAX_BURSTS
      return index
    }
  }

  const fallbackIndex = nextBurstIndex
  nextBurstIndex = (nextBurstIndex + 1) % MAX_BURSTS
  return fallbackIndex
}

const spawnBurst = (clientX: number, clientY: number) =>
{
  const burstIndex = findBurstSlot()
  const burst = bursts[burstIndex]
  const originX = clientX / window.innerWidth
  const originY = 1 - clientY / window.innerHeight
  const count = randomIntInclusive(config.minCount, config.maxCount)

  burst.originX = originX
  burst.originY = originY
  burst.startTime = currentTime
  burst.branchAStartTime = currentTime
  burst.duration = 0
  burst.active = 1
  burst.b0Radius = config.b0Radius
  burst.b0Softness = config.b0Softness
  burst.b1Radius = config.b1Radius
  burst.b2StartScale = config.b2StartScale
  burst.b2EndScale = config.b2EndScale
  burst.b2TimeFraction = config.b2TimeFraction
  burst.b3GrayMultiplier = config.b3GrayMultiplier
  burst.b3AlphaMultiplier = config.b3AlphaMultiplier
  burst.b4Alpha = config.b4Alpha
  resetBurstBounds(burst)

  for (let particleIndex = 0; particleIndex < PARTICLES_PER_BURST; particleIndex += 1)
  {
    const particle = burst.particles[particleIndex]

    if (particleIndex >= count)
    {
      resetParticle(particle)
      continue
    }

    const scaleMultiplier = randomBetween(config.scaleMin, config.scaleMax)

    particle.duration = config.duration * scaleMultiplier
    particle.offsetX = randomSigned(config.randomX)
    particle.offsetY = randomSigned(config.randomY)
    particle.scaleMultiplier = scaleMultiplier
    particle.movementY = config.movementY
    particle.radius = config.radius
    particle.scaleX = config.scaleX
    particle.scaleY = config.scaleY
    particle.enabled = 1

    burst.duration = Math.max(burst.duration, particle.duration)
  }

  burst.branchAStartTime = burst.startTime + burst.duration * burst.b2TimeFraction

  burst.particles.forEach((particle) =>
  {
    if (!particle.enabled)
    {
      return
    }

    particle.startTime = burst.branchAStartTime
  })

  precomputeBurstBounds(burst)
}

const updateBurstActivity = (time: number) =>
{
  bursts.forEach((burst) =>
  {
    const branchBActive = burst.duration > 0
      && time >= burst.startTime
      && time <= burst.startTime + burst.duration
    let hasActiveParticle = false

    burst.particles.forEach((particle) =>
    {
      if (!particle.enabled || particle.duration <= 0)
      {
        return
      }

      const progress = (time - particle.startTime) / particle.duration
      if (progress < 0 || progress > 1)
      {
        return
      }

      hasActiveParticle = true
    })

    if (!branchBActive && !hasActiveParticle)
    {
      burst.active = 0
      resetBurstBounds(burst)
      return
    }

    burst.active = 1
  })
}

const syncRuntimeUniforms = () =>
{
  bursts.forEach((burst, burstIndex) =>
  {
    const burstBase = burstIndex * 4

    burstData[burstBase] = burst.originX
    burstData[burstBase + 1] = burst.originY
    burstData[burstBase + 2] = burst.active
    burstData[burstBase + 3] = burst.startTime
    burstCoreData[burstBase] = burst.b0Radius
    burstCoreData[burstBase + 1] = burst.b0Softness
    burstCoreData[burstBase + 2] = burst.b1Radius
    burstCoreData[burstBase + 3] = burst.duration
    burstCoreAnimData[burstBase] = burst.b2StartScale
    burstCoreAnimData[burstBase + 1] = burst.b2EndScale
    burstCoreAnimData[burstBase + 2] = burst.b2TimeFraction
    burstCoreAnimData[burstBase + 3] = burst.branchAStartTime
    burstCoreToneData[burstBase] = burst.b3GrayMultiplier
    burstCoreToneData[burstBase + 1] = burst.b3AlphaMultiplier
    burstCoreToneData[burstBase + 2] = burst.b4Alpha
    burstCoreToneData[burstBase + 3] = 0

    burstBounds[burstBase] = burst.bounds.minX
    burstBounds[burstBase + 1] = burst.bounds.maxX
    burstBounds[burstBase + 2] = burst.bounds.minY
    burstBounds[burstBase + 3] = burst.bounds.maxY

    burst.particles.forEach((particle, particleIndex) =>
    {
      const slot = particleSlotData[particleIndex]
      const particleBase = burstIndex * 4

      slot.a[particleBase] = particle.startTime
      slot.a[particleBase + 1] = particle.duration
      slot.a[particleBase + 2] = particle.scaleMultiplier
      slot.a[particleBase + 3] = particle.enabled

      slot.b[particleBase] = particle.offsetX
      slot.b[particleBase + 1] = particle.offsetY
      slot.b[particleBase + 2] = particle.movementY
      slot.b[particleBase + 3] = particle.radius

      slot.c[particleBase] = particle.scaleX
      slot.c[particleBase + 1] = particle.scaleY
      slot.c[particleBase + 2] = 0
      slot.c[particleBase + 3] = 0
    })
  })
}

window.addEventListener('pointerdown', (event) =>
{
  if (event.target instanceof HTMLElement && event.target.closest('.debug-panel'))
  {
    return
  }

  spawnBurst(event.clientX, event.clientY)
})

const resize = () =>
{
  renderer.setSize(window.innerWidth, window.innerHeight)
  uniforms.uResolution.value = [window.innerWidth, window.innerHeight]
}

window.addEventListener('resize', resize)

const render = (time: number) =>
{
  currentTime = time * 0.001
  uniforms.uTime.value = currentTime
  updateBurstActivity(currentTime)
  syncRuntimeUniforms()
  renderer.render({ scene: mesh })
  requestAnimationFrame(render)
}

syncControls()
syncRuntimeUniforms()
resize()
requestAnimationFrame(render)
