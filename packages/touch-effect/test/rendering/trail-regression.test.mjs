import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const testDir = dirname(fileURLToPath(import.meta.url))
const runtimePath = resolve(testDir, '../../src/runtime/index.ts')
const inputPath = resolve(testDir, '../../src/runtime/dom.ts')
const typesPath = resolve(testDir, '../../src/types/index.ts')
const configPath = resolve(testDir, '../../src/config/index.ts')
const shaderPath = resolve(testDir, '../../src/rendering/shaders/swipe-trail.frag')
const trailRendererPath = resolve(testDir, '../../src/rendering/trail.ts')
const labConfigPath = resolve(testDir, '../../../../apps/lab/src/config/defaults.ts')

const readSource = (path) => readFile(path, 'utf8')

const sliceBlock = (source, startMarker, endMarker) => {
  const start = source.indexOf(startMarker)
  const end = source.indexOf(endMarker, start)
  assert.notEqual(start, -1, `Missing start marker: ${startMarker}`)
  assert.notEqual(end, -1, `Missing end marker: ${endMarker}`)
  return source.slice(start, end)
}

test('trail polyline explicitly uses premultiplied-alpha blending', async () => {
  const source = await readSource(trailRendererPath)
  const createTrailPolylineBlock = sliceBlock(source, 'const createTrailPolyline', 'const updateTrailPolyline')

  assert.match(
    createTrailPolylineBlock,
    /polyline\.mesh\.program\.setBlendFunc\(\s*gl\.ONE,\s*gl\.ONE_MINUS_SRC_ALPHA\s*\)/
  )
})

test('trail config exposes a separate alpha gradient with transparent end defaults', async () => {
  const typesSource = await readSource(typesPath)
  const configSource = await readSource(configPath)
  const swipeConfigBlock = sliceBlock(typesSource, 'export type SwipeConfig', 'export type CompositorConfig')
  const defaultTrailBlock = sliceBlock(configSource, '    trail: {', '    shards: {')
  const blue0064ff = /r:\s*0,\s*g:\s*0\.39215687,\s*b:\s*1,/

  assert.match(swipeConfigBlock, /alpha:\s*\{\s*start:\s*number\s*mid:\s*number\s*end:\s*number\s*midTime:\s*number\s*\}/)
  assert.match(defaultTrailBlock, /alpha:\s*\{\s*start:\s*1,\s*mid:\s*1,\s*end:\s*0,\s*midTime:\s*0\.6,\s*\}/)
  assert.match(defaultTrailBlock, new RegExp(`startColor:\\s*\\{\\s*${blue0064ff.source}\\s*\\}`))
  assert.match(defaultTrailBlock, new RegExp(`midColor:\\s*\\{\\s*${blue0064ff.source}\\s*\\}`))
  assert.match(defaultTrailBlock, new RegExp(`endColor:\\s*\\{\\s*${blue0064ff.source}\\s*\\}`))
  assert.doesNotMatch(defaultTrailBlock, /endColor:\s*\{\s*r:\s*0,\s*g:\s*0,\s*b:\s*0,\s*\}/)
})

test('trail shader uses alpha gradient instead of hardcoded age fade', async () => {
  const shaderSource = await readSource(shaderPath)

  assert.match(shaderSource, /uniform vec4 uTrailAlphaParams;/)
  assert.match(shaderSource, /float sampleTrailAlpha\(float age\)/)
  assert.match(shaderSource, /float alpha = sampleTrailAlpha\(age\) \* sampleTrailShape\(vUv\);/)
  assert.doesNotMatch(shaderSource, /float alpha = \(1\.0 - age\) \* sampleTrailShape\(vUv\);/)
})

test('runtime and lab expose trail alpha controls', async () => {
  const trailRendererSource = await readSource(trailRendererPath)
  const labConfigSource = await readSource(labConfigPath)

  assert.match(trailRendererSource, /uTrailAlphaParams:\s*\{\s*value:\s*\[1,\s*1,\s*0,\s*0\.6\]\s*\}/)
  assert.match(trailRendererSource, /polyline\.program\.uniforms\.uTrailAlphaParams\.value = \[/)
  assert.match(trailRendererSource, /config\.swipe\.trail\.alpha\.start/)
  assert.match(trailRendererSource, /config\.swipe\.trail\.alpha\.mid/)
  assert.match(trailRendererSource, /config\.swipe\.trail\.alpha\.end/)
  assert.match(trailRendererSource, /config\.swipe\.trail\.alpha\.midTime/)

  assert.match(labConfigSource, /path: 'swipe\.trail\.alpha\.start', label: 'Alpha Start'/)
  assert.match(labConfigSource, /path: 'swipe\.trail\.alpha\.mid', label: 'Alpha Mid'/)
  assert.match(labConfigSource, /path: 'swipe\.trail\.alpha\.end', label: 'Alpha End'/)
  assert.match(labConfigSource, /path: 'swipe\.trail\.alpha\.midTime', label: 'Alpha Mid Time'/)
})

test('pointer cleanup listeners are isolated in the input binding helper', async () => {
  const inputSource = await readSource(inputPath)

  assert.match(inputSource, /addPointerInputListeners/)
  assert.match(inputSource, /removePointerInputListeners/)
  assert.match(inputSource, /pointerleave/)
  assert.match(inputSource, /lostpointercapture/)
  assert.match(inputSource, /blur/)
})

test('pointer movement ends inactive mouse and pen strokes before coalesced events', async () => {
  const runtimeSource = await readSource(runtimePath)
  const handlePointerDownBlock = sliceBlock(runtimeSource, '  const handlePointerDown', '  const handlePointerMove')
  const handlePointerMoveBlock = sliceBlock(runtimeSource, '  const handlePointerMove', '  const handlePointerEnd')

  assert.match(runtimeSource, /const isSwipePointerActive = \(event: PointerEvent\) =>/)
  assert.match(runtimeSource, /event\.pointerType === 'mouse' \|\| event\.pointerType === 'pen'/)
  assert.match(runtimeSource, /return event\.buttons > 0/)
  assert.match(handlePointerDownBlock, /event\.button < 0 \|\| event\.button > 2/)
  assert.match(handlePointerMoveBlock, /if \(!isSwipePointerActive\(event\)\)\s*\{\s*endSwipeFromPointer\(event\)\s*return\s*\}/)
  assert.ok(
    handlePointerMoveBlock.indexOf('if (!isSwipePointerActive(event))') < handlePointerMoveBlock.indexOf('getCoalescedEvents'),
    'Pointer active-state check must happen before reading coalesced events.'
  )
})
