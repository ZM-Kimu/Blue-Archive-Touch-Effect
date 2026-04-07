import { BOUNDS_SAMPLE_COUNT, FRAGMENT_PARTICLES_PER_BURST, MAX_BURSTS, PARTICLES_PER_BURST } from './constants'
import { easeInOutSine, easeInQuad, randomBetween, randomIntInclusive, randomSigned } from './math'
import type { BurstState, BurstStore, DebugState, FragmentParticleState, ParticleState } from './types'

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
  flashPeriod: 0.1,
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
  dTriangleSize: 0.53,
  d3OuterRadius: 0.203,
  d3InnerRadius: 0.098,
  fragmentDuration: 0,
  fragmentParticles: Array.from({ length: FRAGMENT_PARTICLES_PER_BURST }, createFragmentParticleState),
  particles: Array.from({ length: PARTICLES_PER_BURST }, createParticleState),
  bounds: { minX: 0, maxX: 0, minY: 0, maxY: 0 },
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
  particle.flashPeriod = 0.1
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
  config: DebugState,
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
  const count = randomIntInclusive(config.minCount, config.maxCount)
  const fragmentCount = randomIntInclusive(config.d5CountMin, config.d5CountMax)

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
  burst.dTriangleSize = config.dTriangleSize
  burst.d3OuterRadius = config.d3OuterRadius
  burst.d3InnerRadius = config.d3InnerRadius
  burst.fragmentDuration = 0
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

  for (let fragmentIndex = 0; fragmentIndex < FRAGMENT_PARTICLES_PER_BURST; fragmentIndex += 1)
  {
    const particle = burst.fragmentParticles[fragmentIndex]

    if (fragmentIndex >= fragmentCount)
    {
      resetFragmentParticle(particle)
      continue
    }

    const angle = randomBetween(0, Math.PI * 2)
    const inner = burst.d3InnerRadius
    const outer = Math.max(burst.d3OuterRadius, inner)
    const radialDistance = Math.sqrt(randomBetween(inner * inner, outer * outer))
    const spawnX = Math.cos(angle) * radialDistance
    const spawnY = Math.sin(angle) * radialDistance
    const directionLength = Math.hypot(spawnX, spawnY) || 1

    particle.startTime = currentTime
    particle.lifetime = randomBetween(config.d5LifetimeMin, config.d5LifetimeMax)
    particle.spawnX = spawnX
    particle.spawnY = spawnY
    particle.dirX = spawnX / directionLength
    particle.dirY = spawnY / directionLength
    particle.speed = randomBetween(config.d5SpeedMin, config.d5SpeedMax)
    particle.rotation = randomBetween(0, Math.PI * 2)
    particle.spriteIndex = Math.random() < 0.5 ? 0 : 1
    particle.sizeMultiplier = randomBetween(config.d5SizeMin, config.d5SizeMax)
    particle.flashPeriod = randomBetween(config.d8FlashPeriodMin, config.d8FlashPeriodMax)
    particle.enabled = 1
    burst.fragmentDuration = Math.max(burst.fragmentDuration, particle.lifetime)
  }

  precomputeBurstBounds(burst)
}

export const updateBurstActivity = (store: BurstStore, time: number) =>
{
  store.bursts.forEach((burst) =>
  {
    const branchBActive = burst.duration > 0
      && time >= burst.startTime
      && time <= burst.startTime + burst.duration
    let hasActiveParticle = false
    let hasActiveFragmentParticle = false

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

    burst.fragmentParticles.forEach((particle) =>
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

      hasActiveFragmentParticle = true
    })

    if (!branchBActive && !hasActiveParticle && !hasActiveFragmentParticle)
    {
      burst.active = 0
      resetBurstBounds(burst)
      return
    }

    burst.active = 1
  })
}
