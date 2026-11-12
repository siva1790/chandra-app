import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { getCityPanchang } from '../src/cityPanchang.js'
import { PUBLIC_PANCHANG_CITIES, getPublicPanchangCity, getPublicPanchangCityFromPath } from '../src/publicPanchangCities.js'
import { getSunriseForDate, getTithiAtSunrise } from '../src/moonUtils.js'

test('only this rollout is enabled, including canonical Hyderabad spelling', () => {
  assert.deepEqual(PUBLIC_PANCHANG_CITIES.map(city => city.slug), ['bengaluru', 'chennai', 'pune', 'hyderabad', 'bhopal', 'patna', 'delhi', 'kolkata', 'mumbai'])
  for (const slug of ['hydrabad', 'kolkatta', 'unknown']) {
    assert.equal(getPublicPanchangCity(slug), undefined)
    assert.throws(() => getCityPanchang(slug))
  }
  assert.equal(getPublicPanchangCityFromPath('/panchang/chennai/index.html').slug, 'chennai')
  assert.equal(getPublicPanchangCityFromPath('/panchang/chennai-extra'), undefined)
})

test('all cities calculate using their own coordinates and shared sunrise helper', () => {
  const sunrises = new Set()
  for (const city of PUBLIC_PANCHANG_CITIES) {
    const date = new Date('2026-11-12T00:00:00+05:30')
    const data = getCityPanchang(city.slug, '2026-11-12')
    assert.equal(data.citySlug, city.slug)
    assert.equal(data.sunrise, getSunriseForDate(date, city.lat, city.lon, 330).toISOString())
    assert.equal(data.tithi, getTithiAtSunrise(date, city.lat, city.lon, 330).name)
    sunrises.add(data.sunrise)
  }
  assert.equal(sunrises.size, PUBLIC_PANCHANG_CITIES.length)
})

test('all city results are invariant across device timezones', () => {
  const script = `import {getCityPanchang} from './src/cityPanchang.js'; import {PUBLIC_PANCHANG_CITIES} from './src/publicPanchangCities.js'; console.log(JSON.stringify(PUBLIC_PANCHANG_CITIES.map(city=>getCityPanchang(city.slug,'2026-11-08'))))`
  const outputs = ['Asia/Kolkata', 'UTC', 'America/Los_Angeles'].map(TZ => execFileSync(process.execPath, ['--input-type=module', '-e', script], { env: { ...process.env, TZ }, encoding: 'utf8' }))
  for (const output of outputs) assert.equal(output, outputs[0])
})
