import type {
  BranchDefinition,
  BranchVisibility,
  ControlDefinition,
  CorePreviewOption,
  CorePreviewStage,
  FragmentPreviewOption,
  FragmentPreviewStage,
  MainArcPreviewOption,
  MainArcPreviewStage,
  NumericRuntimeKey,
  SelectDefinition,
  SelectRuntimeKey,
  StageDefinition,
} from './types'
import {
  defaultRuntimeConfig,
  finalMixerModes,
  tonemappingModes,
  type FinalMixerMode,
  type RuntimeConfig,
  type TonemappingMode,
} from 'blue-archive-touch-effect'

export const defaultConfig: RuntimeConfig = { ...defaultRuntimeConfig }
export const finalMixerModeOptions: { value: FinalMixerMode; label: string }[] = finalMixerModes.map((value) => ({
  value,
  label:
    value === 'normalized'
      ? 'Normalized'
      : value === 'add'
        ? 'Add'
        : value === 'screen'
          ? 'Screen'
          : 'Max',
}))
export const tonemappingModeOptions: { value: TonemappingMode; label: string }[] = tonemappingModes.map((value) => ({
  value,
  label: value === 'none' ? 'None' : value === 'neutral' ? 'Neutral' : 'ACES',
}))

export const controls: ControlDefinition[] = [
  { branch: 'mainArc', stage: 'a1', key: 'radius', label: 'Radius', min: 0.07, max: 0.13, step: 0.0025 },
  { branch: 'mainArc', stage: 'a1', key: 'scaleX', label: 'Scale X', min: 0.06, max: 0.2, step: 0.005 },
  { branch: 'mainArc', stage: 'a1', key: 'scaleY', label: 'Scale Y', min: 0.7, max: 1.3, step: 0.01 },
  { branch: 'mainArc', stage: 'a2', key: 'duration', label: 'Duration', min: 0.4, max: 0.9, step: 0.025 },
  { branch: 'mainArc', stage: 'a2', key: 'movementY', label: 'Move Y', min: -0.3, max: 0.0, step: 0.005 },
  { branch: 'mainArc', stage: 'a3', key: 'randomX', label: 'Random X', min: 0.0, max: 0.05, step: 0.0025 },
  { branch: 'mainArc', stage: 'a3', key: 'randomY', label: 'Random Y', min: 0.0, max: 0.12, step: 0.0025 },
  { branch: 'mainArc', stage: 'a3', key: 'scaleMin', label: 'Scale Min', min: 0.4, max: 0.8, step: 0.01 },
  { branch: 'mainArc', stage: 'a3', key: 'scaleMax', label: 'Scale Max', min: 0.8, max: 1.2, step: 0.01 },
  { branch: 'mainArc', stage: 'a3', key: 'minCount', label: 'Min Count', min: 1, max: 3, step: 1 },
  { branch: 'mainArc', stage: 'a3', key: 'maxCount', label: 'Max Count', min: 1, max: 3, step: 1 },
  { branch: 'mainArc', stage: 'a4', key: 'angleSpanDeg', label: 'Angle', min: 0, max: 360, step: 1 },
  { branch: 'mainArc', stage: 'a4', key: 'arcRadius', label: 'Arc Radius', min: 0.14, max: 0.26, step: 0.0025 },
  { branch: 'mainArc', stage: 'a6', key: 'rotationSpeedDeg', label: 'Rotate', min: -180, max: 180, step: 0.5 },
  { branch: 'coreDisk', stage: 'bBase', key: 'coreDiskRadius', label: 'Radius', min: 0.06, max: 0.18, step: 0.0025 },
  { branch: 'coreDisk', stage: 'bBase', key: 'coreDiskSoftness', label: 'Softness', min: 0.1, max: 1, step: 0.01 },
  { branch: 'coreDisk', stage: 'bScale', key: 'coreDiskScaleStart', label: 'Start Scale', min: 0.05, max: 1, step: 0.01 },
  { branch: 'coreDisk', stage: 'bScale', key: 'coreDiskScaleEnd', label: 'End Scale', min: 0.25, max: 1.5, step: 0.01 },
  { branch: 'coreDisk', stage: 'bScale', key: 'coreDiskScaleTimeFraction', label: 'Time Frac', min: 0.1, max: 1, step: 0.01 },
  { branch: 'coreDisk', stage: 'bAlpha', key: 'coreDiskAlphaStart', label: 'Alpha Start', min: 0, max: 1, step: 0.01 },
  { branch: 'coreDisk', stage: 'bAlpha', key: 'coreDiskAlphaEnd', label: 'Alpha End', min: 0, max: 1, step: 0.01 },
  { branch: 'coreDisk', stage: 'bAlpha', key: 'coreDiskAlphaFadeStartFraction', label: 'Fade Start', min: 0, max: 1, step: 0.01 },
  { branch: 'mainFx', stage: 'c1', key: 'c1StartScale', label: 'Start Scale', min: 0.1, max: 1, step: 0.01 },
  { branch: 'mainFx', stage: 'c1', key: 'c1EndScale', label: 'End Scale', min: 0.5, max: 1.5, step: 0.01 },
  { branch: 'mainFx', stage: 'c1', key: 'c1TimeFraction', label: 'Time Frac', min: 0.1, max: 1, step: 0.01 },
  { branch: 'mainFx', stage: 'finalMixer', key: 'mainArcWeight', label: 'MainArc Weight', min: 0, max: 2, step: 0.01 },
  { branch: 'mainFx', stage: 'finalMixer', key: 'coreDiskWeight', label: 'CoreDisk Weight', min: 0, max: 2, step: 0.01 },
  { branch: 'mainFx', stage: 'finalMixer', key: 'fragmentsWeight', label: 'Fragments Weight', min: 0, max: 2, step: 0.01 },
  { branch: 'mainFx', stage: 'finalMixer', key: 'finalMixerGain', label: 'Final Gain', min: 0, max: 3, step: 0.01 },
  { branch: 'mainFx', stage: 'final', key: 'effectScale', label: 'Effect Scale', min: 0.4, max: 2, step: 0.01 },
  { branch: 'fragments', stage: 'd0', key: 'dTriangleSize', label: 'Size', min: 0.25, max: 2, step: 0.01 },
  { branch: 'fragments', stage: 'd3', key: 'd3OuterRadius', label: 'Outer Radius', min: 0.08, max: 0.3, step: 0.0025 },
  { branch: 'fragments', stage: 'd3', key: 'd3InnerRadius', label: 'Inner Radius', min: 0.0, max: 0.16, step: 0.0025 },
  { branch: 'fragments', stage: 'd5', key: 'd5CountMin', label: 'Count Min', min: 1, max: 10, step: 1 },
  { branch: 'fragments', stage: 'd5', key: 'd5CountMax', label: 'Count Max', min: 1, max: 10, step: 1 },
  { branch: 'fragments', stage: 'd5', key: 'd5SpeedMin', label: 'Speed Min', min: 0.02, max: 0.3, step: 0.01 },
  { branch: 'fragments', stage: 'd5', key: 'd5SpeedMax', label: 'Speed Max', min: 0.02, max: 0.3, step: 0.01 },
  { branch: 'fragments', stage: 'd5', key: 'd5LifetimeMin', label: 'Life Min', min: 0.1, max: 0.6, step: 0.01 },
  { branch: 'fragments', stage: 'd5', key: 'd5LifetimeMax', label: 'Life Max', min: 0.1, max: 0.6, step: 0.01 },
  { branch: 'fragments', stage: 'd5', key: 'd5SizeMin', label: 'Size Min', min: 0.3, max: 1.5, step: 0.01 },
  { branch: 'fragments', stage: 'd5', key: 'd5SizeMax', label: 'Size Max', min: 0.3, max: 1.5, step: 0.01 },
  { branch: 'fragments', stage: 'd6', key: 'd6StartScale', label: 'Start Scale', min: 0, max: 1.5, step: 0.01 },
  { branch: 'fragments', stage: 'd6', key: 'd6PeakScale', label: 'Peak Scale', min: 0.1, max: 1.5, step: 0.01 },
  { branch: 'fragments', stage: 'd6', key: 'd6EndScale', label: 'End Scale', min: 0, max: 1.0, step: 0.01 },
  { branch: 'fragments', stage: 'd6', key: 'd6GrowTimeFraction', label: 'Grow Frac', min: 0.02, max: 0.5, step: 0.01 },
  { branch: 'fragments', stage: 'd8', key: 'd8AlphaMax', label: 'Alpha Max', min: 0, max: 1, step: 0.01 },
  { branch: 'fragments', stage: 'd8', key: 'd8AlphaMin', label: 'Alpha Min', min: 0, max: 1, step: 0.01 },
  { branch: 'fragments', stage: 'd8', key: 'd8FlashPeriodMin', label: 'Flash Min', min: 0.02, max: 0.5, step: 0.01 },
  { branch: 'fragments', stage: 'd8', key: 'd8FlashPeriodMax', label: 'Flash Max', min: 0.02, max: 0.5, step: 0.01 },
  { branch: 'fragments', stage: 'd9', key: 'd9StartScale', label: 'Start Scale', min: 0.2, max: 1.5, step: 0.01 },
  { branch: 'fragments', stage: 'd9', key: 'd9EndScale', label: 'End Scale', min: 0.2, max: 1.8, step: 0.01 },
  { branch: 'fragments', stage: 'd9', key: 'd9TimeFraction', label: 'Time Frac', min: 0.02, max: 0.5, step: 0.01 },
  { branch: 'filter', stage: 'fx', key: 'fxBloomThreshold', label: 'Threshold', min: 0, max: 2, step: 0.01 },
  { branch: 'filter', stage: 'fx', key: 'fxBloomIntensity', label: 'Intensity', min: 0, max: 3, step: 0.01 },
  { branch: 'filter', stage: 'fx', key: 'fxBloomScatter', label: 'Scatter', min: 0, max: 1, step: 0.01 },
]

