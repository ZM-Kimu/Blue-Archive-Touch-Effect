import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import test from 'node:test'

const distUrl = pathToFileURL(resolve('packages/touch-effect/dist/index.mjs')).href

test('built package exposes TouchEffect API and omits removed ClickFx names', async () => {
  const api = await import(distUrl)

  assert.equal(typeof api.createTouchEffect, 'function')
  assert.equal(typeof api.createTouchEffectConfig, 'function')
  assert.equal(typeof api.cloneTouchEffectConfig, 'function')
  assert.equal(typeof api.mergeTouchEffectConfig, 'function')
  assert.equal(typeof api.applyTouchEffectConfigConstraints, 'function')
  assert.equal(typeof api.defaultTouchEffectConfig, 'object')

  assert.equal('createClickFx' in api, false)
  assert.equal('createRuntimeConfig' in api, false)
  assert.equal('defaultRuntimeConfig' in api, false)
  assert.equal('spawnAtClient' in api, false)
  assert.equal('spawnAtLocal' in api, false)
  assert.equal('spawnClickAtClient' in api, false)
  assert.equal('spawnClickAtLocal' in api, false)
})

test('built config helpers deep-clone and merge partial config patches', async () => {
  const {
    cloneTouchEffectConfig,
    createTouchEffectConfig,
    defaultTouchEffectConfig,
    mergeTouchEffectConfig,
  } = await import(distUrl)

  const created = createTouchEffectConfig({
    mixer: { trailWeight: 0.42 },
    swipe: {
      trail: {
        alpha: { end: 0.25 },
      },
    },
  })

  assert.equal(created.mixer.trailWeight, 0.42)
  assert.equal(created.swipe.trail.alpha.end, 0.25)
  assert.notEqual(created, defaultTouchEffectConfig)
  assert.notEqual(created.swipe.trail.alpha, defaultTouchEffectConfig.swipe.trail.alpha)

  const cloned = cloneTouchEffectConfig(created)
  cloned.swipe.trail.alpha.end = 0.75
  assert.equal(created.swipe.trail.alpha.end, 0.25)

  mergeTouchEffectConfig(created, { mixer: { trailWeight: 2 } })
  assert.equal(created.mixer.trailWeight, 2)
})
