# blue-archive-touch-effect

Monorepo for the publishable click FX runtime and its local lab app.

## Workspace Layout

- `packages/click-fx`: npm package source and build output
- `apps/lab`: Vite demo app with debug controls
- `src/legacy`: archived monolithic prototype, not part of the published package

## Quick Start

```bash
npm install
npm run build
npm run dev
```

`npm run dev` builds the package first, then starts the lab app.

## Using The Package

The public runtime is published from `packages/click-fx` and exposes `createClickFx(...)`:

```ts
import { createClickFx } from 'blue-archive-touch-effect'

const host = document.querySelector('#fx-root')

if (!host) {
  throw new Error('Missing host element')
}

const fx = createClickFx({ target: host })
```

The runtime attaches a transparent overlay canvas to the target container and renders local burst regions only.

## Public API

- `createClickFx({ target, listenTarget, config, pixelRatioCap, autoBindPointer })`
- `spawnAtClient(clientX, clientY)`
- `spawnAtLocal(x, y)`
- `updateConfig(partial)`
- `resize()`
- `dispose()`

## Development

- Build everything: `npm run build`
- Start the lab app: `npm run dev`
- Pack the npm package locally: `npm pack -w packages/click-fx`

## Publishing Notes

- Package name: `blue-archive-touch-effect`
- Package entry: [packages/click-fx/src/index.ts](/c:/Users/Win10/Desktop/ba_click_effect/packages/click-fx/src/index.ts)
- Package metadata: [packages/click-fx/package.json](/c:/Users/Win10/Desktop/ba_click_effect/packages/click-fx/package.json)
- The published package includes only `dist`, `README.md`, `CHANGELOG.md`, and `LICENSE`

## License

This project is released under the MIT License. See [LICENSE](/c:/Users/Win10/Desktop/ba_click_effect/LICENSE).
