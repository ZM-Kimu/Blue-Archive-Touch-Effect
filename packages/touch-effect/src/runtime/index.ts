import { Mesh, Program, RenderTarget, Renderer, Triangle } from 'ogl'
import type { Texture } from 'ogl'
import {
  createTouchEffectConfig,
  mergeTouchEffectConfig,
} from '../config'
import {
  appendSwipeStrokePoint,
  beginSwipeStroke,
  createBurstStore,
  createSwipeStore,
  endAllSwipeStrokes,
  endSwipeStroke,
  hasActiveBursts,
  hasActiveSwipeContent,
  spawnBurst,
  updateBurstActivity,
  updateSwipeActivity,
} from '../state'
import burstFilterFragment from '../rendering/shaders/burst-filter.frag'
import burstSceneFragment from '../rendering/shaders/burst-scene.frag'
import finalMixerFragment from '../rendering/shaders/final-mixer.frag'
import bloomDownsampleFragment from '../rendering/shaders/postfx-bloom-downsample.frag'
import bloomPrefilterFragment from '../rendering/shaders/postfx-bloom-prefilter.frag'
import bloomUpsampleFragment from '../rendering/shaders/postfx-bloom-upsample.frag'
import vertex from '../rendering/shaders/touch-effect.vert'
import { createTrailPolyline, updateTrailPolyline } from '../rendering/trail'
import { addPointerInputListeners, removePointerInputListeners, setCanvasStyles } from './dom'
import {
  clearBoundTarget,
  createRenderTargetOptions,
  detectHdrTargetSupport,
  ensureRenderTargetSize,
  setRendererViewport,
} from './gl'
import {
  getBloomDownscaleFactor,
} from './modes'
import { getBurstRenderRect, getSwipeShardsRenderRect } from './rects'
import {
  createBloomDownsampleUniforms,
  createBloomPrefilterUniforms,
  createBloomUpsampleUniforms,
  createFinalMixerUniforms,
  createSceneUniforms,
  createUberUniforms,
  syncBloomDownsampleUniforms,
  syncBloomPrefilterUniforms,
  syncBloomUpsampleUniforms,
  syncBurstUniforms,
  syncFinalMixerUniforms,
  syncSceneStaticUniforms,
  syncSwipeShardBatchUniforms,
  syncUberUniforms,
} from './uniforms'
import type {
  InternalTouchEffectInstance,
  RuntimeState,
} from './types'
import type {
  BurstState,
  TouchEffectInstance,
  CreateTouchEffectOptions,
  TouchEffectConfig,
  TouchEffectConfigPatch,
  TouchEffectDebugState,
  SwipeStrokeState,
} from '../types'

const defaultTouchEffectDebugState = (): TouchEffectDebugState => ({
  previewMode: 'composite',
})

