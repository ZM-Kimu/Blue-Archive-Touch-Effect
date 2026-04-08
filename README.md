# blue-archive-touch-effect

Monorepo for the publishable click FX runtime and its local lab app.

## Workspace Layout

- `packages/click-fx`: npm package source and build output
- `apps/lab`: Vite demo app with debug controls

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

## GitHub Actions Publishing

The repository includes two workflows under `.github/workflows`:

- `ci.yml`: installs dependencies, builds the workspace, and verifies `npm pack -w packages/click-fx`
- `publish.yml`: publishes the npm package through npm Trusted Publishing

The publish workflow is configured for GitHub Actions OIDC:

- trigger by pushing a version tag like `v0.1.0`
- or run it manually with `workflow_dispatch`
- it verifies the tag version matches `packages/click-fx/package.json`
- it picks the npm dist-tag automatically:
  - `alpha` for `*-alpha.*`
  - `beta` for `*-beta.*`
  - `latest` otherwise
- it verifies the matching version section exists in `packages/click-fx/CHANGELOG.md`
- on tag publishes, it also creates a GitHub Release using that changelog section
- it publishes with npm provenance enabled

With Trusted Publishing connected on npm, no `NPM_TOKEN` secret is required.

Useful local commands before tagging:

```bash
npm run verify
```

## License

This project is released under the MIT License. See [LICENSE](/c:/Users/Win10/Desktop/ba_click_effect/LICENSE).
