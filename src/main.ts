import { Mesh, Program, Renderer, Triangle } from 'ogl'
import fragment from './shaders/click-fx.frag'
import vertex from './shaders/click-fx.vert'
import './styles.css'

const app = document.querySelector<HTMLDivElement>('#app')

if (!app) {
  throw new Error('App root not found')
}

const shell = document.createElement('main')
shell.className = 'app-shell'

const hud = document.createElement('aside')
hud.className = 'app-hud'
hud.innerHTML = '<strong>Shader Lab</strong><span>Scaffold ready for click FX iteration</span>'

shell.appendChild(hud)
app.appendChild(shell)

const renderer = new Renderer({
  alpha: true,
  antialias: true,
  dpr: Math.min(window.devicePixelRatio, 2),
})

const gl = renderer.gl
gl.clearColor(0.015, 0.03, 0.06, 1.0)
renderer.setSize(window.innerWidth, window.innerHeight)

gl.canvas.className = 'app-canvas'
shell.prepend(gl.canvas)

const geometry = new Triangle(gl)

const uniforms = {
  uTime: { value: 0 },
  uResolution: { value: [window.innerWidth, window.innerHeight] as [number, number] },
  uPointer: { value: [0.5, 0.5] as [number, number] },
}

const program = new Program(gl, {
  vertex,
  fragment,
  uniforms,
})

const mesh = new Mesh(gl, { geometry, program })

const updatePointer = (clientX: number, clientY: number) => {
  uniforms.uPointer.value = [
    clientX / window.innerWidth,
    1 - clientY / window.innerHeight,
  ]
}

window.addEventListener('pointermove', (event) => {
  updatePointer(event.clientX, event.clientY)
})

window.addEventListener('pointerdown', (event) => {
  updatePointer(event.clientX, event.clientY)
})

const resize = () => {
  renderer.setSize(window.innerWidth, window.innerHeight)
  uniforms.uResolution.value = [window.innerWidth, window.innerHeight]
}

window.addEventListener('resize', resize)

const render = (time: number) => {
  uniforms.uTime.value = time * 0.001
  renderer.render({ scene: mesh })
  requestAnimationFrame(render)
}

resize()
requestAnimationFrame(render)
