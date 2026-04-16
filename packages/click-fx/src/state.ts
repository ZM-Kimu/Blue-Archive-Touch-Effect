import {
  BOUNDS_SAMPLE_COUNT,
  FRAGMENT_PARTICLES_PER_BURST,
  MAX_BURSTS,
  PARTICLES_PER_BURST,
} from './constants'
import {
  easeInOutSine,
  easeInQuad,
  randomBetween,
  randomIntInclusive,
  randomSigned,
} from './math'
import type {
  BurstBounds,
  BurstState,
  BurstStore,
  FragmentParticleState,
  ParticleState,
  RuntimeConfig,
} from './types'

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

const createFragmentParticleState = (): FragmentParticleState => ({
  startTime: -100,
  lifetime: 0,
  spawnX: 0,
  spawnY: 0,
  dirX: 0,
  dirY: 0,
  speed: 0,
  rotation: 0,
  spriteIndex: 0,
  sizeMultiplier: 1,
  flashTimeWarp: 0.1,
  enabled: 0,
})

const createBurstState = (): BurstState => ({
  originX: 0.5,
  originY: 0.5,
  startTime: -100,
  arcStartTime: -100,
  arcInitialAngle: 0,
  duration: 0,
  active: 0,
  diskRadius: 0,
  diskSoftness: 1,
  diskScaleStart: 0.25,
  diskScaleEnd: 1,
  diskScaleTimeFraction: 0.3,
  diskAlphaStart: 1,
  diskAlphaEnd: 0,
  diskAlphaFadeStartFraction: 0.3,
  shardsTriangleSize: 0.53,
  shardsOuterRadius: 0.25,
  shardsInnerRadius: 0.098,
  shardsDuration: 0,
  shardParticles: Array.from({ length: FRAGMENT_PARTICLES_PER_BURST }, createFragmentParticleState),
  arcParticles: Array.from({ length: PARTICLES_PER_BURST }, createParticleState),
  bounds: { minX: 0, maxX: 0, minY: 0, maxY: 0 },
})

const createBounds = (minX = 0, maxX = 0, minY = 0, maxY = 0): BurstBounds => ({
  minX,
  maxX,
  minY,
  maxY,
})

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

