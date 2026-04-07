import type {
  BranchDefinition,
  BranchVisibility,
  ControlDefinition,
  CorePreviewOption,
  CorePreviewStage,
  FragmentPreviewOption,
  FragmentPreviewStage,
  SelectDefinition,
  StageDefinition,
} from './types'
import { defaultRuntimeConfig, type BlendMode, type RuntimeConfig } from 'blue-archive-touch-effect'

export const defaultConfig: RuntimeConfig = { ...defaultRuntimeConfig }
export const blendModeOptions: { value: BlendMode; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'add', label: 'Add' },
  { value: 'screen', label: 'Screen' },
]

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
  { branch: 'mainArc', stage: 'a7', key: 'arcColorR', label: 'Color R', min: 0, max: 1, step: 0.01 },
  { branch: 'mainArc', stage: 'a7', key: 'arcColorG', label: 'Color G', min: 0, max: 1, step: 0.01 },
  { branch: 'mainArc', stage: 'a7', key: 'arcColorB', label: 'Color B', min: 0, max: 1, step: 0.01 },
  { branch: 'mainArc', stage: 'aMix', key: 'mainArcAlphaMix', label: 'Alpha Mix', min: 0, max: 1, step: 0.01 },
  { branch: 'coreDisk', stage: 'b0', key: 'b0Radius', label: 'B0 Radius', min: 0.06, max: 0.22, step: 0.0025 },
  { branch: 'coreDisk', stage: 'b0', key: 'b0Softness', label: 'B0 Soft', min: 0.1, max: 1, step: 0.01 },
  { branch: 'coreDisk', stage: 'b1', key: 'b1Radius', label: 'B1 Radius', min: 0.06, max: 0.18, step: 0.0025 },
  { branch: 'coreDisk', stage: 'b2', key: 'b2StartScale', label: 'Start Scale', min: 0.05, max: 1, step: 0.01 },
  { branch: 'coreDisk', stage: 'b2', key: 'b2EndScale', label: 'End Scale', min: 0.25, max: 1.5, step: 0.01 },
  { branch: 'coreDisk', stage: 'b2', key: 'b2TimeFraction', label: 'Time Frac', min: 0.1, max: 1, step: 0.01 },
  { branch: 'coreDisk', stage: 'b3', key: 'b3GrayMultiplier', label: 'Gray Mult', min: 0, max: 2, step: 0.01 },
  { branch: 'coreDisk', stage: 'b3', key: 'b3AlphaMultiplier', label: 'Alpha Mult', min: 0, max: 2, step: 0.01 },
  { branch: 'coreDisk', stage: 'b4', key: 'b4Alpha', label: 'Alpha', min: 0, max: 1, step: 0.01 },
  { branch: 'coreDisk', stage: 'bMix', key: 'coreDiskAlphaMix', label: 'Alpha Mix', min: 0, max: 1, step: 0.01 },
  { branch: 'mainFx', stage: 'c1', key: 'c1StartScale', label: 'Start Scale', min: 0.1, max: 1, step: 0.01 },
  { branch: 'mainFx', stage: 'c1', key: 'c1EndScale', label: 'End Scale', min: 0.5, max: 1.5, step: 0.01 },
  { branch: 'mainFx', stage: 'c1', key: 'c1TimeFraction', label: 'Time Frac', min: 0.1, max: 1, step: 0.01 },
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
  { branch: 'fragments', stage: 'dMix', key: 'fragmentsAlphaMix', label: 'Alpha Mix', min: 0, max: 1, step: 0.01 },
  { branch: 'filter', stage: 'fx', key: 'fxBlurRadius', label: 'Blur Radius', min: 0.25, max: 3, step: 0.05 },
  { branch: 'filter', stage: 'fx', key: 'fxBlurMix', label: 'Blur Mix', min: 0, max: 0.75, step: 0.01 },
  { branch: 'filter', stage: 'fx', key: 'fxBloomThresholdLow', label: 'Bloom Low', min: 0, max: 1, step: 0.01 },
  { branch: 'filter', stage: 'fx', key: 'fxBloomThresholdHigh', label: 'Bloom High', min: 0, max: 1, step: 0.01 },
  { branch: 'filter', stage: 'fx', key: 'fxBloomIntensity', label: 'Bloom Intensity', min: 0, max: 2.5, step: 0.01 },
  { branch: 'filter', stage: 'fxMix', key: 'fxScreenMix', label: 'Filter Mix', min: 0, max: 1, step: 0.01 },
  { branch: 'filter', stage: 'fxMix', key: 'globalAlpha', label: 'Global Alpha', min: 0, max: 1, step: 0.01 },
]

export const selectControls: SelectDefinition[] = [
  { branch: 'mainArc', stage: 'aMix', key: 'mainArcBlendMode', label: 'Blend Mode', options: blendModeOptions },
  { branch: 'coreDisk', stage: 'bMix', key: 'coreDiskBlendMode', label: 'Blend Mode', options: blendModeOptions },
  { branch: 'fragments', stage: 'dMix', key: 'fragmentsBlendMode', label: 'Blend Mode', options: blendModeOptions },
  { branch: 'filter', stage: 'fxMix', key: 'filterBlendMode', label: 'Blend Mode', options: blendModeOptions },
]

