import { Mesh, Program, RenderTarget, Renderer, Triangle } from 'ogl'
import {
  createRuntimeConfig,
  mergeRuntimeConfig,
} from './config'
import {
  createBurstStore,
  expandBurstBounds,
  getBurstCompositeBounds,
  getBurstShardsBounds,
  hasActiveBursts,
  spawnBurst,
  unionBurstBounds,
  updateBurstActivity,
} from './state'
import burstFilterFragment from './shaders/burst-filter.frag'
import bloomDownsampleFragment from './shaders/postfx-bloom-downsample.frag'
import bloomPrefilterFragment from './shaders/postfx-bloom-prefilter.frag'
import bloomUpsampleFragment from './shaders/postfx-bloom-upsample.frag'
import burstSceneFragment from './shaders/burst-scene.frag'
import vertex from './shaders/click-fx.vert'
import type {
  BurstBounds,
  BurstState,
  ClickFxInstance,
  CreateClickFxOptions,
  RuntimeConfig,
  RuntimeConfigPatch,
  RuntimeDebugState,
} from './types'

type UniformBag = Record<string, { value: any }>

type HdrTargetSupport = {
  useHdr: boolean
  type: number
  internalFormat?: number
}

type RuntimeState = {
  width: number
  height: number
  dpr: number
}

type RenderRect = {
  localBounds: BurstBounds
  deviceX: number
  deviceY: number
  deviceWidth: number
  deviceHeight: number
}

type InternalClickFxInstance = ClickFxInstance & {
  setDebugState: (partial: Partial<RuntimeDebugState>) => void
}

