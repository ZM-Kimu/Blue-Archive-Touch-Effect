import {
  bloomDownscaleModes,
  createTouchEffectConfig,
  layerPreviewModes,
  mixerModes,
  tonemappingModes,
  type BloomDownscaleMode,
  type LayerPreviewMode,
  type MixerMode,
  type TouchEffectConfig,
  type TonemappingMode,
} from 'blue-archive-touch-effect'
import type {
  ColorControlDefinition,
  NumericControlDefinition,
  PanelDefinition,
  PreviewOption,
  SelectControlDefinition,
} from './types'

export const defaultConfig: TouchEffectConfig = createTouchEffectConfig()

export const panelDefinitions: PanelDefinition[] = [
  { key: 'arc', title: 'Arc', subtitle: 'Arc emitter and warp' },
  { key: 'disk', title: 'Disk', subtitle: 'Disk emitter and alpha' },
  { key: 'shards', title: 'Shards', subtitle: 'Shard burst and color' },
  { key: 'swipe', title: 'Swipe', subtitle: 'Trail ribbon and swipe shard emission' },
  { key: 'compositor', title: 'Compositor', subtitle: 'Shared arc + disk timing' },
  { key: 'mixer', title: 'Mixer', subtitle: 'Final color composition' },
  { key: 'postfx', title: 'PostFX', subtitle: 'Bloom and tonemapping' },
]

export const previewOptions: PreviewOption[] = layerPreviewModes.map((value) => ({
  value,
  label:
    value === 'composite'
      ? 'Composite'
      : value === 'arc'
        ? 'Arc'
        : value === 'disk'
          ? 'Disk'
          : value === 'shards'
            ? 'Shards'
            : value === 'trail'
              ? 'Trail'
              : 'PostFX Off',
}))

const mixerModeOptions: { value: MixerMode; label: string }[] = mixerModes.map((value) => ({
  value,
  label:
    value === 'add'
      ? 'Add (Brighter)'
      : value === 'screen'
        ? 'Screen (Default)'
        : 'Max',
}))

const tonemappingModeOptions: { value: TonemappingMode; label: string }[] = tonemappingModes.map((value) => ({
  value,
  label: value === 'none' ? 'None' : value === 'neutral' ? 'Neutral' : 'ACES',
}))

const bloomEnabledOptions = [
  { value: true, label: 'Enabled' },
  { value: false, label: 'Disabled' },
]

const postfxEnabledOptions = [
  { value: true, label: 'Enabled' },
  { value: false, label: 'Disabled' },
]

const highQualityFilteringOptions = [
  { value: false, label: 'Low' },
  { value: true, label: 'High' },
]

const bloomDownscaleOptions: { value: BloomDownscaleMode; label: string }[] = bloomDownscaleModes.map((value) => ({
  value,
  label: value === 'half' ? 'Half' : 'Quarter',
}))

