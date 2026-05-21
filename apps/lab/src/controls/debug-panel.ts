import {
  colorControls,
  formatNumber,
  numericControls,
  panelDefinitions,
  previewOptions,
  selectControls,
} from '../config/defaults'
import type {
  ColorControlDefinition,
  ConfigPath,
  LabAppearanceState,
  NumericControlDefinition,
  PanelKey,
  SelectControlDefinition,
} from '../config/types'
import type {
  ColorRgb,
  LayerPreviewMode,
  TouchEffectConfig,
} from 'blue-archive-touch-effect'

type DebugPanelOptions = {
  app: HTMLDivElement
  config: TouchEffectConfig
  getPreviewMode: () => LayerPreviewMode
  getBackgroundColor: () => LabAppearanceState['backgroundColor']
  readPath: (path: ConfigPath) => unknown
  onNumberChange: (path: ConfigPath, value: number) => void
  onSelectChange: (path: ConfigPath, value: string | number | boolean) => void
  onColorChange: (path: ConfigPath, value: ColorRgb) => void
  onPreviewModeChange: (value: LayerPreviewMode) => void
  onBackgroundColorChange: (value: LabAppearanceState['backgroundColor']) => void
}

export type DebugPanelController = {
  shell: HTMLElement
  panel: HTMLElement
  sync: () => void
}

const toHexChannel = (value: number) =>
  Math.round(Math.min(1, Math.max(0, value)) * 255)
    .toString(16)
    .padStart(2, '0')

const colorToHex = (color: ColorRgb) =>
  `#${toHexChannel(color.r)}${toHexChannel(color.g)}${toHexChannel(color.b)}`

