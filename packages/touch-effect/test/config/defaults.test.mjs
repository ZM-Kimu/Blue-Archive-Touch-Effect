import assert from 'node:assert/strict'
import { dirname, resolve } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { importSourceModule } from '../helpers/source-module.mjs'

const testDir = dirname(fileURLToPath(import.meta.url))
const configPath = resolve(testDir, '../../src/config/index.ts')

test('runtime defaults use tuned arc color and trail vertex distance', async () => {
  const { createTouchEffectConfig } = await importSourceModule(configPath)
  const config = createTouchEffectConfig()

  assert.deepEqual(config.arc.color, { r: 0x4C / 255, g: 0xA7 / 255, b: 1 })
  assert.equal(config.swipe.trail.minVertexDistance, 0.02)
})

test('trail defaults keep blue RGB while alpha fades to transparent', async () => {
  const { createTouchEffectConfig } = await importSourceModule(configPath)
  const config = createTouchEffectConfig()
  const blue0064ff = { r: 0, g: 0.39215687, b: 1 }

  assert.deepEqual(config.swipe.trail.startColor, blue0064ff)
  assert.deepEqual(config.swipe.trail.midColor, blue0064ff)
  assert.deepEqual(config.swipe.trail.endColor, blue0064ff)
  assert.deepEqual(config.swipe.trail.alpha, {
    start: 1,
    mid: 1,
    end: 0,
    midTime: 0.6,
  })
})