export const selectControls: SelectDefinition[] = [
  { branch: 'mainFx', stage: 'finalMixer', key: 'finalMixerMode', label: 'Mode', options: finalMixerModeOptions },
  { branch: 'filter', stage: 'fx', key: 'fxTonemappingMode', label: 'Tonemapping', options: tonemappingModeOptions },
]

export const featuredControlKeys: NumericRuntimeKey[] = [
  'effectScale',
  'fxBloomIntensity',
  'fxBloomScatter',
]

export const featuredSelectKeys: SelectRuntimeKey[] = [
  'fxTonemappingMode',
]

export const branchDefinitions: BranchDefinition[] = [
  { key: 'mainFx', title: 'Branch C', subtitle: 'MainFX / C1' },
  { key: 'filter', title: 'Filter', subtitle: 'FX / Bloom + Tonemapping' },
  { key: 'coreDisk', title: 'Branch B', subtitle: 'CoreDisk / Final' },
  { key: 'mainArc', title: 'Branch A', subtitle: 'MainArc / A7' },
  { key: 'fragments', title: 'Branch D', subtitle: 'Fragments / D8' },
]

export const stageDefinitions: StageDefinition[] = [
  { key: 'c1', branch: 'mainFx', title: 'C1', subtitle: 'Composite Scale (ease-out)', section: 'Transform' },
  { key: 'finalMixer', branch: 'mainFx', title: 'FinalMixer', subtitle: 'Unified Color Mixer', section: 'Output' },
  { key: 'final', branch: 'mainFx', title: 'Final', subtitle: 'Overall Transform', section: 'Output' },
  { key: 'fx', branch: 'filter', title: 'FX', subtitle: 'Bloom + Tonemapping', section: 'Post Process' },
  { key: 'bFinal', branch: 'coreDisk', title: 'Final', subtitle: 'Scaled Color * Alpha', section: 'Output' },
  { key: 'bAlpha', branch: 'coreDisk', title: 'Alpha', subtitle: 'Hold Then Fade', section: 'Alpha' },
  { key: 'bScale', branch: 'coreDisk', title: 'Scale', subtitle: 'Scale Animation (ease-out)', section: 'Animation' },
  { key: 'bBase', branch: 'coreDisk', title: 'BaseCircle', subtitle: 'Colored Base Disk', section: 'Shape' },
  { key: 'a7', branch: 'mainArc', title: 'A7', subtitle: 'Theme Color', section: 'Color' },
  { key: 'a4', branch: 'mainArc', title: 'A4', subtitle: 'Polar Warp', section: 'Arc Shape' },
  { key: 'a6', branch: 'mainArc', title: 'A6', subtitle: 'Rotation', section: 'Arc Shape' },
  { key: 'a2', branch: 'mainArc', title: 'A2', subtitle: 'Movement', section: 'Motion' },
  { key: 'a3', branch: 'mainArc', title: 'A3', subtitle: 'Particleize', section: 'Motion' },
  { key: 'a1', branch: 'mainArc', title: 'A1', subtitle: 'Ellipse Prefab', section: 'Source' },
  { key: 'd8', branch: 'fragments', title: 'D8', subtitle: 'Alpha Over Lifetime', section: 'Output' },
  { key: 'd9', branch: 'fragments', title: 'D9', subtitle: 'Init Scale', section: 'Output' },
  { key: 'd6', branch: 'fragments', title: 'D6', subtitle: 'Scale Over Lifetime', section: 'Lifetime' },
  { key: 'd5', branch: 'fragments', title: 'D5', subtitle: 'Burst Particle System', section: 'Burst' },
  { key: 'd3', branch: 'fragments', title: 'D3', subtitle: 'Donut Shape', section: 'Distribution' },
  { key: 'd4', branch: 'fragments', title: 'D4', subtitle: 'Particle Distribution Map', section: 'Distribution' },
  { key: 'd0', branch: 'fragments', title: 'D0', subtitle: 'Triangle Shape', section: 'Source' },
  { key: 'd1', branch: 'fragments', title: 'D1', subtitle: 'Flip Y', section: 'Source' },
  { key: 'd2', branch: 'fragments', title: 'D2', subtitle: 'Particle Sprites', section: 'Source' },
  { key: 'd7', branch: 'fragments', title: 'D7', subtitle: 'Color Over Lifetime', section: 'Color' },
]

