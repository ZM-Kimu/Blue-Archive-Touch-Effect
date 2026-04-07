import {
  branchDefinitions,
  controls,
  corePreviewOptions,
  fragmentPreviewOptions,
  formatValue,
  isCorePreviewStage,
  isFragmentPreviewStage,
  stageDefinitions,
} from './config'
import type {
  BranchKey,
  BranchVisibility,
  CorePreviewStage,
  DebugState,
  FragmentPreviewStage,
} from './types'

type DebugPanelOptions = {
  app: HTMLDivElement
  config: DebugState
  branchVisibility: BranchVisibility
  getCorePreviewStage: () => CorePreviewStage
  getFragmentPreviewStage: () => FragmentPreviewStage
  onControlChange: (key: keyof DebugState, value: number) => void
  onVisibilityChange: (key: BranchKey, value: boolean) => void
  onCorePreviewChange: (value: CorePreviewStage) => void
  onFragmentPreviewChange: (value: FragmentPreviewStage) => void
}

export type DebugPanelController = {
  shell: HTMLElement
  panel: HTMLElement
  sync: () => void
}

export const createDebugPanel = ({
  app,
  config,
  branchVisibility,
  getCorePreviewStage,
  getFragmentPreviewStage,
  onControlChange,
  onVisibilityChange,
  onCorePreviewChange,
  onFragmentPreviewChange,
}: DebugPanelOptions): DebugPanelController =>
{
  const createControlMarkup = ({ key, label, min, max, step }: (typeof controls)[number]) => `
    <label class="debug-control">
      <span>${label}</span>
      <input
        data-field="${key}"
        type="range"
        min="${min}"
        max="${max}"
        step="${step}"
        value="${config[key]}"
      />
      <output data-output="${key}">${formatValue(key, config[key])}</output>
    </label>
  `

  const createStageMarkup = ({ key, title, subtitle }: (typeof stageDefinitions)[number]) => `
    <section class="debug-stage">
      <div class="debug-stage__header">
        <strong>${title}</strong>
        <span>${subtitle}</span>
      </div>
      <div class="debug-stage__controls">
        ${controls.filter((control) => control.stage === key).map(createControlMarkup).join('')}
      </div>
    </section>
  `

  const createCorePreviewMarkup = () => `
    <label class="debug-preview">
      <span>Preview</span>
      <select data-core-preview>
        ${corePreviewOptions
          .map(({ key, label }) => `<option value="${key}" ${getCorePreviewStage() === key ? 'selected' : ''}>${label}</option>`)
          .join('')}
      </select>
    </label>
  `

  const createFragmentPreviewMarkup = () => `
    <label class="debug-preview">
      <span>Preview</span>
      <select data-fragment-preview>
        ${fragmentPreviewOptions
          .map(({ key, label }) => `<option value="${key}" ${getFragmentPreviewStage() === key ? 'selected' : ''}>${label}</option>`)
          .join('')}
      </select>
    </label>
  `

  const createBranchMarkup = ({ key, title, subtitle }: (typeof branchDefinitions)[number]) => `
    <section class="debug-branch">
      <div class="debug-branch__header">
        <div class="debug-branch__copy">
          <strong>${title}</strong>
          <span>${subtitle}</span>
        </div>
        <label class="debug-toggle">
          <input data-visibility="${key}" type="checkbox" ${branchVisibility[key] ? 'checked' : ''} />
          <span>${key === 'filter' ? 'Enabled' : 'Visible'}</span>
        </label>
      </div>
      <div class="debug-branch__controls">
        ${key === 'coreDisk' ? createCorePreviewMarkup() : ''}
        ${key === 'fragments' ? createFragmentPreviewMarkup() : ''}
        ${stageDefinitions.filter((stage) => stage.branch === key).map(createStageMarkup).join('')}
      </div>
    </section>
  `

  const shell = document.createElement('main')
  shell.className = 'app-shell'

  const panel = document.createElement('aside')
  panel.className = 'debug-panel'
  panel.innerHTML = `
    <div class="debug-panel__header">
      <strong>Click FX</strong>
      <span>Stage controls for the current preview stack.</span>
    </div>
    <div class="debug-branches">
      ${branchDefinitions.map(createBranchMarkup).join('')}
    </div>
    <p class="debug-hint">Most generation parameters apply on next click. Visibility, A7 color, C1 controls, filter controls, and preview selectors update immediately.</p>
  `

  shell.appendChild(panel)
  app.appendChild(shell)

  const controlElements = new Map<keyof DebugState, { input: HTMLInputElement; output: HTMLOutputElement }>()
  const visibilityElements = new Map<BranchKey, HTMLInputElement>()
  const corePreviewElement = panel.querySelector<HTMLSelectElement>('select[data-core-preview]')
  const fragmentPreviewElement = panel.querySelector<HTMLSelectElement>('select[data-fragment-preview]')

  controls.forEach((control) =>
  {
    const input = panel.querySelector<HTMLInputElement>(`input[data-field="${control.key}"]`)
    const output = panel.querySelector<HTMLOutputElement>(`output[data-output="${control.key}"]`)

    if (!input || !output)
    {
      throw new Error(`Missing control for ${control.key}`)
    }

    controlElements.set(control.key, { input, output })

    const handleInput = () =>
    {
      onControlChange(control.key, Number(input.value))
    }

    input.addEventListener('input', handleInput)
    input.addEventListener('change', handleInput)
  })

  branchDefinitions.forEach(({ key }) =>
  {
    const input = panel.querySelector<HTMLInputElement>(`input[data-visibility="${key}"]`)

    if (!input)
    {
      throw new Error(`Missing visibility toggle for ${key}`)
    }

    visibilityElements.set(key, input)

    const handleToggle = () =>
    {
      onVisibilityChange(key, input.checked)
    }

    input.addEventListener('input', handleToggle)
    input.addEventListener('change', handleToggle)
  })

  if (!corePreviewElement)
  {
    throw new Error('Missing core preview selector')
  }

  if (!fragmentPreviewElement)
  {
    throw new Error('Missing fragment preview selector')
  }

  const handleCorePreviewChange = () =>
  {
    if (isCorePreviewStage(corePreviewElement.value))
    {
      onCorePreviewChange(corePreviewElement.value)
    }
  }

  const handleFragmentPreviewChange = () =>
  {
    if (isFragmentPreviewStage(fragmentPreviewElement.value))
    {
      onFragmentPreviewChange(fragmentPreviewElement.value)
    }
  }

  corePreviewElement.addEventListener('input', handleCorePreviewChange)
  corePreviewElement.addEventListener('change', handleCorePreviewChange)
  fragmentPreviewElement.addEventListener('input', handleFragmentPreviewChange)
  fragmentPreviewElement.addEventListener('change', handleFragmentPreviewChange)

  const sync = () =>
  {
    controls.forEach(({ key }) =>
    {
      const element = controlElements.get(key)

      if (!element)
      {
        return
      }

      element.input.value = String(config[key])
      element.output.value = formatValue(key, config[key])
    })

    corePreviewElement.value = getCorePreviewStage()
    fragmentPreviewElement.value = getFragmentPreviewStage()

    branchDefinitions.forEach(({ key }) =>
    {
      const input = visibilityElements.get(key)

      if (!input)
      {
        return
      }

      input.checked = branchVisibility[key]
    })
  }

  return {
    shell,
    panel,
    sync,
  }
}
