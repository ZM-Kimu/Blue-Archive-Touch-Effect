import {
  expandBurstBounds,
  getBurstCompositeBounds,
  getBurstShardsBounds,
  getSwipeShardsBounds,
  unionBurstBounds,
} from '../state'
import type {
  BurstBounds,
  BurstState,
  SwipeStrokeState,
  TouchEffectConfig,
  TouchEffectDebugState,
} from '../types'
import type { RenderRect, RuntimeState } from './types'

const getFilterPaddingCss = (config: TouchEffectConfig) =>
{
  if (!config.postfx.enabled || !config.postfx.bloom.enabled)
  {
    return 6
  }

  const downscaleFactor = config.postfx.bloom.downscale === 'quarter' ? 0.8 : 1
  return 12
    + config.postfx.bloom.scatter * 36
    + config.postfx.bloom.intensity * 18
    + config.postfx.bloom.maxIterations * 5 * downscaleFactor
}

export const getLocalRenderRect = (
  originX: number,
  originY: number,
  visibleBounds: BurstBounds,
  paddingLocal: number,
  runtimeState: RuntimeState
): RenderRect | null =>
{
  const paddedBounds = expandBurstBounds(visibleBounds, paddingLocal)
  const originCssX = originX * runtimeState.width
  const originCssY = (1 - originY) * runtimeState.height

  const unclampedLeft = originCssX + paddedBounds.minX * runtimeState.height
  const unclampedRight = originCssX + paddedBounds.maxX * runtimeState.height
  const unclampedTop = originCssY - paddedBounds.maxY * runtimeState.height
  const unclampedBottom = originCssY - paddedBounds.minY * runtimeState.height

  const cssLeft = Math.max(0, unclampedLeft)
  const cssTop = Math.max(0, unclampedTop)
  const cssRight = Math.min(runtimeState.width, unclampedRight)
  const cssBottom = Math.min(runtimeState.height, unclampedBottom)

  if (cssRight <= cssLeft || cssBottom <= cssTop)
  {
    return null
  }

  const localBounds = {
    minX: paddedBounds.minX + (cssLeft - unclampedLeft) / runtimeState.height,
    maxX: paddedBounds.maxX - (unclampedRight - cssRight) / runtimeState.height,
    minY: paddedBounds.minY + (unclampedBottom - cssBottom) / runtimeState.height,
    maxY: paddedBounds.maxY - (cssTop - unclampedTop) / runtimeState.height,
  }

  const deviceWidth = Math.max(1, Math.ceil((cssRight - cssLeft) * runtimeState.dpr))
  const deviceHeight = Math.max(1, Math.ceil((cssBottom - cssTop) * runtimeState.dpr))
  const deviceX = Math.floor(cssLeft * runtimeState.dpr)
  const deviceY = Math.floor((runtimeState.height - cssBottom) * runtimeState.dpr)

  return {
    localBounds,
    deviceX,
    deviceY,
    deviceWidth,
    deviceHeight,
  }
}

export const getBurstRenderRect = (
  burst: BurstState,
  config: TouchEffectConfig,
  debugState: TouchEffectDebugState,
  runtimeState: RuntimeState
) =>
{
  const compositeBounds = getBurstCompositeBounds(burst, config)
  const shardsBounds = getBurstShardsBounds(burst, config)
  const visibleBounds = debugState.previewMode === 'arc' || debugState.previewMode === 'disk'
    ? compositeBounds
    : debugState.previewMode === 'shards'
      ? shardsBounds
      : unionBurstBounds(compositeBounds, shardsBounds)

  return getLocalRenderRect(
    burst.originX,
    burst.originY,
    visibleBounds,
    getFilterPaddingCss(config) / Math.max(runtimeState.height, 1),
    runtimeState
  )
}

export const getSwipeShardsRenderRect = (
  stroke: SwipeStrokeState,
  config: TouchEffectConfig,
  runtimeState: RuntimeState
) =>
  getLocalRenderRect(
    stroke.originX,
    stroke.originY,
    getSwipeShardsBounds(stroke, config),
    getFilterPaddingCss(config) / Math.max(runtimeState.height, 1),
    runtimeState
  )
