import {
  branchDefinitions,
  controls,
  corePreviewOptions,
  featuredControlKeys,
  featuredSelectKeys,
  fragmentPreviewOptions,
  formatValue,
  isCorePreviewStage,
  isFragmentPreviewStage,
  isMainArcPreviewStage,
  mainArcPreviewOptions,
  selectControls,
  stageDefinitions,
} from './lab-config'
import type {
  BranchKey,
  BranchVisibility,
  CorePreviewStage,
  FragmentPreviewStage,
  LabAppearanceState,
  MainArcPreviewStage,
  NumericRuntimeKey,
  SelectRuntimeKey,
} from './types'
import type { RuntimeConfig } from 'blue-archive-touch-effect'

type DebugPanelOptions = {
  app: HTMLDivElement
  config: RuntimeConfig
  branchVisibility: BranchVisibility
  getMainArcPreviewStage: () => MainArcPreviewStage
  getCorePreviewStage: () => CorePreviewStage
  getFragmentPreviewStage: () => FragmentPreviewStage
  getThemeColor: () => RuntimeConfig['themeColor']
  getCoreDiskColor: () => RuntimeConfig['coreDiskColor']
  getBackgroundColor: () => LabAppearanceState['backgroundColor']
  onControlChange: (key: NumericRuntimeKey, value: number) => void
  onSelectChange: (key: SelectRuntimeKey, value: RuntimeConfig[SelectRuntimeKey]) => void
  onVisibilityChange: (key: BranchKey, value: boolean) => void
  onMainArcPreviewChange: (value: MainArcPreviewStage) => void
  onCorePreviewChange: (value: CorePreviewStage) => void
  onFragmentPreviewChange: (value: FragmentPreviewStage) => void
  onThemeColorChange: (value: RuntimeConfig['themeColor']) => void
  onCoreDiskColorChange: (value: RuntimeConfig['coreDiskColor']) => void
  onBackgroundColorChange: (value: LabAppearanceState['backgroundColor']) => void
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
  getMainArcPreviewStage,
  getCorePreviewStage,
  getFragmentPreviewStage,
  getThemeColor,
  getCoreDiskColor,
  getBackgroundColor,
  onControlChange,
  onSelectChange,
  onVisibilityChange,
  onMainArcPreviewChange,
  onCorePreviewChange,
  onFragmentPreviewChange,
  onThemeColorChange,
  onCoreDiskColorChange,
  onBackgroundColorChange,
}: DebugPanelOptions): DebugPanelController =>
{
  const featuredControlKeySet = new Set(featuredControlKeys)
  const featuredSelectKeySet = new Set(featuredSelectKeys)
  let activeBranchKey: BranchKey = branchDefinitions[0].key

  const toHexChannel = (value: number) =>
    Math.round(Math.min(1, Math.max(0, value)) * 255)
      .toString(16)
      .padStart(2, '0')

  const themeColorToHex = (themeColor: RuntimeConfig['themeColor']) =>
    `#${toHexChannel(themeColor.r)}${toHexChannel(themeColor.g)}${toHexChannel(themeColor.b)}`

  const coreDiskColorToHex = (coreDiskColor: RuntimeConfig['coreDiskColor']) =>
    `#${toHexChannel(coreDiskColor.r)}${toHexChannel(coreDiskColor.g)}${toHexChannel(coreDiskColor.b)}`

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

  const createSelectMarkup = ({ key, label, options }: (typeof selectControls)[number]) => `
    <label class="debug-select">
      <span>${label}</span>
      <select data-select-field="${key}">
        ${options.map((option) => `<option value="${option.value}" ${config[key] === option.value ? 'selected' : ''}>${option.label}</option>`).join('')}
      </select>
    </label>
  `

  const createCoreDiskColorMarkup = () => `
    <label class="debug-color">
      <span>CoreDisk Color</span>
      <input data-core-disk-color type="color" value="${coreDiskColorToHex(getCoreDiskColor())}" />
    </label>
  `

  const createStageMarkup = (
    { key, title, subtitle }: (typeof stageDefinitions)[number],
    stageControls: (typeof controls),
    stageSelects: (typeof selectControls),
  ) => `
    <section class="debug-stage">
      <div class="debug-stage__header">
        <strong>${title}</strong>
        <span>${subtitle}</span>
      </div>
      <div class="debug-stage__controls">
        ${key === 'bBase' ? createCoreDiskColorMarkup() : ''}
        ${stageControls.map(createControlMarkup).join('')}
        ${stageSelects.map(createSelectMarkup).join('')}
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

  const createMainArcPreviewMarkup = () => `
    <label class="debug-preview">
      <span>Preview</span>
      <select data-main-arc-preview>
        ${mainArcPreviewOptions
          .map(({ key, label }) => `<option value="${key}" ${getMainArcPreviewStage() === key ? 'selected' : ''}>${label}</option>`)
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

  const createQuickSectionMarkup = (title: string, subtitle: string, body: string) => `
    <section class="debug-live__section">
      <div class="debug-live__header">
        <strong>${title}</strong>
        <span>${subtitle}</span>
      </div>
      <div class="debug-live__body">
        ${body}
      </div>
    </section>
  `

  const featuredControls = controls.filter((control) => featuredControlKeySet.has(control.key))
  const featuredSelects = selectControls.filter((control) => featuredSelectKeySet.has(control.key))

  const createBranchTabMarkup = ({ key, title }: (typeof branchDefinitions)[number]) => `
    <button
      class="debug-tab"
      type="button"
      data-branch-tab="${key}"
      data-active="${key === activeBranchKey ? 'true' : 'false'}"
    >
      ${title}
    </button>
  `

  const createBranchMarkup = ({ key, title, subtitle }: (typeof branchDefinitions)[number]) => `
    <section class="debug-branch" data-branch-panel="${key}" data-active="${key === activeBranchKey ? 'true' : 'false'}">
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
        ${(() =>
        {
          const branchStages = stageDefinitions.filter((stage) => stage.branch === key)
          const visibleStages = branchStages
            .map((stage) =>
            {
              const stageControls = controls.filter((control) => control.stage === stage.key && !featuredControlKeySet.has(control.key))
              const stageSelects = selectControls.filter((control) => control.stage === stage.key && !featuredSelectKeySet.has(control.key))
              return { stage, stageControls, stageSelects }
            })
            .filter(({ stageControls, stageSelects }) => stageControls.length > 0 || stageSelects.length > 0)

          const stageGroups = visibleStages.reduce<Array<{ section: string; stages: typeof visibleStages }>>((groups, entry) =>
          {
            const currentGroup = groups[groups.length - 1]

            if (!currentGroup || currentGroup.section !== entry.stage.section)
            {
              groups.push({ section: entry.stage.section, stages: [entry] })
              return groups
            }

            currentGroup.stages.push(entry)
            return groups
          }, [])

          return stageGroups.map(({ section, stages }) => `
            <section class="debug-stage-group">
              <div class="debug-stage-group__header">${section}</div>
              <div class="debug-stage-group__body">
                ${stages.map(({ stage, stageControls, stageSelects }) => createStageMarkup(stage, stageControls, stageSelects)).join('')}
              </div>
            </section>
          `).join('')
        })()}
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
      <span>Live output controls first, source shaping below.</span>
    </div>
    <div class="debug-live">
      ${createQuickSectionMarkup(
        'Scene',
        'Global look and lab-only background.',
        `
          <label class="debug-color">
            <span>Theme Color</span>
            <input data-theme-color type="color" value="${themeColorToHex(getThemeColor())}" />
          </label>
          <label class="debug-color">
            <span>BG Color</span>
            <input data-bg-color type="color" value="${getBackgroundColor()}" />
          </label>
        `,
      )}
      ${createQuickSectionMarkup(
        'Preview',
        'Pick which MainArc, CoreDisk, and Fragment stages feed the live output.',
        `
          ${createMainArcPreviewMarkup()}
          ${createCorePreviewMarkup()}
          ${createFragmentPreviewMarkup()}
        `,
      )}
      ${createQuickSectionMarkup(
        'Output',
        'Immediate whole-effect transforms and post-process profile.',
        `
          ${featuredControls.map(createControlMarkup).join('')}
          ${featuredSelects.map(createSelectMarkup).join('')}
        `,
      )}
    </div>
    <div class="debug-tabs" role="tablist" aria-label="Branch controls">
      ${branchDefinitions.map(createBranchTabMarkup).join('')}
    </div>
    <div class="debug-branches">
      ${branchDefinitions.map(createBranchMarkup).join('')}
    </div>
    <p class="debug-hint">Live controls update active effects immediately. Source, timing, and particle generation controls apply on the next click.</p>
  `

  shell.appendChild(panel)
  app.appendChild(shell)

  const controlElements = new Map<keyof RuntimeConfig, { input: HTMLInputElement; output: HTMLOutputElement }>()
  const selectElements = new Map<SelectRuntimeKey, HTMLSelectElement>()
  const visibilityElements = new Map<BranchKey, HTMLInputElement>()
  const tabElements = new Map<BranchKey, HTMLButtonElement>()
  const branchPanelElements = new Map<BranchKey, HTMLElement>()
  const mainArcPreviewElement = panel.querySelector<HTMLSelectElement>('select[data-main-arc-preview]')
  const corePreviewElement = panel.querySelector<HTMLSelectElement>('select[data-core-preview]')
  const fragmentPreviewElement = panel.querySelector<HTMLSelectElement>('select[data-fragment-preview]')
  const themeColorElement = panel.querySelector<HTMLInputElement>('input[data-theme-color]')
  const coreDiskColorElement = panel.querySelector<HTMLInputElement>('input[data-core-disk-color]')
  const backgroundColorElement = panel.querySelector<HTMLInputElement>('input[data-bg-color]')

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

  selectControls.forEach((control) =>
  {
    const select = panel.querySelector<HTMLSelectElement>(`select[data-select-field="${control.key}"]`)

    if (!select)
    {
      throw new Error(`Missing select control for ${control.key}`)
    }

    selectElements.set(control.key, select)

    const handleSelect = () =>
    {
      onSelectChange(control.key, select.value as RuntimeConfig[SelectRuntimeKey])
    }

    select.addEventListener('input', handleSelect)
    select.addEventListener('change', handleSelect)
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

  branchDefinitions.forEach(({ key }) =>
  {
    const tab = panel.querySelector<HTMLButtonElement>(`button[data-branch-tab="${key}"]`)
    const branchPanel = panel.querySelector<HTMLElement>(`[data-branch-panel="${key}"]`)

    if (!tab || !branchPanel)
    {
      throw new Error(`Missing branch tab or panel for ${key}`)
    }

    tabElements.set(key, tab)
    branchPanelElements.set(key, branchPanel)

    const handleTabClick = () =>
    {
      activeBranchKey = key
      sync()
    }

    tab.addEventListener('click', handleTabClick)
  })

  if (!mainArcPreviewElement)
  {
    throw new Error('Missing main arc preview selector')
  }

  if (!corePreviewElement)
  {
    throw new Error('Missing core preview selector')
  }

  if (!fragmentPreviewElement)
  {
    throw new Error('Missing fragment preview selector')
  }

  if (!themeColorElement)
  {
    throw new Error('Missing theme color control')
  }

  if (!coreDiskColorElement)
  {
    throw new Error('Missing core disk color control')
  }

  if (!backgroundColorElement)
  {
    throw new Error('Missing background color control')
  }

  const handleMainArcPreviewChange = () =>
  {
    if (isMainArcPreviewStage(mainArcPreviewElement.value))
    {
      onMainArcPreviewChange(mainArcPreviewElement.value)
    }
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

  mainArcPreviewElement.addEventListener('input', handleMainArcPreviewChange)
  mainArcPreviewElement.addEventListener('change', handleMainArcPreviewChange)
  corePreviewElement.addEventListener('input', handleCorePreviewChange)
  corePreviewElement.addEventListener('change', handleCorePreviewChange)
  fragmentPreviewElement.addEventListener('input', handleFragmentPreviewChange)
  fragmentPreviewElement.addEventListener('change', handleFragmentPreviewChange)
  const handleThemeColorChange = () =>
  {
    const hex = themeColorElement.value
    const parseChannel = (start: number) => Number.parseInt(hex.slice(start, start + 2), 16) / 255
    onThemeColorChange({
      r: parseChannel(1),
      g: parseChannel(3),
      b: parseChannel(5),
    })
  }
  const handleCoreDiskColorChange = () =>
  {
    const hex = coreDiskColorElement.value
    const parseChannel = (start: number) => Number.parseInt(hex.slice(start, start + 2), 16) / 255
    onCoreDiskColorChange({
      r: parseChannel(1),
      g: parseChannel(3),
      b: parseChannel(5),
    })
  }
  themeColorElement.addEventListener('input', handleThemeColorChange)
  themeColorElement.addEventListener('change', handleThemeColorChange)
  coreDiskColorElement.addEventListener('input', handleCoreDiskColorChange)
  coreDiskColorElement.addEventListener('change', handleCoreDiskColorChange)
  backgroundColorElement.addEventListener('input', () => onBackgroundColorChange(backgroundColorElement.value))
  backgroundColorElement.addEventListener('change', () => onBackgroundColorChange(backgroundColorElement.value))

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

    selectControls.forEach(({ key }) =>
    {
      const element = selectElements.get(key)

      if (!element)
      {
        return
      }

      element.value = String(config[key])
    })

    mainArcPreviewElement.value = getMainArcPreviewStage()
    corePreviewElement.value = getCorePreviewStage()
    fragmentPreviewElement.value = getFragmentPreviewStage()
    themeColorElement.value = themeColorToHex(getThemeColor())
    coreDiskColorElement.value = coreDiskColorToHex(getCoreDiskColor())
    backgroundColorElement.value = getBackgroundColor()

    branchDefinitions.forEach(({ key }) =>
    {
      const input = visibilityElements.get(key)
      const tab = tabElements.get(key)
      const branchPanel = branchPanelElements.get(key)

      if (!input)
      {
        return
      }

      input.checked = branchVisibility[key]

      if (tab)
      {
        tab.dataset.active = key === activeBranchKey ? 'true' : 'false'
      }

      if (branchPanel)
      {
        branchPanel.dataset.active = key === activeBranchKey ? 'true' : 'false'
      }
    })
  }

  return {
    shell,
    panel,
    sync,
  }
}