export const corePreviewOptions: CorePreviewOption[] = [
  { key: 'bBase', label: 'BaseCircle' },
  { key: 'bScale', label: 'Scale' },
  { key: 'bAlpha', label: 'Alpha' },
  { key: 'bFinal', label: 'Final' },
]

export const mainArcPreviewOptions: MainArcPreviewOption[] = [
  { key: 'a1', label: 'A1' },
  { key: 'a3', label: 'A3 Source' },
  { key: 'a4', label: 'A4 Warp' },
  { key: 'a6', label: 'A6 Rotate' },
  { key: 'a7', label: 'A7 Color' },
]

export const fragmentPreviewOptions: FragmentPreviewOption[] = [
  { key: 'd0', label: 'D0' },
  { key: 'd1', label: 'D1' },
  { key: 'd2', label: 'D2' },
  { key: 'd3', label: 'D3' },
  { key: 'd4', label: 'D4' },
  { key: 'd5', label: 'D5' },
  { key: 'd6', label: 'D6' },
  { key: 'd7', label: 'D7' },
  { key: 'd8', label: 'D8' },
  { key: 'd9', label: 'D9' },
]

export const defaultBranchVisibility: BranchVisibility = {
  mainArc: true,
  coreDisk: true,
  mainFx: true,
  fragments: true,
  filter: true,
}

