import type { BlendMode, RuntimeConfig } from 'blue-archive-touch-effect'

export type BranchKey = 'mainArc' | 'coreDisk' | 'mainFx' | 'fragments' | 'filter'
export type StageKey = 'a1' | 'a2' | 'a3' | 'a4' | 'a6' | 'a7' | 'aMix' | 'b0' | 'b1' | 'b2' | 'b3' | 'b4' | 'bMix' | 'c1' | 'final' | 'd0' | 'd1' | 'd2' | 'd3' | 'd4' | 'd5' | 'd6' | 'd7' | 'd8' | 'd9' | 'dMix' | 'fx' | 'fxMix'
export type CorePreviewStage = 'b0' | 'b1' | 'b2' | 'b3' | 'b4'
export type FragmentPreviewStage = 'd0' | 'd1' | 'd2' | 'd3' | 'd4' | 'd5' | 'd6' | 'd7' | 'd8' | 'd9'

export type BranchVisibility = Record<BranchKey, boolean>

export type NumericRuntimeKey = {
  [Key in keyof RuntimeConfig]: RuntimeConfig[Key] extends number ? Key : never
}[keyof RuntimeConfig]

export type BlendModeRuntimeKey = {
  [Key in keyof RuntimeConfig]: RuntimeConfig[Key] extends BlendMode ? Key : never
}[keyof RuntimeConfig]

export type ControlDefinition = {
  branch: BranchKey
  stage: StageKey
  key: NumericRuntimeKey
  label: string
  min: number
  max: number
  step: number
}

export type SelectOption = {
  value: BlendMode
  label: string
}

export type SelectDefinition = {
  branch: BranchKey
  stage: StageKey
  key: BlendModeRuntimeKey
  label: string
  options: SelectOption[]
}

export type BranchDefinition = {
  key: BranchKey
  title: string
  subtitle: string
}

export type StageDefinition = {
  key: StageKey
  branch: BranchKey
  title: string
  subtitle: string
}

export type CorePreviewOption = {
  key: CorePreviewStage
  label: string
}

export type FragmentPreviewOption = {
  key: FragmentPreviewStage
  label: string
}

export type LabRuntimeDebugState = {
  branchVisibility: BranchVisibility
  corePreviewStage: CorePreviewStage
  fragmentPreviewStage: FragmentPreviewStage
}

export type LabAppearanceState = {
  backgroundColor: string
}