export const branchDefinitions: BranchDefinition[] = [
  { key: 'mainArc', title: 'Branch A', subtitle: 'MainArc / A7' },
  { key: 'coreDisk', title: 'Branch B', subtitle: 'CoreDisk / B4' },
  { key: 'mainFx', title: 'Branch C', subtitle: 'MainFX / C1' },
  { key: 'fragments', title: 'Branch D', subtitle: 'Fragments / D8' },
  { key: 'filter', title: 'Filter', subtitle: 'FX / Bloom + Blur + Screen' },
]

export const stageDefinitions: StageDefinition[] = [
  { key: 'a1', branch: 'mainArc', title: 'A1', subtitle: 'Ellipse Prefab' },
  { key: 'a2', branch: 'mainArc', title: 'A2', subtitle: 'Movement' },
  { key: 'a3', branch: 'mainArc', title: 'A3', subtitle: 'Particleize' },
  { key: 'a4', branch: 'mainArc', title: 'A4', subtitle: 'Polar Warp' },
  { key: 'a6', branch: 'mainArc', title: 'A6', subtitle: 'Rotation' },
  { key: 'a7', branch: 'mainArc', title: 'A7', subtitle: 'Colorize' },
  { key: 'aMix', branch: 'mainArc', title: 'Mix', subtitle: 'Alpha + Blend' },
  { key: 'b0', branch: 'coreDisk', title: 'B0', subtitle: 'Height Reference' },
  { key: 'b1', branch: 'coreDisk', title: 'B1', subtitle: 'Solid Output' },
  { key: 'b2', branch: 'coreDisk', title: 'B2', subtitle: 'Scale Animation (ease-out)' },
  { key: 'b3', branch: 'coreDisk', title: 'B3', subtitle: 'Threshold / Gray+Alpha' },
  { key: 'b4', branch: 'coreDisk', title: 'B4', subtitle: 'Replace Color' },
  { key: 'bMix', branch: 'coreDisk', title: 'Mix', subtitle: 'Alpha + Blend' },
  { key: 'c1', branch: 'mainFx', title: 'C1', subtitle: 'Composite Scale (ease-out)' },
  { key: 'final', branch: 'mainFx', title: 'Final', subtitle: 'Overall Transform' },
  { key: 'd0', branch: 'fragments', title: 'D0', subtitle: 'Triangle Shape' },
  { key: 'd1', branch: 'fragments', title: 'D1', subtitle: 'Flip Y' },
  { key: 'd2', branch: 'fragments', title: 'D2', subtitle: 'Particle Sprites' },
  { key: 'd3', branch: 'fragments', title: 'D3', subtitle: 'Donut Shape' },
  { key: 'd4', branch: 'fragments', title: 'D4', subtitle: 'Particle Distribution Map' },
  { key: 'd5', branch: 'fragments', title: 'D5', subtitle: 'Burst Particle System' },
  { key: 'd6', branch: 'fragments', title: 'D6', subtitle: 'Scale Over Lifetime' },
  { key: 'd7', branch: 'fragments', title: 'D7', subtitle: 'Color Over Lifetime' },
  { key: 'd8', branch: 'fragments', title: 'D8', subtitle: 'Alpha Over Lifetime' },
  { key: 'd9', branch: 'fragments', title: 'D9', subtitle: 'Init Scale' },
  { key: 'dMix', branch: 'fragments', title: 'Mix', subtitle: 'Alpha + Blend' },
  { key: 'fx', branch: 'filter', title: 'FX', subtitle: 'Bloom + Blur + Screen' },
  { key: 'fxMix', branch: 'filter', title: 'Mix', subtitle: 'Branch Blend' },
]

export const corePreviewOptions: CorePreviewOption[] = [
  { key: 'b0', label: 'B0' },
  { key: 'b1', label: 'B1' },
  { key: 'b2', label: 'B2' },
  { key: 'b3', label: 'B3' },
  { key: 'b4', label: 'B4' },
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

export const defaultCorePreviewStage: CorePreviewStage = 'b4'
export const defaultFragmentPreviewStage: FragmentPreviewStage = 'd8'

export const getCorePreviewStageValue = (stage: CorePreviewStage) =>
{
  if (stage === 'b0')
  {
    return 0
  }

  if (stage === 'b1')
  {
    return 1
  }

  if (stage === 'b2')
  {
    return 2
  }

  if (stage === 'b3')
  {
    return 3
  }

  return 4
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

  if (key === 'rotationSpeedDeg')
  {
    return value.toFixed(1)
  }

  if (key === 'radius' || key === 'arcRadius' || key === 'b0Radius' || key === 'b1Radius' || key === 'd3OuterRadius' || key === 'd3InnerRadius')
  {
    return value.toFixed(3)
  }

  return value.toFixed(2)
}
