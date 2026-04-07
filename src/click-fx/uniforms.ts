import { DEG_TO_RAD, FRAGMENT_PARTICLES_PER_BURST, MAX_BURSTS, PARTICLES_PER_BURST } from './constants'
import { getCorePreviewStageValue, getFragmentPreviewStageValue } from './config'
import type { BranchVisibility, BurstState, PreviewState, DebugState, UniformValue } from './types'

type UniformBag = Record<string, UniformValue<unknown>>
type PackedSlot = {
  a: Float32Array
  b: Float32Array
  c: Float32Array
}

export type UniformStore = {
  sceneUniforms: UniformBag
  postUniforms: UniformBag
  setTime: (time: number) => void
  setResolution: (width: number, height: number) => void
  syncStatic: (config: DebugState, branchVisibility: BranchVisibility, previews: PreviewState) => void
  syncRuntime: (bursts: BurstState[]) => void
}

export const createUniformStore = (
  config: DebugState,
  width: number,
  height: number,
  sceneTexture: unknown
): UniformStore =>
{
  const resolution = [width, height]
  const postResolution = [width, height]
  const burstData = new Float32Array(MAX_BURSTS * 4)
  const burstCoreData = new Float32Array(MAX_BURSTS * 4)
  const burstCoreAnimData = new Float32Array(MAX_BURSTS * 4)
  const burstCoreToneData = new Float32Array(MAX_BURSTS * 4)
  const burstFragmentData = new Float32Array(MAX_BURSTS * 4)
  const burstBounds = new Float32Array(MAX_BURSTS * 4)
  const particleSlotData = Array.from({ length: PARTICLES_PER_BURST }, (): PackedSlot => ({
    a: new Float32Array(MAX_BURSTS * 4),
    b: new Float32Array(MAX_BURSTS * 4),
    c: new Float32Array(MAX_BURSTS * 4),
  }))
  const fragmentParticleSlotData = Array.from({ length: FRAGMENT_PARTICLES_PER_BURST }, (): PackedSlot => ({
    a: new Float32Array(MAX_BURSTS * 4),
    b: new Float32Array(MAX_BURSTS * 4),
    c: new Float32Array(MAX_BURSTS * 4),
  }))

  const fragmentParticleUniforms = Object.fromEntries(
    fragmentParticleSlotData.flatMap((slot, index) => [
      [`uFragmentParticleA${index}`, { value: slot.a }],
      [`uFragmentParticleB${index}`, { value: slot.b }],
      [`uFragmentParticleC${index}`, { value: slot.c }],
    ])
  ) as UniformBag

  const sceneUniforms: UniformBag = {
    uTime: { value: 0 },
    uResolution: { value: resolution },
    uBurstData: { value: burstData },
    uBurstCoreData: { value: burstCoreData },
    uBurstCoreAnimData: { value: burstCoreAnimData },
    uBurstCoreToneData: { value: burstCoreToneData },
    uBurstFragmentData: { value: burstFragmentData },
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
    uFragmentScaleCurveParams: { value: [config.d6StartScale, config.d6PeakScale, config.d6EndScale, config.d6GrowTimeFraction] },
    uFragmentAlphaParams: { value: [config.d8AlphaMax, config.d8AlphaMin] },
    uFragmentInitScaleParams: { value: [config.d9StartScale, config.d9EndScale, config.d9TimeFraction] },
    uCorePreviewStage: { value: 4 },
    uFragmentPreviewStage: { value: 8 },
    uBranchVisibility: { value: [1, 1, 1, 1] },
    ...fragmentParticleUniforms,
  }

  const postUniforms: UniformBag = {
    uSceneTexture: { value: sceneTexture },
    uPostResolution: { value: postResolution },
    uPostParams: { value: [config.fxBlurRadius, config.fxBlurMix, config.fxBloomIntensity, config.fxScreenMix] },
    uPostBloomThresholds: { value: [config.fxBloomThresholdLow, config.fxBloomThresholdHigh] },
    uPostEnabled: { value: 1 },
  }

  const setTime = (time: number) =>
  {
    sceneUniforms.uTime.value = time
  }

  const setResolution = (nextWidth: number, nextHeight: number) =>
  {
    resolution[0] = nextWidth
    resolution[1] = nextHeight
    postResolution[0] = nextWidth
    postResolution[1] = nextHeight
  }

  const syncStatic = (nextConfig: DebugState, branchVisibility: BranchVisibility, previews: PreviewState) =>
  {
    sceneUniforms.uPolarParams.value = [nextConfig.angleSpanDeg * DEG_TO_RAD, nextConfig.arcRadius]
    sceneUniforms.uRotationSpeedRad.value = nextConfig.rotationSpeedDeg * DEG_TO_RAD
    sceneUniforms.uArcColor.value = [nextConfig.arcColorR, nextConfig.arcColorG, nextConfig.arcColorB]
    sceneUniforms.uCompositeScaleParams.value = [nextConfig.c1StartScale, nextConfig.c1EndScale, nextConfig.c1TimeFraction]
    sceneUniforms.uFragmentScaleCurveParams.value = [nextConfig.d6StartScale, nextConfig.d6PeakScale, nextConfig.d6EndScale, nextConfig.d6GrowTimeFraction]
    sceneUniforms.uFragmentAlphaParams.value = [nextConfig.d8AlphaMax, nextConfig.d8AlphaMin]
    sceneUniforms.uFragmentInitScaleParams.value = [nextConfig.d9StartScale, nextConfig.d9EndScale, nextConfig.d9TimeFraction]
    sceneUniforms.uCorePreviewStage.value = getCorePreviewStageValue(previews.core)
    sceneUniforms.uFragmentPreviewStage.value = getFragmentPreviewStageValue(previews.fragment)
    sceneUniforms.uBranchVisibility.value = [
      branchVisibility.mainArc ? 1 : 0,
      branchVisibility.coreDisk ? 1 : 0,
      branchVisibility.mainFx ? 1 : 0,
      branchVisibility.fragments ? 1 : 0,
    ]
    postUniforms.uPostParams.value = [nextConfig.fxBlurRadius, nextConfig.fxBlurMix, nextConfig.fxBloomIntensity, nextConfig.fxScreenMix]
    postUniforms.uPostBloomThresholds.value = [nextConfig.fxBloomThresholdLow, nextConfig.fxBloomThresholdHigh]
    postUniforms.uPostEnabled.value = branchVisibility.filter ? 1 : 0
  }

  const syncRuntime = (bursts: BurstState[]) =>
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

      burstFragmentData[burstBase] = burst.dTriangleSize
      burstFragmentData[burstBase + 1] = burst.d3OuterRadius
      burstFragmentData[burstBase + 2] = burst.d3InnerRadius
      burstFragmentData[burstBase + 3] = burst.fragmentDuration

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

      burst.fragmentParticles.forEach((particle, particleIndex) =>
      {
        const slot = fragmentParticleSlotData[particleIndex]
        const particleBase = burstIndex * 4

        slot.a[particleBase] = particle.startTime
        slot.a[particleBase + 1] = particle.lifetime
        slot.a[particleBase + 2] = particle.speed
        slot.a[particleBase + 3] = particle.enabled

        slot.b[particleBase] = particle.spawnX
        slot.b[particleBase + 1] = particle.spawnY
        slot.b[particleBase + 2] = particle.dirX
        slot.b[particleBase + 3] = particle.dirY

        slot.c[particleBase] = particle.rotation
        slot.c[particleBase + 1] = particle.spriteIndex
        slot.c[particleBase + 2] = particle.sizeMultiplier
        slot.c[particleBase + 3] = particle.flashPeriod
      })
    })
  }

  return {
    sceneUniforms,
    postUniforms,
    setTime,
    setResolution,
    syncStatic,
    syncRuntime,
  }
}
