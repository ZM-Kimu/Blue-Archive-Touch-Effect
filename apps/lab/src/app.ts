import {
  applyRuntimeConfigConstraints,
  createClickFx,
  type ClickFxInstance,
  type RuntimeConfig,
} from 'blue-archive-touch-effect'
import {
  defaultBranchVisibility,
  defaultConfig,
  defaultCorePreviewStage,
  defaultFragmentPreviewStage,
} from './lab-config'
import { createDebugPanel } from './ui'
import type {
  BranchKey,
  BranchVisibility,
  CorePreviewStage,
  FragmentPreviewStage,
  LabAppearanceState,
  LabRuntimeDebugState,
  NumericRuntimeKey,
} from './types'

type LabClickFxInstance = ClickFxInstance & {
  setDebugState: (partial: Partial<LabRuntimeDebugState>) => void
}

export const bootstrapClickFx = () =>
{
  const app = document.querySelector<HTMLDivElement>('#app')

  if (!app)
  {
    throw new Error('App root not found')
  }

  const config: RuntimeConfig = { ...defaultConfig }
  const branchVisibility: BranchVisibility = { ...defaultBranchVisibility }
  const appearance: LabAppearanceState = {
    backgroundColor: '#000000',
  }
  let corePreviewStage: CorePreviewStage = defaultCorePreviewStage
  let fragmentPreviewStage: FragmentPreviewStage = defaultFragmentPreviewStage

  const panelController = createDebugPanel({
    app,
    config,
    branchVisibility,
    getCorePreviewStage: () => corePreviewStage,
    getFragmentPreviewStage: () => fragmentPreviewStage,
    getThemeColor: () => config.themeColor,
    getBackgroundColor: () => appearance.backgroundColor,
    onControlChange: (key: NumericRuntimeKey, value) =>
    {
      config[key] = value
      applyRuntimeConfigConstraints(config, key)
      syncControls()
    },
    onSelectChange: (key, value) =>
    {
      config[key] = value
      applyRuntimeConfigConstraints(config, key)
      syncControls()
    },
    onVisibilityChange: (key: BranchKey, value: boolean) =>
    {
      branchVisibility[key] = value
      syncControls()
    },
    onCorePreviewChange: (value) =>
    {
      corePreviewStage = value
      syncControls()
    },
    onFragmentPreviewChange: (value) =>
    {
      fragmentPreviewStage = value
      syncControls()
    },
    onThemeColorChange: (value) =>
    {
      config.themeColor = value
      applyRuntimeConfigConstraints(config, 'themeColor')
      syncControls()
    },
    onBackgroundColorChange: (value) =>
    {
      appearance.backgroundColor = value
      syncControls()
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
    runtime.updateConfig({ ...config })
    runtime.setDebugState({
      branchVisibility: { ...branchVisibility },
      corePreviewStage,
      fragmentPreviewStage,
    })
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
