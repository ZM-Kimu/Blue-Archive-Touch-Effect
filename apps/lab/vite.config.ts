import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import glsl from 'vite-plugin-glsl'

export default defineConfig({
  plugins: [glsl()],
  resolve: {
    alias: {
      'blue-archive-touch-effect': fileURLToPath(new URL('../../packages/touch-effect/src/index.ts', import.meta.url)),
    },
  },
})
