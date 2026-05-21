import { Mesh, Program, RenderTarget, Renderer, Triangle } from 'ogl'
import {
  createTouchEffectConfig,
  mergeTouchEffectConfig,
} from '../config'
import { MAX_SWIPE_POINTS_PER_STROKE } from '../core/constants'
import {
  appendSwipeStrokePoint,
  beginSwipeStroke,
  createBurstStore,
  createSwipeStore,
  endAllSwipeStrokes,
  endSwipeStroke,
  expandBurstBounds,
  getBurstCompositeBounds,
  getBurstShardsBounds,
  getSwipeShardsBounds,
  hasActiveBursts,
  hasActiveSwipeContent,
  spawnBurst,
  unionBurstBounds,
  updateBurstActivity,
  updateSwipeActivity,
} from '../state'
import burstFilterFragment from '../rendering/shaders/burst-filter.frag'
import burstSceneFragment from '../rendering/shaders/burst-scene.frag'
import finalMixerFragment from '../rendering/shaders/final-mixer.frag'
import bloomDownsampleFragment from '../rendering/shaders/postfx-bloom-downsample.frag'
import bloomPrefilterFragment from '../rendering/shaders/postfx-bloom-prefilter.frag'
import bloomUpsampleFragment from '../rendering/shaders/postfx-bloom-upsample.frag'
import vertex from '../rendering/shaders/touch-effect.vert'
import { createTrailPolyline, updateTrailPolyline } from '../rendering/trail'
import type {
  BurstBounds,
  BurstState,
  TouchEffectInstance,
  CreateTouchEffectOptions,
  TouchEffectConfig,
  TouchEffectConfigPatch,
  TouchEffectDebugState,
  SwipeStrokeState,
} from '../types'

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

type InternalTouchEffectInstance = TouchEffectInstance & {
  setDebugState: (partial: Partial<TouchEffectDebugState>) => void
}

