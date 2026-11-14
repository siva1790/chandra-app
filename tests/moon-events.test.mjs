import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import * as Astronomy from 'astronomy-engine'
import { getMoonEventsForDate } from '../src/moonEvents.js'
import { dateFromKey, getCityPanchang, formatIndiaTime } from '../src/cityPanchang.js'
import { indianDateKey } from '../src/civilDate.js'

const city = { lat: 12.9716, lon: 77.5946 }

test('Bengaluru 1 December has no moonrise but retains its midday moonset', () => {
  const date = dateFromKey('2026-12-01')
  const original = date.getTime()
  const events = getMoonEventsForDate(date, city)
  assert.equal(events.moonrise, null)
  assert.equal(indianDateKey(events.moonset), '2026-12-01')
  assert.equal(formatIndiaTime(events.moonset), '12:27 PM')
  const publicPage = getCityPanchang('bengaluru', '2026-12-01')
  assert.equal(publicPage.moonrise, null)
  assert.equal(publicPage.moonset, events.moonset.toISOString())
  assert.equal(date.getTime(), original)
})

test('an absent rise is not replaced by the next day rise', () => {
  const missing = getMoonEventsForDate(dateFromKey('2026-12-01'), city)
  const next = getMoonEventsForDate(dateFromKey('2026-12-02'), city)
  assert.equal(missing.moonrise, null)
  assert.equal(indianDateKey(next.moonrise), '2026-12-02')
  assert.equal(formatIndiaTime(next.moonrise), '12:41 AM')
})

test('evening rises retain the dated following moonset', () => {
  const events = getMoonEventsForDate(dateFromKey('2026-06-02'), city)
  assert.equal(indianDateKey(events.moonrise), '2026-06-02')
  assert.equal(indianDateKey(events.moonset), '2026-06-03')
  assert.ok(events.moonset > events.moonrise)
  assert.equal(formatIndiaTime(events.moonset), '8:02 AM')
})

test('a day without a civil-day moonset can still show a correctly dated following moonset', () => {
  const date = dateFromKey('2026-11-17')
  const observer = new Astronomy.Observer(city.lat, city.lon, 0)
  assert.equal(Astronomy.SearchRiseSet('Moon', observer, -1, date, 1), null)
  const events = getMoonEventsForDate(date, city)
  assert.equal(indianDateKey(events.moonrise), '2026-11-17')
  assert.equal(indianDateKey(events.moonset), '2026-11-18')
  assert.equal(formatIndiaTime(events.moonset), '12:24 AM')
})

test('moon-event civil days are IST even on overseas devices', () => {
  const script = `import {getMoonEventsForDate} from './src/moonEvents.js';
    console.log(JSON.stringify(['2026-12-01','2026-11-17','2026-06-02'].map(key =>
      getMoonEventsForDate(new Date(key+'T00:00:00+05:30'),{lat:12.9716,lon:77.5946}))))`
  const outputs = ['Asia/Kolkata', 'UTC', 'America/Los_Angeles', 'Pacific/Auckland'].map(TZ =>
    execFileSync(process.execPath, ['--input-type=module', '-e', script], { env: { ...process.env, TZ }, encoding: 'utf8' }))
  for (const output of outputs) assert.equal(output, outputs[0])
})

test('a failed search is not reported as an absent moonrise', () => {
  assert.throws(() => getMoonEventsForDate(dateFromKey('2026-12-01'), { lat: 1000, lon: 77.5946 }))
})
