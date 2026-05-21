import { Polyline, Vec3 } from 'ogl'
import type { OGLRenderingContext } from 'ogl'
import { MAX_SWIPE_POINTS_PER_STROKE } from '../core/constants'
import swipeTrailFragment from './shaders/swipe-trail.frag'
import swipeTrailVertex from './shaders/swipe-trail.vert'
import type { SwipeStrokeState, TouchEffectConfig } from '../types'

export type TrailRuntimeState = {
  width: number
  height: number
  dpr: number
}

export const createTrailPolyline = (gl: OGLRenderingContext) =>
{
  const points = Array.from({ length: MAX_SWIPE_POINTS_PER_STROKE }, () => new Vec3(-2, -2, 0))
  const ageData = new Float32Array(MAX_SWIPE_POINTS_PER_STROKE * 2)
  const polyline = new Polyline(gl, {
    points,
    vertex: swipeTrailVertex,
    fragment: swipeTrailFragment,
    uniforms: {
      uTrailStartColor: { value: [0, 0.39215687, 1] },
      uTrailMidColor: { value: [0, 0.39215687, 1] },
      uTrailEndColor: { value: [0, 0.39215687, 1] },
      uTrailParams: { value: [0.42058441, 8, 1, 0] },
      uTrailAlphaParams: { value: [1, 1, 0, 0.6] },
    },
    attributes: {
      age: { size: 1, data: ageData },
    },
  })

  polyline.mesh.frustumCulled = false
  polyline.mesh.program.transparent = true
  polyline.mesh.program.setBlendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
  polyline.mesh.program.depthTest = false
  polyline.mesh.program.depthWrite = false
  polyline.mesh.program.cullFace = false

  return {
    polyline,
    points,
    ageData,
  }
}

export const updateTrailPolyline = (
  stroke: SwipeStrokeState,
  trailPolyline: ReturnType<typeof createTrailPolyline>,
  config: TouchEffectConfig,
  runtimeState: TrailRuntimeState,
  currentTime: number
) =>
{
  const { polyline, points, ageData } = trailPolyline
  if (stroke.pointCount < 2)
  {
    return false
  }

  const originCssX = stroke.originX * runtimeState.width
  const originCssY = (1 - stroke.originY) * runtimeState.height
  const lastPoint = stroke.points[stroke.pointCount - 1]

  for (let index = 0; index < MAX_SWIPE_POINTS_PER_STROKE; index += 1)
  {
    const sourcePoint = index < stroke.pointCount ? stroke.points[index] : lastPoint
    const absoluteCssX = originCssX + sourcePoint.x * runtimeState.height
    const absoluteCssY = originCssY - sourcePoint.y * runtimeState.height
    const ndcX = absoluteCssX / Math.max(runtimeState.width, 1) * 2 - 1
    const ndcY = 1 - (absoluteCssY / Math.max(runtimeState.height, 1) * 2)

    points[index].set(ndcX, ndcY, 0)

    const age = Math.min(
      1,
      Math.max(0, (currentTime - sourcePoint.time) / Math.max(config.swipe.trail.lifetime, 0.0001))
    )
    ageData[index * 2] = age
    ageData[index * 2 + 1] = age
  }

  polyline.updateGeometry()
  polyline.geometry.attributes.age.needsUpdate = true
  polyline.resize()
  polyline.thickness.value = config.swipe.trail.width * runtimeState.height * runtimeState.dpr
  polyline.miter.value = config.swipe.trail.cornerVertices > 0 ? 1 : 0
  polyline.program.uniforms.uTrailStartColor.value = [
    config.swipe.trail.startColor.r,
    config.swipe.trail.startColor.g,
    config.swipe.trail.startColor.b,
  ]
  polyline.program.uniforms.uTrailMidColor.value = [
    config.swipe.trail.midColor.r,
    config.swipe.trail.midColor.g,
    config.swipe.trail.midColor.b,
  ]
  polyline.program.uniforms.uTrailEndColor.value = [
    config.swipe.trail.endColor.r,
    config.swipe.trail.endColor.g,
    config.swipe.trail.endColor.b,
  ]
  polyline.program.uniforms.uTrailParams.value = [
    config.swipe.trail.midTime,
    config.swipe.trail.intensity,
    0,
    0,
  ]
  polyline.program.uniforms.uTrailAlphaParams.value = [
    config.swipe.trail.alpha.start,
    config.swipe.trail.alpha.mid,
    config.swipe.trail.alpha.end,
    config.swipe.trail.alpha.midTime,
  ]
  return true
}
