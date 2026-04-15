# blue-archive-touch-effect

Attachable browser runtime for the Blue Archive-inspired click FX shader.

## Install

```bash
npm install blue-archive-touch-effect
```

## What It Does

- Attaches to any container element
- Adds a transparent overlay canvas with `pointer-events: none`
- Spawns local click burst FX without taking over the full page
- Exposes a small runtime API for spawning, config updates, resize, and cleanup

## Minimal Usage

```ts
import { createClickFx } from 'blue-archive-touch-effect'

const target = document.querySelector('#fx-root')

if (!target) {
  throw new Error('Missing target element')
}

const fx = createClickFx({ target })

target.addEventListener('pointerdown', (event) => {
  fx.spawnAtClient(event.clientX, event.clientY)
})
```

The target container should usually be `position: relative` or another non-static layout container. The runtime will attach a full-size overlay canvas inside it.

## Auto Binding

If you want the runtime to listen for pointer events itself:

```ts
import { createClickFx } from 'blue-archive-touch-effect'

const target = document.querySelector('#fx-root')

if (!target) {
  throw new Error('Missing target element')
}

const fx = createClickFx({
  target,
  autoBindPointer: true,
})
```

## Configuration

You can pass initial config and update it later:

```ts
import { createClickFx } from 'blue-archive-touch-effect'

const fx = createClickFx({
  target: document.body,
  config: {
    themeColor: { r: 0.23, g: 0.9, b: 1 },
    coreDiskColor: { r: 0x55 / 255, g: 0xBD / 255, b: 1 },
    mainArcWeight: 0.85,
    coreDiskWeight: 1,
    fragmentsWeight: 0.75,
    finalMixerMode: 'normalized',
    finalMixerGain: 1,
    fxBloomThreshold: 1,
    fxBloomIntensity: 1,
    fxBloomScatter: 0.7,
    fxTonemappingMode: 'neutral',
    angleSpanDeg: 360,
    arcRadius: 0.177,
  },
})

fx.updateConfig({
  themeColor: { r: 1, g: 0.55, b: 0.3 },
  coreDiskColor: { r: 0.2, g: 0.7, b: 1 },
  finalMixerMode: 'screen',
  finalMixerGain: 1.1,
  fxBloomIntensity: 1.4,
  fxTonemappingMode: 'aces',
  duration: 0.7,
})
```

`themeColor` drives the MainArc and Fragments branches. `coreDiskColor` is independent and controls CoreDisk directly. Update color objects as full objects:

```ts
fx.updateConfig({
  themeColor: { r: 0.4, g: 0.8, b: 1 },
  coreDiskColor: { r: 0x55 / 255, g: 0xBD / 255, b: 1 },
})
```

Partial nested updates like `themeColor: { r: 0.5 }` or `coreDiskColor: { r: 0.5 }` are not part of the supported API.

In `0.2.0`, `themeColor` replaces the older `arcColorR/G/B` public API.

Branch C keeps the existing `C1` shared transform for `CoreDisk` and `MainArc`, but final RGB composition now happens in one unified mixer:

- `mainArcWeight`
- `coreDiskWeight`
- `fragmentsWeight`
- `finalMixerMode`
- `finalMixerGain`

`finalMixerMode` supports:

- `normalized`
- `add`
- `screen`
- `max`

The filter block follows the Unity-style `Bloom + Tonemapping` model:

- `fxBloomThreshold`
- `fxBloomIntensity`
- `fxBloomScatter`
- `fxTonemappingMode`

## API

- `createClickFx({ target, config, listenTarget, pixelRatioCap, autoBindPointer })`
- `spawnAtClient(x, y)`
- `spawnAtLocal(x, y)`
- `updateConfig(partial)`
- `resize()`
- `dispose()`

## Options

- `target`: required host element for the overlay canvas
- `listenTarget`: optional element or window used for pointer listening
- `config`: optional partial runtime config
- `pixelRatioCap`: optional device-pixel-ratio cap for the renderer
- `autoBindPointer`: when `true`, the runtime adds its own `mousedown` listener

## Lifecycle Notes

- Use `spawnAtClient()` when your coordinates come from DOM pointer events
- Use `spawnAtLocal()` when you already have coordinates relative to the target container
- Call `resize()` after external layout changes if you are not relying on the built-in observer
- Call `dispose()` when removing the host element or tearing down the page/app

## Packaging

This package ships browser-ready JavaScript and bundled shader assets. Consumers do not need to configure a GLSL loader.

Published artifacts:

- `dist/index.mjs`
- `dist/index.cjs`
- `dist/index.d.ts`

## License

MIT. See [LICENSE](./LICENSE).