const defaultRuntimeDebugState = (): RuntimeDebugState => ({
  previewMode: 'composite',
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

const getMixerModeValue = (mode: RuntimeConfig['mixer']['mode']) =>
  mode === 'add' ? 0 : mode === 'screen' ? 1 : 2

const getTonemappingModeValue = (mode: RuntimeConfig['postfx']['tonemapping']['mode']) =>
  mode === 'none' ? 0 : mode === 'neutral' ? 1 : 2

const getPreviewModeValue = (mode: RuntimeDebugState['previewMode']) =>
  mode === 'composite' || mode === 'postfxOff'
    ? 0
    : mode === 'arc'
      ? 1
      : mode === 'disk'
        ? 2
        : 3

const gammaToLinear = (value: number) =>
  value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4)

const getBloomScatterValue = (scatter: number) =>
  0.05 + 0.9 * Math.min(1, Math.max(0, scatter))

const getBloomDownscaleFactor = (downscale: RuntimeConfig['postfx']['bloom']['downscale']) =>
  downscale === 'quarter' ? 4 : 2

const detectHdrTargetSupport = (gl: WebGLRenderingContext | WebGL2RenderingContext): HdrTargetSupport =>
{
  const supportsWebgl2 = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext
  if (!supportsWebgl2)
  {
    return {
      useHdr: false,
      type: gl.UNSIGNED_BYTE,
    }
  }

  const webgl2 = gl as WebGL2RenderingContext
  const hasColorBufferFloat = Boolean(webgl2.getExtension('EXT_color_buffer_float'))

  if (!hasColorBufferFloat)
  {
    return {
      useHdr: false,
      type: gl.UNSIGNED_BYTE,
    }
  }

  return {
    useHdr: true,
    type: webgl2.HALF_FLOAT,
    internalFormat: webgl2.RGBA16F,
  }
}

const createRenderTargetOptions = (
  gl: WebGLRenderingContext | WebGL2RenderingContext,
  hdrTargetSupport: HdrTargetSupport
) =>
{
  const options: Record<string, unknown> = {
    width: 1,
    height: 1,
    depth: false,
    stencil: false,
    wrapS: gl.CLAMP_TO_EDGE,
    wrapT: gl.CLAMP_TO_EDGE,
    minFilter: gl.LINEAR,
    magFilter: gl.LINEAR,
    format: gl.RGBA,
    type: hdrTargetSupport.type,
  }

  if (hdrTargetSupport.useHdr && hdrTargetSupport.internalFormat !== undefined)
  {
    options.internalFormat = hdrTargetSupport.internalFormat
  }

  return options
}

const ensureRenderTargetSize = (target: RenderTarget, width: number, height: number) =>
{
  const safeWidth = Math.max(1, Math.floor(width))
  const safeHeight = Math.max(1, Math.floor(height))
  if (target.width === safeWidth && target.height === safeHeight)
  {
    return
  }

  target.setSize(safeWidth, safeHeight)
}

const createSceneUniforms = (config: RuntimeConfig, debugState: RuntimeDebugState): UniformBag => ({
  uTime: { value: 0 },
  uLocalBounds: { value: [-1, 1, -1, 1] },
  uBurstTiming: { value: [0, 0, 0, 0] },
  uDiskShapeData: { value: [config.disk.shape.radius, config.disk.shape.softness, 0, 0] },
  uDiskScaleData: { value: [config.disk.scale.start, config.disk.scale.end, config.disk.scale.timeFraction, 0] },
  uDiskAlphaData: { value: [config.disk.alpha.start, config.disk.alpha.end, config.disk.alpha.fadeStartFraction, 0] },
  uDiskColor: { value: [config.disk.color.r, config.disk.color.g, config.disk.color.b] },
  uArcData: {
    value: [
      config.arc.warp.angleSpanDeg * Math.PI / 180,
      config.arc.warp.radius,
      config.arc.rotation.speedDeg * Math.PI / 180,
      0,
    ],
  },
  uArcAlphaData: { value: [config.arc.alpha.multiplier, 0, 0, 0] },
  uArcColor: { value: [config.arc.color.r, config.arc.color.g, config.arc.color.b] },
  uCompositorScaleData: {
    value: [
      config.compositor.sharedScale.start,
      config.compositor.sharedScale.end,
      config.compositor.sharedScale.timeFraction,
      0,
    ],
  },
  uMixerWeights: {
    value: [
      config.mixer.arcWeight,
      config.mixer.diskWeight,
      config.mixer.shardsWeight,
    ],
  },
  uMixerParams: { value: [getMixerModeValue(config.mixer.mode), config.mixer.gain, 0, 0] },
  uPreviewMode: { value: getPreviewModeValue(debugState.previewMode) },
  uEffectScale: { value: config.compositor.effectScale },
  uShardsShapeData: {
    value: [
      config.shards.shape.triangleSize,
      config.shards.distribution.outerRadius,
      config.shards.distribution.innerRadius,
      0,
    ],
  },
  uShardsScaleCurveData: {
    value: [
      config.shards.scaleOverLife.start,
      config.shards.scaleOverLife.peak,
      config.shards.scaleOverLife.end,
      config.shards.scaleOverLife.growTimeFraction,
    ],
  },
  uShardsAlphaData: { value: [config.shards.alpha.max, config.shards.alpha.min] },
  uShardsInitScaleData: {
    value: [
      config.shards.initScale.start,
      config.shards.initScale.end,
      config.shards.initScale.timeFraction,
      0,
    ],
  },
  uShardsTint: {
    value: [
      config.shards.color.tint.r,
      config.shards.color.tint.g,
      config.shards.color.tint.b,
    ],
  },
  uShardsColorData: { value: [config.shards.color.peakBoost, 0, 0, 0] },
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

const createBloomPrefilterUniforms = (config: RuntimeConfig): UniformBag => ({
  uSourceTexture: { value: null },
  uSourceTexel: { value: [1, 1] },
  uBloomThresholdData: {
    value: [
      gammaToLinear(config.postfx.bloom.threshold),
      Math.max(gammaToLinear(config.postfx.bloom.threshold) * 0.5, 0.0001),
      config.postfx.bloom.clamp,
      config.postfx.bloom.highQualityFiltering ? 1 : 0,
    ],
  },
})

const createBloomDownsampleUniforms = (config: RuntimeConfig): UniformBag => ({
  uSourceTexture: { value: null },
  uSourceTexel: { value: [1, 1] },
  uBloomSampleParams: { value: [config.postfx.bloom.highQualityFiltering ? 1 : 0, 0, 0, 0] },
})

const createBloomUpsampleUniforms = (config: RuntimeConfig): UniformBag => ({
  uHighTexture: { value: null },
  uLowTexture: { value: null },
  uLowTexel: { value: [1, 1] },
  uBloomUpsampleParams: {
    value: [getBloomScatterValue(config.postfx.bloom.scatter), config.postfx.bloom.highQualityFiltering ? 1 : 0, 0, 0],
  },
})

const createUberUniforms = (config: RuntimeConfig): UniformBag => ({
  uSceneTexture: { value: null },
  uBloomTexture: { value: null },
  uPostfxParams: {
    value: [
      1,
      config.postfx.bloom.enabled ? 1 : 0,
      config.postfx.bloom.intensity,
      getTonemappingModeValue(config.postfx.tonemapping.mode),
    ],
  },
  uPostfxAlphaParams: {
    value: [config.postfx.alpha.bloomStrength, config.postfx.alpha.bloomClamp, 0, 0],
  },
  uBloomTint: {
    value: [config.postfx.bloom.tint.r, config.postfx.bloom.tint.g, config.postfx.bloom.tint.b],
  },
})

const getFilterPaddingCss = (config: RuntimeConfig) =>
{
  if (!config.postfx.enabled || !config.postfx.bloom.enabled)
  {
    return 6
  }

  const downscaleFactor = config.postfx.bloom.downscale === 'quarter' ? 0.8 : 1
  return 12
    + config.postfx.bloom.scatter * 36
    + config.postfx.bloom.intensity * 18
    + config.postfx.bloom.maxIterations * 5 * downscaleFactor
}

const getBurstRenderRect = (
  burst: BurstState,
  config: RuntimeConfig,
  debugState: RuntimeDebugState,
  runtimeState: RuntimeState
): RenderRect | null =>
{
  const compositeBounds = getBurstCompositeBounds(burst, config)
  const shardsBounds = getBurstShardsBounds(burst, config)
  let visibleBounds: BurstBounds

  if (debugState.previewMode === 'arc' || debugState.previewMode === 'disk')
  {
    visibleBounds = compositeBounds
  } else if (debugState.previewMode === 'shards')
  {
    visibleBounds = shardsBounds
  } else
  {
    visibleBounds = unionBurstBounds(compositeBounds, shardsBounds)
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
  uniforms.uDiskShapeData.value = [config.disk.shape.radius, config.disk.shape.softness, 0, 0]
  uniforms.uDiskScaleData.value = [config.disk.scale.start, config.disk.scale.end, config.disk.scale.timeFraction, 0]
  uniforms.uDiskAlphaData.value = [config.disk.alpha.start, config.disk.alpha.end, config.disk.alpha.fadeStartFraction, 0]
  uniforms.uDiskColor.value = [config.disk.color.r, config.disk.color.g, config.disk.color.b]
  uniforms.uArcData.value = [
    config.arc.warp.angleSpanDeg * Math.PI / 180,
    config.arc.warp.radius,
    config.arc.rotation.speedDeg * Math.PI / 180,
    0,
  ]
  uniforms.uArcAlphaData.value = [config.arc.alpha.multiplier, 0, 0, 0]
  uniforms.uArcColor.value = [config.arc.color.r, config.arc.color.g, config.arc.color.b]
  uniforms.uCompositorScaleData.value = [
    config.compositor.sharedScale.start,
    config.compositor.sharedScale.end,
    config.compositor.sharedScale.timeFraction,
    0,
  ]
  uniforms.uMixerWeights.value = [
    config.mixer.arcWeight,
    config.mixer.diskWeight,
    config.mixer.shardsWeight,
  ]
  uniforms.uMixerParams.value = [getMixerModeValue(config.mixer.mode), config.mixer.gain, 0, 0]
  uniforms.uPreviewMode.value = getPreviewModeValue(debugState.previewMode)
  uniforms.uEffectScale.value = config.compositor.effectScale
  uniforms.uShardsShapeData.value = [
    config.shards.shape.triangleSize,
    config.shards.distribution.outerRadius,
    config.shards.distribution.innerRadius,
    0,
  ]
  uniforms.uShardsScaleCurveData.value = [
    config.shards.scaleOverLife.start,
    config.shards.scaleOverLife.peak,
    config.shards.scaleOverLife.end,
    config.shards.scaleOverLife.growTimeFraction,
  ]
  uniforms.uShardsAlphaData.value = [config.shards.alpha.max, config.shards.alpha.min]
  uniforms.uShardsInitScaleData.value = [
    config.shards.initScale.start,
    config.shards.initScale.end,
    config.shards.initScale.timeFraction,
    0,
  ]
  uniforms.uShardsTint.value = [
    config.shards.color.tint.r,
    config.shards.color.tint.g,
    config.shards.color.tint.b,
  ]
  uniforms.uShardsColorData.value = [config.shards.color.peakBoost, 0, 0, 0]
}

const syncBloomPrefilterUniforms = (
  uniforms: ReturnType<typeof createBloomPrefilterUniforms>,
  config: RuntimeConfig,
  texture: any,
  texelX: number,
  texelY: number
) =>
{
  const thresholdLinear = gammaToLinear(config.postfx.bloom.threshold)
  uniforms.uSourceTexture.value = texture
  uniforms.uSourceTexel.value = [texelX, texelY]
  uniforms.uBloomThresholdData.value = [
    thresholdLinear,
    Math.max(thresholdLinear * 0.5, 0.0001),
    config.postfx.bloom.clamp,
    config.postfx.bloom.highQualityFiltering ? 1 : 0,
  ]
}

const syncBloomDownsampleUniforms = (
  uniforms: ReturnType<typeof createBloomDownsampleUniforms>,
  config: RuntimeConfig,
  texture: any,
  texelX: number,
  texelY: number
) =>
{
  uniforms.uSourceTexture.value = texture
  uniforms.uSourceTexel.value = [texelX, texelY]
  uniforms.uBloomSampleParams.value = [config.postfx.bloom.highQualityFiltering ? 1 : 0, 0, 0, 0]
}

const syncBloomUpsampleUniforms = (
  uniforms: ReturnType<typeof createBloomUpsampleUniforms>,
  config: RuntimeConfig,
  highTexture: any,
  lowTexture: any,
  lowTexelX: number,
  lowTexelY: number
) =>
{
  uniforms.uHighTexture.value = highTexture
  uniforms.uLowTexture.value = lowTexture
  uniforms.uLowTexel.value = [lowTexelX, lowTexelY]
  uniforms.uBloomUpsampleParams.value = [
    getBloomScatterValue(config.postfx.bloom.scatter),
    config.postfx.bloom.highQualityFiltering ? 1 : 0,
    0,
    0,
  ]
}

const syncUberUniforms = (
  uniforms: ReturnType<typeof createUberUniforms>,
  config: RuntimeConfig,
  postfxEnabled: boolean,
  bloomTexture: any,
  sceneTexture: any
) =>
{
  uniforms.uSceneTexture.value = sceneTexture
  uniforms.uBloomTexture.value = bloomTexture ?? sceneTexture
  uniforms.uPostfxParams.value = [
    postfxEnabled ? 1 : 0,
    config.postfx.bloom.enabled && postfxEnabled ? 1 : 0,
    config.postfx.bloom.intensity,
    getTonemappingModeValue(config.postfx.tonemapping.mode),
  ]
  uniforms.uPostfxAlphaParams.value = [
    config.postfx.alpha.bloomStrength,
    config.postfx.alpha.bloomClamp,
    0,
    0,
  ]
  uniforms.uBloomTint.value = [
    config.postfx.bloom.tint.r,
    config.postfx.bloom.tint.g,
    config.postfx.bloom.tint.b,
  ]
}

const syncBurstUniforms = (
  uniforms: ReturnType<typeof createSceneUniforms>,
  burst: BurstState,
  rect: RenderRect,
  time: number
) =>
{
  uniforms.uTime.value = time
  uniforms.uLocalBounds.value = [
    rect.localBounds.minX,
    rect.localBounds.maxX,
    rect.localBounds.minY,
    rect.localBounds.maxY,
  ]
  uniforms.uBurstTiming.value = [
    burst.startTime,
    burst.arcStartTime,
    burst.duration,
    burst.shardsDuration,
  ]
  uniforms.uDiskShapeData.value[0] = burst.diskRadius
  uniforms.uDiskShapeData.value[1] = burst.diskSoftness
  uniforms.uDiskScaleData.value[0] = burst.diskScaleStart
  uniforms.uDiskScaleData.value[1] = burst.diskScaleEnd
  uniforms.uDiskScaleData.value[2] = burst.diskScaleTimeFraction
  uniforms.uDiskScaleData.value[3] = burst.arcInitialAngle
  uniforms.uDiskAlphaData.value[0] = burst.diskAlphaStart
  uniforms.uDiskAlphaData.value[1] = burst.diskAlphaEnd
  uniforms.uDiskAlphaData.value[2] = burst.diskAlphaFadeStartFraction
  uniforms.uShardsShapeData.value[0] = burst.shardsTriangleSize
  uniforms.uShardsShapeData.value[1] = burst.shardsOuterRadius
  uniforms.uShardsShapeData.value[2] = burst.shardsInnerRadius
  uniforms.uArcSourceBounds.value = [
    burst.bounds.minX,
    burst.bounds.maxX,
    burst.bounds.minY,
    burst.bounds.maxY,
  ]

  burst.arcParticles.forEach((particle, index) =>
  {
    uniforms[`uParticleA${index}` as const].value = [
      particle.startTime,
      particle.duration,
      particle.scaleMultiplier,
      particle.enabled,
    ]
    uniforms[`uParticleB${index}` as const].value = [
      particle.offsetX,
      particle.offsetY,
      particle.movementY,
      particle.radius,
    ]
    uniforms[`uParticleC${index}` as const].value = [
      particle.scaleX,
      particle.scaleY,
      0,
      0,
    ]
  })

  burst.shardParticles.forEach((particle, index) =>
  {
    uniforms[`uFragmentParticleA${index}` as const].value = [
      particle.startTime,
      particle.lifetime,
      particle.speed,
      particle.enabled,
    ]
    uniforms[`uFragmentParticleB${index}` as const].value = [
      particle.spawnX,
      particle.spawnY,
      particle.dirX,
      particle.dirY,
    ]
    uniforms[`uFragmentParticleC${index}` as const].value = [
      particle.rotation,
      particle.spriteIndex,
      particle.sizeMultiplier,
      particle.flashTimeWarp,
    ]
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
  const config = createRuntimeConfig(initialConfig)
  const debugState = defaultRuntimeDebugState()
  const burstStore = createBurstStore()
  const renderer = new Renderer({
    alpha: true,
    antialias: true,
    dpr: Math.min(window.devicePixelRatio || 1, pixelRatioCap),
    premultipliedAlpha: true,
  })
  const gl = renderer.gl
  const hdrTargetSupport = detectHdrTargetSupport(gl)
  const canvas = gl.canvas as HTMLCanvasElement
  const sceneUniforms = createSceneUniforms(config, debugState)
  const bloomPrefilterUniforms = createBloomPrefilterUniforms(config)
  const bloomDownsampleUniforms = createBloomDownsampleUniforms(config)
  const bloomUpsampleUniforms = createBloomUpsampleUniforms(config)
  const uberUniforms = createUberUniforms(config)
  const geometry = new Triangle(gl)
  const sceneProgram = new Program(gl, {
    vertex,
    fragment: burstSceneFragment,
    uniforms: sceneUniforms,
    depthTest: false,
    depthWrite: false,
    cullFace: false,
  })
  const bloomPrefilterProgram = new Program(gl, {
    vertex,
    fragment: bloomPrefilterFragment,
    uniforms: bloomPrefilterUniforms,
    depthTest: false,
    depthWrite: false,
    cullFace: false,
  })
  const bloomDownsampleProgram = new Program(gl, {
    vertex,
    fragment: bloomDownsampleFragment,
    uniforms: bloomDownsampleUniforms,
    depthTest: false,
    depthWrite: false,
    cullFace: false,
  })
  const bloomUpsampleProgram = new Program(gl, {
    vertex,
    fragment: bloomUpsampleFragment,
    uniforms: bloomUpsampleUniforms,
    depthTest: false,
    depthWrite: false,
    cullFace: false,
  })
  const uberProgram = new Program(gl, {
    vertex,
    fragment: burstFilterFragment,
    uniforms: uberUniforms,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    cullFace: false,
  })
  const sceneMesh = new Mesh(gl, { geometry, program: sceneProgram })
  const bloomPrefilterMesh = new Mesh(gl, { geometry, program: bloomPrefilterProgram })
  const bloomDownsampleMesh = new Mesh(gl, { geometry, program: bloomDownsampleProgram })
  const bloomUpsampleMesh = new Mesh(gl, { geometry, program: bloomUpsampleProgram })
  const uberMesh = new Mesh(gl, { geometry, program: uberProgram })
  const renderTargetOptions = createRenderTargetOptions(gl, hdrTargetSupport)
  const sceneTarget = new RenderTarget(gl, renderTargetOptions)
  const bloomDownTargets: RenderTarget[] = []
  const bloomUpTargets: RenderTarget[] = []
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
    setRendererViewport(
      renderer,
      0,
      0,
      Math.max(1, Math.round(runtimeState.width * runtimeState.dpr)),
      Math.max(1, Math.round(runtimeState.height * runtimeState.dpr))
    )
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
  }

  const ensureSceneTarget = (width: number, height: number) =>
  {
    ensureRenderTargetSize(sceneTarget, width, height)
  }

  const getBloomTarget = (targets: RenderTarget[], index: number) =>
  {
    if (!targets[index])
    {
      targets[index] = new RenderTarget(gl, renderTargetOptions)
    }

    return targets[index]
  }

  const clearBoundTarget = () =>
  {
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
  }

  const runBloomPyramid = (width: number, height: number) =>
  {
    const bloomConfig = config.postfx.bloom
    if (!config.postfx.enabled || !bloomConfig.enabled || bloomConfig.intensity <= 0)
    {
      return null
    }

    const downscaleFactor = getBloomDownscaleFactor(bloomConfig.downscale)
    let levelWidth = Math.max(1, Math.floor(width / downscaleFactor))
    let levelHeight = Math.max(1, Math.floor(height / downscaleFactor))

    if (levelWidth < 2 || levelHeight < 2)
    {
      return null
    }

    const maxLevels = Math.max(1, bloomConfig.maxIterations)
    let levelCount = 0

    const prefilterTarget = getBloomTarget(bloomDownTargets, 0)
    ensureRenderTargetSize(prefilterTarget, levelWidth, levelHeight)
    syncBloomPrefilterUniforms(
      bloomPrefilterUniforms,
      config,
      sceneTarget.texture,
      1 / sceneTarget.width,
      1 / sceneTarget.height
    )
    renderer.bindFramebuffer(prefilterTarget)
    setRendererViewport(renderer, 0, 0, prefilterTarget.width, prefilterTarget.height)
    clearBoundTarget()
    bloomPrefilterMesh.draw()
    levelCount = 1

    while (levelCount < maxLevels)
    {
      const previousTarget = bloomDownTargets[levelCount - 1]
      const nextWidth = Math.max(1, Math.floor(previousTarget.width / 2))
      const nextHeight = Math.max(1, Math.floor(previousTarget.height / 2))

      if (nextWidth === previousTarget.width && nextHeight === previousTarget.height)
      {
        break
      }

      const nextTarget = getBloomTarget(bloomDownTargets, levelCount)
      ensureRenderTargetSize(nextTarget, nextWidth, nextHeight)
      syncBloomDownsampleUniforms(
        bloomDownsampleUniforms,
        config,
        previousTarget.texture,
        1 / previousTarget.width,
        1 / previousTarget.height
      )
      renderer.bindFramebuffer(nextTarget)
      setRendererViewport(renderer, 0, 0, nextTarget.width, nextTarget.height)
      clearBoundTarget()
      bloomDownsampleMesh.draw()
      levelCount += 1

      if (nextWidth <= 2 && nextHeight <= 2)
      {
        break
      }
    }

    let currentTexture = bloomDownTargets[levelCount - 1].texture
    let currentWidth = bloomDownTargets[levelCount - 1].width
    let currentHeight = bloomDownTargets[levelCount - 1].height

    for (let index = levelCount - 2; index >= 0; index -= 1)
    {
      const highTarget = bloomDownTargets[index]
      const combinedTarget = getBloomTarget(bloomUpTargets, index)
      ensureRenderTargetSize(combinedTarget, highTarget.width, highTarget.height)
      syncBloomUpsampleUniforms(
        bloomUpsampleUniforms,
        config,
        highTarget.texture,
        currentTexture,
        1 / currentWidth,
        1 / currentHeight
      )
      renderer.bindFramebuffer(combinedTarget)
      setRendererViewport(renderer, 0, 0, combinedTarget.width, combinedTarget.height)
      clearBoundTarget()
      bloomUpsampleMesh.draw()
      currentTexture = combinedTarget.texture
      currentWidth = combinedTarget.width
      currentHeight = combinedTarget.height
    }

    return currentTexture
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

    const postfxEnabled = config.postfx.enabled && debugState.previewMode !== 'postfxOff'
    const bloomTexture = postfxEnabled ? runBloomPyramid(rect.deviceWidth, rect.deviceHeight) : null

    renderer.bindFramebuffer()
    setRendererViewport(renderer, rect.deviceX, rect.deviceY, rect.deviceWidth, rect.deviceHeight)
    syncUberUniforms(
      uberUniforms,
      config,
      postfxEnabled,
      bloomTexture,
      sceneTarget.texture
    )
    uberMesh.draw()
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
      if (burst.active)
      {
        drawBurst(burst)
      }
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

  const handleMouseDown = (event: MouseEvent) =>
  {
    if (event.button < 0 || event.button > 2)
    {
      return
    }

    spawnAtClient(event.clientX, event.clientY)
  }

  const updateConfig = (partial: RuntimeConfigPatch) =>
  {
    mergeRuntimeConfig(config, partial)
    drawFrame()
  }

  const setDebugState = (partial: Partial<RuntimeDebugState>) =>
  {
    if (partial.previewMode)
    {
      debugState.previewMode = partial.previewMode
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
  } else
  {
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
