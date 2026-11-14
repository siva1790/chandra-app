import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { getPanchang, getDisplayMasa } from '../src/panchangCalculations.js'
import { getPanchaAngaAtSunrise, getKaranaFromPhase, getDailyTimingRanges } from '../src/panchangAnga.js'
import { getCityPanchang, dateFromKey } from '../src/cityPanchang.js'
import { PUBLIC_PANCHANG_CITIES } from '../src/publicPanchangCities.js'

// The app still uses the device's civil day; explicit IST migration is separate.
process.env.TZ = 'Asia/Kolkata'
const baseline = JSON.parse(readFileSync(new URL('./fixtures/panchang-before-extraction.json', import.meta.url), 'utf8'))

for (const { key, lat, lon, calendarSystem, result } of baseline) {
  test(`full Panchang preserves non-timing values: ${key}, ${calendarSystem}, ${lat}`, () => {
    const date = dateFromKey(key)
    const originalDate = date.getTime()
    const location = Object.freeze({ lat, lon, calendarSystem })
    const actual = getPanchang(date, location)
    // Old fixtures contain timing strings calculated from truncated inputs.
    // Everything else must retain the exact pre-extraction output.
    const { dailyTimings, ...unchanged } = actual
    const expected = { ...result }
    for (const field of ['rahuKaal', 'yamagandam', 'abhijitMuhurta', 'brahmaMuhurta']) delete expected[field]
    assert.deepEqual(JSON.parse(JSON.stringify(unchanged)), expected)
    assert.ok(Object.values(dailyTimings).flat().every(Number.isFinite))
    assert.equal(date.getTime(), originalDate, 'calculation must not mutate the selected date')
  })
}

test('app summaries and public pages share sunrise Pancha Anga for every enabled city', () => {
  for (const city of PUBLIC_PANCHANG_CITIES) {
    for (const key of ['2026-05-17', '2026-09-14', '2026-11-08']) {
      const date = dateFromKey(key)
      const app = getPanchaAngaAtSunrise(date, city)
      const explicit = getPanchaAngaAtSunrise(date, { ...city, utcOffsetMinutes: 330 })
      const page = getCityPanchang(city.slug, key)
      assert.deepEqual(explicit, app)
      assert.equal(page.sunrise, app.sunrise.toISOString())
      assert.equal(page.tithi, app.tithi.name)
      assert.equal(page.paksha, `${app.tithi.paksha} Paksha`)
      for (const field of ['nakshatra', 'yoga', 'karana', 'vara']) assert.equal(page[field], app[field])
    }
  }
})

test('shared summary Karana follows all 60 half-tithis, including the four fixed Karanas', () => {
  const expected = ['Kimstughna', ...Array.from({ length: 8 }, () =>
    ['Bava', 'Balava', 'Kaulava', 'Taitila', 'Garija', 'Vanija', 'Vishti']).flat(),
    'Shakuni', 'Chatushpada', 'Naga']
  expected.forEach((name, index) => {
    assert.equal(getKaranaFromPhase(index * 6), name)
    assert.equal(getKaranaFromPhase(index * 6 + 5.999), name)
  })
  // The previous Calendar-only `% 11` formula returned Vanija here.
  assert.equal(getKaranaFromPhase(30), 'Garija')
})

test('display masa retains the Krishna Paksha calendar-system adjustment', () => {
  const date = dateFromKey('2026-11-08')
  const { tithi } = getPanchaAngaAtSunrise(date, { lat: 12.9716, lon: 77.5946 })
  assert.equal(getDisplayMasa(date, tithi.number - 1, 'amavasyant'), 'Ashwin')
  assert.equal(getDisplayMasa(date, tithi.number - 1, 'purnimant'), 'Kartika')
})

test('daily timing rules preserve weekday slots and fixed durations in timestamps', () => {
  const rahuSlots = [8, 2, 7, 5, 6, 4, 3]
  const yamaSlots = [5, 4, 3, 2, 1, 7, 6]
  for (let weekday = 0; weekday < 7; weekday++) {
    const ranges = getDailyTimingRanges(360 * 60000, 1080 * 60000, weekday)
    assert.deepEqual(ranges.rahuKaal, [360 + (rahuSlots[weekday] - 1) * 90, 360 + rahuSlots[weekday] * 90].map(value => value * 60000))
    assert.deepEqual(ranges.yamagandam, [360 + (yamaSlots[weekday] - 1) * 90, 360 + yamaSlots[weekday] * 90].map(value => value * 60000))
    assert.deepEqual(ranges.abhijitMuhurta, [696, 744].map(value => value * 60000))
    assert.deepEqual(ranges.brahmaMuhurta, [264, 312].map(value => value * 60000))
  }
})