const resetFragmentParticle = (particle: FragmentParticleState) =>
{
  particle.startTime = -100
  particle.lifetime = 0
  particle.spawnX = 0
  particle.spawnY = 0
  particle.dirX = 0
  particle.dirY = 0
  particle.speed = 0
  particle.rotation = 0
  particle.spriteIndex = 0
  particle.sizeMultiplier = 1
  particle.flashTimeWarp = 0.1
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

  burst.arcParticles.forEach((particle) =>
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

const findBurstSlot = (store: BurstStore) =>
{
  for (let step = 0; step < MAX_BURSTS; step += 1)
  {
    const index = (store.nextBurstIndex + step) % MAX_BURSTS
    if (!store.bursts[index].active)
    {
      store.nextBurstIndex = (index + 1) % MAX_BURSTS
      return index
    }
  }

  const fallbackIndex = store.nextBurstIndex
  store.nextBurstIndex = (store.nextBurstIndex + 1) % MAX_BURSTS
  return fallbackIndex
}

export const createBurstStore = (): BurstStore => ({
  bursts: Array.from({ length: MAX_BURSTS }, createBurstState),
  nextBurstIndex: 0,
})

export const spawnBurst = (
  store: BurstStore,
  config: RuntimeConfig,
  currentTime: number,
  clientX: number,
  clientY: number,
  viewportWidth: number,
  viewportHeight: number
) =>
{
  const burstIndex = findBurstSlot(store)
  const burst = store.bursts[burstIndex]
  const originX = clientX / viewportWidth
  const originY = 1 - clientY / viewportHeight
  const arcCount = randomIntInclusive(config.arc.emitter.minCount, config.arc.emitter.maxCount)
  const shardCount = randomIntInclusive(config.shards.burst.countMin, config.shards.burst.countMax)

  burst.originX = originX
  burst.originY = originY
  burst.startTime = currentTime
  burst.arcInitialAngle = randomBetween(0, Math.PI * 2)
  burst.duration = 0
  burst.active = 1

  burst.diskRadius = config.disk.shape.radius
  burst.diskSoftness = config.disk.shape.softness
  burst.diskScaleStart = config.disk.scale.start
  burst.diskScaleEnd = config.disk.scale.end
  burst.diskScaleTimeFraction = config.disk.scale.timeFraction
  burst.diskAlphaStart = config.disk.alpha.start
  burst.diskAlphaEnd = config.disk.alpha.end
  burst.diskAlphaFadeStartFraction = config.disk.alpha.fadeStartFraction

  burst.shardsTriangleSize = config.shards.shape.triangleSize
  burst.shardsOuterRadius = config.shards.distribution.outerRadius
  burst.shardsInnerRadius = config.shards.distribution.innerRadius
  burst.shardsDuration = 0

  resetBurstBounds(burst)

  for (let particleIndex = 0; particleIndex < PARTICLES_PER_BURST; particleIndex += 1)
  {
    const particle = burst.arcParticles[particleIndex]

    if (particleIndex >= arcCount)
    {
      resetParticle(particle)
      continue
    }

    const scaleMultiplier = randomBetween(config.arc.emitter.scaleMin, config.arc.emitter.scaleMax)

    particle.duration = config.arc.motion.duration * scaleMultiplier
    particle.offsetX = randomSigned(config.arc.emitter.randomX)
    particle.offsetY = randomSigned(config.arc.emitter.randomY)
    particle.scaleMultiplier = scaleMultiplier
    particle.movementY = config.arc.motion.movementY
    particle.radius = config.arc.source.radius
    particle.scaleX = config.arc.source.scaleX
    particle.scaleY = config.arc.source.scaleY
    particle.enabled = 1

    burst.duration = Math.max(burst.duration, particle.duration)
  }

  const arcDelay = burst.duration
    * burst.diskScaleTimeFraction
    * config.compositor.handoff.arcDelayFromDiskScale

  burst.arcStartTime = burst.startTime + arcDelay

  burst.arcParticles.forEach((particle) =>
  {
    if (!particle.enabled)
    {
      return
    }

    particle.startTime = burst.arcStartTime
  })

  for (let particleIndex = 0; particleIndex < FRAGMENT_PARTICLES_PER_BURST; particleIndex += 1)
  {
    const particle = burst.shardParticles[particleIndex]

    if (particleIndex >= shardCount)
    {
      resetFragmentParticle(particle)
      continue
    }

    const angle = randomBetween(0, Math.PI * 2)
    const inner = burst.shardsInnerRadius
    const outer = Math.max(burst.shardsOuterRadius, inner)
    const radialDistance = Math.sqrt(randomBetween(inner * inner, outer * outer))
    const spawnX = Math.cos(angle) * radialDistance
    const spawnY = Math.sin(angle) * radialDistance
    const directionLength = Math.hypot(spawnX, spawnY) || 1

    particle.startTime = currentTime
    particle.lifetime = randomBetween(config.shards.burst.lifetimeMin, config.shards.burst.lifetimeMax)
    particle.spawnX = spawnX
    particle.spawnY = spawnY
    particle.dirX = spawnX / directionLength
    particle.dirY = spawnY / directionLength
    particle.speed = randomBetween(config.shards.burst.speedMin, config.shards.burst.speedMax)
    particle.rotation = randomBetween(0, Math.PI * 2)
    particle.spriteIndex = Math.random() < 0.5 ? 0 : 1
    particle.sizeMultiplier = randomBetween(config.shards.burst.sizeMin, config.shards.burst.sizeMax)
    particle.flashTimeWarp = randomBetween(config.shards.alpha.flashTimeWarpMin, config.shards.alpha.flashTimeWarpMax)
    particle.enabled = 1
    burst.shardsDuration = Math.max(burst.shardsDuration, particle.lifetime)
  }

  precomputeBurstBounds(burst)
}

export const updateBurstActivity = (store: BurstStore, time: number) =>
{
  store.bursts.forEach((burst) =>
  {
    const diskActive = burst.duration > 0
      && time >= burst.startTime
      && time <= burst.startTime + burst.duration
    let hasActiveArcParticle = false
    let hasActiveShardParticle = false

    burst.arcParticles.forEach((particle) =>
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

      hasActiveArcParticle = true
    })

    burst.shardParticles.forEach((particle) =>
    {
      if (!particle.enabled || particle.lifetime <= 0)
      {
        return
      }

      const progress = (time - particle.startTime) / particle.lifetime
      if (progress < 0 || progress > 1)
      {
        return
      }

      hasActiveShardParticle = true
    })

    if (!diskActive && !hasActiveArcParticle && !hasActiveShardParticle)
    {
      burst.active = 0
      resetBurstBounds(burst)
      return
    }

    burst.active = 1
  })
}

export const hasActiveBursts = (store: BurstStore) => store.bursts.some((burst) => burst.active > 0)

export const getBurstCompositeBounds = (burst: BurstState, config: RuntimeConfig): BurstBounds =>
{
  const compositeScaleMax = Math.max(
    config.compositor.sharedScale.start,
    config.compositor.sharedScale.end
  )
  const diskScaleMax = Math.max(burst.diskScaleStart, burst.diskScaleEnd)
  const diskRadius = burst.diskRadius * diskScaleMax * compositeScaleMax
  const arcOuterRadius = Math.max(
    Math.abs(config.arc.warp.radius + burst.bounds.minX),
    Math.abs(config.arc.warp.radius + burst.bounds.maxX)
  ) * compositeScaleMax
  const radius = Math.max(diskRadius, arcOuterRadius) * config.compositor.effectScale

  return createBounds(-radius, radius, -radius, radius)
}

export const getBurstShardsBounds = (burst: BurstState, config: RuntimeConfig): BurstBounds =>
{
  let maxSpeed = 0
  let maxSizeMultiplier = 0

  burst.shardParticles.forEach((particle) =>
  {
    if (!particle.enabled)
    {
      return
    }

    maxSpeed = Math.max(maxSpeed, particle.speed)
    maxSizeMultiplier = Math.max(maxSizeMultiplier, particle.sizeMultiplier)
  })

  const scaleOverLifeMax = Math.max(
    config.shards.scaleOverLife.start,
    config.shards.scaleOverLife.peak,
    config.shards.scaleOverLife.end
  )
  const initScaleMax = Math.max(config.shards.initScale.start, config.shards.initScale.end)
  const spriteRadius = 0.05
    * burst.shardsTriangleSize
    * Math.max(maxSizeMultiplier, 1)
    * scaleOverLifeMax
  const centerRadius = burst.shardsOuterRadius + maxSpeed
  const radius = (centerRadius + spriteRadius) * initScaleMax * config.compositor.effectScale

  return createBounds(-radius, radius, -radius, radius)
}

export const unionBurstBounds = (...boundsList: BurstBounds[]): BurstBounds =>
{
  const validBounds = boundsList.filter((bounds) =>
    Number.isFinite(bounds.minX)
    && Number.isFinite(bounds.maxX)
    && Number.isFinite(bounds.minY)
    && Number.isFinite(bounds.maxY)
  )

  if (!validBounds.length)
  {
    return createBounds()
  }

  return createBounds(
    Math.min(...validBounds.map((bounds) => bounds.minX)),
    Math.max(...validBounds.map((bounds) => bounds.maxX)),
    Math.min(...validBounds.map((bounds) => bounds.minY)),
    Math.max(...validBounds.map((bounds) => bounds.maxY))
  )
}

export const expandBurstBounds = (bounds: BurstBounds, padding: number): BurstBounds => createBounds(
  bounds.minX - padding,
  bounds.maxX + padding,
  bounds.minY - padding,
  bounds.maxY + padding
)
