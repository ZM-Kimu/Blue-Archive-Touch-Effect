import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const testDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(testDir, '../../../..')
const runtimePath = resolve(repoRoot, 'packages/touch-effect/src/runtime/index.ts')
const trailRendererPath = resolve(repoRoot, 'packages/touch-effect/src/rendering/trail.ts')
const rootPackagePath = resolve(repoRoot, 'package.json')
const labViteConfigPath = resolve(repoRoot, 'apps/lab/vite.config.ts')
const ciWorkflowPath = resolve(repoRoot, '.github/workflows/ci.yml')
const publishWorkflowPath = resolve(repoRoot, '.github/workflows/publish.yml')
const labIndexPath = resolve(repoRoot, 'apps/lab/index.html')
const labPanelPath = resolve(repoRoot, 'apps/lab/src/controls/debug-panel.ts')
const designPath = resolve(repoRoot, 'docs/design.md')
const rootReadmePath = resolve(repoRoot, 'README.md')
const packageReadmePath = resolve(repoRoot, 'packages/touch-effect/README.md')

const readSource = (path) => readFile(path, 'utf8')

test('runtime sources do not keep avoidable any types or dead swipe imports', async () => {
  const runtimeSource = await readSource(runtimePath)
  const trailSource = await readSource(trailRendererPath)

  assert.doesNotMatch(runtimeSource, /\bMAX_SWIPE_POINTS_PER_STROKE\b/)
  assert.doesNotMatch(runtimeSource, /:\s*any\b/)
  assert.doesNotMatch(trailSource, /:\s*any\b/)
})

test('user-facing docs and lab labels use TouchEffect naming', async () => {
  const sources = await Promise.all([
    readSource(labIndexPath),
    readSource(labPanelPath),
    readSource(designPath),
    readSource(rootReadmePath),
    readSource(packageReadmePath),
  ])
  const combined = sources.join('\n')

  assert.doesNotMatch(combined, /Click FX VNext|Click FX Shader Lab|runtime config|partial runtime config|for spawning/)
})

test('lab dev resolves package imports to source and package artifacts pack outside root', async () => {
  const labViteConfigSource = await readSource(labViteConfigPath)
  const rootPackage = JSON.parse(await readSource(rootPackagePath))
  const ciWorkflowSource = await readSource(ciWorkflowPath)
  const publishWorkflowSource = await readSource(publishWorkflowPath)

  assert.match(labViteConfigSource, /blue-archive-touch-effect/)
  assert.match(labViteConfigSource, /packages\/touch-effect\/src\/index\.ts/)
  assert.doesNotMatch(rootPackage.scripts.verify, /npm test/)
  assert.match(rootPackage.scripts.verify, /pack:package/)
  assert.match(rootPackage.scripts['pack:package'], /--pack-destination\s+artifacts/)
  assert.match(ciWorkflowSource, /artifacts\/blue-archive-touch-effect-\*\.tgz/)
  assert.match(publishWorkflowSource, /artifacts\/blue-archive-touch-effect-\*\.tgz/)
})
