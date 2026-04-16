import type { LayerPreviewMode } from 'blue-archive-touch-effect'

export type PanelKey = 'arc' | 'disk' | 'shards' | 'compositor' | 'mixer' | 'postfx'

export type ConfigPath = string

export type PanelDefinition = {
  key: PanelKey
  title: string
  subtitle: string
}

export type NumericControlDefinition = {
  panel: PanelKey
  group: string
  path: ConfigPath
  label: string
  min: number
  max: number
  step: number
}

export type SelectOption = {
  value: string | number | boolean
  label: string
}

export type SelectControlDefinition = {
  panel: PanelKey
  group: string
  path: ConfigPath
  label: string
  options: SelectOption[]
}

export type ColorControlDefinition = {
  panel: PanelKey
  group: string
  path: ConfigPath
  label: string
}

export type PreviewOption = {
  value: LayerPreviewMode
  label: string
}

export type LabAppearanceState = {
  backgroundColor: string
}
