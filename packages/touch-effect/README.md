# blue-archive-touch-effect

Attachable browser runtime for a Blue Archive-inspired TouchEffect renderer.

## Install

```bash
npm install blue-archive-touch-effect
```

## What It Does

- Attaches to any container element
- Adds a transparent overlay canvas with `pointer-events: none`
- Triggers local click burst effects without taking over the full page
- Adds a swipe trail ribbon plus distance-emitted swipe shards on drag
- Exposes a small runtime API for spawning, config updates, resize, and cleanup

## Minimal Usage

```ts
import { createTouchEffect } from 'blue-archive-touch-effect'

const target = document.querySelector('#fx-root')

if (!target) {
  throw new Error('Missing target element')
}

const fx = createTouchEffect({ target })
```

## Layer Model

The renderer is organized as a layered pipeline:

- `arc`: source ellipse, emitter jitter, polar warp, rotation, color
  - includes `arc.alpha.multiplier`
- `disk`: filled disk shape, scale timing, alpha timing, color
- `shards`: burst distribution, Unity `Ring (3)` size-over-life, keyed flashing alpha with time-warp controls, tinted lifetime palette
- `swipe`: drag input, trail ribbon, and `Ring (4)`-style distance-emitted shard pairs
- `compositor`: shared transform timing for `arc + disk`
- `mixer`: final color mix across `arc + disk + shards`, plus trail compositing via `trailWeight`
- `postfx`: bloom and tonemapping

`arc` and `disk` share the compositor transform. `shards` stay outside that shared transform. The swipe trail is rendered as a dedicated ribbon layer and joins only at the final mixer stage.
Swipe shards use their own pointer-centered ring radius and no longer inherit click-shard distribution settings.

## Configuration

Pass nested semantic config at creation time and update it later by section.

```ts
import { createTouchEffect } from 'blue-archive-touch-effect'

const fx = createTouchEffect({
  target: document.body,
  config: {
    arc: {
      color: { r: 0x4C / 255, g: 0xA7 / 255, b: 1 },
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
      trailWeight: 1,
    },
    swipe: {
      input: {
        minPointDistance: 0,
        pointerCapture: true,
      },
      trail: {
        lifetime: 0.29,
        width: 0.008,
        minVertexDistance: 0.02,
        cornerVertices: 1,
        capVertices: 1,
        intensity: 2.2,
        startColor: { r: 0, g: 0x64 / 255, b: 1 },
        midColor: { r: 0, g: 0x64 / 255, b: 1 },
        endColor: { r: 0, g: 0x64 / 255, b: 1 },
        midTime: 0.2,
        alpha: {
          start: 1,
          mid: 1,
          end: 0,
          midTime: 0.6,
        },
      },
      shards: {
        emitPerDistance: 3,
        innerRadius: 0,
        outerRadius: 0.02,
        speedMin: 0.02,
        speedMax: 0.08,
        lifetimeMin: 0.2,
        lifetimeMax: 0.44,
        sizeMin: 0.2,
        sizeMax: 0.32,
      },
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

- `createTouchEffect({ target, config, listenTarget, pixelRatioCap, autoBindPointer })`
- `triggerClickAtClient(x, y)`
- `triggerClickAtLocal(x, y)`
- `beginTrailAtClient(pointerId, x, y)`
- `appendTrailAtClient(pointerId, x, y)`
- `beginTrailAtLocal(pointerId, x, y)`
- `appendTrailAtLocal(pointerId, x, y)`
- `endTrail(pointerId)`
- `endAllTrails()`
- `updateConfig(partial)`
- `resize()`
- `dispose()`

## Options

- `target`: required host element for the overlay canvas
- `listenTarget`: optional element or window used for pointer listening
- `config`: optional partial runtime config
- `pixelRatioCap`: optional device-pixel-ratio cap for the renderer
- `autoBindPointer`: when `true`, the runtime adds its own pointer listeners for click + swipe

## Manual Triggering

Set `autoBindPointer: false` when your application owns the input lifecycle. Click bursts and trails can then be scheduled independently.

```ts
const fx = createTouchEffect({
  target,
  autoBindPointer: false,
})

target.addEventListener('pointerdown', (event) => {
  fx.triggerClickAtClient(event.clientX, event.clientY)
  fx.beginTrailAtClient(event.pointerId, event.clientX, event.clientY)
})

target.addEventListener('pointermove', (event) => {
  if (event.buttons > 0 || event.pointerType === 'touch') {
    fx.appendTrailAtClient(event.pointerId, event.clientX, event.clientY)
  } else {
    fx.endTrail(event.pointerId)
  }
})

target.addEventListener('pointerup', (event) => {
  fx.endTrail(event.pointerId)
})

window.addEventListener('blur', () => {
  fx.endAllTrails()
})
```

Client-coordinate trail methods convert from viewport coordinates into the target element. Local-coordinate methods accept CSS pixels relative to the target's top-left corner. `appendTrail...` returns `false` when no active trail point was appended, for example because the trail is disabled or the movement was below the configured minimum distance.

## Preview and Debug

The package public API stays renderer-focused. The bundled lab app adds layer-level preview/solo modes:

- `composite`
- `arc`
- `disk`
- `shards`
- `trail`
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
