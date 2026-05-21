import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const testDir = dirname(fileURLToPath(import.meta.url))
const runtimePath = resolve(testDir, '../src/runtime.ts')
const typesPath = resolve(testDir, '../src/types.ts')

const readSource = (path) => readFile(path, 'utf8')

const sliceBlock = (source, startMarker, endMarker) => {
  const start = source.indexOf(startMarker)
  const end = source.indexOf(endMarker, start)
  assert.notEqual(start, -1, `Missing start marker: ${startMarker}`)
  assert.notEqual(end, -1, `Missing end marker: ${endMarker}`)
  return source.slice(start, end)
}

test('public instance exposes explicit click and trail trigger APIs', async () => {
  const typesSource = await readSource(typesPath)
  const runtimeSource = await readSource(runtimePath)
  const instanceTypeBlock = sliceBlock(typesSource, 'export type ClickFxInstance', '\n}')
  const runtimeHelpersBlock = sliceBlock(runtimeSource, '  const spawnAtLocal', '  const beginSwipeFromPointer')
  const instanceBlock = sliceBlock(runtimeSource, '  const instance: InternalClickFxInstance = {', '  return instance')

  assert.match(instanceTypeBlock, /spawnClickAtClient: \(clientX: number, clientY: number\) => void/)
  assert.match(instanceTypeBlock, /spawnClickAtLocal: \(x: number, y: number\) => void/)
  assert.match(instanceTypeBlock, /beginTrailAtClient: \(pointerId: number, clientX: number, clientY: number\) => void/)
  assert.match(instanceTypeBlock, /appendTrailAtClient: \(pointerId: number, clientX: number, clientY: number\) => boolean/)
  assert.match(instanceTypeBlock, /beginTrailAtLocal: \(pointerId: number, x: number, y: number\) => void/)
  assert.match(instanceTypeBlock, /appendTrailAtLocal: \(pointerId: number, x: number, y: number\) => boolean/)
  assert.match(instanceTypeBlock, /endTrail: \(pointerId: number\) => void/)
  assert.match(instanceTypeBlock, /endAllTrails: \(\) => void/)

  assert.match(runtimeHelpersBlock, /const spawnClickAtClient = spawnAtClient/)
  assert.match(runtimeHelpersBlock, /const spawnClickAtLocal = spawnAtLocal/)
  assert.match(runtimeHelpersBlock, /const beginTrailAtClient = \(pointerId: number, clientX: number, clientY: number, timeSeconds\?: number\) =>/)
  assert.match(runtimeHelpersBlock, /const appendTrailAtClient = \(pointerId: number, clientX: number, clientY: number, timeSeconds\?: number\) =>/)
  assert.match(runtimeHelpersBlock, /const beginTrailAtLocal = \(pointerId: number, x: number, y: number, timeSeconds\?: number\) =>/)
  assert.match(runtimeHelpersBlock, /const appendTrailAtLocal = \(pointerId: number, x: number, y: number, timeSeconds\?: number\) =>/)
  assert.match(runtimeHelpersBlock, /const endTrail = \(pointerId: number\) =>/)
  assert.match(runtimeHelpersBlock, /const endAllTrails = \(\) =>/)
  assert.match(runtimeHelpersBlock, /beginSwipeStroke\(\s*swipeStore,/)
  assert.match(runtimeHelpersBlock, /appendSwipeStrokePoint\(\s*swipeStore,/)
  assert.match(runtimeHelpersBlock, /endSwipeStroke\(swipeStore, pointerId\)/)
  assert.match(runtimeHelpersBlock, /endAllSwipeStrokes\(swipeStore\)/)

  assert.match(instanceBlock, /spawnClickAtClient,/)
  assert.match(instanceBlock, /spawnClickAtLocal,/)
  assert.match(instanceBlock, /beginTrailAtClient,/)
  assert.match(instanceBlock, /appendTrailAtClient,/)
  assert.match(instanceBlock, /beginTrailAtLocal,/)
  assert.match(instanceBlock, /appendTrailAtLocal,/)
  assert.match(instanceBlock, /endTrail,/)
  assert.match(instanceBlock, /endAllTrails,/)
})

test('automatic pointer handlers use the public trail lifecycle helpers', async () => {
  const runtimeSource = await readSource(runtimePath)
  const beginSwipeFromPointerBlock = sliceBlock(runtimeSource, '  const beginSwipeFromPointer', '  const handlePointerDown')
  const handlePointerMoveBlock = sliceBlock(runtimeSource, '  const handlePointerMove', '  const handlePointerEnd')
  const handleWindowBlurBlock = sliceBlock(runtimeSource, '  const handleWindowBlur', '  const updateConfig')

  assert.match(beginSwipeFromPointerBlock, /beginTrailAtClient\(event\.pointerId, event\.clientX, event\.clientY\)/)
  assert.match(handlePointerMoveBlock, /appendTrailAtClient\(\s*event\.pointerId,\s*pointerEvent\.clientX,\s*pointerEvent\.clientY,\s*pointerTime\s*\)/)
  assert.match(handleWindowBlurBlock, /endAllTrails\(\)/)
})
