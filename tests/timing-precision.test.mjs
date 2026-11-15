import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import { getPanchang } from '../src/panchangCalculations.js'
import { getDailyTimingRanges } from '../src/panchangAnga.js'
import { getCityPanchang, dateFromKey, formatIndiaTime } from '../src/cityPanchang.js'
import { PUBLIC_PANCHANG_CITIES } from '../src/publicPanchangCities.js'
import { formatEventTime, formatEventDate, formatEventRange, roundTimeForDisplay } from '../src/timeFormatting.js'

const backend = createRequire(import.meta.url)('../functions/timeFormatting.js')
const { festivalEmail } = createRequire(import.meta.url)('../functions/emailTemplates.js')
process.env.TZ = 'Asia/Kolkata'

test('timing arithmetic retains seconds and fractional slot boundaries', () => {
  const sunrise = Date.parse('2026-11-01T06:12:13.123+05:30')
  const sunset = Date.parse('2026-11-01T18:23:47.987+05:30')
  const result = getDailyTimingRanges(sunrise, sunset, 0)
  const slot = (sunset - sunrise) / 8
  assert.deepEqual(result.rahuKaal, [sunrise + 7 * slot, sunset])
  assert.deepEqual(result.yamagandam, [sunrise + 4 * slot, sunrise + 5 * slot])
  assert.deepEqual(result.abhijitMuhurta, [(sunrise + sunset) / 2 - 24 * 60000, (sunrise + sunset) / 2 + 24 * 60000])
  assert.deepEqual(result.brahmaMuhurta, [sunrise - 96 * 60000, sunrise - 48 * 60000])
  assert.notEqual(result.rahuKaal[0] % 1000, 0, 'slot boundary must not be rounded to a second or minute')
})

test('all city pages and full Panchang retain the same raw Rahu boundaries', () => {
  for (const city of PUBLIC_PANCHANG_CITIES) {
    for (const key of ['2026-11-01', '2026-09-14']) {
      const page = getCityPanchang(city.slug, key)
      const full = getPanchang(dateFromKey(key), city)
      assert.equal(full.sunrise.toISOString(), page.sunrise)
      assert.equal(full.sunset.toISOString(), page.sunset)
      const [start, end] = full.dailyTimings.rahuKaal
      // The public JSON stores ISO timestamps, which have millisecond resolution.
      assert.ok(Math.abs(Date.parse(page.rahuStart) - start) < 1)
      assert.ok(Math.abs(Date.parse(page.rahuEnd) - end) < 1)
      assert.equal(formatEventRange(start, end), `${formatIndiaTime(page.rahuStart)} – ${formatIndiaTime(page.rahuEnd)}`)
    }
  }
})

test('minute display rounds once with correct hour, noon and midnight rollover', () => {
  const cases = [
    ['2026-11-01T06:12:29.999+05:30', '6:12 AM', '1 Nov'],
    ['2026-11-01T06:12:30.000+05:30', '6:13 AM', '1 Nov'],
    ['2026-11-01T10:59:45.000+05:30', '11:00 AM', '1 Nov'],
    ['2026-11-01T11:59:45.000+05:30', '12:00 PM', '1 Nov'],
    ['2026-11-01T23:59:45.000+05:30', '12:00 AM', '2 Nov'],
    ['2026-12-31T23:59:45.000+05:30', '12:00 AM', '1 Jan'],
  ]
  for (const [instant, time, date] of cases) {
    const original = new Date(instant)
    assert.equal(formatEventTime(original), time)
    assert.equal(formatEventDate(original), date)
    assert.equal(backend.formatEventTime(original), time)
    assert.equal(backend.formatEventDate(original), date)
    assert.equal(backend.roundTimeForDisplay(original).getTime(), roundTimeForDisplay(original).getTime())
    assert.equal(original.toISOString(), new Date(instant).toISOString(), 'display must not mutate raw events')
  }
})

test('email uses the rounded event time and matching event date without changing the raw moonrise', () => {
  const moonrise = new Date('2026-11-01T23:59:40+05:30')
  const { html } = festivalEmail({
    subscriber: { name: 'Test', city: 'Bengaluru' },
    festival: { name: 'Test festival', emoji: '🌕', description: 'Test' },
    tithi: { name: 'Purnima', paksha: 'Shukla' }, nakshatra: 'Rohini',
    moonrise, date: dateFromKey('2026-11-01'),
  })
  assert.ok(html.includes('12:00 AM, 2 Nov'))
  assert.equal(moonrise.toISOString(), '2026-11-01T18:29:40.000Z')
})

test('ranges use dates from rounded instants when display crosses midnight', () => {
  assert.equal(formatEventRange('2026-11-01T23:59:20+05:30', '2026-11-01T23:59:40+05:30'), '11:59 PM, 1 Nov – 12:00 AM, 2 Nov')
})

test('timing presentation uses IST independently of the browser or server timezone', () => {
  const script = `import { formatEventTime, formatEventDate } from './src/timeFormatting.js';
    console.log(formatEventTime('2026-11-01T18:29:40Z'), formatEventDate('2026-11-01T18:29:40Z'))`
  for (const TZ of ['Asia/Kolkata', 'UTC', 'America/Los_Angeles', 'Pacific/Auckland']) {
    assert.equal(execFileSync(process.execPath, ['--input-type=module', '-e', script], {
      env: { ...process.env, TZ }, encoding: 'utf8',
    }).trim(), '12:00 AM 2 Nov')
  }
})

test('precision correction resolves the previously mismatched Bengaluru timing', () => {
  const city = getCityPanchang('bengaluru', '2026-11-01')
  const full = getPanchang(dateFromKey('2026-11-01'), { lat: 12.9716, lon: 77.5946 })
  assert.equal(formatEventTime(full.dailyTimings.rahuKaal[0]), '4:26 PM')
  assert.equal(formatIndiaTime(city.rahuStart), '4:26 PM')
})
