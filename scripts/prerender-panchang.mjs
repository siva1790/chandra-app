import { readFile, writeFile } from 'node:fs/promises'
import { build } from 'vite'
import { PUBLIC_PANCHANG_CITIES } from '../src/publicPanchangCities.js'

// Bundle the same React view for Node, keeping browser-only providers out of SSR.
await build({
  configFile: false,
  esbuild: { jsx: 'automatic' },
  build: {
    ssr: 'src/entry-city-panchang-server.jsx', outDir: 'dist-ssr',
    rollupOptions: { output: { entryFileNames: 'city-panchang.js' } },
  },
})
const { render } = await import('../dist-ssr/city-panchang.js')
for (const city of PUBLIC_PANCHANG_CITIES) {
  const { html, data } = render(city.slug)
  const path = new URL(`../dist${city.path}/index.html`, import.meta.url)
  const template = await readFile(path, 'utf8')
  if (!template.includes('<!--panchang-html-->')) throw new Error('Missing Panchang HTML placeholder')
  await writeFile(path, template
    .replace('<!--panchang-html-->', html)
    .replace('<script id="panchang-data" type="application/json">null</script>', `<script id="panchang-data" type="application/json">${data}</script>`))
  console.log(`Prerendered ${city.path} with a dated IST snapshot.`)
}

const urls = ['/', ...PUBLIC_PANCHANG_CITIES.map(city => city.path)]
await writeFile(new URL('../dist/sitemap.xml', import.meta.url), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(path => `<url><loc>https://chandrapanchang.app${path}</loc></url>`).join('')}</urlset>\n`)
await writeFile(new URL('../dist/robots.txt', import.meta.url), 'User-agent: *\nAllow: /\n\nSitemap: https://chandrapanchang.app/sitemap.xml\n')
