import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const html = await readFile(new URL('../dist/panchang/bengaluru/index.html', import.meta.url), 'utf8')

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
  assert.match(html, /\/assets\/bengaluru-/)
  assert.match(html, /href="\/#settings"/)
  assert.match(html, /href="\/#learn\/pancha-anga"/)
})
