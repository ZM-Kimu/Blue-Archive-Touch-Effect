<div align="center">

# Blue Archive Cursor Touch Effect

[English](./README.md) | [中文](./README.zh-CN.md)

<br />

<img src="./docs/assets/cursor-demo.gif" alt="Cursor touch effect demo" width="720" />

Just a simple shader effect for Web Canvas.

</div>



## Quick Start

Install dependencies and start the test page:

```bash
npm install
npm run dev
```

Build the project:

```bash
npm run build
```

## Use The NPM Package

```bash
npm install blue-archive-touch-effect
```

```ts
import { createTouchEffect } from 'blue-archive-touch-effect'

const target = document.querySelector<HTMLElement>('#fx-root')

if (!target) {
  throw new Error('Missing target element')
}

const fx = createTouchEffect({ target })
```

The runtime appends an overlay canvas to `target`. If the target is statically positioned, the runtime temporarily sets it to `position: relative` and restores it on `dispose()`.

## Runtime API

```ts
const fx = createTouchEffect({
  target,
  listenTarget,
  config,
  pixelRatioCap,
  autoBindPointer,
})

fx.triggerClickAtClient(clientX, clientY)
fx.triggerClickAtLocal(x, y)
fx.beginTrailAtClient(pointerId, clientX, clientY)
fx.appendTrailAtClient(pointerId, clientX, clientY)
fx.beginTrailAtLocal(pointerId, x, y)
fx.appendTrailAtLocal(pointerId, x, y)
fx.endTrail(pointerId)
fx.endAllTrails()
fx.updateConfig(partialConfig)
fx.resize()
fx.dispose()
```

### Options

- `target`: required host element for the overlay canvas.
- `listenTarget`: optional element or `window` used for pointer input.
- `config`: optional TouchEffect config patch.
- `pixelRatioCap`: optional device-pixel-ratio cap, default `2`.
- `autoBindPointer`: when `true`, the runtime automatically binds click and swipe pointer events.

### Manual Triggering

By default, the runtime owns pointer input. Set `autoBindPointer: false` if your app wants to decide exactly when click bursts or trails begin, move, and end.

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

## Configuration Example

```ts
fx.updateConfig({
  arc: {
    color: { r: 0x4C / 255, g: 0xA7 / 255, b: 1 },
  },
  swipe: {
    trail: {
      minVertexDistance: 0.02,
      startColor: { r: 0, g: 0x64 / 255, b: 1 },
      midColor: { r: 0, g: 0x64 / 255, b: 1 },
      endColor: { r: 0, g: 0x64 / 255, b: 1 },
      alpha: {
        start: 1,
        mid: 1,
        end: 0,
        midTime: 0.6,
      },
    },
  },
  mixer: {
    mode: 'screen',
    trailWeight: 1,
  },
  postfx: {
    bloom: {
      enabled: true,
      threshold: 0.93,
      intensity: 1.65,
    },
  },
})
```

`updateConfig(...)` deep-merges by section, so callers only need to pass the fields they want to change.

## References

- Click effect reference: [Blue Archive touch fx process](https://www.youtube.com/watch?v=Ho7BbVUr71Q).
- Trail effect reference: actual game decompiled content.

## License

This project uses the MIT License. See [LICENSE](./LICENSE).
