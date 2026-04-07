import type { RuntimeConfig } from './types'
import { blendModes } from './types'

export const defaultRuntimeConfig: RuntimeConfig = {
  radius: 0.1,
  scaleX: 0.09,
  scaleY: 1,
  duration: 0.7,
  movementY: -0.15,
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
  mainArcAlphaMix: 0.85,
  mainArcBlendMode: 'screen',
  b0Radius: 0.18,
  b0Softness: 1,
  b1Radius: 0.175,
  b2StartScale: 0.25,
  b2EndScale: 1,
  b2TimeFraction: 0.3,
  b3GrayMultiplier: 1.5,
  b3AlphaMultiplier: 0.73,
  b4Alpha: 1,
  coreDiskAlphaMix: 1,
  coreDiskBlendMode: 'add',
  c1StartScale: 0.2,
  c1EndScale: 1,
  c1TimeFraction: 0.85,
  effectScale: 0.2,
  dTriangleSize: 0.53,
  d3OuterRadius: 0.25,
  d3InnerRadius: 0.098,
  d5CountMin: 4,
  d5CountMax: 4,
  d5SpeedMin: 0.04,
  d5SpeedMax: 0.08,
  d5LifetimeMin: 0.38,
  d5LifetimeMax: 0.6,
  d5SizeMin: 1.09,
  d5SizeMax: 1.5,
  d6StartScale: 0,
  d6PeakScale: 1,
  d6EndScale: 0,
  d6GrowTimeFraction: 0.15,
  d8AlphaMax: 1,
  d8AlphaMin: 0.35,
  d8FlashPeriodMin: 0.08,
  d8FlashPeriodMax: 0.15,
  d9StartScale: 0.85,
  d9EndScale: 1.1,
  d9TimeFraction: 0.3,
  fragmentsAlphaMix: 0.7,
  fragmentsBlendMode: 'add',
  fxBlurRadius: 1.85,
  fxBlurMix: 0.6,
  fxBloomThresholdLow: 0.1,
  fxBloomThresholdHigh: 0.74,
  fxBloomIntensity: 1.61,
  fxScreenMix: 1,
  filterBlendMode: 'screen',
  globalAlpha: 0.9,
}

export const applyRuntimeConfigConstraints = (
  config: RuntimeConfig,
  changedKey: keyof RuntimeConfig
) =>
{
  const clamp01 = (value: number) => Math.min(1, Math.max(0, value))
  const ensureBlendMode = (
    key: 'mainArcBlendMode' | 'coreDiskBlendMode' | 'fragmentsBlendMode' | 'filterBlendMode',
    fallback: RuntimeConfig[typeof key]
  ) =>
  {
    if (!blendModes.includes(config[key]))
    {
      config[key] = fallback
    }
  }

  config.mainArcAlphaMix = clamp01(config.mainArcAlphaMix)
  config.coreDiskAlphaMix = clamp01(config.coreDiskAlphaMix)
  config.fragmentsAlphaMix = clamp01(config.fragmentsAlphaMix)
  config.fxScreenMix = clamp01(config.fxScreenMix)
  config.globalAlpha = clamp01(config.globalAlpha)
  ensureBlendMode('mainArcBlendMode', 'add')
  ensureBlendMode('coreDiskBlendMode', 'add')
  ensureBlendMode('fragmentsBlendMode', 'add')
  ensureBlendMode('filterBlendMode', 'screen')

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

  if (config.d3InnerRadius > config.d3OuterRadius)
  {
    if (changedKey === 'd3InnerRadius')
    {
      config.d3OuterRadius = config.d3InnerRadius
    } else if (changedKey === 'd3OuterRadius')
    {
      config.d3InnerRadius = config.d3OuterRadius
    }
  }

  if (config.d5CountMin > config.d5CountMax)
  {
    if (changedKey === 'd5CountMin')
    {
      config.d5CountMax = config.d5CountMin
    } else if (changedKey === 'd5CountMax')
    {
      config.d5CountMin = config.d5CountMax
    }
  }

  if (config.d5SpeedMin > config.d5SpeedMax)
  {
    if (changedKey === 'd5SpeedMin')
    {
      config.d5SpeedMax = config.d5SpeedMin
    } else if (changedKey === 'd5SpeedMax')
    {
      config.d5SpeedMin = config.d5SpeedMax
    }
  }

  if (config.d5LifetimeMin > config.d5LifetimeMax)
  {
    if (changedKey === 'd5LifetimeMin')
    {
      config.d5LifetimeMax = config.d5LifetimeMin
    } else if (changedKey === 'd5LifetimeMax')
    {
      config.d5LifetimeMin = config.d5LifetimeMax
    }
  }

  if (config.d5SizeMin > config.d5SizeMax)
  {
    if (changedKey === 'd5SizeMin')
    {
      config.d5SizeMax = config.d5SizeMin
    } else if (changedKey === 'd5SizeMax')
    {
      config.d5SizeMin = config.d5SizeMax
    }
  }

  if (config.d8AlphaMin > config.d8AlphaMax)
  {
    if (changedKey === 'd8AlphaMin')
    {
      config.d8AlphaMax = config.d8AlphaMin
    } else if (changedKey === 'd8AlphaMax')
    {
      config.d8AlphaMin = config.d8AlphaMax
    }
  }

  if (config.d8FlashPeriodMin > config.d8FlashPeriodMax)
  {
    if (changedKey === 'd8FlashPeriodMin')
    {
      config.d8FlashPeriodMax = config.d8FlashPeriodMin
    } else if (changedKey === 'd8FlashPeriodMax')
    {
      config.d8FlashPeriodMin = config.d8FlashPeriodMax
    }
  }

  if (config.fxBloomThresholdLow > config.fxBloomThresholdHigh)
  {
    if (changedKey === 'fxBloomThresholdLow')
    {
      config.fxBloomThresholdHigh = config.fxBloomThresholdLow
    } else if (changedKey === 'fxBloomThresholdHigh')
    {
      config.fxBloomThresholdLow = config.fxBloomThresholdHigh
    }
  }

  if (config.effectScale <= 0)
  {
    config.effectScale = 0.01
  }
}
