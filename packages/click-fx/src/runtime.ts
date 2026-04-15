import { Mesh, Program, RenderTarget, Renderer, Triangle } from 'ogl'
import vertex from './shaders/click-fx.vert'
import burstSceneFragment from './shaders/burst-scene.frag'
import burstFilterFragment from './shaders/burst-filter.frag'
import { applyRuntimeConfigConstraints, defaultRuntimeConfig } from './config'
import {
  createBurstStore,
  expandBurstBounds,
  getBurstFragmentBounds,
  getBurstMainFxBounds,
  hasActiveBursts,
  spawnBurst,
  unionBurstBounds,
  updateBurstActivity,
} from './state'
import type {
  BurstBounds,
  BurstState,
  ClickFxInstance,
  CreateClickFxOptions,
  RuntimeConfig,
  RuntimeDebugState,
} from './types'

type UniformBag = Record<string, { value: any }>

type RuntimeState = {
  width: number
  height: number
  dpr: number
}

type RenderRect = {
  localBounds: BurstBounds
  cssLeft: number
  cssTop: number
  cssWidth: number
  cssHeight: number
  deviceX: number
  deviceY: number
  deviceWidth: number
  deviceHeight: number
}

type InternalClickFxInstance = ClickFxInstance & {
  setDebugState: (partial: Partial<RuntimeDebugState>) => void
}

const defaultRuntimeDebugState = (): RuntimeDebugState => ({
  branchVisibility: {
    mainArc: true,
    coreDisk: true,
  mainFx: true,
  fragments: true,
  filter: true,
  },
  mainArcPreviewStage: 'a7',
  corePreviewStage: 'bFinal',
  fragmentPreviewStage: 'd8',
})

const getFinalMixerModeValue = (mode: RuntimeConfig['finalMixerMode']) =>
  mode === 'normalized' ? 0 : mode === 'add' ? 1 : mode === 'screen' ? 2 : 3

const getTonemappingModeValue = (mode: RuntimeConfig['fxTonemappingMode']) =>
  mode === 'none' ? 0 : mode === 'neutral' ? 1 : 2

const getThemeColorValue = (config: RuntimeConfig) => [
  config.themeColor.r,
  config.themeColor.g,
  config.themeColor.b,
]

const getCoreDiskColorValue = (config: RuntimeConfig) => [
  config.coreDiskColor.r,
  config.coreDiskColor.g,
  config.coreDiskColor.b,
]

const getFragmentHighlightColorValue = (config: RuntimeConfig) => [
  Math.min(1, config.themeColor.r * 1.2),
  Math.min(1, config.themeColor.g * 1.2),
  Math.min(1, config.themeColor.b * 1.2),
]

