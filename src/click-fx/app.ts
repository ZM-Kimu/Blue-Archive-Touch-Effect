import { Mesh, Program, RenderTarget, Renderer, Triangle } from 'ogl'
import fragment from '../shaders/click-fx.frag'
import postFragment from '../shaders/post-fx.frag'
import vertex from '../shaders/click-fx.vert'
import {
  applyControlConstraints,
  defaultBranchVisibility,
  defaultConfig,
  defaultCorePreviewStage,
  defaultFragmentPreviewStage,
} from './config'
import { createBurstStore, spawnBurst, updateBurstActivity } from './state'
import { createDebugPanel } from './ui'
import { createUniformStore } from './uniforms'
import type { BranchKey, CorePreviewStage, FragmentPreviewStage } from './types'

export const bootstrapClickFx = () =>
{
  const app = document.querySelector<HTMLDivElement>('#app')

  if (!app)
  {
    throw new Error('App root not found')
  }

  const config = { ...defaultConfig }
  const branchVisibility = { ...defaultBranchVisibility }
  let corePreviewStage: CorePreviewStage = defaultCorePreviewStage
  let fragmentPreviewStage: FragmentPreviewStage = defaultFragmentPreviewStage

  const panelController = createDebugPanel({
    app,
    config,
    branchVisibility,
    getCorePreviewStage: () => corePreviewStage,
    getFragmentPreviewStage: () => fragmentPreviewStage,
    onControlChange: (key, value) =>
    {
      config[key] = value
      applyControlConstraints(config, key)
      syncControls()
    },
    onVisibilityChange: (key: BranchKey, value: boolean) =>
    {
      branchVisibility[key] = value
      syncControls()
    },
    onCorePreviewChange: (value) =>
    {
      corePreviewStage = value
      syncControls()
    },
    onFragmentPreviewChange: (value) =>
    {
      fragmentPreviewStage = value
      syncControls()
    },
  })

  const renderer = new Renderer({
    alpha: true,
    antialias: true,
    dpr: Math.min(window.devicePixelRatio, 2),
  })

  const gl = renderer.gl
  gl.clearColor(0, 0, 0, 1)
  renderer.setSize(window.innerWidth, window.innerHeight)

  gl.canvas.className = 'app-canvas'
  panelController.shell.prepend(gl.canvas)

  const geometry = new Triangle(gl)
  const sceneTarget = new RenderTarget(gl, {
    width: gl.canvas.width,
    height: gl.canvas.height,
    depth: false,
    stencil: false,
  })

  const uniformStore = createUniformStore(config, window.innerWidth, window.innerHeight, sceneTarget.texture)

  const program = new Program(gl, {
    vertex,
    fragment,
    uniforms: uniformStore.sceneUniforms,
  })

  const postProgram = new Program(gl, {
    vertex,
    fragment: postFragment,
    uniforms: uniformStore.postUniforms,
  })

  const mesh = new Mesh(gl, { geometry, program })
  const postMesh = new Mesh(gl, { geometry, program: postProgram })

  const burstStore = createBurstStore()
  let currentTime = 0

  const syncControls = () =>
  {
    uniformStore.syncStatic(config, branchVisibility, {
      core: corePreviewStage,
      fragment: fragmentPreviewStage,
    })
    panelController.sync()
  }

  const resize = () =>
  {
    renderer.setSize(window.innerWidth, window.innerHeight)
    sceneTarget.setSize(gl.canvas.width, gl.canvas.height)
    uniformStore.setResolution(window.innerWidth, window.innerHeight)
  }

  window.addEventListener('pointerdown', (event) =>
  {
    if (event.target instanceof HTMLElement && event.target.closest('.debug-panel'))
    {
      return
    }

    spawnBurst(
      burstStore,
      config,
      currentTime,
      event.clientX,
      event.clientY,
      window.innerWidth,
      window.innerHeight
    )
  })

  window.addEventListener('resize', resize)

  const render = (time: number) =>
  {
    currentTime = time * 0.001
    uniformStore.setTime(currentTime)
    updateBurstActivity(burstStore, currentTime)
    uniformStore.syncRuntime(burstStore.bursts)
    renderer.render({ scene: mesh, target: sceneTarget })
    renderer.render({ scene: postMesh })
    requestAnimationFrame(render)
  }

  syncControls()
  uniformStore.syncRuntime(burstStore.bursts)
  resize()
  requestAnimationFrame(render)
}
