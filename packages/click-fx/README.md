# blue-archive-touch-effect

Attachable browser runtime for a Blue Archive-inspired click FX renderer.

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

target.addEventListener('mousedown', (event) => {
  fx.spawnAtClient(event.clientX, event.clientY)
})
```

## Layer Model

The renderer is organized as a layered pipeline:

- `arc`: source ellipse, emitter jitter, polar warp, rotation, color
  - includes `arc.alpha.multiplier`
- `disk`: filled disk shape, scale timing, alpha timing, color
- `shards`: burst distribution, Unity `Ring (3)` size-over-life, keyed flashing alpha with time-warp controls, tinted lifetime palette
- `compositor`: shared transform timing for `arc + disk`
- `mixer`: final color mix across `arc + disk + shards`
- `postfx`: bloom and tonemapping

`arc` and `disk` share the compositor transform. `shards` stay outside that shared transform and only join at the final mixer stage.

## Configuration

Pass nested semantic config at creation time and update it later by section.

```ts
import { createClickFx } from 'blue-archive-touch-effect'

const fx = createClickFx({
  target: document.body,
  config: {
    arc: {
      color: { r: 0.23, g: 0.9, b: 1 },
      warp: { angleSpanDeg: 360, radius: 0.177 },
    },
    disk: {
      color: { r: 0x55 / 255, g: 0xBD / 255, b: 1 },
    },
    mixer: {
      mode: 'screen',
      arcWeight: 1.02,
      diskWeight: 0.75,
      shardsWeight: 1.2,
    },
    postfx: {
      bloom: {
        threshold: 0.93,
        intensity: 1.65,
        scatter: 0.7,
        tint: { r: 1, g: 1, b: 1 },
        highQualityFiltering: true,
        maxIterations: 4,
      },
      tonemapping: {
        mode: 'none',
      },
    },
  },
})

fx.updateConfig({
  arc: {
    rotation: { speedDeg: -120 },
  },
  disk: {
    alpha: { fadeStartFraction: 0.24 },
  },
  mixer: {
    shardsWeight: 0.9,
  },
})
```

`updateConfig(...)` deep-merges by section. You only need to send the parts you want to change.

`screen` is the canonical mixer default. `add` remains available when you want a brighter, punchier composite.

## PostFX Reference

`postfx` is now authored against the Unity URP-style `FXTouchBloomTonemapping` profile shape:

- `postfx.enabled`
- `postfx.alpha.bloomStrength`
- `postfx.alpha.bloomClamp`
- `postfx.bloom.enabled`
- `postfx.bloom.threshold`
- `postfx.bloom.intensity`
- `postfx.bloom.scatter`
- `postfx.bloom.clamp`
- `postfx.bloom.tint`
- `postfx.bloom.highQualityFiltering`
- `postfx.bloom.downscale`
- `postfx.bloom.maxIterations`
- `postfx.tonemapping.mode`

The renderer prefers an HDR offscreen path and falls back to an LDR approximation when the browser cannot allocate an HDR-compatible render target.

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

## Preview and Debug

The package public API stays renderer-focused. The bundled lab app adds layer-level preview/solo modes:

- `composite`
- `arc`
- `disk`
- `shards`
- `postfxOff`

These preview controls are lab/debug behavior, not part of the public runtime API.

## Packaging

This package ships browser-ready JavaScript and bundled shader assets. Consumers do not need to configure a GLSL loader.

Published artifacts:

- `dist/index.mjs`
- `dist/index.cjs`
- `dist/index.d.ts`

## License

MIT. See [LICENSE](./LICENSE).
