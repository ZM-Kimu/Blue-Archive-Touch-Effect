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
    fxBlurRadius: 1.85,
    fxBloomIntensity: 1.48,
    angleSpanDeg: 360,
    arcRadius: 0.177,
  },
})

fx.updateConfig({
  themeColor: { r: 1, g: 0.55, b: 0.3 },
  fxScreenMix: 1,
  duration: 0.7,
})
```

`themeColor` is the unified visible color for the arc, core disk, and fragment branches. Update it as a full object:

```ts
fx.updateConfig({
  themeColor: { r: 0.4, g: 0.8, b: 1 },
})
```

Partial nested updates like `themeColor: { r: 0.5 }` are not part of the supported API.

In `0.2.0`, `themeColor` replaces the older `arcColorR/G/B` public API.

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
