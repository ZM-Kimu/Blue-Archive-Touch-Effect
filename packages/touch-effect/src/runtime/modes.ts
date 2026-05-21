import type { TouchEffectConfig, TouchEffectDebugState } from '../types'

export const getMixerModeValue = (mode: TouchEffectConfig['mixer']['mode']) =>
  mode === 'add' ? 0 : mode === 'screen' ? 1 : 2

export const getTonemappingModeValue = (mode: TouchEffectConfig['postfx']['tonemapping']['mode']) =>
  mode === 'none' ? 0 : mode === 'neutral' ? 1 : 2

export const getScenePreviewModeValue = (mode: TouchEffectDebugState['previewMode']) =>
  mode === 'arc'
    ? 1
    : mode === 'disk'
      ? 2
      : mode === 'shards'
        ? 3
        : 0

export const getFinalPreviewModeValue = (mode: TouchEffectDebugState['previewMode']) =>
  mode === 'trail'
    ? 2
    : mode === 'arc' || mode === 'disk' || mode === 'shards'
      ? 1
      : 0

export const gammaToLinear = (value: number) =>
  value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4)

export const getBloomScatterValue = (scatter: number) =>
  0.05 + 0.9 * Math.min(1, Math.max(0, scatter))

export const getBloomDownscaleFactor = (downscale: TouchEffectConfig['postfx']['bloom']['downscale']) =>
  downscale === 'quarter' ? 4 : 2
