# Click FX VNext Design

This document describes the current vNext renderer, not the historical branch-stage graph.

## 1. Canonical Pipeline

```text
Click
  -> BurstState
  -> Arc emitter
  -> Disk emitter
  -> Shared compositor (arc + disk only)
  -> Shards emitter
  -> Swipe trail layer
  -> Final mixer
  -> PostFX
```

The vNext mental model is layer-based:

- `arc`
- `disk`
- `shards`
- `swipe`
- `compositor`
- `mixer`
- `postfx`

## 2. Timing Contract

The renderer preserves the previous visual rhythm at a high level:

- disk appears first
- arc follows the disk handoff timing
- arc and disk share a compositor transform
- shards stay outside the shared transform
- swipe trail starts on the same press as click and builds on movement
- swipe shard pairs emit by traveled distance, not time
- postfx runs after the final mixed color result

## 3. Layer Responsibilities

### Arc

The arc layer owns:

- ellipse source shape
- source motion
- emitter randomization and count
- polar warp
- rotation
- final arc color
- arc alpha multiplier

Public config section:

```text
arc.source
arc.motion
arc.emitter
arc.warp
arc.rotation
arc.alpha
arc.color
```

### Disk

The disk layer owns:

- filled circle silhouette
- disk softness
- scale timing
- alpha timing
- disk color

Public config section:

```text
disk.shape
disk.scale
disk.alpha
disk.color
```

### Shards

The shards layer owns:

- triangle sprite shape
- donut-like spawn distribution
- burst count / speed / lifetime / size
- scale over life with a fast rise and full-life falloff
- init scale
- keyed flashing alpha based on the Unity `Ring (3)` lifetime pattern, with time-warp bounds
- Unity-style lifetime palette with optional tint and peak boost

Public config section:

```text
shards.shape
shards.distribution
shards.burst
shards.scaleOverLife
shards.initScale
shards.alpha
shards.color
```

### Swipe

The swipe subsystem owns:

- pointer-driven stroke capture
- a dedicated ribbon trail layer inspired by Unity `TrailRenderer`
- independent trail RGB and alpha gradients
- distance-emitted shard pairs inspired by Unity `Ring (4)`
- a swipe-specific pointer-centered shard ring radius independent from click-shard distribution

Public config section:

```text
swipe.enabled
swipe.input
swipe.trail
swipe.shards
```

### Compositor

The compositor does not perform early RGB color mixing.

It owns:

- shared scale timing for arc + disk
- handoff timing from disk into arc
- overall effect scale

Public config section:

```text
compositor.sharedScale
compositor.handoff
compositor.effectScale
```

## 4. Final Mixer

The final mixer is the only place where colored layers are combined.

```text
FinalColor = mix(
  ArcColorAfterCompositor,
  DiskColorAfterCompositor,
  ShardsColor,
  TrailColor,
  mixer
)
```

Public config section:

```text
mixer.arcWeight
mixer.diskWeight
mixer.shardsWeight
mixer.trailWeight
mixer.mode
mixer.gain
```

Supported mixer modes:

- `add`
- `screen`
- `max`

## 5. PostFX

The post-process pass runs after the final mixer:

```text
FinalColor -> bloom -> tonemapping -> output
```

Public config section:

```text
postfx.enabled
postfx.alpha.bloomStrength
postfx.alpha.bloomClamp
postfx.bloom.enabled
postfx.bloom.threshold
postfx.bloom.intensity
postfx.bloom.scatter
postfx.bloom.clamp
postfx.bloom.tint
postfx.bloom.highQualityFiltering
postfx.bloom.downscale
postfx.bloom.maxIterations
postfx.tonemapping.mode
```

Supported tonemapping modes:

- `none`
- `neutral`
- `aces`

The post-process pipeline now follows a URP-style structure:

- HDR scene result when the browser supports half-float render targets
- bloom prefilter
- downsample pyramid
- upsample/combine pyramid
- final uber pass with tonemapping

Unsupported environments fall back to the same pipeline on an LDR render target.

## 6. Preview Model

The lab no longer defaults to node-stage previews.

It uses layer-level preview/solo modes:

- `composite`
- `arc`
- `disk`
- `shards`
- `trail`
- `postfxOff`

`postfxOff` keeps the composite result but bypasses the post-process pass.

## 7. API Shape

The public runtime config is nested and semantic:

```text
TouchEffectConfig = {
  arc,
  disk,
  shards,
  swipe,
  compositor,
  mixer,
  postfx,
}
```

`updateConfig(...)` deep-merges by section, so partial updates are valid:

```text
updateConfig({
  disk: { color: ... },
  mixer: { mode: 'screen' },
})
```

## 8. Legacy Policy

The historical branch-stage renderer is preserved only by git history.

- no parallel legacy runtime remains in-tree
- no `legacy/` runtime path is kept alive
- this document describes only the current vNext implementation
