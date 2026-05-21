import {
  BOUNDS_SAMPLE_COUNT,
  FRAGMENT_PARTICLES_PER_BURST,
  MAX_BURSTS,
  MAX_SWIPE_POINTS_PER_STROKE,
  MAX_SWIPE_STROKES,
  PARTICLES_PER_BURST,
  SWIPE_SHARD_PARTICLES_PER_STROKE,
} from '../core/constants'
import {
  easeInOutSine,
  easeInQuad,
  randomBetween,
  randomIntInclusive,
  randomSigned,
} from '../core/math'
import { createBounds } from './bounds'
import type {
  BurstBounds,
  BurstState,
  BurstStore,
  FragmentParticleState,
  ParticleState,
  TouchEffectConfig,
  SwipePointState,
  SwipeShardParticleState,
  SwipeStore,
  SwipeStrokeState,
} from '../types'

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

const createSwipePointState = (): SwipePointState => ({
  x: 0,
  y: 0,
  time: -100,
  cumulativeDistance: 0,
  enabled: 0,
})

const createSwipeShardParticleState = (): SwipeShardParticleState => ({
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

const createSwipeStrokeState = (): SwipeStrokeState => ({
  originX: 0,
  originY: 0,
  pointerId: -1,
  active: 0,
  appending: 0,
  pointCount: 0,
  lastEmitDistance: 0,
  trailLifetime: 0.3,
  nextShardIndex: 0,
  bounds: { minX: 0, maxX: 0, minY: 0, maxY: 0 },
  points: Array.from({ length: MAX_SWIPE_POINTS_PER_STROKE }, createSwipePointState),
  shardParticles: Array.from({ length: SWIPE_SHARD_PARTICLES_PER_STROKE }, createSwipeShardParticleState),
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

const resetSwipePoint = (point: SwipePointState) =>
{
  point.x = 0
  point.y = 0
  point.time = -100
  point.cumulativeDistance = 0
  point.enabled = 0
}

const resetSwipeShardParticle = (particle: SwipeShardParticleState) =>
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

const resetSwipeBounds = (stroke: SwipeStrokeState) =>
{
  stroke.bounds.minX = 0
  stroke.bounds.maxX = 0
  stroke.bounds.minY = 0
  stroke.bounds.maxY = 0
}

const resetSwipeStroke = (stroke: SwipeStrokeState) =>
{
  stroke.originX = 0
  stroke.originY = 0
  stroke.pointerId = -1
  stroke.active = 0
  stroke.appending = 0
  stroke.pointCount = 0
  stroke.lastEmitDistance = 0
  stroke.trailLifetime = 0.3
  stroke.nextShardIndex = 0
  resetSwipeBounds(stroke)
  stroke.points.forEach(resetSwipePoint)
  stroke.shardParticles.forEach(resetSwipeShardParticle)
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

const findSwipeStrokeSlot = (store: SwipeStore) =>
{
  for (let step = 0; step < MAX_SWIPE_STROKES; step += 1)
  {
    const index = (store.nextStrokeIndex + step) % MAX_SWIPE_STROKES
    if (!store.strokes[index].active)
    {
      store.nextStrokeIndex = (index + 1) % MAX_SWIPE_STROKES
      return index
    }
  }

  const fallbackIndex = store.nextStrokeIndex
  store.nextStrokeIndex = (store.nextStrokeIndex + 1) % MAX_SWIPE_STROKES
  return fallbackIndex
}

const findSwipeStrokeByPointerId = (store: SwipeStore, pointerId: number) =>
  store.strokes.find((stroke) => stroke.active > 0 && stroke.pointerId === pointerId)

const recomputeSwipeBounds = (stroke: SwipeStrokeState) =>
{
  if (stroke.pointCount <= 0)
  {
    resetSwipeBounds(stroke)
    return
  }

  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity

  for (let index = 0; index < stroke.pointCount; index += 1)
  {
    const point = stroke.points[index]
    if (!point.enabled)
    {
      continue
    }

    minX = Math.min(minX, point.x)
    maxX = Math.max(maxX, point.x)
    minY = Math.min(minY, point.y)
    maxY = Math.max(maxY, point.y)
  }

  if (!Number.isFinite(minX))
  {
    resetSwipeBounds(stroke)
    return
  }

  stroke.bounds.minX = minX
  stroke.bounds.maxX = maxX
  stroke.bounds.minY = minY
  stroke.bounds.maxY = maxY
}

const shiftSwipePointsLeft = (stroke: SwipeStrokeState, count = 1) =>
{
  if (count <= 0 || stroke.pointCount <= 0)
  {
    return
  }

  const actual = Math.min(count, stroke.pointCount)
  for (let index = 0; index < stroke.pointCount - actual; index += 1)
  {
    const next = stroke.points[index + actual]
    const current = stroke.points[index]
    current.x = next.x
    current.y = next.y
    current.time = next.time
    current.cumulativeDistance = next.cumulativeDistance
    current.enabled = next.enabled
  }

  for (let index = stroke.pointCount - actual; index < stroke.pointCount; index += 1)
  {
    resetSwipePoint(stroke.points[index])
  }

  stroke.pointCount = Math.max(0, stroke.pointCount - actual)
}

const appendSwipePointState = (
  stroke: SwipeStrokeState,
  x: number,
  y: number,
  time: number,
  cumulativeDistance: number
) =>
{
  if (stroke.pointCount >= MAX_SWIPE_POINTS_PER_STROKE)
  {
    shiftSwipePointsLeft(stroke, 1)
  }

  const point = stroke.points[stroke.pointCount]
  point.x = x
  point.y = y
  point.time = time
  point.cumulativeDistance = cumulativeDistance
  point.enabled = 1
  stroke.pointCount += 1
  recomputeSwipeBounds(stroke)
}

const emitSwipeShardPair = (
  stroke: SwipeStrokeState,
  config: TouchEffectConfig,
  currentTime: number,
  emissionX: number,
  emissionY: number
) =>
{
  const innerRadius = config.swipe.shards.innerRadius
  const outerRadius = Math.max(config.swipe.shards.outerRadius, innerRadius)

  for (let index = 0; index < 2; index += 1)
  {
    const particle = stroke.shardParticles[stroke.nextShardIndex]
    stroke.nextShardIndex = (stroke.nextShardIndex + 1) % stroke.shardParticles.length

    const angle = randomBetween(0, Math.PI * 2)
    const radialDistance = Math.sqrt(randomBetween(innerRadius * innerRadius, outerRadius * outerRadius))
    const spawnOffsetX = Math.cos(angle) * radialDistance
    const spawnOffsetY = Math.sin(angle) * radialDistance
    const directionLength = Math.hypot(spawnOffsetX, spawnOffsetY) || 1

    particle.startTime = currentTime
    particle.lifetime = randomBetween(config.swipe.shards.lifetimeMin, config.swipe.shards.lifetimeMax)
    particle.spawnX = emissionX + spawnOffsetX
    particle.spawnY = emissionY + spawnOffsetY
    particle.dirX = spawnOffsetX / directionLength
    particle.dirY = spawnOffsetY / directionLength
    particle.speed = randomBetween(config.swipe.shards.speedMin, config.swipe.shards.speedMax)
    particle.rotation = randomBetween(0, Math.PI * 2)
    particle.spriteIndex = index
    particle.sizeMultiplier = randomBetween(config.swipe.shards.sizeMin, config.swipe.shards.sizeMax)
    particle.flashTimeWarp = randomBetween(
      config.swipe.shards.flashTimeWarpMin,
      config.swipe.shards.flashTimeWarpMax
    )
    particle.enabled = 1
  }
}

export const createBurstStore = (): BurstStore => ({
  bursts: Array.from({ length: MAX_BURSTS }, createBurstState),
  nextBurstIndex: 0,
})

export const createSwipeStore = (): SwipeStore => ({
  strokes: Array.from({ length: MAX_SWIPE_STROKES }, createSwipeStrokeState),
  nextStrokeIndex: 0,
})

export const spawnBurst = (
  store: BurstStore,
  config: TouchEffectConfig,
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

export const beginSwipeStroke = (
  store: SwipeStore,
  config: TouchEffectConfig,
  currentTime: number,
  pointerId: number,
  clientX: number,
  clientY: number,
  viewportWidth: number,
  viewportHeight: number
) =>
{
  if (!config.swipe.enabled)
  {
    return
  }

  const strokeIndex = findSwipeStrokeSlot(store)
  const stroke = store.strokes[strokeIndex]
  resetSwipeStroke(stroke)

  stroke.originX = clientX / viewportWidth
  stroke.originY = 1 - clientY / viewportHeight
  stroke.pointerId = pointerId
  stroke.active = 1
  stroke.appending = 1
  stroke.trailLifetime = config.swipe.trail.lifetime

  appendSwipePointState(stroke, 0, 0, currentTime, 0)
}

export const appendSwipeStrokePoint = (
  store: SwipeStore,
  config: TouchEffectConfig,
  currentTime: number,
  pointerId: number,
  clientX: number,
  clientY: number,
  viewportWidth: number,
  viewportHeight: number
) =>
{
  const stroke = findSwipeStrokeByPointerId(store, pointerId)
  if (!stroke || !stroke.appending)
  {
    return false
  }

  const originCssX = stroke.originX * viewportWidth
  const originCssY = (1 - stroke.originY) * viewportHeight
  const nextX = (clientX - originCssX) / viewportHeight
  const nextY = (originCssY - clientY) / viewportHeight
  const minimumDistance = Math.max(
    config.swipe.input.minPointDistance,
    config.swipe.trail.minVertexDistance
  )
  const previousPoint = stroke.points[Math.max(0, stroke.pointCount - 1)]
  const previousX = previousPoint.x
  const previousY = previousPoint.y
  const previousTime = previousPoint.time
  const previousDistance = previousPoint.cumulativeDistance
  const deltaX = nextX - previousPoint.x
  const deltaY = nextY - previousPoint.y
  const distance = Math.hypot(deltaX, deltaY)

  if (distance <= 0)
  {
    return false
  }

  if (distance < minimumDistance)
  {
    return false
  }

  const nextDistance = previousDistance + distance

  if (config.swipe.shards.enabled && config.swipe.shards.emitPerDistance > 0)
  {
    const spacing = 1 / config.swipe.shards.emitPerDistance
    while (nextDistance - stroke.lastEmitDistance >= spacing)
    {
      const emissionDistance = stroke.lastEmitDistance + spacing
      const emissionProgress = Math.min(
        1,
        Math.max(0, (emissionDistance - previousDistance) / distance)
      )
      emitSwipeShardPair(
        stroke,
        config,
        currentTime,
        previousX + deltaX * emissionProgress,
        previousY + deltaY * emissionProgress
      )
      stroke.lastEmitDistance = emissionDistance
    }
  }

  const maxSegmentDistance = Math.max(
    config.swipe.trail.width * 1.5,
    1 / Math.max(viewportHeight, 1)
  )
  const segmentCount = Math.min(
    MAX_SWIPE_POINTS_PER_STROKE,
    Math.max(1, Math.ceil(distance / maxSegmentDistance))
  )

  for (let segmentIndex = 1; segmentIndex <= segmentCount; segmentIndex += 1)
  {
    const segmentProgress = segmentIndex / segmentCount
    appendSwipePointState(
      stroke,
      previousX + deltaX * segmentProgress,
      previousY + deltaY * segmentProgress,
      previousTime + (currentTime - previousTime) * segmentProgress,
      previousDistance + distance * segmentProgress
    )
  }

  return true
}

export const endSwipeStroke = (store: SwipeStore, pointerId: number) =>
{
  const stroke = findSwipeStrokeByPointerId(store, pointerId)
  if (!stroke)
  {
    return
  }

  stroke.appending = 0
}

export const endAllSwipeStrokes = (store: SwipeStore) =>
{
  store.strokes.forEach((stroke) =>
  {
    if (!stroke.active)
    {
      return
    }

    stroke.appending = 0
  })
}

export const updateSwipeActivity = (store: SwipeStore, time: number) =>
{
  store.strokes.forEach((stroke) =>
  {
    if (!stroke.active)
    {
      return
    }

    while (
      stroke.pointCount > 0
      && stroke.points[0].enabled
      && time - stroke.points[0].time > stroke.trailLifetime
    )
    {
      shiftSwipePointsLeft(stroke, 1)
    }

    let hasActiveShards = false
    stroke.shardParticles.forEach((particle) =>
    {
      if (!particle.enabled || particle.lifetime <= 0)
      {
        return
      }

      const progress = (time - particle.startTime) / particle.lifetime
      if (progress >= 0 && progress <= 1)
      {
        hasActiveShards = true
      }
    })

    recomputeSwipeBounds(stroke)

    const hasTrail = stroke.pointCount > 1
    if (stroke.appending || hasTrail || hasActiveShards)
    {
      stroke.active = 1
      return
    }

    resetSwipeStroke(stroke)
  })
}

export const hasActiveBursts = (store: BurstStore) => store.bursts.some((burst) => burst.active > 0)
export const hasActiveSwipeContent = (store: SwipeStore) => store.strokes.some((stroke) => stroke.active > 0)

export const getBurstCompositeBounds = (burst: BurstState, config: TouchEffectConfig): BurstBounds =>
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

export const getBurstShardsBounds = (burst: BurstState, config: TouchEffectConfig): BurstBounds =>
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

export const getSwipeShardsBounds = (stroke: SwipeStrokeState, config: TouchEffectConfig): BurstBounds =>
{
  if (stroke.pointCount <= 0)
  {
    return createBounds()
  }

  let maxSpeed = 0
  let maxSizeMultiplier = 0
  stroke.shardParticles.forEach((particle) =>
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
    * config.shards.shape.triangleSize
    * Math.max(maxSizeMultiplier, 1)
    * scaleOverLifeMax
  const emissionPadding = maxSpeed + spriteRadius + config.swipe.trail.width * 2.0

  return createBounds(
    stroke.bounds.minX - emissionPadding,
    stroke.bounds.maxX + emissionPadding,
    stroke.bounds.minY - emissionPadding,
    stroke.bounds.maxY + emissionPadding
  )
}

export { expandBurstBounds, unionBurstBounds } from './bounds'