const createSceneUniforms = (config: RuntimeConfig, debugState: RuntimeDebugState): UniformBag => ({
  uTime: { value: 0 },
  uLocalBounds: { value: [-1, 1, -1, 1] },
  uBurstTiming: { value: [0, 0, 0, 0] },
  uBurstCoreData: { value: [0, 1, 0, 0] },
  uBurstCoreAnimData: { value: [0.25, 1, 0.3, 0] },
  uBurstCoreToneData: { value: [1, 0, 0.3, 0] },
  uBurstFragmentData: { value: [0.53, 0.203, 0.098, 0] },
  uArcData: { value: [config.angleSpanDeg * Math.PI / 180, config.arcRadius, config.rotationSpeedDeg * Math.PI / 180, 0] },
  uThemeColor: { value: getThemeColorValue(config) },
  uCoreDiskColor: { value: getCoreDiskColorValue(config) },
  uFragmentHighlightColor: { value: getFragmentHighlightColorValue(config) },
  uCompositeScaleParams: { value: [config.c1StartScale, config.c1EndScale, config.c1TimeFraction] },
  uFinalMixerWeights: { value: [config.mainArcWeight, config.coreDiskWeight, config.fragmentsWeight] },
  uFinalMixerParams: { value: [getFinalMixerModeValue(config.finalMixerMode), config.finalMixerGain] },
  uEffectScale: { value: config.effectScale },
  uFragmentScaleCurveParams: { value: [config.d6StartScale, config.d6PeakScale, config.d6EndScale, config.d6GrowTimeFraction] },
  uFragmentAlphaParams: { value: [config.d8AlphaMax, config.d8AlphaMin] },
  uFragmentInitScaleParams: { value: [config.d9StartScale, config.d9EndScale, config.d9TimeFraction] },
  uMainArcPreviewStage: { value: 4 },
  uCorePreviewStage: { value: 3 },
  uFragmentPreviewStage: { value: 8 },
  uBranchVisibility: { value: [1, 1, 1, 1] },
  uArcSourceBounds: { value: [0, 0, 0, 0] },
  uParticleA0: { value: [-100, 0, 1, 0] },
  uParticleB0: { value: [0, 0, 0, 0] },
  uParticleC0: { value: [0, 0, 0, 0] },
  uParticleA1: { value: [-100, 0, 1, 0] },
  uParticleB1: { value: [0, 0, 0, 0] },
  uParticleC1: { value: [0, 0, 0, 0] },
  uParticleA2: { value: [-100, 0, 1, 0] },
  uParticleB2: { value: [0, 0, 0, 0] },
  uParticleC2: { value: [0, 0, 0, 0] },
  uFragmentParticleA0: { value: [-100, 0, 0, 0] },
  uFragmentParticleB0: { value: [0, 0, 0, 0] },
  uFragmentParticleC0: { value: [0, 0, 1, 0.1] },
  uFragmentParticleA1: { value: [-100, 0, 0, 0] },
  uFragmentParticleB1: { value: [0, 0, 0, 0] },
  uFragmentParticleC1: { value: [0, 0, 1, 0.1] },
  uFragmentParticleA2: { value: [-100, 0, 0, 0] },
  uFragmentParticleB2: { value: [0, 0, 0, 0] },
  uFragmentParticleC2: { value: [0, 0, 1, 0.1] },
  uFragmentParticleA3: { value: [-100, 0, 0, 0] },
  uFragmentParticleB3: { value: [0, 0, 0, 0] },
  uFragmentParticleC3: { value: [0, 0, 1, 0.1] },
  uFragmentParticleA4: { value: [-100, 0, 0, 0] },
  uFragmentParticleB4: { value: [0, 0, 0, 0] },
  uFragmentParticleC4: { value: [0, 0, 1, 0.1] },
  uFragmentParticleA5: { value: [-100, 0, 0, 0] },
  uFragmentParticleB5: { value: [0, 0, 0, 0] },
  uFragmentParticleC5: { value: [0, 0, 1, 0.1] },
  uFragmentParticleA6: { value: [-100, 0, 0, 0] },
  uFragmentParticleB6: { value: [0, 0, 0, 0] },
  uFragmentParticleC6: { value: [0, 0, 1, 0.1] },
  uFragmentParticleA7: { value: [-100, 0, 0, 0] },
  uFragmentParticleB7: { value: [0, 0, 0, 0] },
  uFragmentParticleC7: { value: [0, 0, 1, 0.1] },
  uFragmentParticleA8: { value: [-100, 0, 0, 0] },
  uFragmentParticleB8: { value: [0, 0, 0, 0] },
  uFragmentParticleC8: { value: [0, 0, 1, 0.1] },
  uFragmentParticleA9: { value: [-100, 0, 0, 0] },
  uFragmentParticleB9: { value: [0, 0, 0, 0] },
  uFragmentParticleC9: { value: [0, 0, 1, 0.1] },
})

