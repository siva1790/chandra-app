import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { LEARN_PATH, isPublicLearnPath } from '../src/publicLearn.js'

const html = (await readFile(new URL(`../dist${LEARN_PATH}/index.html`, import.meta.url), 'utf8')).replaceAll('<!-- -->', '')
test('Learn serves all eight topics as native accordions before JavaScript', () => {
  assert.match(html, /A Gentle Guide To Panchang Terms/)
  assert.match(html, /What you’ll learn/)
  assert.match(html, /8 topics · Learn at your own pace/)
  assert.match(html, /Compare the Amavasyant and Purnimant calendar traditions/)
  for (const id of ['basics', 'pancha-anga', 'daily-timings', 'nakshatra', 'month-year', 'navagraha', 'festivals-events', 'calendar-system']) {
    assert.match(html, new RegExp(`<details id="${id}"[^>]*>[\\s\\S]*?<summary`))
  }
  assert.equal([...html.matchAll(/<summary\b/g)].length, 8)
  assert.match(html, /Your selected city sets sunrise/)
  assert.match(html, /During Krishna Paksha/)
  assert.ok(!html.includes('<!--learn-html-->'))
  assert.ok(!html.includes('aria-label="Learning sections"'))
})
test('Learn has independent canonical and share metadata', () => {
  assert.equal([...html.matchAll(/rel="canonical"/g)].length, 1)
  assert.ok(html.includes(`rel="canonical" href="https://chandrapanchang.app${LEARN_PATH}"`))
  assert.match(html, /<title>Panchang Basics/)
  assert.ok(html.includes(`property="og:url" content="https://chandrapanchang.app${LEARN_PATH}"`))
  assert.match(html, /name="description" content="Understand Tithi/)
})
test('Learn assets exist and the entry excludes the personalized app and Firebase', async () => {
  assert.ok(!/\/assets\/main-/.test(html))
  const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"?#]+)"/g)].map(match => match[1])
  assert.ok(assets.some(asset => asset.endsWith('.js')))
  for (const asset of assets) {
    const content = await readFile(new URL(`../dist${asset}`, import.meta.url), 'utf8')
    assert.ok(content.length)
    if (asset.endsWith('.js')) assert.ok(!/firestore\.googleapis|firebaseinstallations\.googleapis/.test(content))
  }
})
test('Learn routing, canonical variants and sitemap entry are published together', async () => {
  const config = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'))
  assert.ok(config.rewrites.some(route => route.source === LEARN_PATH && route.destination === `${LEARN_PATH}/index.html`))
  for (const suffix of ['/', '/index.html']) {
    assert.ok(config.redirects.some(route => route.source === LEARN_PATH + suffix && route.destination === LEARN_PATH && route.permanent))
    assert.equal(isPublicLearnPath(LEARN_PATH + suffix), true)
  }
  assert.equal(isPublicLearnPath('/learn/unknown'), false)
  const sitemap = await readFile(new URL('../dist/sitemap.xml', import.meta.url), 'utf8')
  assert.ok(sitemap.includes(`https://chandrapanchang.app${LEARN_PATH}`))
  assert.ok(!sitemap.includes('#learn'))
})