export const createTouchEffect = ({
  target,
  listenTarget,
  config: initialConfig,
  pixelRatioCap = 2,
  autoBindPointer = true,
}: CreateTouchEffectOptions): TouchEffectInstance =>
{
  const config = createTouchEffectConfig(initialConfig)
  const debugState = defaultTouchEffectDebugState()
  const burstStore = createBurstStore()
  const swipeStore = createSwipeStore()
  const renderer = new Renderer({
    alpha: true,
    antialias: true,
    dpr: Math.min(window.devicePixelRatio || 1, pixelRatioCap),
    premultipliedAlpha: true,
  })
  const gl = renderer.gl
  const hdrTargetSupport = detectHdrTargetSupport(gl)
  const canvas = gl.canvas as HTMLCanvasElement
  const sceneUniforms = createSceneUniforms(config)
  const finalMixerUniforms = createFinalMixerUniforms(config, debugState)
  const bloomPrefilterUniforms = createBloomPrefilterUniforms(config)
  const bloomDownsampleUniforms = createBloomDownsampleUniforms(config)
  const bloomUpsampleUniforms = createBloomUpsampleUniforms(config)
  const uberUniforms = createUberUniforms(config)
  const geometry = new Triangle(gl)
  const sceneProgram = new Program(gl, {
    vertex,
    fragment: burstSceneFragment,
    uniforms: sceneUniforms,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    cullFace: false,
  })
  const finalMixerProgram = new Program(gl, {
    vertex,
    fragment: finalMixerFragment,
    uniforms: finalMixerUniforms,
    depthTest: false,
    depthWrite: false,
    cullFace: false,
  })
  const bloomPrefilterProgram = new Program(gl, {
    vertex,
    fragment: bloomPrefilterFragment,
    uniforms: bloomPrefilterUniforms,
    depthTest: false,
    depthWrite: false,
    cullFace: false,
  })
  const bloomDownsampleProgram = new Program(gl, {
    vertex,
    fragment: bloomDownsampleFragment,
    uniforms: bloomDownsampleUniforms,
    depthTest: false,
    depthWrite: false,
    cullFace: false,
  })
  const bloomUpsampleProgram = new Program(gl, {
    vertex,
    fragment: bloomUpsampleFragment,
    uniforms: bloomUpsampleUniforms,
    depthTest: false,
    depthWrite: false,
    cullFace: false,
  })
  const uberProgram = new Program(gl, {
    vertex,
    fragment: burstFilterFragment,
    uniforms: uberUniforms,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    cullFace: false,
  })
  const sceneMesh = new Mesh(gl, { geometry, program: sceneProgram })
  const finalMixerMesh = new Mesh(gl, { geometry, program: finalMixerProgram })
  const bloomPrefilterMesh = new Mesh(gl, { geometry, program: bloomPrefilterProgram })
  const bloomDownsampleMesh = new Mesh(gl, { geometry, program: bloomDownsampleProgram })
  const bloomUpsampleMesh = new Mesh(gl, { geometry, program: bloomUpsampleProgram })
  const uberMesh = new Mesh(gl, { geometry, program: uberProgram })
  const trailPolyline = createTrailPolyline(gl)
  const renderTargetOptions = createRenderTargetOptions(gl, hdrTargetSupport)
  const sceneTarget = new RenderTarget(gl, renderTargetOptions)
  const trailTarget = new RenderTarget(gl, renderTargetOptions)
  const mixedTarget = new RenderTarget(gl, renderTargetOptions)
  const bloomDownTargets: RenderTarget[] = []
  const bloomUpTargets: RenderTarget[] = []
  let currentTime = 0
  let disposed = false
  let resizeObserver: ResizeObserver | null = null
  let usedWindowResizeFallback = false
  const hostWindow = window
  const runtimeState: RuntimeState = {
    width: 1,
    height: 1,
    dpr: renderer.dpr,
  }
  const previousTargetPosition = target.style.position
  const shouldRestorePosition = getComputedStyle(target).position === 'static'
  const boundListenTarget: HTMLElement | Window = listenTarget ?? target
  const capturedPointerIds = new Set<number>()

  if (shouldRestorePosition)
  {
    target.style.position = 'relative'
  }

  setCanvasStyles(canvas)
  canvas.className = 'app-canvas'
  target.appendChild(canvas)
  gl.clearColor(0, 0, 0, 0)

  const clearDefaultFramebuffer = () =>
  {
    renderer.bindFramebuffer()
    setRendererViewport(
      renderer,
      0,
      0,
      Math.max(1, Math.round(runtimeState.width * runtimeState.dpr)),
      Math.max(1, Math.round(runtimeState.height * runtimeState.dpr))
    )
    clearBoundTarget(gl)
  }

  const ensureLayerTargets = () =>
  {
    const width = Math.max(1, Math.round(runtimeState.width * runtimeState.dpr))
    const height = Math.max(1, Math.round(runtimeState.height * runtimeState.dpr))
    ensureRenderTargetSize(sceneTarget, width, height)
    ensureRenderTargetSize(trailTarget, width, height)
    ensureRenderTargetSize(mixedTarget, width, height)
  }

  const getBloomTarget = (targets: RenderTarget[], index: number) =>
  {
    if (!targets[index])
    {
      targets[index] = new RenderTarget(gl, renderTargetOptions)
    }
    return targets[index]
  }

  const runBloomPyramid = (
    width: number,
    height: number,
    sourceTexture: Texture,
    sourceWidth: number,
    sourceHeight: number
  ) =>
  {
    const bloomConfig = config.postfx.bloom
    if (!config.postfx.enabled || !bloomConfig.enabled || bloomConfig.intensity <= 0)
    {
      return null
    }

    const downscaleFactor = getBloomDownscaleFactor(bloomConfig.downscale)
    const levelWidth = Math.max(1, Math.floor(width / downscaleFactor))
    const levelHeight = Math.max(1, Math.floor(height / downscaleFactor))
    if (levelWidth < 2 || levelHeight < 2)
    {
      return null
    }

    const maxLevels = Math.max(1, bloomConfig.maxIterations)
    let levelCount = 0
    const prefilterTarget = getBloomTarget(bloomDownTargets, 0)
    ensureRenderTargetSize(prefilterTarget, levelWidth, levelHeight)
    syncBloomPrefilterUniforms(
      bloomPrefilterUniforms,
      config,
      sourceTexture,
      1 / sourceWidth,
      1 / sourceHeight
    )
    renderer.bindFramebuffer(prefilterTarget)
    setRendererViewport(renderer, 0, 0, prefilterTarget.width, prefilterTarget.height)
    clearBoundTarget(gl)
    bloomPrefilterMesh.draw()
    levelCount = 1

    while (levelCount < maxLevels)
    {
      const previousTarget = bloomDownTargets[levelCount - 1]
      const nextWidth = Math.max(1, Math.floor(previousTarget.width / 2))
      const nextHeight = Math.max(1, Math.floor(previousTarget.height / 2))
      if (nextWidth === previousTarget.width && nextHeight === previousTarget.height)
      {
        break
      }

      const nextTarget = getBloomTarget(bloomDownTargets, levelCount)
      ensureRenderTargetSize(nextTarget, nextWidth, nextHeight)
      syncBloomDownsampleUniforms(
        bloomDownsampleUniforms,
        config,
        previousTarget.texture,
        1 / previousTarget.width,
        1 / previousTarget.height
      )
      renderer.bindFramebuffer(nextTarget)
      setRendererViewport(renderer, 0, 0, nextTarget.width, nextTarget.height)
      clearBoundTarget(gl)
      bloomDownsampleMesh.draw()
      levelCount += 1

      if (nextWidth <= 2 && nextHeight <= 2)
      {
        break
      }
    }

    let currentTexture = bloomDownTargets[levelCount - 1].texture
    let currentWidth = bloomDownTargets[levelCount - 1].width
    let currentHeight = bloomDownTargets[levelCount - 1].height

    for (let index = levelCount - 2; index >= 0; index -= 1)
    {
      const highTarget = bloomDownTargets[index]
      const combinedTarget = getBloomTarget(bloomUpTargets, index)
      ensureRenderTargetSize(combinedTarget, highTarget.width, highTarget.height)
      syncBloomUpsampleUniforms(
        bloomUpsampleUniforms,
        config,
        highTarget.texture,
        currentTexture,
        1 / currentWidth,
        1 / currentHeight
      )
      renderer.bindFramebuffer(combinedTarget)
      setRendererViewport(renderer, 0, 0, combinedTarget.width, combinedTarget.height)
      clearBoundTarget(gl)
      bloomUpsampleMesh.draw()
      currentTexture = combinedTarget.texture
      currentWidth = combinedTarget.width
      currentHeight = combinedTarget.height
    }

    return currentTexture
  }

  const drawClickBurst = (burst: BurstState) =>
  {
    const rect = getBurstRenderRect(burst, config, debugState, runtimeState)
    if (!rect)
    {
      return
    }

    syncSceneStaticUniforms(sceneUniforms, config, debugState.previewMode)
    syncBurstUniforms(sceneUniforms, burst, rect, currentTime)
    renderer.bindFramebuffer(sceneTarget)
    setRendererViewport(renderer, rect.deviceX, rect.deviceY, rect.deviceWidth, rect.deviceHeight)
    sceneMesh.draw()
  }

  const drawSwipeShardStroke = (stroke: SwipeStrokeState) =>
  {
    const rect = getSwipeShardsRenderRect(stroke, config, runtimeState)
    if (!rect)
    {
      return
    }

    const activeParticleIndices: number[] = []
    stroke.shardParticles.forEach((particle, index) =>
    {
      if (!particle.enabled || particle.lifetime <= 0)
      {
        return
      }

      const progress = (currentTime - particle.startTime) / particle.lifetime
      if (progress >= 0 && progress <= 1)
      {
        activeParticleIndices.push(index)
      }
    })

    if (!activeParticleIndices.length)
    {
      return
    }

    syncSceneStaticUniforms(sceneUniforms, config, 'shards')
    for (let batchStart = 0; batchStart < activeParticleIndices.length; batchStart += 10)
    {
      const particleBatch = activeParticleIndices.slice(batchStart, batchStart + 10)
      syncSwipeShardBatchUniforms(sceneUniforms, stroke, rect, currentTime, config, particleBatch)
      renderer.bindFramebuffer(sceneTarget)
      setRendererViewport(renderer, rect.deviceX, rect.deviceY, rect.deviceWidth, rect.deviceHeight)
      sceneMesh.draw()
    }
  }

  const drawTrailStroke = (stroke: SwipeStrokeState) =>
  {
    if (!updateTrailPolyline(stroke, trailPolyline, config, runtimeState, currentTime))
    {
      return
    }

    renderer.bindFramebuffer(trailTarget)
    setRendererViewport(renderer, 0, 0, trailTarget.width, trailTarget.height)
    trailPolyline.polyline.mesh.draw()
  }

  const drawFrame = () =>
  {
    updateBurstActivity(burstStore, currentTime)
    updateSwipeActivity(swipeStore, currentTime)
    clearDefaultFramebuffer()

    const hasBursts = hasActiveBursts(burstStore)
    const hasSwipe = hasActiveSwipeContent(swipeStore)
    if (!hasBursts && !hasSwipe)
    {
      return
    }

    ensureLayerTargets()

    renderer.bindFramebuffer(sceneTarget)
    setRendererViewport(renderer, 0, 0, sceneTarget.width, sceneTarget.height)
    clearBoundTarget(gl)

    if (debugState.previewMode !== 'trail')
    {
      burstStore.bursts.forEach((burst) =>
      {
        if (burst.active)
        {
          drawClickBurst(burst)
        }
      })

      if (debugState.previewMode === 'composite' || debugState.previewMode === 'postfxOff' || debugState.previewMode === 'shards')
      {
        swipeStore.strokes.forEach((stroke) =>
        {
          if (stroke.active)
          {
            drawSwipeShardStroke(stroke)
          }
        })
      }
    }

    renderer.bindFramebuffer(trailTarget)
    setRendererViewport(renderer, 0, 0, trailTarget.width, trailTarget.height)
    clearBoundTarget(gl)
    if (config.swipe.enabled && (
      debugState.previewMode === 'composite'
      || debugState.previewMode === 'postfxOff'
      || debugState.previewMode === 'trail'
    ))
    {
      swipeStore.strokes.forEach((stroke) =>
      {
        if (stroke.active)
        {
          drawTrailStroke(stroke)
        }
      })
    }

    renderer.bindFramebuffer(mixedTarget)
    setRendererViewport(renderer, 0, 0, mixedTarget.width, mixedTarget.height)
    clearBoundTarget(gl)
    syncFinalMixerUniforms(finalMixerUniforms, config, debugState, sceneTarget.texture, trailTarget.texture)
    finalMixerMesh.draw()

    const postfxEnabled = config.postfx.enabled && debugState.previewMode !== 'postfxOff'
    const bloomTexture = postfxEnabled
      ? runBloomPyramid(mixedTarget.width, mixedTarget.height, mixedTarget.texture, mixedTarget.width, mixedTarget.height)
      : null

    renderer.bindFramebuffer()
    setRendererViewport(renderer, 0, 0, mixedTarget.width, mixedTarget.height)
    syncUberUniforms(uberUniforms, config, postfxEnabled, bloomTexture, mixedTarget.texture)
    uberMesh.draw()
  }

  const render = (time: number) =>
  {
    if (disposed)
    {
      return
    }

    currentTime = time * 0.001
    drawFrame()
    requestAnimationFrame(render)
  }

  const resize = () =>
  {
    const rect = target.getBoundingClientRect()
    runtimeState.width = Math.max(1, rect.width)
    runtimeState.height = Math.max(1, rect.height)
    runtimeState.dpr = Math.min(window.devicePixelRatio || 1, pixelRatioCap)
    renderer.dpr = runtimeState.dpr
    renderer.setSize(runtimeState.width, runtimeState.height)
    trailPolyline.polyline.resize()
    drawFrame()
  }

  const triggerClickAtLocal = (x: number, y: number) =>
  {
    currentTime = hostWindow.performance.now() * 0.001
    spawnBurst(
      burstStore,
      config,
      currentTime,
      x,
      y,
      Math.max(runtimeState.width, 1),
      Math.max(runtimeState.height, 1)
    )
  }

  const triggerClickAtClient = (clientX: number, clientY: number) =>
  {
    const rect = target.getBoundingClientRect()
    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom)
    {
      return
    }

    triggerClickAtLocal(clientX - rect.left, clientY - rect.top)
  }

  const getRuntimeTime = (timeSeconds?: number) =>
    timeSeconds ?? hostWindow.performance.now() * 0.001

  const releasePointerCapture = (pointerId: number) =>
  {
    capturedPointerIds.delete(pointerId)
    if ('releasePointerCapture' in target)
    {
      try
      {
        target.releasePointerCapture(pointerId)
      }
      catch
      {
        // ignore capture failures
      }
    }
  }

  const beginTrailAtLocal = (pointerId: number, x: number, y: number, timeSeconds?: number) =>
  {
    if (!config.swipe.enabled)
    {
      return
    }

    currentTime = getRuntimeTime(timeSeconds)
    beginSwipeStroke(
      swipeStore,
      config,
      currentTime,
      pointerId,
      x,
      y,
      Math.max(runtimeState.width, 1),
      Math.max(runtimeState.height, 1)
    )
  }

  const appendTrailAtLocal = (pointerId: number, x: number, y: number, timeSeconds?: number) =>
  {
    if (!config.swipe.enabled)
    {
      return false
    }

    currentTime = getRuntimeTime(timeSeconds)
    return appendSwipeStrokePoint(
      swipeStore,
      config,
      currentTime,
      pointerId,
      x,
      y,
      Math.max(runtimeState.width, 1),
      Math.max(runtimeState.height, 1)
    )
  }

  const beginTrailAtClient = (pointerId: number, clientX: number, clientY: number, timeSeconds?: number) =>
  {
    const rect = target.getBoundingClientRect()
    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom)
    {
      return
    }

    beginTrailAtLocal(pointerId, clientX - rect.left, clientY - rect.top, timeSeconds)
  }

  const appendTrailAtClient = (pointerId: number, clientX: number, clientY: number, timeSeconds?: number) =>
  {
    const rect = target.getBoundingClientRect()
    return appendTrailAtLocal(pointerId, clientX - rect.left, clientY - rect.top, timeSeconds)
  }

  const endTrail = (pointerId: number) =>
  {
    endSwipeStroke(swipeStore, pointerId)
    releasePointerCapture(pointerId)
  }

  const endAllTrails = () =>
  {
    endAllSwipeStrokes(swipeStore)
    capturedPointerIds.forEach((pointerId) => releasePointerCapture(pointerId))
    capturedPointerIds.clear()
  }

  const isSwipePointerActive = (event: PointerEvent) =>
  {
    if (event.pointerType === 'mouse' || event.pointerType === 'pen')
    {
      return event.buttons > 0
    }

    return true
  }

  const endSwipeFromPointer = (event: PointerEvent) =>
  {
    endTrail(event.pointerId)
  }

  const beginSwipeFromPointer = (event: PointerEvent) =>
  {
    if (!config.swipe.enabled)
    {
      return
    }

    beginTrailAtClient(event.pointerId, event.clientX, event.clientY)

    if (config.swipe.input.pointerCapture && 'setPointerCapture' in target)
    {
      try
      {
        target.setPointerCapture(event.pointerId)
        capturedPointerIds.add(event.pointerId)
      }
      catch
      {
        // ignore capture failures
      }
    }
  }

  const handlePointerDown = (event: PointerEvent) =>
  {
    if (event.button < 0 || event.button > 2)
    {
      return
    }

    const rect = target.getBoundingClientRect()
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)
    {
      return
    }

    currentTime = hostWindow.performance.now() * 0.001
    triggerClickAtLocal(event.clientX - rect.left, event.clientY - rect.top)
    beginSwipeFromPointer(event)
  }

  const handlePointerMove = (event: PointerEvent) =>
  {
    if (!config.swipe.enabled)
    {
      return
    }

    if (!isSwipePointerActive(event))
    {
      endSwipeFromPointer(event)
      return
    }

    const events = typeof event.getCoalescedEvents === 'function'
      ? event.getCoalescedEvents()
      : []
    const pointerEvents = events.length > 0 ? events : [event]

    pointerEvents.forEach((pointerEvent) =>
    {
      const pointerTime = pointerEvent.timeStamp > 0
        ? pointerEvent.timeStamp * 0.001
        : hostWindow.performance.now() * 0.001
      appendTrailAtClient(
        event.pointerId,
        pointerEvent.clientX,
        pointerEvent.clientY,
        pointerTime
      )
    })
  }

  const handlePointerEnd = (event: PointerEvent) =>
  {
    endSwipeFromPointer(event)
  }

  const handlePointerLeave = (event: PointerEvent) =>
  {
    if (capturedPointerIds.has(event.pointerId))
    {
      return
    }

    endSwipeFromPointer(event)
  }

  const handleWindowBlur = () =>
  {
    endAllTrails()
  }

  const updateConfig = (partial: TouchEffectConfigPatch) =>
  {
    mergeTouchEffectConfig(config, partial)
    drawFrame()
  }

  const setDebugState = (partial: Partial<TouchEffectDebugState>) =>
  {
    if (partial.previewMode)
    {
      debugState.previewMode = partial.previewMode
    }
    drawFrame()
  }

  const dispose = () =>
  {
    if (disposed)
    {
      return
    }

    disposed = true
    if (autoBindPointer)
    {
      removePointerInputListeners(boundListenTarget, target, hostWindow, {
        pointerDown: handlePointerDown,
        pointerMove: handlePointerMove,
        pointerEnd: handlePointerEnd,
        pointerLeave: handlePointerLeave,
        windowBlur: handleWindowBlur,
      })
    }
    resizeObserver?.disconnect()
    if (usedWindowResizeFallback)
    {
      hostWindow.removeEventListener('resize', resize)
    }
    if (canvas.parentElement === target)
    {
      target.removeChild(canvas)
    }
    if (shouldRestorePosition)
    {
      target.style.position = previousTargetPosition
    }
  }

  if (autoBindPointer)
  {
    addPointerInputListeners(boundListenTarget, target, hostWindow, {
      pointerDown: handlePointerDown,
      pointerMove: handlePointerMove,
      pointerEnd: handlePointerEnd,
      pointerLeave: handlePointerLeave,
      windowBlur: handleWindowBlur,
    })
  }

  if ('ResizeObserver' in window)
  {
    resizeObserver = new ResizeObserver(() => resize())
    resizeObserver.observe(target)
  } else
  {
    usedWindowResizeFallback = true
    hostWindow.addEventListener('resize', resize)
  }

  resize()
  requestAnimationFrame(render)

  const instance: InternalTouchEffectInstance = {
    canvas,
    triggerClickAtClient,
    triggerClickAtLocal,
    beginTrailAtClient,
    appendTrailAtClient,
    beginTrailAtLocal,
    appendTrailAtLocal,
    endTrail,
    endAllTrails,
    updateConfig,
    setDebugState,
    resize,
    dispose,
  }

  return instance
}
