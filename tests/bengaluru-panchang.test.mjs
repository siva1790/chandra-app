import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { getBengaluruPanchang, dateFromKey, nextIndianMidnight } from '../src/bengaluruPanchang.js'
import { indianDateKey, startOfCivilDay } from '../src/civilDate.js'
import { getTithiAtSunrise } from '../src/moonUtils.js'

test('Indian day changes at 18:30 UTC, independently of host timezone', () => {
  assert.equal(indianDateKey(new Date('2026-11-12T18:29:59Z')), '2026-11-12')
  assert.equal(indianDateKey(new Date('2026-11-12T18:30:00Z')), '2026-11-13')
  assert.equal(nextIndianMidnight(new Date('2026-11-12T18:29:59Z')).toISOString(), '2026-11-12T18:30:00.000Z')
})

test('invalid and overflowing dates are rejected', () => {
  for (const value of ['invalid', '2026-02-30', '2026-13-01', '2026-1-01']) {
    assert.throws(() => dateFromKey(value))
  }
})

test('May Amavasya boundary uses the shared sunrise convention', () => {
  assert.equal(getBengaluruPanchang('2026-05-16').tithi, 'Amavasya')
  assert.equal(getBengaluruPanchang('2026-05-17').tithi, 'Pratipada (Prathama)')
  // Festival ritual windows need not have the same tithi as sunrise.
  assert.ok(getBengaluruPanchang('2026-09-14').festivals.some(value => value.name === 'Ganesh Chaturthi'))
})

test('sunrise and tithi match the existing Bengaluru app in IST', () => {
  const script = `import {getBengaluruPanchang} from './src/bengaluruPanchang.js';
    import {getTithiAtSunrise,getSunriseForDate} from './src/moonUtils.js';
    for(const key of ['2026-05-16','2026-05-17','2026-09-14','2026-11-12']) {
      const date=new Date(key+'T00:00:00+05:30'); const result=getBengaluruPanchang(key);
      if(result.tithi!==getTithiAtSunrise(date,12.9716,77.5946).name || result.sunrise!==getSunriseForDate(date,12.9716,77.5946).toISOString()) throw Error(key);
    }`
  execFileSync(process.execPath, ['--input-type=module', '-e', script], { env: { ...process.env, TZ: 'Asia/Kolkata' } })
})

test('Indian results stay identical in UTC and overseas device timezones', () => {
  const script = `import {getBengaluruPanchang} from './src/bengaluruPanchang.js';
    console.log(JSON.stringify(['2026-05-17','2026-09-14','2026-11-08','2026-11-12','2027-01-15'].map(getBengaluruPanchang)))`
  const results = ['Asia/Kolkata', 'UTC', 'America/Los_Angeles', 'Pacific/Auckland'].map(TZ =>
    execFileSync(process.execPath, ['--input-type=module', '-e', script], { env: { ...process.env, TZ }, encoding: 'utf8' }))
  for (const result of results) assert.equal(result, results[0])
})

test('paired moonset retains the next civil day', () => {
  const result = getBengaluruPanchang('2026-06-02')
  assert.equal(indianDateKey(new Date(result.moonrise)), '2026-06-02')
  assert.equal(indianDateKey(new Date(result.moonset)), '2026-06-03')
  assert.ok(new Date(result.moonset) > new Date(result.moonrise))
})

test('days without moonrise do not fabricate an event', () => {
  const results = Array.from({ length: 30 }, (_, index) => getBengaluruPanchang(`2026-06-${String(index + 1).padStart(2, '0')}`))
  const noRise = results.find(value => !value.moonrise)
  assert.ok(noRise)
  assert.equal(noRise.moonset, null)
})

test('Rahu Kaal follows the correct weekday slot', () => {
  for (let day = 8; day <= 14; day++) {
    const result = getBengaluruPanchang(`2026-11-${String(day).padStart(2, '0')}`)
    const sunrise = new Date(result.sunrise).getTime()
    const slot = (new Date(result.sunset).getTime() - sunrise) / 8
    assert.ok(Math.abs(new Date(result.rahuStart).getTime() - (sunrise + ([8, 2, 7, 5, 6, 4, 3][day - 8] - 1) * slot)) < 2)
  }
})

test('Diwali remains correct across the documented 2026–2030 sweep', () => {
  for (const key of ['2026-11-08', '2027-10-29', '2028-10-17', '2029-11-05', '2030-10-26']) {
    assert.ok(getBengaluruPanchang(key).festivals.some(value => value.name.includes('Diwali')), key)
  }
})

test('optional explicit offset leaves the sunrise tithi helper compatible', () => {
  const date = new Date('2026-11-12T00:00:00+05:30')
  assert.equal(startOfCivilDay(date, 330).toISOString(), date.toISOString())
  assert.equal(getBengaluruPanchang('2026-11-12').tithi, getTithiAtSunrise(date, 12.9716, 77.5946, 330).name)
})