const createFilterUniforms = (config: RuntimeConfig): UniformBag => ({
  uSceneTexture: { value: null },
  uSceneUvScale: { value: [1, 1] },
  uSceneTexel: { value: [1, 1] },
  uPostBloomParams: { value: [config.fxBloomThreshold, config.fxBloomIntensity, config.fxBloomScatter, 1] },
  uPostTonemappingMode: { value: getTonemappingModeValue(config.fxTonemappingMode) },
})

const setCanvasStyles = (canvas: HTMLCanvasElement) =>
{
  Object.assign(canvas.style, {
    position: 'absolute',
    inset: '0',
    width: '100%',
    height: '100%',
    display: 'block',
    pointerEvents: 'none',
    zIndex: '0',
  })
}

const setRendererViewport = (
  renderer: Renderer,
  x: number,
  y: number,
  width: number,
  height: number
) =>
{
  renderer.gl.viewport(x, y, width, height)
  renderer.state.viewport.x = x
  renderer.state.viewport.y = y
  renderer.state.viewport.width = width
  renderer.state.viewport.height = height
}

const mergeConfig = (config: RuntimeConfig, partial: Partial<RuntimeConfig>) =>
{
  (Object.keys(partial) as Array<keyof RuntimeConfig>).forEach((configKey) =>
  {
    const value = partial[configKey]
    if (value === undefined)
    {
      return
    }

    if (configKey === 'themeColor' || configKey === 'coreDiskColor')
    {
      const colorKey = configKey as 'themeColor' | 'coreDiskColor'
      const colorValue = value as Partial<RuntimeConfig['themeColor']>
      config[colorKey] = {
        ...config[colorKey],
        ...colorValue,
      } as RuntimeConfig[typeof colorKey]
    } else
    {
      ;(config as Record<keyof RuntimeConfig, RuntimeConfig[keyof RuntimeConfig]>)[configKey] = value
    }

    applyRuntimeConfigConstraints(config, configKey)
  })
}

const getFilterPaddingCss = (config: RuntimeConfig) =>
  10 + config.fxBloomScatter * 28 + config.fxBloomIntensity * 12

const getBurstRenderRect = (
  burst: BurstState,
  config: RuntimeConfig,
  debugState: RuntimeDebugState,
  runtimeState: RuntimeState
): RenderRect | null =>
{
  const mainFxBounds = getBurstMainFxBounds(burst, config)
  const fragmentBounds = getBurstFragmentBounds(burst, config)
  let visibleBounds = unionBurstBounds()

  if (debugState.branchVisibility.mainFx)
  {
    visibleBounds = unionBurstBounds(visibleBounds, mainFxBounds)
  }

  if (debugState.branchVisibility.fragments)
  {
    visibleBounds = unionBurstBounds(visibleBounds, fragmentBounds)
  }

  if (
    visibleBounds.minX === 0
    && visibleBounds.maxX === 0
    && visibleBounds.minY === 0
    && visibleBounds.maxY === 0
  )
  {
    visibleBounds = unionBurstBounds(mainFxBounds, fragmentBounds)
  }

  const paddingLocal = getFilterPaddingCss(config) / Math.max(runtimeState.height, 1)
  const paddedBounds = expandBurstBounds(visibleBounds, paddingLocal)
  const originCssX = burst.originX * runtimeState.width
  const originCssY = (1 - burst.originY) * runtimeState.height

  const unclampedLeft = originCssX + paddedBounds.minX * runtimeState.height
  const unclampedRight = originCssX + paddedBounds.maxX * runtimeState.height
  const unclampedTop = originCssY - paddedBounds.maxY * runtimeState.height
  const unclampedBottom = originCssY - paddedBounds.minY * runtimeState.height

  const cssLeft = Math.max(0, unclampedLeft)
  const cssTop = Math.max(0, unclampedTop)
  const cssRight = Math.min(runtimeState.width, unclampedRight)
  const cssBottom = Math.min(runtimeState.height, unclampedBottom)

  if (cssRight <= cssLeft || cssBottom <= cssTop)
  {
    return null
  }

  const localBounds = {
    minX: paddedBounds.minX + (cssLeft - unclampedLeft) / runtimeState.height,
    maxX: paddedBounds.maxX - (unclampedRight - cssRight) / runtimeState.height,
    minY: paddedBounds.minY + (unclampedBottom - cssBottom) / runtimeState.height,
    maxY: paddedBounds.maxY - (cssTop - unclampedTop) / runtimeState.height,
  }

  const deviceWidth = Math.max(1, Math.ceil((cssRight - cssLeft) * runtimeState.dpr))
  const deviceHeight = Math.max(1, Math.ceil((cssBottom - cssTop) * runtimeState.dpr))
  const deviceX = Math.floor(cssLeft * runtimeState.dpr)
  const deviceY = Math.floor((runtimeState.height - cssBottom) * runtimeState.dpr)

  return {
    localBounds,
    cssLeft,
    cssTop,
    cssWidth: cssRight - cssLeft,
    cssHeight: cssBottom - cssTop,
    deviceX,
    deviceY,
    deviceWidth,
    deviceHeight,
  }
}