export const defaultMainArcPreviewStage: MainArcPreviewStage = 'a7'
export const defaultCorePreviewStage: CorePreviewStage = 'bFinal'
export const defaultFragmentPreviewStage: FragmentPreviewStage = 'd8'

export const isMainArcPreviewStage = (value: string): value is MainArcPreviewStage =>
  mainArcPreviewOptions.some((option) => option.key === value)

export const getCorePreviewStageValue = (stage: CorePreviewStage) =>
{
  if (stage === 'bBase')
  {
    return 0
  }

  if (stage === 'bScale')
  {
    return 1
  }

  if (stage === 'bAlpha')
  {
    return 2
  }

  return 3
}

export const getFragmentPreviewStageValue = (stage: FragmentPreviewStage) =>
{
  if (stage === 'd0')
  {
    return 0
  }

  if (stage === 'd1')
  {
    return 1
  }

  if (stage === 'd2')
  {
    return 2
  }

  if (stage === 'd3')
  {
    return 3
  }

  if (stage === 'd4')
  {
    return 4
  }

  if (stage === 'd5')
  {
    return 5
  }

  if (stage === 'd6')
  {
    return 6
  }

  if (stage === 'd7')
  {
    return 7
  }

  if (stage === 'd8')
  {
    return 8
  }

  return 9
}

export const isCorePreviewStage = (value: string): value is CorePreviewStage =>
  corePreviewOptions.some((option) => option.key === value)

export const isFragmentPreviewStage = (value: string): value is FragmentPreviewStage =>
  fragmentPreviewOptions.some((option) => option.key === value)

export const formatValue = (key: keyof RuntimeConfig, value: number) =>
{
  if (
    key === 'minCount'
    || key === 'maxCount'
    || key === 'angleSpanDeg'
    || key === 'd5CountMin'
    || key === 'd5CountMax'
  )
  {
    return String(Math.round(value))
  }

  return value.toFixed(2)
}
