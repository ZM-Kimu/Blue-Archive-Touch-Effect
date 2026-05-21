import assert from 'node:assert/strict'
import { dirname, resolve } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { importSourceModule } from '../helpers/source-module.mjs'

const testDir = dirname(fileURLToPath(import.meta.url))
const statePath = resolve(testDir, '../../src/state/index.ts')
const configPath = resolve(testDir, '../../src/config/index.ts')

const loadStateFixture = async () => {
  const state = await importSourceModule(statePath)
  const { createTouchEffectConfig } = await importSourceModule(configPath)
  const config = createTouchEffectConfig({
    swipe: {
      input: {
        minPointDistance: 0,
      },
      trail: {
        width: 0.0035,
        minVertexDistance: 0,
        lifetime: 0.29,
      },
      shards: {
        enabled: false,
      },
    },
  })

  return { state, config }
}

test('swipe strokes densify sparse movement into multiple trail points', async () => {
  const { state, config } = await loadStateFixture()
  const store = state.createSwipeStore()

  state.beginSwipeStroke(store, config, 0, 42, 100, 100, 1000, 1000)
  const appended = state.appendSwipeStrokePoint(store, config, 0.1, 42, 300, 100, 1000, 1000)
  const stroke = store.strokes.find((entry) => entry.pointerId === 42)

  assert.equal(appended, true)
  assert.ok(stroke.pointCount > 2)
  assert.equal(stroke.points[0].enabled, 1)
  assert.equal(stroke.points[stroke.pointCount - 1].cumulativeDistance > 0, true)
})

test('swipe strokes stop appending and expire after endAll', async () => {
  const { state, config } = await loadStateFixture()
  const store = state.createSwipeStore()

  state.beginSwipeStroke(store, config, 0, 7, 100, 100, 1000, 1000)
  state.beginSwipeStroke(store, config, 0, 8, 200, 100, 1000, 1000)
  state.appendSwipeStrokePoint(store, config, 0.1, 7, 300, 100, 1000, 1000)
  state.appendSwipeStrokePoint(store, config, 0.1, 8, 400, 100, 1000, 1000)

  state.endAllSwipeStrokes(store)

  assert.equal(store.strokes.find((entry) => entry.pointerId === 7).appending, 0)
  assert.equal(store.strokes.find((entry) => entry.pointerId === 8).appending, 0)

  state.updateSwipeActivity(store, 1)

  assert.equal(state.hasActiveSwipeContent(store), false)
})
