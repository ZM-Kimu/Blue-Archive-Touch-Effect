import type { RuntimeConfig } from 'blue-archive-touch-effect'

export type BranchKey = 'mainArc' | 'coreDisk' | 'mainFx' | 'fragments' | 'filter'
export type StageKey =
  | 'a1'
  | 'a2'
  | 'a3'
  | 'a4'
  | 'a6'
  | 'a7'
  | 'bBase'
  | 'bScale'
  | 'bAlpha'
  | 'bFinal'
  | 'c1'
  | 'finalMixer'
  | 'final'
  | 'd0'
  | 'd1'
  | 'd2'
  | 'd3'
  | 'd4'
  | 'd5'
  | 'd6'
  | 'd7'
  | 'd8'
  | 'd9'
  | 'fx'
export type MainArcPreviewStage = 'a1' | 'a3' | 'a4' | 'a6' | 'a7'
export type CorePreviewStage = 'bBase' | 'bScale' | 'bAlpha' | 'bFinal'
export type FragmentPreviewStage = 'd0' | 'd1' | 'd2' | 'd3' | 'd4' | 'd5' | 'd6' | 'd7' | 'd8' | 'd9'

export type BranchVisibility = Record<BranchKey, boolean>

export type NumericRuntimeKey = {
  [Key in keyof RuntimeConfig]: RuntimeConfig[Key] extends number ? Key : never
}[keyof RuntimeConfig]

export type SelectRuntimeKey = {
  [Key in keyof RuntimeConfig]: RuntimeConfig[Key] extends string ? Key : never
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
  value: string
  label: string
}

export type SelectDefinition = {
  branch: BranchKey
  stage: StageKey
  key: SelectRuntimeKey
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
  section: string
}

export type CorePreviewOption = {
  key: CorePreviewStage
  label: string
}

export type MainArcPreviewOption = {
  key: MainArcPreviewStage
  label: string
}

export type FragmentPreviewOption = {
  key: FragmentPreviewStage
  label: string
}

export type LabRuntimeDebugState = {
  branchVisibility: BranchVisibility
  mainArcPreviewStage: MainArcPreviewStage
  corePreviewStage: CorePreviewStage
  fragmentPreviewStage: FragmentPreviewStage
}

export type LabAppearanceState = {
  backgroundColor: string
}