export const createDebugPanel = ({
  app,
  config,
  getPreviewMode,
  getBackgroundColor,
  readPath,
  onNumberChange,
  onSelectChange,
  onColorChange,
  onPreviewModeChange,
  onBackgroundColorChange,
}: DebugPanelOptions): DebugPanelController =>
{
  let activePanelKey: PanelKey = panelDefinitions[0].key

  const createNumericControlMarkup = ({ path, label, min, max, step }: NumericControlDefinition) => `
    <label class="debug-control">
      <span>${label}</span>
      <input data-number-path="${path}" type="range" min="${min}" max="${max}" step="${step}" value="${String(readPath(path))}" />
      <output data-number-output="${path}">${formatNumber(path, Number(readPath(path)))}</output>
    </label>
  `

  const createSelectControlMarkup = ({ path, label, options }: SelectControlDefinition) => `
    <label class="debug-select">
      <span>${label}</span>
      <select data-select-path="${path}">
        ${options.map((option, index) => `<option value="${index}" ${readPath(path) === option.value ? 'selected' : ''}>${option.label}</option>`).join('')}
      </select>
    </label>
  `

  const createColorControlMarkup = ({ path, label }: ColorControlDefinition) => `
    <label class="debug-color">
      <span>${label}</span>
      <input data-color-path="${path}" type="color" value="${colorToHex(readPath(path) as ColorRgb)}" />
    </label>
  `

  const groupMarkup = (panel: PanelKey, group: string) =>
  {
    const groupNumeric = numericControls.filter((control) => control.panel === panel && control.group === group)
    const groupSelects = selectControls.filter((control) => control.panel === panel && control.group === group)
    const groupColors = colorControls.filter((control) => control.panel === panel && control.group === group)

    return `
      <section class="debug-stage-group">
        <div class="debug-stage-group__header">${group}</div>
        <div class="debug-stage-group__body">
          ${groupColors.map(createColorControlMarkup).join('')}
          ${groupSelects.map(createSelectControlMarkup).join('')}
          ${groupNumeric.map(createNumericControlMarkup).join('')}
        </div>
      </section>
    `
  }

  const createPanelMarkup = (panel: (typeof panelDefinitions)[number]) =>
  {
    const groups = new Set<string>()
    numericControls.forEach((control) =>
    {
      if (control.panel === panel.key)
      {
        groups.add(control.group)
      }
    })
    selectControls.forEach((control) =>
    {
      if (control.panel === panel.key)
      {
        groups.add(control.group)
      }
    })
    colorControls.forEach((control) =>
    {
      if (control.panel === panel.key)
      {
        groups.add(control.group)
      }
    })

    return `
      <section class="debug-branch" data-panel="${panel.key}" data-active="${panel.key === activePanelKey ? 'true' : 'false'}">
        <div class="debug-branch__header">
          <div class="debug-branch__copy">
            <strong>${panel.title}</strong>
            <span>${panel.subtitle}</span>
          </div>
        </div>
        <div class="debug-branch__controls">
          ${Array.from(groups).map((group) => groupMarkup(panel.key, group)).join('')}
        </div>
      </section>
    `
  }

  const shell = document.createElement('main')
  shell.className = 'app-shell'

  const panel = document.createElement('aside')
  panel.className = 'debug-panel'
  panel.innerHTML = `
    <div class="debug-panel__header">
      <strong>Click FX VNext</strong>
      <span>Layer-driven controls for arc, disk, shards, swipe trail, compositor, mixer, and postfx.</span>
    </div>
    <div class="debug-live">
      <section class="debug-live__section">
        <div class="debug-live__header">
          <strong>Preview</strong>
          <span>Solo a layer or inspect the composite. Trail isolates the swipe ribbon. PostFX Off bypasses the filter pass.</span>
        </div>
        <div class="debug-live__body">
          <label class="debug-select">
            <span>Mode</span>
            <select data-preview-mode>
              ${previewOptions.map((option) => `<option value="${option.value}" ${getPreviewMode() === option.value ? 'selected' : ''}>${option.label}</option>`).join('')}
            </select>
          </label>
        </div>
      </section>
      <section class="debug-live__section">
        <div class="debug-live__header">
          <strong>Lab</strong>
          <span>Only affects the lab page background.</span>
        </div>
        <div class="debug-live__body">
          <label class="debug-color">
            <span>Background</span>
            <input data-background-color type="color" value="${getBackgroundColor()}" />
          </label>
        </div>
      </section>
    </div>
    <div class="debug-tabs" role="tablist" aria-label="VNext panels">
      ${panelDefinitions.map((entry) => `
        <button
          class="debug-tab"
          type="button"
          data-panel-tab="${entry.key}"
          data-active="${entry.key === activePanelKey ? 'true' : 'false'}"
        >
          ${entry.title}
        </button>
      `).join('')}
    </div>
    <div class="debug-branches">
      ${panelDefinitions.map(createPanelMarkup).join('')}
    </div>
    <p class="debug-hint">Nested runtime config updates apply by section. Generator-heavy controls still mostly affect the next click.</p>
  `

  shell.appendChild(panel)
  app.appendChild(shell)

  const numericElements = new Map<ConfigPath, { input: HTMLInputElement; output: HTMLOutputElement }>()
  const selectElements = new Map<ConfigPath, HTMLSelectElement>()
  const colorElements = new Map<ConfigPath, HTMLInputElement>()
  const panelTabElements = new Map<PanelKey, HTMLButtonElement>()
  const panelElements = new Map<PanelKey, HTMLElement>()
  const previewModeElement = panel.querySelector<HTMLSelectElement>('select[data-preview-mode]')
  const backgroundColorElement = panel.querySelector<HTMLInputElement>('input[data-background-color]')

  numericControls.forEach((control) =>
  {
    const input = panel.querySelector<HTMLInputElement>(`input[data-number-path="${control.path}"]`)
    const output = panel.querySelector<HTMLOutputElement>(`output[data-number-output="${control.path}"]`)

    if (!input || !output)
    {
      throw new Error(`Missing numeric control for ${control.path}`)
    }

    numericElements.set(control.path, { input, output })
    const handleInput = () => onNumberChange(control.path, Number(input.value))
    input.addEventListener('input', handleInput)
    input.addEventListener('change', handleInput)
  })

  selectControls.forEach((control) =>
  {
    const element = panel.querySelector<HTMLSelectElement>(`select[data-select-path="${control.path}"]`)
    if (!element)
    {
      throw new Error(`Missing select control for ${control.path}`)
    }

    selectElements.set(control.path, element)
    const handleSelect = () =>
    {
      const optionIndex = Number(element.value)
      const selectedOption = control.options[optionIndex]
      if (!selectedOption)
      {
        return
      }

      onSelectChange(control.path, selectedOption.value)
    }
    element.addEventListener('input', handleSelect)
    element.addEventListener('change', handleSelect)
  })

  colorControls.forEach((control) =>
  {
    const element = panel.querySelector<HTMLInputElement>(`input[data-color-path="${control.path}"]`)
    if (!element)
    {
      throw new Error(`Missing color control for ${control.path}`)
    }

    colorElements.set(control.path, element)
    const handleColor = () =>
    {
      const hex = element.value
      const parseChannel = (start: number) => Number.parseInt(hex.slice(start, start + 2), 16) / 255
      onColorChange(control.path, {
        r: parseChannel(1),
        g: parseChannel(3),
        b: parseChannel(5),
      })
    }
    element.addEventListener('input', handleColor)
    element.addEventListener('change', handleColor)
  })

  panelDefinitions.forEach(({ key }) =>
  {
    const tab = panel.querySelector<HTMLButtonElement>(`button[data-panel-tab="${key}"]`)
    const section = panel.querySelector<HTMLElement>(`[data-panel="${key}"]`)

    if (!tab || !section)
    {
      throw new Error(`Missing panel elements for ${key}`)
    }

    panelTabElements.set(key, tab)
    panelElements.set(key, section)

    tab.addEventListener('click', () =>
    {
      activePanelKey = key
      sync()
    })
  })

  if (!previewModeElement || !backgroundColorElement)
  {
    throw new Error('Missing live controls')
  }

  const handlePreviewChange = () =>
  {
    const next = previewModeElement.value as LayerPreviewMode
    onPreviewModeChange(next)
  }

  previewModeElement.addEventListener('input', handlePreviewChange)
  previewModeElement.addEventListener('change', handlePreviewChange)
  backgroundColorElement.addEventListener('input', () => onBackgroundColorChange(backgroundColorElement.value))
  backgroundColorElement.addEventListener('change', () => onBackgroundColorChange(backgroundColorElement.value))

  const sync = () =>
  {
    numericControls.forEach(({ path }) =>
    {
      const element = numericElements.get(path)
      const value = Number(readPath(path))
      if (!element)
      {
        return
      }

      element.input.value = String(value)
      element.output.value = formatNumber(path, value)
    })

    selectControls.forEach(({ path }) =>
    {
      const element = selectElements.get(path)
      if (element)
      {
        const currentValue = readPath(path)
        const control = selectControls.find((entry) => entry.path === path)
        const optionIndex = control?.options.findIndex((option) => option.value === currentValue) ?? -1
        element.value = optionIndex >= 0 ? String(optionIndex) : '0'
      }
    })

    colorControls.forEach(({ path }) =>
    {
      const element = colorElements.get(path)
      if (element)
      {
        element.value = colorToHex(readPath(path) as ColorRgb)
      }
    })

    previewModeElement.value = getPreviewMode()
    backgroundColorElement.value = getBackgroundColor()

    panelDefinitions.forEach(({ key }) =>
    {
      const tab = panelTabElements.get(key)
      const section = panelElements.get(key)
      if (tab)
      {
        tab.dataset.active = key === activePanelKey ? 'true' : 'false'
      }
      if (section)
      {
        section.dataset.active = key === activePanelKey ? 'true' : 'false'
      }
    })
  }

  return {
    shell,
    panel,
    sync,
  }
}
