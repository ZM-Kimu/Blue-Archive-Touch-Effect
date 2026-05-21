import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const testDir = dirname(fileURLToPath(import.meta.url))
const configPath = resolve(testDir, '../src/config.ts')

const readSource = (path) => readFile(path, 'utf8')

const sliceBlock = (source, startMarker, endMarker) => {
  const start = source.indexOf(startMarker)
  const end = source.indexOf(endMarker, start)
  assert.notEqual(start, -1, `Missing start marker: ${startMarker}`)
  assert.notEqual(end, -1, `Missing end marker: ${endMarker}`)
  return source.slice(start, end)
}

test('runtime defaults use tuned arc color and trail vertex distance', async () => {
  const source = await readSource(configPath)
  const arcBlock = sliceBlock(source, '  arc: {', '  disk: {')
  const swipeTrailBlock = sliceBlock(source, '    trail: {', '    shards: {')

  assert.match(arcBlock, /color:\s*\{\s*r:\s*0x4C \/ 255,\s*g:\s*0xA7 \/ 255,\s*b:\s*1,\s*\}/)
  assert.match(swipeTrailBlock, /minVertexDistance:\s*0\.02,/)
})
