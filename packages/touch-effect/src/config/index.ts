import type {
  ColorRgb,
  TouchEffectConfig,
  TouchEffectConfigPatch,
} from '../types'
import
{
  mixerModes,
  tonemappingModes,
} from '../types'

const cloneColor = (color: ColorRgb): ColorRgb => ({ ...color })

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const deepClone = <T> (value: T): T =>
{
  if (Array.isArray(value))
  {
    return value.map((entry) => deepClone(entry)) as T
  }

  if (!isObject(value))
  {
    return value
  }

  const clone: Record<string, unknown> = {}
  Object.entries(value).forEach(([key, entry]) =>
  {
    clone[key] = deepClone(entry)
  })
  return clone as T
}

const mergeObjects = <T extends Record<string, unknown>> (target: T, patch: Record<string, unknown>) =>
{
  const mutableTarget = target as Record<string, unknown>
  Object.entries(patch).forEach(([key, value]) =>
  {
    if (value === undefined)
    {
      return
    }

    const current = mutableTarget[key]
    if (isObject(current) && isObject(value))
    {
      mergeObjects(current, value)
      return
    }

    mutableTarget[key] = deepClone(value)
  })
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))
const clampNonNegative = (value: number) => Math.max(0, value)
const clampColor = (color: ColorRgb) => ({
  r: clamp01(color.r),
  g: clamp01(color.g),
  b: clamp01(color.b),
})

const clampIntegerAtLeast = (value: number, min: number) =>
  Math.max(min, Math.round(value))

const clampOrderedPair = (
  minValue: number,
  maxValue: number,
  normalize: (value: number) => number
) =>
{
  const min = normalize(minValue)
  const max = normalize(maxValue)
  return min > max ? [min, min] as const : [min, max] as const
}

const clampCountRange = (minValue: number, maxValue: number) =>
  clampOrderedPair(minValue, maxValue, (value) => clampIntegerAtLeast(value, 1))

const clampNonNegativeRange = (minValue: number, maxValue: number) =>
  clampOrderedPair(minValue, maxValue, clampNonNegative)

export const defaultTouchEffectConfig: TouchEffectConfig = {
  arc: {
    source: {
      radius: 0.1,
      scaleX: 0.09,
      scaleY: 1,
    },
    motion: {
      duration: 0.7,
      movementY: -0.15,
    },
    emitter: {
      randomX: 0.01,
      randomY: 0.08,
      scaleMin: 0.53,
      scaleMax: 1,
      minCount: 2,
      maxCount: 3,
    },
    warp: {
      angleSpanDeg: 360,
      radius: 0.177,
    },
    rotation: {
      speedDeg: -90,
    },
    alpha: {
      multiplier: 0.9,
    },
    color: {
      r: 0x4C / 255,
      g: 0xA7 / 255,
      b: 1,
    },
  },
  disk: {
    shape: {
      radius: 0.175,
      softness: 0.6,
    },
    scale: {
      start: 0.25,
      end: 1,
      timeFraction: 0.3,
    },
    alpha: {
      start: 1,
      end: 0,
      fadeStartFraction: 0.3,
    },
    color: {
      r: 0x55 / 255,
      g: 0xBD / 255,
      b: 1,
    },
  },
  shards: {
    shape: {
      triangleSize: 0.53,
    },
    distribution: {
      outerRadius: 0.25,
      innerRadius: 0.098,
    },
    burst: {
      countMin: 4,
      countMax: 4,
      speedMin: 0.04,
      speedMax: 0.08,
      lifetimeMin: 0.38,
      lifetimeMax: 0.6,
      sizeMin: 1.09,
      sizeMax: 1.5,
    },
    scaleOverLife: {
      start: 0,
      peak: 1,
      end: 0,
      growTimeFraction: 0.15445095,
    },
    initScale: {
      start: 0.85,
      end: 1.1,
      timeFraction: 0.3,
    },
    alpha: {
      max: 0.9,
      min: 0.35,
      flashTimeWarpMin: 0.08,
      flashTimeWarpMax: 0.15,
    },
    color: {
      tint: {
        r: 1,
        g: 1,
        b: 1,
      },
      peakBoost: 1,
    },
  },
  swipe: {
    enabled: true,
    input: {
      minPointDistance: 0,
      pointerCapture: true,
    },
    trail: {
      lifetime: 0.29,
      width: 0.0035,
      minVertexDistance: 0.02,
      cornerVertices: 1,
      capVertices: 1,
      intensity: 2.2,
      startColor: {
        r: 0,
        g: 0.39215687,
        b: 1,
      },
      midColor: {
        r: 0,
        g: 0.39215687,
        b: 1,
      },
      endColor: {
        r: 0,
        g: 0.39215687,
        b: 1,
      },
      midTime: 0.2,
      alpha: {
        start: 1,
        mid: 1,
        end: 0,
        midTime: 0.6,
      },
    },
    shards: {
      enabled: true,
      emitPerDistance: 3,
      innerRadius: 0,
      outerRadius: 0.02,
      speedMin: 0.02,
      speedMax: 0.08,
      lifetimeMin: 0.2,
      lifetimeMax: 0.44,
      sizeMin: 0.2,
      sizeMax: 0.32,
      flashTimeWarpMin: 0.08,
      flashTimeWarpMax: 0.15,
      tint: {
        r: 1,
        g: 1,
        b: 1,
      },
      peakBoost: 1,
    },
  },
  compositor: {
    sharedScale: {
      start: 0.2,
      end: 1,
      timeFraction: 0.85,
    },
    handoff: {
      arcDelayFromDiskScale: 1,
    },
    effectScale: 0.2,
  },
  mixer: {
    arcWeight: 1.02,
    diskWeight: 0.75,
    shardsWeight: 1.2,
    trailWeight: 1,
    mode: 'screen',
    gain: 1,
  },
  postfx: {
    enabled: true,
    alpha: {
      bloomStrength: 0.5,
      bloomClamp: 0.2,
    },
    bloom: {
      enabled: true,
      threshold: 0.93,
      intensity: 1.65,
      scatter: 0.7,
      clamp: 65472,
      tint: {
        r: 1,
        g: 1,
        b: 1,
      },
      highQualityFiltering: true,
      downscale: 'half',
      maxIterations: 4,
    },
    tonemapping: {
      mode: 'none',
    },
  },
}