const syncSceneStaticUniforms = (
  uniforms: ReturnType<typeof createSceneUniforms>,
  config: RuntimeConfig,
  debugState: RuntimeDebugState
) =>
{
  uniforms.uArcData.value = [config.angleSpanDeg * Math.PI / 180, config.arcRadius, config.rotationSpeedDeg * Math.PI / 180, 0]
  uniforms.uThemeColor.value = getThemeColorValue(config)
  uniforms.uCoreDiskColor.value = getCoreDiskColorValue(config)
  uniforms.uFragmentHighlightColor.value = getFragmentHighlightColorValue(config)
  uniforms.uCompositeScaleParams.value = [config.c1StartScale, config.c1EndScale, config.c1TimeFraction]
  uniforms.uFinalMixerWeights.value = [config.mainArcWeight, config.coreDiskWeight, config.fragmentsWeight]
  uniforms.uFinalMixerParams.value = [getFinalMixerModeValue(config.finalMixerMode), config.finalMixerGain]
  uniforms.uEffectScale.value = config.effectScale
  uniforms.uFragmentScaleCurveParams.value = [config.d6StartScale, config.d6PeakScale, config.d6EndScale, config.d6GrowTimeFraction]
  uniforms.uFragmentAlphaParams.value = [config.d8AlphaMax, config.d8AlphaMin]
  uniforms.uFragmentInitScaleParams.value = [config.d9StartScale, config.d9EndScale, config.d9TimeFraction]
  uniforms.uMainArcPreviewStage.value =
    debugState.mainArcPreviewStage === 'a1' ? 0
      : debugState.mainArcPreviewStage === 'a3' ? 1
        : debugState.mainArcPreviewStage === 'a4' ? 2
          : debugState.mainArcPreviewStage === 'a6' ? 3
            : 4
  uniforms.uCorePreviewStage.value =
    debugState.corePreviewStage === 'bBase' ? 0
      : debugState.corePreviewStage === 'bScale' ? 1
        : debugState.corePreviewStage === 'bAlpha' ? 2
          : 3
  uniforms.uFragmentPreviewStage.value =
    debugState.fragmentPreviewStage === 'd0' ? 0
      : debugState.fragmentPreviewStage === 'd1' ? 1
        : debugState.fragmentPreviewStage === 'd2' ? 2
          : debugState.fragmentPreviewStage === 'd3' ? 3
            : debugState.fragmentPreviewStage === 'd4' ? 4
              : debugState.fragmentPreviewStage === 'd5' ? 5
                : debugState.fragmentPreviewStage === 'd6' ? 6
                  : debugState.fragmentPreviewStage === 'd7' ? 7
                : debugState.fragmentPreviewStage === 'd8' ? 8
                      : 9
  uniforms.uBranchVisibility.value = [
    debugState.branchVisibility.mainArc ? 1 : 0,
    debugState.branchVisibility.coreDisk ? 1 : 0,
    debugState.branchVisibility.mainFx ? 1 : 0,
    debugState.branchVisibility.fragments ? 1 : 0,
  ]
}

