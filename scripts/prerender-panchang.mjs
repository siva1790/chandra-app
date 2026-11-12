import { readFile, writeFile } from 'node:fs/promises'
import { build } from 'vite'

// Bundle the same React view for Node, keeping browser-only providers out of SSR.
await build({
  configFile: false,
  esbuild: { jsx: 'automatic' },
  build: {
    ssr: 'src/entry-bengaluru-server.jsx', outDir: 'dist-ssr',
    rollupOptions: { output: { entryFileNames: 'bengaluru.js' } },
  },
})
const { render } = await import('../dist-ssr/bengaluru.js')
const { html, data } = render()
const path = new URL('../dist/panchang/bengaluru/index.html', import.meta.url)
const template = await readFile(path, 'utf8')
if (!template.includes('<!--panchang-html-->')) throw new Error('Missing Panchang HTML placeholder')
await writeFile(path, template
  .replace('<!--panchang-html-->', html)
  .replace('<script id="panchang-data" type="application/json">null</script>', `<script id="panchang-data" type="application/json">${data}</script>`))
console.log('Prerendered /panchang/bengaluru with a dated IST snapshot.')
