import { RenderTarget, Renderer } from 'ogl'
import type { OGLRenderingContext } from 'ogl'
import type { HdrTargetSupport } from './types'

export const setRendererViewport = (
  renderer: Renderer,
  x: number,
  y: number,
  width: number,
  height: number
) =>
{
  renderer.gl.viewport(x, y, width, height)
  renderer.state.viewport.x = x
  renderer.state.viewport.y = y
  renderer.state.viewport.width = width
  renderer.state.viewport.height = height
}

export const detectHdrTargetSupport = (gl: OGLRenderingContext): HdrTargetSupport =>
{
  const supportsWebgl2 = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext
  if (!supportsWebgl2)
  {
    return {
      useHdr: false,
      type: gl.UNSIGNED_BYTE,
    }
  }

  const webgl2 = gl as WebGL2RenderingContext
  const hasColorBufferFloat = Boolean(webgl2.getExtension('EXT_color_buffer_float'))
  if (!hasColorBufferFloat)
  {
    return {
      useHdr: false,
      type: gl.UNSIGNED_BYTE,
    }
  }

  return {
    useHdr: true,
    type: webgl2.HALF_FLOAT,
    internalFormat: webgl2.RGBA16F,
  }
}

export const createRenderTargetOptions = (
  gl: OGLRenderingContext,
  hdrTargetSupport: HdrTargetSupport
) =>
{
  const options: Record<string, unknown> = {
    width: 1,
    height: 1,
    depth: false,
    stencil: false,
    wrapS: gl.CLAMP_TO_EDGE,
    wrapT: gl.CLAMP_TO_EDGE,
    minFilter: gl.LINEAR,
    magFilter: gl.LINEAR,
    format: gl.RGBA,
    type: hdrTargetSupport.type,
  }

  if (hdrTargetSupport.useHdr && hdrTargetSupport.internalFormat !== undefined)
  {
    options.internalFormat = hdrTargetSupport.internalFormat
  }

  return options
}

export const ensureRenderTargetSize = (target: RenderTarget, width: number, height: number) =>
{
  const safeWidth = Math.max(1, Math.floor(width))
  const safeHeight = Math.max(1, Math.floor(height))
  if (target.width === safeWidth && target.height === safeHeight)
  {
    return
  }

  target.setSize(safeWidth, safeHeight)
}

export const clearBoundTarget = (gl: OGLRenderingContext) =>
{
  gl.clearColor(0, 0, 0, 0)
  gl.clear(gl.COLOR_BUFFER_BIT)
}