export const numericControls: NumericControlDefinition[] = [
  { panel: 'arc', group: 'Source', path: 'arc.source.radius', label: 'Radius', min: 0.07, max: 0.13, step: 0.0025 },
  { panel: 'arc', group: 'Source', path: 'arc.source.scaleX', label: 'Scale X', min: 0.06, max: 0.2, step: 0.005 },
  { panel: 'arc', group: 'Source', path: 'arc.source.scaleY', label: 'Scale Y', min: 0.7, max: 1.4, step: 0.01 },
  { panel: 'arc', group: 'Motion', path: 'arc.motion.duration', label: 'Duration', min: 0.4, max: 0.9, step: 0.025 },
  { panel: 'arc', group: 'Motion', path: 'arc.motion.movementY', label: 'Move Y', min: -0.3, max: 0, step: 0.005 },
  { panel: 'arc', group: 'Emitter', path: 'arc.emitter.randomX', label: 'Random X', min: 0, max: 0.05, step: 0.0025 },
  { panel: 'arc', group: 'Emitter', path: 'arc.emitter.randomY', label: 'Random Y', min: 0, max: 0.12, step: 0.0025 },
  { panel: 'arc', group: 'Emitter', path: 'arc.emitter.scaleMin', label: 'Scale Min', min: 0.4, max: 1, step: 0.01 },
  { panel: 'arc', group: 'Emitter', path: 'arc.emitter.scaleMax', label: 'Scale Max', min: 0.6, max: 1.3, step: 0.01 },
  { panel: 'arc', group: 'Emitter', path: 'arc.emitter.minCount', label: 'Min Count', min: 1, max: 3, step: 1 },
  { panel: 'arc', group: 'Emitter', path: 'arc.emitter.maxCount', label: 'Max Count', min: 1, max: 3, step: 1 },
  { panel: 'arc', group: 'Warp', path: 'arc.warp.angleSpanDeg', label: 'Angle', min: 0, max: 360, step: 1 },
  { panel: 'arc', group: 'Warp', path: 'arc.warp.radius', label: 'Radius', min: 0.14, max: 0.26, step: 0.0025 },
  { panel: 'arc', group: 'Rotation', path: 'arc.rotation.speedDeg', label: 'Speed', min: -180, max: 180, step: 0.5 },
  { panel: 'arc', group: 'Alpha', path: 'arc.alpha.multiplier', label: 'Multiplier', min: 0, max: 2, step: 0.01 },

  { panel: 'disk', group: 'Shape', path: 'disk.shape.radius', label: 'Radius', min: 0.06, max: 0.2, step: 0.0025 },
  { panel: 'disk', group: 'Shape', path: 'disk.shape.softness', label: 'Softness', min: 0.1, max: 1, step: 0.01 },
  { panel: 'disk', group: 'Scale', path: 'disk.scale.start', label: 'Start Scale', min: 0.05, max: 1, step: 0.01 },
  { panel: 'disk', group: 'Scale', path: 'disk.scale.end', label: 'End Scale', min: 0.25, max: 1.5, step: 0.01 },
  { panel: 'disk', group: 'Scale', path: 'disk.scale.timeFraction', label: 'Time Frac', min: 0.1, max: 1, step: 0.01 },
  { panel: 'disk', group: 'Alpha', path: 'disk.alpha.start', label: 'Alpha Start', min: 0, max: 1, step: 0.01 },
  { panel: 'disk', group: 'Alpha', path: 'disk.alpha.end', label: 'Alpha End', min: 0, max: 1, step: 0.01 },
  { panel: 'disk', group: 'Alpha', path: 'disk.alpha.fadeStartFraction', label: 'Fade Start', min: 0, max: 1, step: 0.01 },

  { panel: 'shards', group: 'Shape', path: 'shards.shape.triangleSize', label: 'Triangle Size', min: 0.25, max: 2, step: 0.01 },
  { panel: 'shards', group: 'Distribution', path: 'shards.distribution.outerRadius', label: 'Outer Radius', min: 0.08, max: 0.3, step: 0.0025 },
  { panel: 'shards', group: 'Distribution', path: 'shards.distribution.innerRadius', label: 'Inner Radius', min: 0, max: 0.16, step: 0.0025 },
  { panel: 'shards', group: 'Burst', path: 'shards.burst.countMin', label: 'Count Min', min: 1, max: 10, step: 1 },
  { panel: 'shards', group: 'Burst', path: 'shards.burst.countMax', label: 'Count Max', min: 1, max: 10, step: 1 },
  { panel: 'shards', group: 'Burst', path: 'shards.burst.speedMin', label: 'Speed Min', min: 0.02, max: 0.3, step: 0.01 },
  { panel: 'shards', group: 'Burst', path: 'shards.burst.speedMax', label: 'Speed Max', min: 0.02, max: 0.3, step: 0.01 },
  { panel: 'shards', group: 'Burst', path: 'shards.burst.lifetimeMin', label: 'Life Min', min: 0.1, max: 0.6, step: 0.01 },
  { panel: 'shards', group: 'Burst', path: 'shards.burst.lifetimeMax', label: 'Life Max', min: 0.1, max: 0.6, step: 0.01 },
  { panel: 'shards', group: 'Burst', path: 'shards.burst.sizeMin', label: 'Size Min', min: 0.3, max: 1.5, step: 0.01 },
  { panel: 'shards', group: 'Burst', path: 'shards.burst.sizeMax', label: 'Size Max', min: 0.3, max: 1.5, step: 0.01 },
  { panel: 'shards', group: 'Scale Over Life', path: 'shards.scaleOverLife.start', label: 'Start', min: 0, max: 1.5, step: 0.01 },
  { panel: 'shards', group: 'Scale Over Life', path: 'shards.scaleOverLife.peak', label: 'Peak', min: 0.1, max: 1.5, step: 0.01 },
  { panel: 'shards', group: 'Scale Over Life', path: 'shards.scaleOverLife.end', label: 'End', min: 0, max: 1, step: 0.01 },
  { panel: 'shards', group: 'Scale Over Life', path: 'shards.scaleOverLife.growTimeFraction', label: 'Grow Frac', min: 0.02, max: 0.5, step: 0.01 },
  { panel: 'shards', group: 'Init Scale', path: 'shards.initScale.start', label: 'Start', min: 0.2, max: 1.5, step: 0.01 },
  { panel: 'shards', group: 'Init Scale', path: 'shards.initScale.end', label: 'End', min: 0.2, max: 1.8, step: 0.01 },
  { panel: 'shards', group: 'Init Scale', path: 'shards.initScale.timeFraction', label: 'Time Frac', min: 0.02, max: 0.5, step: 0.01 },
  { panel: 'shards', group: 'Alpha', path: 'shards.alpha.max', label: 'Alpha Max', min: 0, max: 1, step: 0.01 },
  { panel: 'shards', group: 'Alpha', path: 'shards.alpha.min', label: 'Alpha Min', min: 0, max: 1, step: 0.01 },
  { panel: 'shards', group: 'Alpha', path: 'shards.alpha.flashTimeWarpMin', label: 'Flash Warp Min', min: 0.02, max: 0.5, step: 0.01 },
  { panel: 'shards', group: 'Alpha', path: 'shards.alpha.flashTimeWarpMax', label: 'Flash Warp Max', min: 0.02, max: 0.5, step: 0.01 },
  { panel: 'shards', group: 'Color', path: 'shards.color.peakBoost', label: 'Peak Boost', min: 1, max: 2, step: 0.01 },

  { panel: 'compositor', group: 'Shared Scale', path: 'compositor.sharedScale.start', label: 'Start', min: 0.1, max: 1, step: 0.01 },
  { panel: 'compositor', group: 'Shared Scale', path: 'compositor.sharedScale.end', label: 'End', min: 0.5, max: 1.5, step: 0.01 },
  { panel: 'compositor', group: 'Shared Scale', path: 'compositor.sharedScale.timeFraction', label: 'Time Frac', min: 0.1, max: 1, step: 0.01 },
  { panel: 'compositor', group: 'Handoff', path: 'compositor.handoff.arcDelayFromDiskScale', label: 'Arc Delay', min: 0, max: 1.5, step: 0.01 },
  { panel: 'compositor', group: 'Effect', path: 'compositor.effectScale', label: 'Effect Scale', min: 0.05, max: 1.5, step: 0.01 },

  { panel: 'mixer', group: 'Weights', path: 'mixer.arcWeight', label: 'Arc Weight', min: 0, max: 2, step: 0.01 },
  { panel: 'mixer', group: 'Weights', path: 'mixer.diskWeight', label: 'Disk Weight', min: 0, max: 2, step: 0.01 },
  { panel: 'mixer', group: 'Weights', path: 'mixer.shardsWeight', label: 'Shards Weight', min: 0, max: 2, step: 0.01 },
  { panel: 'mixer', group: 'Weights', path: 'mixer.trailWeight', label: 'Trail Weight', min: 0, max: 2, step: 0.01 },
  { panel: 'mixer', group: 'Mode', path: 'mixer.gain', label: 'Gain', min: 0, max: 3, step: 0.01 },

  { panel: 'swipe', group: 'Input', path: 'swipe.input.minPointDistance', label: 'Min Point Distance', min: 0, max: 0.05, step: 0.0005 },
  { panel: 'swipe', group: 'Trail', path: 'swipe.trail.lifetime', label: 'Lifetime', min: 0.05, max: 1, step: 0.01 },
  { panel: 'swipe', group: 'Trail', path: 'swipe.trail.width', label: 'Width', min: 0, max: 0.03, step: 0.0005 },
  { panel: 'swipe', group: 'Trail', path: 'swipe.trail.minVertexDistance', label: 'Min Vertex Distance', min: 0, max: 0.05, step: 0.0005 },
  { panel: 'swipe', group: 'Trail', path: 'swipe.trail.cornerVertices', label: 'Corner Vertices', min: 0, max: 8, step: 1 },
  { panel: 'swipe', group: 'Trail', path: 'swipe.trail.capVertices', label: 'Cap Vertices', min: 0, max: 4, step: 1 },
  { panel: 'swipe', group: 'Trail', path: 'swipe.trail.intensity', label: 'Intensity', min: 0, max: 24, step: 0.1 },
  { panel: 'swipe', group: 'Trail', path: 'swipe.trail.midTime', label: 'Mid Time', min: 0.05, max: 0.95, step: 0.01 },
  { panel: 'swipe', group: 'Trail', path: 'swipe.trail.alpha.start', label: 'Alpha Start', min: 0, max: 1, step: 0.01 },
  { panel: 'swipe', group: 'Trail', path: 'swipe.trail.alpha.mid', label: 'Alpha Mid', min: 0, max: 1, step: 0.01 },
  { panel: 'swipe', group: 'Trail', path: 'swipe.trail.alpha.end', label: 'Alpha End', min: 0, max: 1, step: 0.01 },
  { panel: 'swipe', group: 'Trail', path: 'swipe.trail.alpha.midTime', label: 'Alpha Mid Time', min: 0.05, max: 0.95, step: 0.01 },
  { panel: 'swipe', group: 'Shards', path: 'swipe.shards.emitPerDistance', label: 'Emit / Distance', min: 1, max: 12, step: 0.5 },
  { panel: 'swipe', group: 'Shards', path: 'swipe.shards.innerRadius', label: 'Inner Radius', min: 0, max: 0.12, step: 0.0025 },
  { panel: 'swipe', group: 'Shards', path: 'swipe.shards.outerRadius', label: 'Outer Radius', min: 0, max: 0.16, step: 0.0025 },
  { panel: 'swipe', group: 'Shards', path: 'swipe.shards.speedMin', label: 'Speed Min', min: 0.02, max: 0.6, step: 0.01 },
  { panel: 'swipe', group: 'Shards', path: 'swipe.shards.speedMax', label: 'Speed Max', min: 0.02, max: 0.6, step: 0.01 },
  { panel: 'swipe', group: 'Shards', path: 'swipe.shards.lifetimeMin', label: 'Life Min', min: 0.05, max: 0.8, step: 0.01 },
  { panel: 'swipe', group: 'Shards', path: 'swipe.shards.lifetimeMax', label: 'Life Max', min: 0.05, max: 0.8, step: 0.01 },
  { panel: 'swipe', group: 'Shards', path: 'swipe.shards.sizeMin', label: 'Size Min', min: 0.2, max: 2, step: 0.01 },
  { panel: 'swipe', group: 'Shards', path: 'swipe.shards.sizeMax', label: 'Size Max', min: 0.2, max: 2, step: 0.01 },
  { panel: 'swipe', group: 'Shards', path: 'swipe.shards.flashTimeWarpMin', label: 'Flash Warp Min', min: 0.02, max: 0.5, step: 0.01 },
  { panel: 'swipe', group: 'Shards', path: 'swipe.shards.flashTimeWarpMax', label: 'Flash Warp Max', min: 0.02, max: 0.5, step: 0.01 },
  { panel: 'swipe', group: 'Shards', path: 'swipe.shards.peakBoost', label: 'Peak Boost', min: 1, max: 2, step: 0.01 },

  { panel: 'postfx', group: 'Bloom', path: 'postfx.bloom.threshold', label: 'Threshold', min: 0, max: 2, step: 0.01 },
  { panel: 'postfx', group: 'Bloom', path: 'postfx.bloom.intensity', label: 'Intensity', min: 0, max: 3, step: 0.01 },
  { panel: 'postfx', group: 'Bloom', path: 'postfx.bloom.scatter', label: 'Scatter', min: 0, max: 1, step: 0.01 },
  { panel: 'postfx', group: 'Bloom', path: 'postfx.bloom.clamp', label: 'Clamp', min: 1, max: 65472, step: 1 },
  { panel: 'postfx', group: 'Bloom', path: 'postfx.bloom.maxIterations', label: 'Max Iterations', min: 1, max: 8, step: 1 },
  { panel: 'postfx', group: 'Alpha', path: 'postfx.alpha.bloomStrength', label: 'Bloom Strength', min: 0, max: 1, step: 0.01 },
  { panel: 'postfx', group: 'Alpha', path: 'postfx.alpha.bloomClamp', label: 'Bloom Clamp', min: 0, max: 1, step: 0.01 },
]

