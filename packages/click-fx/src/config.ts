import type { RuntimeConfig } from './types'
import { finalMixerModes, tonemappingModes } from './types'

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
  themeColor: {
    r: 0.23,
    g: 0.9,
    b: 1,
  },
  mainArcWeight: 0.85,
  coreDiskWeight: 1,
  coreDiskColor: {
    r: 0x55 / 255,
    g: 0xBD / 255,
    b: 0xFF / 255,
  },
  coreDiskRadius: 0.175,
  coreDiskSoftness: 0.6,
  coreDiskScaleStart: 0.25,
  coreDiskScaleEnd: 1,
  coreDiskScaleTimeFraction: 0.3,
  coreDiskAlphaStart: 1,
  coreDiskAlphaEnd: 0,
  coreDiskAlphaFadeStartFraction: 0.3,
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
  d8AlphaMax: 0.9,
  d8AlphaMin: 0.35,
  d8FlashPeriodMin: 0.08,
  d8FlashPeriodMax: 0.15,
  d9StartScale: 0.85,
  d9EndScale: 1.1,
  d9TimeFraction: 0.3,
  fragmentsWeight: 0.75,
  finalMixerMode: 'normalized',
  finalMixerGain: 1,
  fxBloomThreshold: 1,
  fxBloomIntensity: 1,
  fxBloomScatter: 0.7,
  fxTonemappingMode: 'neutral',
}

export const applyRuntimeConfigConstraints = (
  config: RuntimeConfig,
  changedKey: keyof RuntimeConfig
) =>
{
  const clamp01 = (value: number) => Math.min(1, Math.max(0, value))
  const clampNonNegative = (value: number) => Math.max(0, value)
  const normalizeColorChannel = (value: number | undefined, fallback: number) =>
    Number.isFinite(value) ? clamp01(value as number) : fallback
  const normalizeColor = (
    color: RuntimeConfig['themeColor'] | RuntimeConfig['coreDiskColor'] | undefined,
    fallback: RuntimeConfig['themeColor']
  ) => ({
    r: normalizeColorChannel(color?.r, fallback.r),
    g: normalizeColorChannel(color?.g, fallback.g),
    b: normalizeColorChannel(color?.b, fallback.b),
  })
  const ensureFinalMixerMode = () =>
  {
    if (!finalMixerModes.includes(config.finalMixerMode))
    {
      config.finalMixerMode = 'normalized'
    }
  }
  const ensureTonemappingMode = () =>
  {
    if (!tonemappingModes.includes(config.fxTonemappingMode))
    {
      config.fxTonemappingMode = 'neutral'
    }
  }

  config.mainArcWeight = clampNonNegative(config.mainArcWeight)
  config.coreDiskWeight = clampNonNegative(config.coreDiskWeight)
  config.fragmentsWeight = clampNonNegative(config.fragmentsWeight)
  config.finalMixerGain = clampNonNegative(config.finalMixerGain)
  config.themeColor = normalizeColor(config.themeColor, defaultRuntimeConfig.themeColor)
  config.coreDiskColor = normalizeColor(config.coreDiskColor, defaultRuntimeConfig.coreDiskColor)
  ensureFinalMixerMode()
  ensureTonemappingMode()
  config.coreDiskSoftness = clamp01(config.coreDiskSoftness)
  config.coreDiskScaleTimeFraction = clamp01(config.coreDiskScaleTimeFraction)
  config.coreDiskAlphaStart = clamp01(config.coreDiskAlphaStart)
  config.coreDiskAlphaEnd = clamp01(config.coreDiskAlphaEnd)
  config.coreDiskAlphaFadeStartFraction = clamp01(config.coreDiskAlphaFadeStartFraction)
  config.fxBloomThreshold = Math.max(0, config.fxBloomThreshold)
  config.fxBloomIntensity = Math.max(0, config.fxBloomIntensity)
  config.fxBloomScatter = clamp01(config.fxBloomScatter)

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

  if (config.effectScale <= 0)
  {
    config.effectScale = 0.01
  }
}
