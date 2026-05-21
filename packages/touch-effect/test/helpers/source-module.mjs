import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { build } from 'esbuild'

let moduleId = 0

export const importSourceModule = async (entryPath) => {
  const result = await build({
    entryPoints: [entryPath],
    bundle: true,
    format: 'esm',
    platform: 'node',
    target: 'es2022',
    write: false,
    logLevel: 'silent',
  })

  const dir = await mkdtemp(join(tmpdir(), 'touch-effect-source-test-'))
  const filePath = join(dir, `${basename(entryPath, '.ts')}-${moduleId += 1}.mjs`)
  await writeFile(filePath, result.outputFiles[0].text)
  return import(pathToFileURL(filePath).href)
}
