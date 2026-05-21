import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'
import { constants } from 'node:fs'
import { dirname, resolve } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const testDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(testDir, '../../../..')
const touchEffectRoot = resolve(repoRoot, 'packages/touch-effect')

const exists = async (path) => {
  try {
    await access(path, constants.F_OK)
    return true
  } catch {
    return false
  }
}

const readSource = (path) => readFile(path, 'utf8')

test('workspace uses the touch-effect package directory and docs asset layout', async () => {
  assert.equal(await exists(touchEffectRoot), true)
  assert.equal(await exists(resolve(repoRoot, 'packages/click-fx')), false)
  assert.equal(await exists(resolve(repoRoot, 'docs/design.md')), true)
  assert.equal(await exists(resolve(repoRoot, 'docs/assets/cursor-demo.gif')), true)

  const rootPackageSource = await readSource(resolve(repoRoot, 'package.json'))
  assert.match(rootPackageSource, /packages\/touch-effect/)
  assert.doesNotMatch(rootPackageSource, /packages\/click-fx/)
})

test('package root exports only the new TouchEffect public API names', async () => {
  const indexSource = await readSource(resolve(touchEffectRoot, 'src/index.ts'))
  const typesSource = await readSource(resolve(touchEffectRoot, 'src/types/index.ts'))

  assert.match(indexSource, /createTouchEffect/)
  assert.match(indexSource, /createTouchEffectConfig/)
  assert.match(indexSource, /defaultTouchEffectConfig/)
  assert.match(typesSource, /export type CreateTouchEffectOptions/)
  assert.match(typesSource, /export type TouchEffectInstance/)
  assert.match(typesSource, /export type TouchEffectConfig/)

  assert.doesNotMatch(indexSource, /createClickFx|RuntimeConfig|ClickFxInstance/)
  assert.doesNotMatch(typesSource, /CreateClickFxOptions|ClickFxInstance|RuntimeConfig/)
})