export const cloneTouchEffectConfig = (config: TouchEffectConfig = defaultTouchEffectConfig): TouchEffectConfig =>
{
  const clone = deepClone(config)
  clone.arc.color = cloneColor(clone.arc.color)
  clone.disk.color = cloneColor(clone.disk.color)
  clone.shards.color.tint = cloneColor(clone.shards.color.tint)
  clone.swipe.trail.startColor = cloneColor(clone.swipe.trail.startColor)
  clone.swipe.trail.midColor = cloneColor(clone.swipe.trail.midColor)
  clone.swipe.trail.endColor = cloneColor(clone.swipe.trail.endColor)
  clone.swipe.shards.tint = cloneColor(clone.swipe.shards.tint)
  clone.postfx.bloom.tint = cloneColor(clone.postfx.bloom.tint)
  return clone
}

export const applyTouchEffectConfigConstraints = (config: TouchEffectConfig): TouchEffectConfig =>
{
  config.arc.source.radius = clampNonNegative(config.arc.source.radius)
  config.arc.source.scaleX = Math.max(0.0001, config.arc.source.scaleX)
  config.arc.source.scaleY = Math.max(0.0001, config.arc.source.scaleY)
  config.arc.motion.duration = Math.max(0.0001, config.arc.motion.duration)
  config.arc.alpha.multiplier = clampNonNegative(config.arc.alpha.multiplier)
  config.arc.color = clampColor(config.arc.color)
  config.arc.emitter.randomX = clampNonNegative(config.arc.emitter.randomX)
  config.arc.emitter.randomY = clampNonNegative(config.arc.emitter.randomY)
  ;[config.arc.emitter.scaleMin, config.arc.emitter.scaleMax] = clampNonNegativeRange(
    config.arc.emitter.scaleMin,
    config.arc.emitter.scaleMax
  )
  ;[config.arc.emitter.minCount, config.arc.emitter.maxCount] = clampCountRange(
    config.arc.emitter.minCount,
    config.arc.emitter.maxCount
  )

  config.arc.warp.angleSpanDeg = Math.max(0, config.arc.warp.angleSpanDeg)
  config.arc.warp.radius = clampNonNegative(config.arc.warp.radius)

  config.disk.shape.radius = clampNonNegative(config.disk.shape.radius)
  config.disk.shape.softness = clamp01(config.disk.shape.softness)
  config.disk.scale.start = clampNonNegative(config.disk.scale.start)
  config.disk.scale.end = clampNonNegative(config.disk.scale.end)
  config.disk.scale.timeFraction = clamp01(config.disk.scale.timeFraction)
  config.disk.alpha.start = clamp01(config.disk.alpha.start)
  config.disk.alpha.end = clamp01(config.disk.alpha.end)
  config.disk.alpha.fadeStartFraction = clamp01(config.disk.alpha.fadeStartFraction)
  config.disk.color = clampColor(config.disk.color)

  config.shards.shape.triangleSize = clampNonNegative(config.shards.shape.triangleSize)
  config.shards.distribution.outerRadius = clampNonNegative(config.shards.distribution.outerRadius)
  config.shards.distribution.innerRadius = clampNonNegative(config.shards.distribution.innerRadius)
  if (config.shards.distribution.innerRadius > config.shards.distribution.outerRadius)
  {
    config.shards.distribution.outerRadius = config.shards.distribution.innerRadius
  }

  ;[config.shards.burst.countMin, config.shards.burst.countMax] = clampCountRange(
    config.shards.burst.countMin,
    config.shards.burst.countMax
  )
  ;[config.shards.burst.speedMin, config.shards.burst.speedMax] = clampNonNegativeRange(
    config.shards.burst.speedMin,
    config.shards.burst.speedMax
  )
  ;[config.shards.burst.lifetimeMin, config.shards.burst.lifetimeMax] = clampNonNegativeRange(
    config.shards.burst.lifetimeMin,
    config.shards.burst.lifetimeMax
  )
  ;[config.shards.burst.sizeMin, config.shards.burst.sizeMax] = clampNonNegativeRange(
    config.shards.burst.sizeMin,
    config.shards.burst.sizeMax
  )

  config.shards.scaleOverLife.start = clampNonNegative(config.shards.scaleOverLife.start)
  config.shards.scaleOverLife.peak = clampNonNegative(config.shards.scaleOverLife.peak)
  config.shards.scaleOverLife.end = clampNonNegative(config.shards.scaleOverLife.end)
  config.shards.scaleOverLife.growTimeFraction = clamp01(config.shards.scaleOverLife.growTimeFraction)
  config.shards.initScale.start = clampNonNegative(config.shards.initScale.start)
  config.shards.initScale.end = clampNonNegative(config.shards.initScale.end)
  config.shards.initScale.timeFraction = clamp01(config.shards.initScale.timeFraction)
  config.shards.alpha.max = clamp01(config.shards.alpha.max)
  config.shards.alpha.min = clamp01(config.shards.alpha.min)
  if (config.shards.alpha.min > config.shards.alpha.max)
  {
    config.shards.alpha.max = config.shards.alpha.min
  }
  ;[config.shards.alpha.flashTimeWarpMin, config.shards.alpha.flashTimeWarpMax] = clampNonNegativeRange(
    config.shards.alpha.flashTimeWarpMin,
    config.shards.alpha.flashTimeWarpMax
  )
  config.shards.color.tint = clampColor(config.shards.color.tint)
  config.shards.color.peakBoost = clampNonNegative(config.shards.color.peakBoost)

  config.swipe.enabled = Boolean(config.swipe.enabled)
  config.swipe.input.minPointDistance = clampNonNegative(config.swipe.input.minPointDistance)
  config.swipe.input.pointerCapture = Boolean(config.swipe.input.pointerCapture)
  config.swipe.trail.lifetime = clampNonNegative(config.swipe.trail.lifetime)
  config.swipe.trail.width = clampNonNegative(config.swipe.trail.width)
  config.swipe.trail.minVertexDistance = clampNonNegative(config.swipe.trail.minVertexDistance)
  config.swipe.trail.cornerVertices = Math.max(0, Math.round(config.swipe.trail.cornerVertices))
  config.swipe.trail.capVertices = Math.max(0, Math.round(config.swipe.trail.capVertices))
  config.swipe.trail.intensity = clampNonNegative(config.swipe.trail.intensity)
  config.swipe.trail.startColor = clampColor(config.swipe.trail.startColor)
  config.swipe.trail.midColor = clampColor(config.swipe.trail.midColor)
  config.swipe.trail.endColor = clampColor(config.swipe.trail.endColor)
  config.swipe.trail.midTime = clamp01(config.swipe.trail.midTime)
  config.swipe.trail.alpha.start = clamp01(config.swipe.trail.alpha.start)
  config.swipe.trail.alpha.mid = clamp01(config.swipe.trail.alpha.mid)
  config.swipe.trail.alpha.end = clamp01(config.swipe.trail.alpha.end)
  config.swipe.trail.alpha.midTime = clamp01(config.swipe.trail.alpha.midTime)
  config.swipe.shards.enabled = Boolean(config.swipe.shards.enabled)
  config.swipe.shards.emitPerDistance = clampNonNegative(config.swipe.shards.emitPerDistance)
  config.swipe.shards.innerRadius = clampNonNegative(config.swipe.shards.innerRadius)
  config.swipe.shards.outerRadius = clampNonNegative(config.swipe.shards.outerRadius)
  if (config.swipe.shards.innerRadius > config.swipe.shards.outerRadius)
  {
    config.swipe.shards.outerRadius = config.swipe.shards.innerRadius
  }
  ;[config.swipe.shards.speedMin, config.swipe.shards.speedMax] = clampNonNegativeRange(
    config.swipe.shards.speedMin,
    config.swipe.shards.speedMax
  )
  ;[config.swipe.shards.lifetimeMin, config.swipe.shards.lifetimeMax] = clampNonNegativeRange(
    config.swipe.shards.lifetimeMin,
    config.swipe.shards.lifetimeMax
  )
  ;[config.swipe.shards.sizeMin, config.swipe.shards.sizeMax] = clampNonNegativeRange(
    config.swipe.shards.sizeMin,
    config.swipe.shards.sizeMax
  )
  ;[config.swipe.shards.flashTimeWarpMin, config.swipe.shards.flashTimeWarpMax] = clampNonNegativeRange(
    config.swipe.shards.flashTimeWarpMin,
    config.swipe.shards.flashTimeWarpMax
  )
  config.swipe.shards.tint = clampColor(config.swipe.shards.tint)
  config.swipe.shards.peakBoost = clampNonNegative(config.swipe.shards.peakBoost)

  config.compositor.sharedScale.start = Math.max(0.0001, config.compositor.sharedScale.start)
  config.compositor.sharedScale.end = Math.max(0.0001, config.compositor.sharedScale.end)
  config.compositor.sharedScale.timeFraction = clamp01(config.compositor.sharedScale.timeFraction)
  config.compositor.handoff.arcDelayFromDiskScale = clamp01(config.compositor.handoff.arcDelayFromDiskScale)
  config.compositor.effectScale = Math.max(0.01, config.compositor.effectScale)

  config.mixer.arcWeight = clampNonNegative(config.mixer.arcWeight)
  config.mixer.diskWeight = clampNonNegative(config.mixer.diskWeight)
  config.mixer.shardsWeight = clampNonNegative(config.mixer.shardsWeight)
  config.mixer.trailWeight = clampNonNegative(config.mixer.trailWeight)
  config.mixer.gain = clampNonNegative(config.mixer.gain)
  if (!mixerModes.includes(config.mixer.mode))
  {
    config.mixer.mode = 'screen'
  }

  config.postfx.bloom.enabled = Boolean(config.postfx.bloom.enabled)
  config.postfx.enabled = Boolean(config.postfx.enabled)
  config.postfx.alpha.bloomStrength = clamp01(config.postfx.alpha.bloomStrength)
  config.postfx.alpha.bloomClamp = clamp01(config.postfx.alpha.bloomClamp)
  config.postfx.bloom.threshold = clampNonNegative(config.postfx.bloom.threshold)
  config.postfx.bloom.intensity = clampNonNegative(config.postfx.bloom.intensity)
  config.postfx.bloom.scatter = clamp01(config.postfx.bloom.scatter)
  config.postfx.bloom.clamp = clampNonNegative(config.postfx.bloom.clamp)
  config.postfx.bloom.tint = clampColor(config.postfx.bloom.tint)
  config.postfx.bloom.highQualityFiltering = Boolean(config.postfx.bloom.highQualityFiltering)
  if (config.postfx.bloom.downscale !== 'half' && config.postfx.bloom.downscale !== 'quarter')
  {
    config.postfx.bloom.downscale = 'half'
  }
  config.postfx.bloom.maxIterations = Math.max(1, Math.min(8, Math.round(config.postfx.bloom.maxIterations)))
  if (!tonemappingModes.includes(config.postfx.tonemapping.mode))
  {
    config.postfx.tonemapping.mode = 'neutral'
  }

  return config
}

export const mergeTouchEffectConfig = (
  target: TouchEffectConfig,
  patch: TouchEffectConfigPatch
): TouchEffectConfig =>
{
  mergeObjects(target as unknown as Record<string, unknown>, patch as Record<string, unknown>)
  return applyTouchEffectConfigConstraints(target)
}

export const createTouchEffectConfig = (patch?: TouchEffectConfigPatch): TouchEffectConfig =>
{
  const config = cloneTouchEffectConfig(defaultTouchEffectConfig)
  if (patch)
  {
    mergeTouchEffectConfig(config, patch)
  }
  return applyTouchEffectConfigConstraints(config)
}