const syncFilterUniforms = (
  uniforms: ReturnType<typeof createFilterUniforms>,
  config: RuntimeConfig,
  filterEnabled: boolean,
  textureScaleX: number,
  textureScaleY: number,
  texelX: number,
  texelY: number,
  texture: any
) =>
{
  uniforms.uSceneTexture.value = texture
  uniforms.uSceneUvScale.value = [textureScaleX, textureScaleY]
  uniforms.uSceneTexel.value = [texelX, texelY]
  uniforms.uPostBloomParams.value = [config.fxBloomThreshold, config.fxBloomIntensity, config.fxBloomScatter, filterEnabled ? 1 : 0]
  uniforms.uPostTonemappingMode.value = getTonemappingModeValue(config.fxTonemappingMode)
}

const syncBurstUniforms = (
  uniforms: ReturnType<typeof createSceneUniforms>,
  burst: BurstState,
  rect: RenderRect,
  time: number
) =>
{
  uniforms.uTime.value = time
  uniforms.uLocalBounds.value = [rect.localBounds.minX, rect.localBounds.maxX, rect.localBounds.minY, rect.localBounds.maxY]
  uniforms.uBurstTiming.value = [burst.startTime, burst.branchAStartTime, burst.duration, burst.fragmentDuration]
  uniforms.uBurstCoreData.value = [burst.coreDiskRadius, burst.coreDiskSoftness, 0, 0]
  uniforms.uBurstCoreAnimData.value = [burst.coreDiskScaleStart, burst.coreDiskScaleEnd, burst.coreDiskScaleTimeFraction, burst.arcInitialAngle]
  uniforms.uBurstCoreToneData.value = [burst.coreDiskAlphaStart, burst.coreDiskAlphaEnd, burst.coreDiskAlphaFadeStartFraction, 0]
  uniforms.uBurstFragmentData.value = [burst.dTriangleSize, burst.d3OuterRadius, burst.d3InnerRadius, 0]
  uniforms.uArcSourceBounds.value = [burst.bounds.minX, burst.bounds.maxX, burst.bounds.minY, burst.bounds.maxY]

  burst.particles.forEach((particle, index) =>
  {
    uniforms[`uParticleA${index}` as const].value = [particle.startTime, particle.duration, particle.scaleMultiplier, particle.enabled]
    uniforms[`uParticleB${index}` as const].value = [particle.offsetX, particle.offsetY, particle.movementY, particle.radius]
    uniforms[`uParticleC${index}` as const].value = [particle.scaleX, particle.scaleY, 0, 0]
  })

  burst.fragmentParticles.forEach((particle, index) =>
  {
    uniforms[`uFragmentParticleA${index}` as const].value = [particle.startTime, particle.lifetime, particle.speed, particle.enabled]
    uniforms[`uFragmentParticleB${index}` as const].value = [particle.spawnX, particle.spawnY, particle.dirX, particle.dirY]
    uniforms[`uFragmentParticleC${index}` as const].value = [particle.rotation, particle.spriteIndex, particle.sizeMultiplier, particle.flashPeriod]
  })
}