const defaultTouchEffectDebugState = (): TouchEffectDebugState => ({
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

const getMixerModeValue = (mode: TouchEffectConfig['mixer']['mode']) =>
  mode === 'add' ? 0 : mode === 'screen' ? 1 : 2

const getTonemappingModeValue = (mode: TouchEffectConfig['postfx']['tonemapping']['mode']) =>
  mode === 'none' ? 0 : mode === 'neutral' ? 1 : 2

const getScenePreviewModeValue = (mode: TouchEffectDebugState['previewMode']) =>
  mode === 'arc'
    ? 1
    : mode === 'disk'
      ? 2
      : mode === 'shards'
        ? 3
        : 0

const getFinalPreviewModeValue = (mode: TouchEffectDebugState['previewMode']) =>
  mode === 'trail'
    ? 2
    : mode === 'arc' || mode === 'disk' || mode === 'shards'
      ? 1
      : 0

const gammaToLinear = (value: number) =>
  value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4)

const getBloomScatterValue = (scatter: number) =>
  0.05 + 0.9 * Math.min(1, Math.max(0, scatter))

const getBloomDownscaleFactor = (downscale: TouchEffectConfig['postfx']['bloom']['downscale']) =>
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

const clearBoundTarget = (gl: WebGLRenderingContext | WebGL2RenderingContext) =>
{
  gl.clearColor(0, 0, 0, 0)
  gl.clear(gl.COLOR_BUFFER_BIT)
}

const getFilterPaddingCss = (config: TouchEffectConfig) =>
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

const getLocalRenderRect = (
  originX: number,
  originY: number,
  visibleBounds: BurstBounds,
  paddingLocal: number,
  runtimeState: RuntimeState
): RenderRect | null =>
{
  const paddedBounds = expandBurstBounds(visibleBounds, paddingLocal)
  const originCssX = originX * runtimeState.width
  const originCssY = (1 - originY) * runtimeState.height

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

const getBurstRenderRect = (
  burst: BurstState,
  config: TouchEffectConfig,
  debugState: TouchEffectDebugState,
  runtimeState: RuntimeState
) =>
{
  const compositeBounds = getBurstCompositeBounds(burst, config)
  const shardsBounds = getBurstShardsBounds(burst, config)
  const visibleBounds = debugState.previewMode === 'arc' || debugState.previewMode === 'disk'
    ? compositeBounds
    : debugState.previewMode === 'shards'
      ? shardsBounds
      : unionBurstBounds(compositeBounds, shardsBounds)

  return getLocalRenderRect(
    burst.originX,
    burst.originY,
    visibleBounds,
    getFilterPaddingCss(config) / Math.max(runtimeState.height, 1),
    runtimeState
  )
}

const getSwipeShardsRenderRect = (
  stroke: SwipeStrokeState,
  config: TouchEffectConfig,
  runtimeState: RuntimeState
) =>
  getLocalRenderRect(
    stroke.originX,
    stroke.originY,
    getSwipeShardsBounds(stroke, config),
    getFilterPaddingCss(config) / Math.max(runtimeState.height, 1),
    runtimeState
  )

const createSceneUniforms = (config: TouchEffectConfig): UniformBag => ({
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
  uPreviewMode: { value: 0 },
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

const createFinalMixerUniforms = (config: TouchEffectConfig, debugState: TouchEffectDebugState): UniformBag => ({
  uSceneTexture: { value: null },
  uTrailTexture: { value: null },
  uFinalMixerParams: { value: [config.mixer.trailWeight, getMixerModeValue(config.mixer.mode), 0, 0] },
  uFinalPreviewMode: { value: getFinalPreviewModeValue(debugState.previewMode) },
})

const createBloomPrefilterUniforms = (config: TouchEffectConfig): UniformBag => ({
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

const createBloomDownsampleUniforms = (config: TouchEffectConfig): UniformBag => ({
  uSourceTexture: { value: null },
  uSourceTexel: { value: [1, 1] },
  uBloomSampleParams: { value: [config.postfx.bloom.highQualityFiltering ? 1 : 0, 0, 0, 0] },
})

const createBloomUpsampleUniforms = (config: TouchEffectConfig): UniformBag => ({
  uHighTexture: { value: null },
  uLowTexture: { value: null },
  uLowTexel: { value: [1, 1] },
  uBloomUpsampleParams: {
    value: [getBloomScatterValue(config.postfx.bloom.scatter), config.postfx.bloom.highQualityFiltering ? 1 : 0, 0, 0],
  },
})

const createUberUniforms = (config: TouchEffectConfig): UniformBag => ({
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

const syncSceneStaticUniforms = (
  uniforms: ReturnType<typeof createSceneUniforms>,
  config: TouchEffectConfig,
  previewMode: TouchEffectDebugState['previewMode']
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
  uniforms.uPreviewMode.value = getScenePreviewModeValue(previewMode)
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

const syncFinalMixerUniforms = (
  uniforms: ReturnType<typeof createFinalMixerUniforms>,
  config: TouchEffectConfig,
  debugState: TouchEffectDebugState,
  sceneTexture: any,
  trailTexture: any
) =>
{
  uniforms.uSceneTexture.value = sceneTexture
  uniforms.uTrailTexture.value = trailTexture
  uniforms.uFinalMixerParams.value = [config.mixer.trailWeight, getMixerModeValue(config.mixer.mode), 0, 0]
  uniforms.uFinalPreviewMode.value = getFinalPreviewModeValue(debugState.previewMode)
}

const syncBloomPrefilterUniforms = (
  uniforms: ReturnType<typeof createBloomPrefilterUniforms>,
  config: TouchEffectConfig,
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
  config: TouchEffectConfig,
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
  config: TouchEffectConfig,
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
  config: TouchEffectConfig,
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

const disableArcUniforms = (uniforms: ReturnType<typeof createSceneUniforms>) =>
{
  for (let index = 0; index < 3; index += 1)
  {
    uniforms[`uParticleA${index}` as const].value = [-100, 0, 1, 0]
    uniforms[`uParticleB${index}` as const].value = [0, 0, 0, 0]
    uniforms[`uParticleC${index}` as const].value = [0, 0, 0, 0]
  }
}

const disableFragmentUniforms = (uniforms: ReturnType<typeof createSceneUniforms>) =>
{
  for (let index = 0; index < 10; index += 1)
  {
    uniforms[`uFragmentParticleA${index}` as const].value = [-100, 0, 0, 0]
    uniforms[`uFragmentParticleB${index}` as const].value = [0, 0, 0, 0]
    uniforms[`uFragmentParticleC${index}` as const].value = [0, 0, 1, 0.1]
  }
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

const syncSwipeShardBatchUniforms = (
  uniforms: ReturnType<typeof createSceneUniforms>,
  stroke: SwipeStrokeState,
  rect: RenderRect,
  time: number,
  config: TouchEffectConfig,
  particleIndices: number[]
) =>
{
  uniforms.uTime.value = time
  uniforms.uLocalBounds.value = [
    rect.localBounds.minX,
    rect.localBounds.maxX,
    rect.localBounds.minY,
    rect.localBounds.maxY,
  ]
  uniforms.uBurstTiming.value = [time, time, 0, 1]
  uniforms.uPreviewMode.value = 3
  uniforms.uArcSourceBounds.value = [0, 0, 0, 0]
  uniforms.uEffectScale.value = 1
  uniforms.uDiskScaleData.value[3] = 0
  uniforms.uShardsShapeData.value = [config.shards.shape.triangleSize, 0, 0, 0]
  uniforms.uShardsScaleCurveData.value = [
    config.shards.scaleOverLife.start,
    config.shards.scaleOverLife.peak,
    config.shards.scaleOverLife.end,
    config.shards.scaleOverLife.growTimeFraction,
  ]
  uniforms.uShardsAlphaData.value = [config.shards.alpha.max, config.shards.alpha.min]
  uniforms.uShardsInitScaleData.value = [1, 1, 1, 0]
  uniforms.uShardsTint.value = [
    config.swipe.shards.tint.r,
    config.swipe.shards.tint.g,
    config.swipe.shards.tint.b,
  ]
  uniforms.uShardsColorData.value = [config.swipe.shards.peakBoost, 0, 0, 0]

  disableArcUniforms(uniforms)
  disableFragmentUniforms(uniforms)

  particleIndices.forEach((particleIndex, uniformIndex) =>
  {
    const particle = stroke.shardParticles[particleIndex]
    uniforms[`uFragmentParticleA${uniformIndex}` as const].value = [
      particle.startTime,
      particle.lifetime,
      particle.speed,
      particle.enabled,
    ]
    uniforms[`uFragmentParticleB${uniformIndex}` as const].value = [
      particle.spawnX,
      particle.spawnY,
      particle.dirX,
      particle.dirY,
    ]
    uniforms[`uFragmentParticleC${uniformIndex}` as const].value = [
      particle.rotation,
      particle.spriteIndex,
      particle.sizeMultiplier,
      particle.flashTimeWarp,
    ]
  })
}

export const createTouchEffect = ({
  target,
  listenTarget,
  config: initialConfig,
  pixelRatioCap = 2,
  autoBindPointer = true,
}: CreateTouchEffectOptions): TouchEffectInstance =>
{
  const config = createTouchEffectConfig(initialConfig)
  const debugState = defaultTouchEffectDebugState()
  const burstStore = createBurstStore()
  const swipeStore = createSwipeStore()
  const renderer = new Renderer({
    alpha: true,
    antialias: true,
    dpr: Math.min(window.devicePixelRatio || 1, pixelRatioCap),
    premultipliedAlpha: true,
  })
  const gl = renderer.gl
  const hdrTargetSupport = detectHdrTargetSupport(gl)
  const canvas = gl.canvas as HTMLCanvasElement
  const sceneUniforms = createSceneUniforms(config)
  const finalMixerUniforms = createFinalMixerUniforms(config, debugState)
  const bloomPrefilterUniforms = createBloomPrefilterUniforms(config)
  const bloomDownsampleUniforms = createBloomDownsampleUniforms(config)
  const bloomUpsampleUniforms = createBloomUpsampleUniforms(config)
  const uberUniforms = createUberUniforms(config)
  const geometry = new Triangle(gl)
  const sceneProgram = new Program(gl, {
    vertex,
    fragment: burstSceneFragment,
    uniforms: sceneUniforms,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    cullFace: false,
  })
  const finalMixerProgram = new Program(gl, {
    vertex,
    fragment: finalMixerFragment,
    uniforms: finalMixerUniforms,
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
  const finalMixerMesh = new Mesh(gl, { geometry, program: finalMixerProgram })
  const bloomPrefilterMesh = new Mesh(gl, { geometry, program: bloomPrefilterProgram })
  const bloomDownsampleMesh = new Mesh(gl, { geometry, program: bloomDownsampleProgram })
  const bloomUpsampleMesh = new Mesh(gl, { geometry, program: bloomUpsampleProgram })
  const uberMesh = new Mesh(gl, { geometry, program: uberProgram })
  const trailPolyline = createTrailPolyline(gl)
  const renderTargetOptions = createRenderTargetOptions(gl, hdrTargetSupport)
  const sceneTarget = new RenderTarget(gl, renderTargetOptions)
  const trailTarget = new RenderTarget(gl, renderTargetOptions)
  const mixedTarget = new RenderTarget(gl, renderTargetOptions)
  const bloomDownTargets: RenderTarget[] = []
  const bloomUpTargets: RenderTarget[] = []
  let currentTime = 0
  let disposed = false
  let resizeObserver: ResizeObserver | null = null
  let usedWindowResizeFallback = false
  const hostWindow = window
  const runtimeState: RuntimeState = {
    width: 1,
    height: 1,
    dpr: renderer.dpr,
  }
  const previousTargetPosition = target.style.position
  const shouldRestorePosition = getComputedStyle(target).position === 'static'
  const boundListenTarget: HTMLElement | Window = listenTarget ?? target
  const capturedPointerIds = new Set<number>()

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
    clearBoundTarget(gl)
  }

  const ensureLayerTargets = () =>
  {
    const width = Math.max(1, Math.round(runtimeState.width * runtimeState.dpr))
    const height = Math.max(1, Math.round(runtimeState.height * runtimeState.dpr))
    ensureRenderTargetSize(sceneTarget, width, height)
    ensureRenderTargetSize(trailTarget, width, height)
    ensureRenderTargetSize(mixedTarget, width, height)
  }

  const getBloomTarget = (targets: RenderTarget[], index: number) =>
  {
    if (!targets[index])
    {
      targets[index] = new RenderTarget(gl, renderTargetOptions)
    }
    return targets[index]
  }

  const runBloomPyramid = (
    width: number,
    height: number,
    sourceTexture: any,
    sourceWidth: number,
    sourceHeight: number
  ) =>
  {
    const bloomConfig = config.postfx.bloom
    if (!config.postfx.enabled || !bloomConfig.enabled || bloomConfig.intensity <= 0)
    {
      return null
    }

    const downscaleFactor = getBloomDownscaleFactor(bloomConfig.downscale)
    const levelWidth = Math.max(1, Math.floor(width / downscaleFactor))
    const levelHeight = Math.max(1, Math.floor(height / downscaleFactor))
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
      sourceTexture,
      1 / sourceWidth,
      1 / sourceHeight
    )
    renderer.bindFramebuffer(prefilterTarget)
    setRendererViewport(renderer, 0, 0, prefilterTarget.width, prefilterTarget.height)
    clearBoundTarget(gl)
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
      clearBoundTarget(gl)
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
      clearBoundTarget(gl)
      bloomUpsampleMesh.draw()
      currentTexture = combinedTarget.texture
      currentWidth = combinedTarget.width
      currentHeight = combinedTarget.height
    }

    return currentTexture
  }

  const drawClickBurst = (burst: BurstState) =>
  {
    const rect = getBurstRenderRect(burst, config, debugState, runtimeState)
    if (!rect)
    {
      return
    }

    syncSceneStaticUniforms(sceneUniforms, config, debugState.previewMode)
    syncBurstUniforms(sceneUniforms, burst, rect, currentTime)
    renderer.bindFramebuffer(sceneTarget)
    setRendererViewport(renderer, rect.deviceX, rect.deviceY, rect.deviceWidth, rect.deviceHeight)
    sceneMesh.draw()
  }

  const drawSwipeShardStroke = (stroke: SwipeStrokeState) =>
  {
    const rect = getSwipeShardsRenderRect(stroke, config, runtimeState)
    if (!rect)
    {
      return
    }

    const activeParticleIndices: number[] = []
    stroke.shardParticles.forEach((particle, index) =>
    {
      if (!particle.enabled || particle.lifetime <= 0)
      {
        return
      }

      const progress = (currentTime - particle.startTime) / particle.lifetime
      if (progress >= 0 && progress <= 1)
      {
        activeParticleIndices.push(index)
      }
    })

    if (!activeParticleIndices.length)
    {
      return
    }

    syncSceneStaticUniforms(sceneUniforms, config, 'shards')
    for (let batchStart = 0; batchStart < activeParticleIndices.length; batchStart += 10)
    {
      const particleBatch = activeParticleIndices.slice(batchStart, batchStart + 10)
      syncSwipeShardBatchUniforms(sceneUniforms, stroke, rect, currentTime, config, particleBatch)
      renderer.bindFramebuffer(sceneTarget)
      setRendererViewport(renderer, rect.deviceX, rect.deviceY, rect.deviceWidth, rect.deviceHeight)
      sceneMesh.draw()
    }
  }

  const drawTrailStroke = (stroke: SwipeStrokeState) =>
  {
    if (!updateTrailPolyline(stroke, trailPolyline, config, runtimeState, currentTime))
    {
      return
    }

    renderer.bindFramebuffer(trailTarget)
    setRendererViewport(renderer, 0, 0, trailTarget.width, trailTarget.height)
    trailPolyline.polyline.mesh.draw()
  }

  const drawFrame = () =>
  {
    updateBurstActivity(burstStore, currentTime)
    updateSwipeActivity(swipeStore, currentTime)
    clearDefaultFramebuffer()

    const hasBursts = hasActiveBursts(burstStore)
    const hasSwipe = hasActiveSwipeContent(swipeStore)
    if (!hasBursts && !hasSwipe)
    {
      return
    }

    ensureLayerTargets()

    renderer.bindFramebuffer(sceneTarget)
    setRendererViewport(renderer, 0, 0, sceneTarget.width, sceneTarget.height)
    clearBoundTarget(gl)

    if (debugState.previewMode !== 'trail')
    {
      burstStore.bursts.forEach((burst) =>
      {
        if (burst.active)
        {
          drawClickBurst(burst)
        }
      })

      if (debugState.previewMode === 'composite' || debugState.previewMode === 'postfxOff' || debugState.previewMode === 'shards')
      {
        swipeStore.strokes.forEach((stroke) =>
        {
          if (stroke.active)
          {
            drawSwipeShardStroke(stroke)
          }
        })
      }
    }

    renderer.bindFramebuffer(trailTarget)
    setRendererViewport(renderer, 0, 0, trailTarget.width, trailTarget.height)
    clearBoundTarget(gl)
    if (config.swipe.enabled && (
      debugState.previewMode === 'composite'
      || debugState.previewMode === 'postfxOff'
      || debugState.previewMode === 'trail'
    ))
    {
      swipeStore.strokes.forEach((stroke) =>
      {
        if (stroke.active)
        {
          drawTrailStroke(stroke)
        }
      })
    }

    renderer.bindFramebuffer(mixedTarget)
    setRendererViewport(renderer, 0, 0, mixedTarget.width, mixedTarget.height)
    clearBoundTarget(gl)
    syncFinalMixerUniforms(finalMixerUniforms, config, debugState, sceneTarget.texture, trailTarget.texture)
    finalMixerMesh.draw()

    const postfxEnabled = config.postfx.enabled && debugState.previewMode !== 'postfxOff'
    const bloomTexture = postfxEnabled
      ? runBloomPyramid(mixedTarget.width, mixedTarget.height, mixedTarget.texture, mixedTarget.width, mixedTarget.height)
      : null

    renderer.bindFramebuffer()
    setRendererViewport(renderer, 0, 0, mixedTarget.width, mixedTarget.height)
    syncUberUniforms(uberUniforms, config, postfxEnabled, bloomTexture, mixedTarget.texture)
    uberMesh.draw()
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
    trailPolyline.polyline.resize()
    drawFrame()
  }

  const triggerClickAtLocal = (x: number, y: number) =>
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

  const triggerClickAtClient = (clientX: number, clientY: number) =>
  {
    const rect = target.getBoundingClientRect()
    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom)
    {
      return
    }

    triggerClickAtLocal(clientX - rect.left, clientY - rect.top)
  }

  const getRuntimeTime = (timeSeconds?: number) =>
    timeSeconds ?? hostWindow.performance.now() * 0.001

  const releasePointerCapture = (pointerId: number) =>
  {
    capturedPointerIds.delete(pointerId)
    if ('releasePointerCapture' in target)
    {
      try
      {
        target.releasePointerCapture(pointerId)
      }
      catch
      {
        // ignore capture failures
      }
    }
  }

  const beginTrailAtLocal = (pointerId: number, x: number, y: number, timeSeconds?: number) =>
  {
    if (!config.swipe.enabled)
    {
      return
    }

    currentTime = getRuntimeTime(timeSeconds)
    beginSwipeStroke(
      swipeStore,
      config,
      currentTime,
      pointerId,
      x,
      y,
      Math.max(runtimeState.width, 1),
      Math.max(runtimeState.height, 1)
    )
  }

  const appendTrailAtLocal = (pointerId: number, x: number, y: number, timeSeconds?: number) =>
  {
    if (!config.swipe.enabled)
    {
      return false
    }

    currentTime = getRuntimeTime(timeSeconds)
    return appendSwipeStrokePoint(
      swipeStore,
      config,
      currentTime,
      pointerId,
      x,
      y,
      Math.max(runtimeState.width, 1),
      Math.max(runtimeState.height, 1)
    )
  }

  const beginTrailAtClient = (pointerId: number, clientX: number, clientY: number, timeSeconds?: number) =>
  {
    const rect = target.getBoundingClientRect()
    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom)
    {
      return
    }

    beginTrailAtLocal(pointerId, clientX - rect.left, clientY - rect.top, timeSeconds)
  }

  const appendTrailAtClient = (pointerId: number, clientX: number, clientY: number, timeSeconds?: number) =>
  {
    const rect = target.getBoundingClientRect()
    return appendTrailAtLocal(pointerId, clientX - rect.left, clientY - rect.top, timeSeconds)
  }

  const endTrail = (pointerId: number) =>
  {
    endSwipeStroke(swipeStore, pointerId)
    releasePointerCapture(pointerId)
  }

  const endAllTrails = () =>
  {
    endAllSwipeStrokes(swipeStore)
    capturedPointerIds.forEach((pointerId) => releasePointerCapture(pointerId))
    capturedPointerIds.clear()
  }

  const isSwipePointerActive = (event: PointerEvent) =>
  {
    if (event.pointerType === 'mouse' || event.pointerType === 'pen')
    {
      return event.buttons > 0
    }

    return true
  }

  const endSwipeFromPointer = (event: PointerEvent) =>
  {
    endTrail(event.pointerId)
  }

  const beginSwipeFromPointer = (event: PointerEvent) =>
  {
    if (!config.swipe.enabled)
    {
      return
    }

    beginTrailAtClient(event.pointerId, event.clientX, event.clientY)

    if (config.swipe.input.pointerCapture && 'setPointerCapture' in target)
    {
      try
      {
        target.setPointerCapture(event.pointerId)
        capturedPointerIds.add(event.pointerId)
      }
      catch
      {
        // ignore capture failures
      }
    }
  }

  const handlePointerDown = (event: PointerEvent) =>
  {
    if (event.button < 0 || event.button > 2)
    {
      return
    }

    const rect = target.getBoundingClientRect()
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)
    {
      return
    }

    currentTime = hostWindow.performance.now() * 0.001
    triggerClickAtLocal(event.clientX - rect.left, event.clientY - rect.top)
    beginSwipeFromPointer(event)
  }

  const handlePointerMove = (event: PointerEvent) =>
  {
    if (!config.swipe.enabled)
    {
      return
    }

    if (!isSwipePointerActive(event))
    {
      endSwipeFromPointer(event)
      return
    }

    const events = typeof event.getCoalescedEvents === 'function'
      ? event.getCoalescedEvents()
      : []
    const pointerEvents = events.length > 0 ? events : [event]

    pointerEvents.forEach((pointerEvent) =>
    {
      const pointerTime = pointerEvent.timeStamp > 0
        ? pointerEvent.timeStamp * 0.001
        : hostWindow.performance.now() * 0.001
      appendTrailAtClient(
        event.pointerId,
        pointerEvent.clientX,
        pointerEvent.clientY,
        pointerTime
      )
    })
  }

  const handlePointerEnd = (event: PointerEvent) =>
  {
    endSwipeFromPointer(event)
  }

  const handlePointerLeave = (event: PointerEvent) =>
  {
    if (capturedPointerIds.has(event.pointerId))
    {
      return
    }

    endSwipeFromPointer(event)
  }

  const handleWindowBlur = () =>
  {
    endAllTrails()
  }

  const updateConfig = (partial: TouchEffectConfigPatch) =>
  {
    mergeTouchEffectConfig(config, partial)
    drawFrame()
  }

  const setDebugState = (partial: Partial<TouchEffectDebugState>) =>
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
      boundListenTarget.removeEventListener('pointerdown', handlePointerDown as EventListener)
      boundListenTarget.removeEventListener('pointermove', handlePointerMove as EventListener)
      boundListenTarget.removeEventListener('pointerup', handlePointerEnd as EventListener)
      boundListenTarget.removeEventListener('pointercancel', handlePointerEnd as EventListener)
      boundListenTarget.removeEventListener('pointerleave', handlePointerLeave as EventListener)
      target.removeEventListener('lostpointercapture', handlePointerEnd as EventListener)
      hostWindow.removeEventListener('blur', handleWindowBlur)
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
    boundListenTarget.addEventListener('pointerdown', handlePointerDown as EventListener)
    boundListenTarget.addEventListener('pointermove', handlePointerMove as EventListener)
    boundListenTarget.addEventListener('pointerup', handlePointerEnd as EventListener)
    boundListenTarget.addEventListener('pointercancel', handlePointerEnd as EventListener)
    boundListenTarget.addEventListener('pointerleave', handlePointerLeave as EventListener)
    target.addEventListener('lostpointercapture', handlePointerEnd as EventListener)
    hostWindow.addEventListener('blur', handleWindowBlur)
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

  const instance: InternalTouchEffectInstance = {
    canvas,
    triggerClickAtClient,
    triggerClickAtLocal,
    beginTrailAtClient,
    appendTrailAtClient,
    beginTrailAtLocal,
    appendTrailAtLocal,
    endTrail,
    endAllTrails,
    updateConfig,
    setDebugState,
    resize,
    dispose,
  }

  return instance
}
