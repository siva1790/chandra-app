import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { PUBLIC_PANCHANG_CITIES } from '../src/publicPanchangCities.js'
import { LEARN_PATH } from '../src/publicLearn.js'

// The original city's document is the shared head template; body content is React.
const template = await readFile(new URL('../panchang/bengaluru/index.html', import.meta.url), 'utf8')
for (const city of PUBLIC_PANCHANG_CITIES) {
  if (city.slug === 'bengaluru') continue
  const directory = new URL(`../panchang/${city.slug}/`, import.meta.url)
  await mkdir(directory, { recursive: true })
  await writeFile(new URL('index.html', directory), template
    .replaceAll('Bengaluru (Bangalore)', city.displayName)
    .replaceAll('Bengaluru', city.name)
    .replaceAll('/panchang/bengaluru', city.path))
}

const configPath = new URL('../vercel.json', import.meta.url)
const config = JSON.parse(await readFile(configPath, 'utf8'))
const paths = [...PUBLIC_PANCHANG_CITIES.map(city => city.path), LEARN_PATH]
config.rewrites = paths.map(path => ({ source: path, destination: `${path}/index.html` }))
config.redirects = paths.flatMap(path => [
  { source: `${path}/`, destination: path, permanent: true },
  { source: `${path}/index.html`, destination: path, permanent: true },
])
await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`)
