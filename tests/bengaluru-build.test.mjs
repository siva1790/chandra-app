import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const html = (await readFile(new URL('../dist/panchang/bengaluru/index.html', import.meta.url), 'utf8')).replaceAll('<!-- -->', '')

test('production HTML contains the answer and exact snapshot date before JavaScript', () => {
  assert.match(html, /<h1[^>]*>Bengaluru Panchang<\/h1>/)
  assert.match(html, /Pancha Anga/)
  assert.match(html, /Following moonset/)
  assert.match(html, /<time dateTime="\d{4}-\d{2}-\d{2}">/)
  assert.ok(!html.includes('<!--panchang-html-->'))
  const json = html.match(/<script id="panchang-data" type="application\/json">([\s\S]*?)<\/script>/)[1]
  const snapshot = JSON.parse(json)
  assert.ok(snapshot.tithi)
  assert.match(html, new RegExp(snapshot.dateKey))
})

test('public page has a single self canonical and unique metadata', () => {
  assert.equal([...html.matchAll(/rel="canonical"/g)].length, 1)
  assert.match(html, /rel="canonical" href="https:\/\/chandrapanchang.app\/panchang\/bengaluru"/)
  assert.match(html, /<title>Bengaluru Panchang/)
  assert.match(html, /property="og:url" content="https:\/\/chandrapanchang.app\/panchang\/bengaluru"/)
})

test('built local asset references resolve', async () => {
  const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"?#]+)"/g)].map(match => match[1])
  assert.ok(assets.length >= 2)
  for (const asset of assets) assert.ok((await readFile(new URL(`../dist${asset}`, import.meta.url))).length)
})

test('public entry does not pull the personalised app or Firebase bundle', () => {
  assert.ok(!/\/assets\/main-/.test(html))
  assert.match(html, /\/assets\/entry-city-panchang-/)
  assert.match(html, /href="\/#settings"/)
  assert.match(html, /href="\/#learn\/pancha-anga"/)
})


test('all five city pages have local content, unique metadata, and correct snapshots', async () => {
  const { PUBLIC_PANCHANG_CITIES } = await import('../src/publicPanchangCities.js')
  const { getCityPanchang } = await import('../src/cityPanchang.js')
  const config = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'))
  const sitemap = await readFile(new URL('../dist/sitemap.xml', import.meta.url), 'utf8')
  const robots = await readFile(new URL('../dist/robots.txt', import.meta.url), 'utf8')
  for (const city of PUBLIC_PANCHANG_CITIES) {
    const page = (await readFile(new URL(`../dist${city.path}/index.html`, import.meta.url), 'utf8')).replaceAll('<!-- -->', '')
    const snapshot = JSON.parse(page.match(/<script id="panchang-data" type="application\/json">([\s\S]*?)<\/script>/)[1])
    assert.equal(snapshot.citySlug, city.slug)
    assert.deepEqual(snapshot, getCityPanchang(city.slug, snapshot.dateKey))
    assert.ok(page.includes(`<title>${city.name} Panchang`))
    assert.ok(page.includes(`<h1 class="text-2xl font-bold text-chandra-text-primary">${city.name} Panchang</h1>`))
    assert.ok(page.includes(`rel="canonical" href="https://chandrapanchang.app${city.path}"`))
    assert.ok(page.includes(`${city.lat.toFixed(4)}° N`))
    assert.ok(page.includes('Go to homepage'))
    assert.ok(config.rewrites.some(route => route.source === city.path && route.destination === city.path + '/index.html'))
    assert.ok(sitemap.includes('https://chandrapanchang.app' + city.path))
  }
  assert.equal([...sitemap.matchAll(/<loc>/g)].length, 6)
  assert.ok(!sitemap.includes('/panchang/mumbai'))
  assert.ok(robots.includes('Sitemap: https://chandrapanchang.app/sitemap.xml'))
})
