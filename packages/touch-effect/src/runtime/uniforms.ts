import type { Texture } from 'ogl'
import type {
  BurstState,
  SwipeStrokeState,
  TouchEffectConfig,
  TouchEffectDebugState,
} from '../types'
import {
  gammaToLinear,
  getBloomScatterValue,
  getFinalPreviewModeValue,
  getMixerModeValue,
  getScenePreviewModeValue,
  getTonemappingModeValue,
} from './modes'
import type { RenderRect, TextureValue } from './types'

export const createSceneUniforms = (config: TouchEffectConfig) => ({
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

export const createFinalMixerUniforms = (config: TouchEffectConfig, debugState: TouchEffectDebugState) => ({
  uSceneTexture: { value: null as TextureValue },
  uTrailTexture: { value: null as TextureValue },
  uFinalMixerParams: { value: [config.mixer.trailWeight, getMixerModeValue(config.mixer.mode), 0, 0] },
  uFinalPreviewMode: { value: getFinalPreviewModeValue(debugState.previewMode) },
})

export const createBloomPrefilterUniforms = (config: TouchEffectConfig) => ({
  uSourceTexture: { value: null as TextureValue },
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

export const createBloomDownsampleUniforms = (config: TouchEffectConfig) => ({
  uSourceTexture: { value: null as TextureValue },
  uSourceTexel: { value: [1, 1] },
  uBloomSampleParams: { value: [config.postfx.bloom.highQualityFiltering ? 1 : 0, 0, 0, 0] },
})

export const createBloomUpsampleUniforms = (config: TouchEffectConfig) => ({
  uHighTexture: { value: null as TextureValue },
  uLowTexture: { value: null as TextureValue },
  uLowTexel: { value: [1, 1] },
  uBloomUpsampleParams: {
    value: [getBloomScatterValue(config.postfx.bloom.scatter), config.postfx.bloom.highQualityFiltering ? 1 : 0, 0, 0],
  },
})

export const createUberUniforms = (config: TouchEffectConfig) => ({
  uSceneTexture: { value: null as TextureValue },
  uBloomTexture: { value: null as TextureValue },
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

type SceneUniforms = ReturnType<typeof createSceneUniforms>
type NumberArrayUniform = { value: number[] }
type ParticleUniformName = `uParticle${'A' | 'B' | 'C'}${number}`
type FragmentUniformName = `uFragmentParticle${'A' | 'B' | 'C'}${number}`
type DynamicSceneUniforms = Record<ParticleUniformName | FragmentUniformName, NumberArrayUniform>

const getDynamicSceneUniforms = (uniforms: SceneUniforms) =>
  uniforms as SceneUniforms & DynamicSceneUniforms

export const syncSceneStaticUniforms = (
  uniforms: SceneUniforms,
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

export const syncFinalMixerUniforms = (
  uniforms: ReturnType<typeof createFinalMixerUniforms>,
  config: TouchEffectConfig,
  debugState: TouchEffectDebugState,
  sceneTexture: Texture,
  trailTexture: Texture
) =>
{
  uniforms.uSceneTexture.value = sceneTexture
  uniforms.uTrailTexture.value = trailTexture
  uniforms.uFinalMixerParams.value = [config.mixer.trailWeight, getMixerModeValue(config.mixer.mode), 0, 0]
  uniforms.uFinalPreviewMode.value = getFinalPreviewModeValue(debugState.previewMode)
}

export const syncBloomPrefilterUniforms = (
  uniforms: ReturnType<typeof createBloomPrefilterUniforms>,
  config: TouchEffectConfig,
  texture: Texture,
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

export const syncBloomDownsampleUniforms = (
  uniforms: ReturnType<typeof createBloomDownsampleUniforms>,
  config: TouchEffectConfig,
  texture: Texture,
  texelX: number,
  texelY: number
) =>
{
  uniforms.uSourceTexture.value = texture
  uniforms.uSourceTexel.value = [texelX, texelY]
  uniforms.uBloomSampleParams.value = [config.postfx.bloom.highQualityFiltering ? 1 : 0, 0, 0, 0]
}

export const syncBloomUpsampleUniforms = (
  uniforms: ReturnType<typeof createBloomUpsampleUniforms>,
  config: TouchEffectConfig,
  highTexture: Texture,
  lowTexture: Texture,
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

export const syncUberUniforms = (
  uniforms: ReturnType<typeof createUberUniforms>,
  config: TouchEffectConfig,
  postfxEnabled: boolean,
  bloomTexture: TextureValue,
  sceneTexture: Texture
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

const disableArcUniforms = (uniforms: SceneUniforms) =>
{
  const dynamicUniforms = getDynamicSceneUniforms(uniforms)
  for (let index = 0; index < 3; index += 1)
  {
    dynamicUniforms[`uParticleA${index}`].value = [-100, 0, 1, 0]
    dynamicUniforms[`uParticleB${index}`].value = [0, 0, 0, 0]
    dynamicUniforms[`uParticleC${index}`].value = [0, 0, 0, 0]
  }
}

const disableFragmentUniforms = (uniforms: SceneUniforms) =>
{
  const dynamicUniforms = getDynamicSceneUniforms(uniforms)
  for (let index = 0; index < 10; index += 1)
  {
    dynamicUniforms[`uFragmentParticleA${index}`].value = [-100, 0, 0, 0]
    dynamicUniforms[`uFragmentParticleB${index}`].value = [0, 0, 0, 0]
    dynamicUniforms[`uFragmentParticleC${index}`].value = [0, 0, 1, 0.1]
  }
}

export const syncBurstUniforms = (
  uniforms: SceneUniforms,
  burst: BurstState,
  rect: RenderRect,
  time: number
) =>
{
  const dynamicUniforms = getDynamicSceneUniforms(uniforms)
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
    dynamicUniforms[`uParticleA${index}`].value = [
      particle.startTime,
      particle.duration,
      particle.scaleMultiplier,
      particle.enabled,
    ]
    dynamicUniforms[`uParticleB${index}`].value = [
      particle.offsetX,
      particle.offsetY,
      particle.movementY,
      particle.radius,
    ]
    dynamicUniforms[`uParticleC${index}`].value = [
      particle.scaleX,
      particle.scaleY,
      0,
      0,
    ]
  })

  burst.shardParticles.forEach((particle, index) =>
  {
    dynamicUniforms[`uFragmentParticleA${index}`].value = [
      particle.startTime,
      particle.lifetime,
      particle.speed,
      particle.enabled,
    ]
    dynamicUniforms[`uFragmentParticleB${index}`].value = [
      particle.spawnX,
      particle.spawnY,
      particle.dirX,
      particle.dirY,
    ]
    dynamicUniforms[`uFragmentParticleC${index}`].value = [
      particle.rotation,
      particle.spriteIndex,
      particle.sizeMultiplier,
      particle.flashTimeWarp,
    ]
  })
}

export const syncSwipeShardBatchUniforms = (
  uniforms: SceneUniforms,
  stroke: SwipeStrokeState,
  rect: RenderRect,
  time: number,
  config: TouchEffectConfig,
  particleIndices: number[]
) =>
{
  const dynamicUniforms = getDynamicSceneUniforms(uniforms)
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
    dynamicUniforms[`uFragmentParticleA${uniformIndex}`].value = [
      particle.startTime,
      particle.lifetime,
      particle.speed,
      particle.enabled,
    ]
    dynamicUniforms[`uFragmentParticleB${uniformIndex}`].value = [
      particle.spawnX,
      particle.spawnY,
      particle.dirX,
      particle.dirY,
    ]
    dynamicUniforms[`uFragmentParticleC${uniformIndex}`].value = [
      particle.rotation,
      particle.spriteIndex,
      particle.sizeMultiplier,
      particle.flashTimeWarp,
    ]
  })
}