export const createClickFx = ({
  target,
  listenTarget,
  config: initialConfig,
  pixelRatioCap = 2,
  autoBindPointer = true,
}: CreateClickFxOptions): ClickFxInstance =>
{
  const config: RuntimeConfig = {
    ...defaultRuntimeConfig,
    ...initialConfig,
    themeColor: {
      ...defaultRuntimeConfig.themeColor,
      ...(initialConfig?.themeColor ?? {}),
    },
    coreDiskColor: {
      ...defaultRuntimeConfig.coreDiskColor,
      ...(initialConfig?.coreDiskColor ?? {}),
    },
  }
  ;(Object.keys(config) as Array<keyof RuntimeConfig>).forEach((configKey) =>
  {
    applyRuntimeConfigConstraints(config, configKey)
  })
  const debugState: RuntimeDebugState = defaultRuntimeDebugState()
  const burstStore = createBurstStore()
  const renderer = new Renderer({
    alpha: true,
    antialias: true,
    dpr: Math.min(window.devicePixelRatio || 1, pixelRatioCap),
  })
  const gl = renderer.gl
  const canvas = gl.canvas as HTMLCanvasElement
  const sceneUniforms = createSceneUniforms(config, debugState)
  const filterUniforms = createFilterUniforms(config)
  const geometry = new Triangle(gl)
  const sceneProgram = new Program(gl, {
    vertex,
    fragment: burstSceneFragment,
    uniforms: sceneUniforms,
    depthTest: false,
    depthWrite: false,
    cullFace: false,
  })
  const filterProgram = new Program(gl, {
    vertex,
    fragment: burstFilterFragment,
    uniforms: filterUniforms,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    cullFace: false,
  })
  filterProgram.setBlendFunc(gl.ONE, gl.ONE, gl.ONE, gl.ONE)
  const sceneMesh = new Mesh(gl, { geometry, program: sceneProgram })
  const filterMesh = new Mesh(gl, { geometry, program: filterProgram })
  let sceneTarget = new RenderTarget(gl, { width: 1, height: 1, depth: false, stencil: false })
  let currentTime = 0
  let disposed = false
  let resizeObserver: ResizeObserver | null = null
  const hostWindow = window
  const runtimeState: RuntimeState = {
    width: 1,
    height: 1,
    dpr: renderer.dpr,
  }
  const previousTargetPosition = target.style.position
  const shouldRestorePosition = getComputedStyle(target).position === 'static'
  const boundListenTarget: HTMLElement | Window = listenTarget ?? target
  let usedWindowResizeFallback = false

  if (shouldRestorePosition)
  {
    target.style.position = 'relative'
  }

  setCanvasStyles(canvas)
  canvas.className = 'app-canvas'
  target.appendChild(canvas)
  gl.clearColor(0, 0, 0, 0)

  const clearDefaultFramebuffer = () =>
  {
    renderer.bindFramebuffer()
    setRendererViewport(renderer, 0, 0, Math.max(1, Math.round(runtimeState.width * runtimeState.dpr)), Math.max(1, Math.round(runtimeState.height * runtimeState.dpr)))
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
  }

  const ensureSceneTarget = (width: number, height: number) =>
  {
    if (width <= sceneTarget.width && height <= sceneTarget.height)
    {
      return
    }

    sceneTarget.setSize(Math.max(width, sceneTarget.width), Math.max(height, sceneTarget.height))
  }

  const drawBurst = (burst: BurstState) =>
  {
    const rect = getBurstRenderRect(burst, config, debugState, runtimeState)

    if (!rect)
    {
      return
    }

    ensureSceneTarget(rect.deviceWidth, rect.deviceHeight)
    syncSceneStaticUniforms(sceneUniforms, config, debugState)
    syncBurstUniforms(sceneUniforms, burst, rect, currentTime)

    renderer.bindFramebuffer(sceneTarget)
    setRendererViewport(renderer, 0, 0, rect.deviceWidth, rect.deviceHeight)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    sceneMesh.draw()

    renderer.bindFramebuffer()
    setRendererViewport(renderer, rect.deviceX, rect.deviceY, rect.deviceWidth, rect.deviceHeight)
    syncFilterUniforms(
      filterUniforms,
      config,
      debugState.branchVisibility.filter,
      rect.deviceWidth / sceneTarget.width,
      rect.deviceHeight / sceneTarget.height,
      1 / rect.deviceWidth,
      1 / rect.deviceHeight,
      sceneTarget.texture
    )
    filterMesh.draw()
  }

  const drawFrame = () =>
  {
    updateBurstActivity(burstStore, currentTime)
    clearDefaultFramebuffer()

    if (!hasActiveBursts(burstStore))
    {
      return
    }

    burstStore.bursts.forEach((burst) =>
    {
      if (!burst.active)
      {
        return
      }

      drawBurst(burst)
    })
  }

  const render = (time: number) =>
  {
    if (disposed)
    {
      return
    }

    currentTime = time * 0.001
    drawFrame()
    requestAnimationFrame(render)
  }

  const resize = () =>
  {
    const rect = target.getBoundingClientRect()
    runtimeState.width = Math.max(1, rect.width)
    runtimeState.height = Math.max(1, rect.height)
    runtimeState.dpr = Math.min(window.devicePixelRatio || 1, pixelRatioCap)
    renderer.dpr = runtimeState.dpr
    renderer.setSize(runtimeState.width, runtimeState.height)
    drawFrame()
  }

  const spawnAtLocal = (x: number, y: number) =>
  {
    currentTime = hostWindow.performance.now() * 0.001
    spawnBurst(
      burstStore,
      config,
      currentTime,
      x,
      y,
      Math.max(runtimeState.width, 1),
      Math.max(runtimeState.height, 1)
    )
  }

  const spawnAtClient = (clientX: number, clientY: number) =>
  {
    const rect = target.getBoundingClientRect()
    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom)
    {
      return
    }

    spawnAtLocal(clientX - rect.left, clientY - rect.top)
  }

  const spawnFromPressEvent = (event: MouseEvent) =>
  {
    if (event.button < 0 || event.button > 2)
    {
      return
    }

    spawnAtClient(event.clientX, event.clientY)
  }

  const handleMouseDown = (event: MouseEvent) =>
  {
    spawnFromPressEvent(event)
  }

  const updateConfig = (partial: Partial<RuntimeConfig>) =>
  {
    mergeConfig(config, partial)
    drawFrame()
  }

  const setDebugState = (partial: Partial<RuntimeDebugState>) =>
  {
    if (partial.branchVisibility)
    {
      debugState.branchVisibility = {
        ...debugState.branchVisibility,
        ...partial.branchVisibility,
      }
    }

    if (partial.corePreviewStage)
    {
      debugState.corePreviewStage = partial.corePreviewStage
    }

    if (partial.mainArcPreviewStage)
    {
      debugState.mainArcPreviewStage = partial.mainArcPreviewStage
    }

    if (partial.fragmentPreviewStage)
    {
      debugState.fragmentPreviewStage = partial.fragmentPreviewStage
    }

    drawFrame()
  }

  const dispose = () =>
  {
    if (disposed)
    {
      return
    }

    disposed = true
    if (autoBindPointer)
    {
      boundListenTarget.removeEventListener('mousedown', handleMouseDown as EventListener)
    }
    resizeObserver?.disconnect()
    if (usedWindowResizeFallback)
    {
      hostWindow.removeEventListener('resize', resize)
    }
    if (canvas.parentElement === target)
    {
      target.removeChild(canvas)
    }

    if (shouldRestorePosition)
    {
      target.style.position = previousTargetPosition
    }
  }

  if (autoBindPointer)
  {
    boundListenTarget.addEventListener('mousedown', handleMouseDown as EventListener)
  }

  if ('ResizeObserver' in window)
  {
    resizeObserver = new ResizeObserver(() => resize())
    resizeObserver.observe(target)
  } else {
    usedWindowResizeFallback = true
    hostWindow.addEventListener('resize', resize)
  }

  resize()
  requestAnimationFrame(render)

  const instance: InternalClickFxInstance = {
    canvas,
    spawnAtClient,
    spawnAtLocal,
    updateConfig,
    setDebugState,
    resize,
    dispose,
  }

  return instance
}
