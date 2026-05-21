import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import glsl from 'vite-plugin-glsl'

export default defineConfig({
  plugins: [glsl()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'BlueArchiveTouchEffect',
      formats: ['es', 'cjs'],
      fileName: (format) => format === 'es' ? 'index.mjs' : 'index.cjs',
    },
    sourcemap: true,
    target: 'es2022',
    rollupOptions: {
      external: ['ogl'],
    },
  },
})