export const selectControls: SelectControlDefinition[] = [
  { panel: 'mixer', group: 'Mode', path: 'mixer.mode', label: 'Mode', options: mixerModeOptions },
  { panel: 'swipe', group: 'Input', path: 'swipe.enabled', label: 'Enabled', options: bloomEnabledOptions },
  { panel: 'swipe', group: 'Input', path: 'swipe.input.pointerCapture', label: 'Pointer Capture', options: postfxEnabledOptions },
  { panel: 'swipe', group: 'Shards', path: 'swipe.shards.enabled', label: 'Swipe Shards', options: bloomEnabledOptions },
  { panel: 'postfx', group: 'General', path: 'postfx.enabled', label: 'PostFX', options: postfxEnabledOptions },
  { panel: 'postfx', group: 'Bloom', path: 'postfx.bloom.enabled', label: 'Bloom', options: bloomEnabledOptions },
  { panel: 'postfx', group: 'Bloom', path: 'postfx.bloom.highQualityFiltering', label: 'Filtering', options: highQualityFilteringOptions },
  { panel: 'postfx', group: 'Bloom', path: 'postfx.bloom.downscale', label: 'Downscale', options: bloomDownscaleOptions },
  { panel: 'postfx', group: 'Tonemapping', path: 'postfx.tonemapping.mode', label: 'Mode', options: tonemappingModeOptions },
]

export const colorControls: ColorControlDefinition[] = [
  { panel: 'arc', group: 'Color', path: 'arc.color', label: 'Arc Color' },
  { panel: 'disk', group: 'Color', path: 'disk.color', label: 'Disk Color' },
  { panel: 'shards', group: 'Color', path: 'shards.color.tint', label: 'Shards Tint' },
  { panel: 'swipe', group: 'Trail', path: 'swipe.trail.startColor', label: 'Start Color' },
  { panel: 'swipe', group: 'Trail', path: 'swipe.trail.midColor', label: 'Mid Color' },
  { panel: 'swipe', group: 'Trail', path: 'swipe.trail.endColor', label: 'End Color' },
  { panel: 'swipe', group: 'Shards', path: 'swipe.shards.tint', label: 'Swipe Shards Tint' },
  { panel: 'postfx', group: 'Bloom', path: 'postfx.bloom.tint', label: 'Tint' },
]

export const formatNumber = (path: string, value: number) =>
{
  if (
    path.endsWith('countMin')
    || path.endsWith('countMax')
    || path.endsWith('angleSpanDeg')
    || path.endsWith('maxIterations')
    || path.endsWith('clamp')
  )
  {
    return String(Math.round(value))
  }

  return value.toFixed(2)
}
