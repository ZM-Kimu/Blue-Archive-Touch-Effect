# Changelog

## 0.2.0

- Breaking: replaced `arcColorR/G/B` with a unified `themeColor: { r, g, b }` runtime config field.
- Unified visible recoloring across the arc, core disk, and fragment branches without bundle patching.
- Fragments now transition from a theme-tinted highlight into the shared theme color instead of hardcoded white/blue values.
- Lab UI now exposes a single theme color control instead of separate A7 RGB sliders.

## 0.1.0

- First public stable release of the attachable click FX runtime.
- Ships `createClickFx(...)` as the production browser entrypoint.
- Includes the GitHub Actions CI and Trusted Publishing release flow.

## 0.1.0-alpha.0

- First public packaging pass for the attachable click FX runtime.
- Ships `createClickFx(...)` as the production entrypoint.
- Keeps the lab/debug app in the monorepo and out of the package surface.
