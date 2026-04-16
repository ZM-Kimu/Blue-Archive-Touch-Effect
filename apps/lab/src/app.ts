import {
  createClickFx,
  type ClickFxInstance,
  type ColorRgb,
  type LayerPreviewMode,
  type RuntimeConfig,
  type RuntimeConfigPatch,
} from 'blue-archive-touch-effect'
import { defaultConfig } from './lab-config'
import { createDebugPanel } from './ui'
import type { ConfigPath, LabAppearanceState } from './types'

type LabClickFxInstance = ClickFxInstance & {
  setDebugState: (partial: { previewMode?: LayerPreviewMode }) => void
}

const cloneValue = <T>(value: T): T =>
{
  if (Array.isArray(value))
  {
    return value.map((entry) => cloneValue(entry)) as T
  }

  if (typeof value === 'object' && value !== null)
  {
    const clone: Record<string, unknown> = {}
    Object.entries(value as Record<string, unknown>).forEach(([key, entry]) =>
    {
      clone[key] = cloneValue(entry)
    })
    return clone as T
  }

  return value
}

const getPathValue = (config: RuntimeConfig, path: ConfigPath): unknown =>
  path.split('.').reduce<unknown>((current, key) => (current as Record<string, unknown>)[key], config as unknown)

const setPathValue = (config: RuntimeConfig, path: ConfigPath, value: unknown) =>
{
  const segments = path.split('.')
  const last = segments.pop()
  if (!last)
  {
    return
  }

  const target = segments.reduce<Record<string, unknown>>(
    (current, key) => current[key] as Record<string, unknown>,
    config as unknown as Record<string, unknown>
  )
  target[last] = value
}

const buildPatch = (path: ConfigPath, value: unknown): RuntimeConfigPatch =>
{
  const segments = path.split('.')
  const root: Record<string, unknown> = {}
  let current = root

  segments.forEach((segment, index) =>
  {
    if (index === segments.length - 1)
    {
      current[segment] = cloneValue(value)
      return
    }

    current[segment] = {}
    current = current[segment] as Record<string, unknown>
  })

  return root as RuntimeConfigPatch
}

export const bootstrapClickFx = () =>
{
  const app = document.querySelector<HTMLDivElement>('#app')

  if (!app)
  {
    throw new Error('App root not found')
  }

  const config: RuntimeConfig = cloneValue(defaultConfig)
  const appearance: LabAppearanceState = {
    backgroundColor: '#000000',
  }
  let previewMode: LayerPreviewMode = 'composite'

  const panelController = createDebugPanel({
    app,
    config,
    getPreviewMode: () => previewMode,
    getBackgroundColor: () => appearance.backgroundColor,
    readPath: (path) => getPathValue(config, path),
    onNumberChange: (path, value) =>
    {
      setPathValue(config, path, value)
      runtime.updateConfig(buildPatch(path, value))
      panelController.sync()
    },
    onSelectChange: (path, value) =>
    {
      setPathValue(config, path, value)
      runtime.updateConfig(buildPatch(path, value))
      panelController.sync()
    },
    onColorChange: (path, value: ColorRgb) =>
    {
      setPathValue(config, path, value)
      runtime.updateConfig(buildPatch(path, value))
      panelController.sync()
    },
    onPreviewModeChange: (value) =>
    {
      previewMode = value
      runtime.setDebugState({ previewMode })
      panelController.sync()
    },
    onBackgroundColorChange: (value) =>
    {
      appearance.backgroundColor = value
      stage.style.backgroundColor = appearance.backgroundColor
      panelController.sync()
    },
  })

  const stage = document.createElement('section')
  stage.className = 'app-stage'
  panelController.shell.prepend(stage)

  const runtime = createClickFx({
    target: stage,
    config,
    autoBindPointer: false,
  }) as LabClickFxInstance

  const syncControls = () =>
  {
    stage.style.backgroundColor = appearance.backgroundColor
    runtime.setDebugState({ previewMode })
    panelController.sync()
  }

  const handlePressSpawn = (event: MouseEvent) =>
  {
    if (event.target instanceof HTMLElement && event.target.closest('.debug-panel'))
    {
      return
    }

    if (event.button < 0 || event.button > 2)
    {
      return
    }

    runtime.spawnAtClient(event.clientX, event.clientY)
  }

  panelController.shell.addEventListener('mousedown', handlePressSpawn)
  syncControls()
}
