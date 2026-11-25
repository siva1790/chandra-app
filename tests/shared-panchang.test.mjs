import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { getAdditionalTithi, getPanchang, getDisplayMasa, getLunarMonthLabels, getTithiTimeline } from '../src/panchangCalculations.js'
import { getPanchaAngaAtSunrise, getKaranaFromPhase, getDailyTimingRanges } from '../src/panchangAnga.js'
import { getCityPanchang, dateFromKey } from '../src/cityPanchang.js'
import { PUBLIC_PANCHANG_CITIES } from '../src/publicPanchangCities.js'
import { getCalendarTithiName, getRegionalFestivals, getRegionalMonth } from '../src/regionalCalendar.js'
import { DAY_MS, pickerDateFromKey } from '../src/civilDate.js'
import { getCalendarEvents } from '../src/calendarEvents.js'
import { getTamilSolarDate } from '../src/tamilSolarCalendar.js'
import { cities } from '../src/cities.js'
import { getMoonPhaseAngle, getSunriseForDate, getTithiFromAngle } from '../src/moonUtils.js'

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
    const { dailyTimings, sunrise, sunset, ...unchanged } = actual
    const expected = { ...result }
    for (const field of ['rahuKaal', 'yamagandam', 'abhijitMuhurta', 'brahmaMuhurta']) delete expected[field]
    assert.deepEqual(JSON.parse(JSON.stringify(unchanged)), expected)
    assert.ok(Object.values(dailyTimings).flat().every(Number.isFinite))
    assert.ok(sunrise instanceof Date && sunset instanceof Date)
    assert.ok(sunset > sunrise)
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
  const snapshot = getPanchaAngaAtSunrise(date, { lat: 12.9716, lon: 77.5946 })
  assert.equal(getDisplayMasa(snapshot, 'amavasyant'), 'Ashwin')
  assert.equal(getDisplayMasa(snapshot, 'purnimant'), 'Kartika')
})

test('display masa and Paksha use the same city sunrise across full-moon boundaries', () => {
  const cases = [
    { key: '2027-02-21', cityName: 'Bengaluru', paksha: 'Krishna', amavasyant: 'Magha', purnimant: 'Phalguna' },
    { key: '2026-08-28', cityName: 'Bengaluru', paksha: 'Shukla', amavasyant: 'Bhadrapada', purnimant: 'Bhadrapada' },
    { key: '2026-06-30', cityName: 'Bengaluru', paksha: 'Krishna', amavasyant: 'Ashadha', purnimant: 'Shravana' },
    { key: '2026-06-30', cityName: 'Kolkata', paksha: 'Shukla', amavasyant: 'Ashadha', purnimant: 'Ashadha' },
  ]

  for (const { key, cityName, paksha, amavasyant, purnimant } of cases) {
    const city = PUBLIC_PANCHANG_CITIES.find(({ name }) => name === cityName)
    for (const time of ['00:00', '12:00']) {
      const date = new Date(`${key}T${time}:00+05:30`)
      const snapshot = getPanchaAngaAtSunrise(date, city)
      const context = `${cityName}, ${key} at ${time}`
      assert.equal(snapshot.tithi.paksha, paksha, context)
      for (const [calendarSystem, expected] of [['Amavasyant', amavasyant], ['Purnimant', purnimant]]) {
        assert.equal(getDisplayMasa(snapshot, calendarSystem.toLowerCase()), expected, context)
        assert.equal(getPanchang(date, { ...city, calendarSystem }).masa, expected, context)
      }
    }
  }
})

test('homepage lunar months share sunrise and retain both Adhik fortnights', () => {
  const cases = [
    ['2026-05-02', 'Vaishakha', 'Jyeshtha'],
    ['2026-05-31', 'Adhik Jyeshtha', 'Adhik Jyeshtha'],
    ['2026-06-01', 'Adhik Jyeshtha', 'Adhik Jyeshtha'],
    ['2026-06-16', 'Jyeshtha', 'Jyeshtha'],
    ['2026-11-08', 'Ashwin', 'Kartika'],
    ['2027-02-21', 'Magha', 'Phalguna'],
  ]
  for (const [key, amavasyant, purnimant] of cases) {
    const { sunrise, paksha } = getPanchang(dateFromKey(key), { lat: 12.9716, lon: 77.5946 })
    assert.deepEqual(getLunarMonthLabels(sunrise, paksha), { amavasyant, purnimant }, key)
  }
})

test('regional calendar changes month and terminology using the same sunrise', () => {
  const date = dateFromKey('2026-11-25')
  const chennai = PUBLIC_PANCHANG_CITIES.find(city => city.slug === 'chennai')
  const location = { ...chennai, utcOffsetMinutes: 330 }
  const snapshot = getPanchaAngaAtSunrise(date, location)
  assert.equal(snapshot.tithi.paksha, 'Krishna')
  assert.deepEqual(getRegionalMonth(date, snapshot, location, 'tamil'), { name: 'Karthigai', day: 9 })
  assert.equal(getRegionalMonth(date, snapshot, location, 'telugu').name, 'Karthikamu')
  assert.equal(getRegionalMonth(date, snapshot, location, 'ujjain').name, 'Margashirsha')
  assert.deepEqual(
    ['tamil', 'telugu', 'ujjain'].map(tradition => getCalendarTithiName(snapshot.tithi, tradition)),
    ['Pirathamai', 'Padyami', 'Pratipada'],
  )
})

test('regional festivals retain the chosen city and handle sunrise and intercalary edge cases', () => {
  const cases = [
    ['Chennai', 'tamil', '2027-04-13', 'Puthandu', false],
    ['Chennai', 'tamil', '2027-04-14', 'Puthandu', true],
    ['Chennai', 'tamil', '2028-11-15', 'Deepavali', false],
    ['Chennai', 'tamil', '2031-11-13', 'Deepavali', true],
    ['Hyderabad', 'telugu', '2026-03-19', 'Ugadi', true],
    ['Hyderabad', 'telugu', '2028-03-26', 'Ugadi', false],
    ['Hyderabad', 'telugu', '2028-03-27', 'Ugadi', true],
    ['Bhopal', 'ujjain', '2029-04-14', 'Chaitra Navratri Begins', true],
  ]
  for (const [name, tradition, key, festival, expected] of cases) {
    const city = PUBLIC_PANCHANG_CITIES.find(entry => entry.name === name)
    const date = dateFromKey(key)
    const location = { ...city, utcOffsetMinutes: 330 }
    const snapshot = getPanchaAngaAtSunrise(date, location)
    const month = getRegionalMonth(date, snapshot, location, tradition)
    const entries = getRegionalFestivals(date, snapshot, location, tradition, month)
    assert.equal(entries.some(entry => entry.name === festival), expected, `${name} ${key}`)
  }
})

test('a festival and sunset-based Pradosh both appear when sunrise is Dwadashi', () => {
  const key = '2026-11-06'
  const city = { lat: 12.9716, lon: 77.5946 }
  const sunrise = getPanchaAngaAtSunrise(dateFromKey(key), { ...city, utcOffsetMinutes: 330 })
  assert.equal(sunrise.tithi.adjustedNumber, 12)
  const matches = getCalendarEvents(pickerDateFromKey(key), city, sunrise)
  assert.deepEqual(matches.map(event => [event.name, event.filters]), [
    ['Dhanteras', ['festival']],
    ['Shukra Pradosh Vrat', ['pradosh']],
  ])
  assert.deepEqual(getCalendarEvents(pickerDateFromKey(key), { ...city, calendarSystem: 'Purnimant' }), matches)
  const fallback = getCalendarEvents(pickerDateFromKey('2029-11-04'), city)
  assert.ok(fallback.some(event => event.id === 'dhanteras'))
  assert.equal(fallback.find(event => event.id === 'pradosh')?.description, 'Trayodashi observance for Lord Shiva')
  assert.ok(!getCalendarEvents(pickerDateFromKey('2029-11-03'), city).some(event => event.id === 'pradosh'))
})

test('Smarta Ekadashi handles repeated, skipped and Adhik Masa tithis', () => {
  const city = { lat: 13.6288, lon: 79.4192, calendarTradition: 'telugu' }
  const cases = [
    ['2026-05-26', 11, undefined],
    ['2026-05-27', 11, 'Padmini Ekadashi'],
    ['2026-06-11', 11, 'Parama Ekadashi'],
    ['2026-11-20', 10, 'Devutthana Ekadashi'],
    ['2026-11-21', 11, undefined],
    ['2027-07-29', 10, 'Kamika Ekadashi'],
    ['2027-07-30', 12, undefined],
  ]
  for (const [key, tithi, expected] of cases) {
    const snapshot = getPanchaAngaAtSunrise(dateFromKey(key), { ...city, utcOffsetMinutes: 330 })
    assert.equal(snapshot.tithi.adjustedNumber, tithi, key)
    const event = getCalendarEvents(pickerDateFromKey(key), city).find(event => event.id === 'ekadashi')
    assert.equal(event?.name, expected, key)
  }
})

test('event IDs and filters follow festival and observance rules across traditions', () => {
  const chennai = { lat: 13.0827, lon: 80.2707, calendarTradition: 'tamil' }
  const tirupati = { lat: 13.6288, lon: 79.4192, calendarTradition: 'telugu' }
  const ujjain = { lat: 23.18239, lon: 75.77643, calendarTradition: 'ujjain' }
  const cases = [
    [tirupati, '2026-09-14', 'ganesh-chaturthi', 'Vinayaka Chavithi'],
    [chennai, '2027-09-04', 'ganesh-chaturthi', 'Vinayagar Chathurthi'],
    [ujjain, '2028-10-17', 'diwali-deepavali', 'Diwali'],
    [ujjain, '2029-04-22', 'ram-navami', 'Ram Navami'],
    [chennai, '2029-04-23', 'ram-navami', 'Rama Navami'],
    [chennai, '2030-10-26', 'diwali-deepavali', 'Deepavali'],
    [chennai, '2030-08-03', 'aadi-perukku', 'Aadi Perukku'],
  ]
  for (const [city, date, id, name] of cases) {
    const matches = getCalendarEvents(pickerDateFromKey(date), city)
    const event = matches.find(event => event.id === id)
    assert.equal(event?.name, name, date)
    assert.equal(event?.key, `${date}-${id}`)
    assert.deepEqual(event?.filters, ['festival'])
  }
  const bengaluru = { lat: 12.9716, lon: 77.5946 }
  const eventsOn = date => getCalendarEvents(pickerDateFromKey(date), bengaluru)
  assert.equal(eventsOn('2027-01-14').some(event => event.id === 'makar-sankranti-pongal'), false)
  assert.equal(eventsOn('2027-01-15').some(event => event.id === 'makar-sankranti-pongal'), true)
  assert.deepEqual(eventsOn('2026-08-12').find(event => event.eclipse)?.filters, ['astronomical'])
})

test('regional observances use the same IDs and dates in monthly lists and day summaries', () => {
  const tamil = { lat: 13.0827, lon: 80.2707, calendarTradition: 'tamil' }
  const telugu = { lat: 13.6288, lon: 79.4192, calendarTradition: 'telugu' }
  const on = (key, city) => getCalendarEvents(pickerDateFromKey(key), city)
  const finds = (key, city, id) => on(key, city).find(event => event.id === id)
  assert.equal(finds('2026-02-22', tamil, 'sashti')?.name, 'Sashti')
  assert.equal(finds('2026-02-23', tamil, 'sashti'), undefined)
  assert.equal(finds('2026-02-22', telugu, 'sashti'), undefined)
  assert.deepEqual(finds('2026-12-15', telugu, 'sashti')?.filters, ['sashti', 'festival'])
  assert.deepEqual(finds('2026-12-01', telugu, 'kalashtami')?.filters, ['kalashtami', 'festival'])
  assert.equal(finds('2026-12-30', telugu, 'kalashtami')?.name, 'Kalabhairava Ashtami')
  assert.equal(finds('2026-11-07', tamil, 'masik-shivaratri')?.name, 'Maadha Shivaratri')
  assert.equal(finds('2026-11-07', telugu, 'masik-shivaratri')?.name, 'Masa Shivaratri')
  assert.equal(finds('2026-11-27', tamil, 'sankashti-chaturthi')?.name, 'Sankatahara Chaturthi')
  assert.equal(finds('2026-11-27', telugu, 'sankashti-chaturthi')?.name, 'Sankatahara Chaturthi')
  for (const city of [tamil, telugu, { ...tamil, calendarTradition: null }]) {
    assert.equal(finds('2026-11-13', city, 'vinayaka-chaturthi'), undefined)
  }
})

test('Krithigai follows Krittika Nakshatra once per transit in the Tamil tradition', () => {
  const chennai = { lat: 13.0827, lon: 80.2707, calendarTradition: 'tamil' }
  for (const key of ['2026-11-24', '2027-11-14', '2028-12-01', '2029-11-20', '2030-11-10']) {
    const date = pickerDateFromKey(key)
    const hasKrithigai = (date, city) => getCalendarEvents(date, city).some(event => event.filters.includes('krithigai'))
    assert.ok(hasKrithigai(date, chennai), key)
    assert.ok(!hasKrithigai(new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1), chennai), key)
    assert.ok(!hasKrithigai(new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1), chennai), key)
    assert.ok(!hasKrithigai(date, { ...chennai, calendarTradition: 'telugu' }), key)
  }
})

test('Ujjain lists waxing Vinayaka Chaturti and Durgashtami under their own filters', () => {
  const city = { lat: 23.18239, lon: 75.77643, calendarTradition: 'ujjain' }
  const on = key => getCalendarEvents(pickerDateFromKey(key), city)
  assert.deepEqual(on('2026-11-13').find(event => event.name === 'Vinayaka Chaturti')?.filters, ['vinayaka-chaturthi'])
  assert.deepEqual(on('2026-11-17').find(event => event.name === 'Masik Durgashtami')?.filters, ['masik-durgashtami'])
  assert.deepEqual(on('2026-11-27').find(event => event.name === 'Sankashti Chaturthi')?.filters, ['sankashti-chaturthi'])
  assert.deepEqual(on('2026-09-14').find(event => event.id === 'ganesh-chaturthi')?.filters, ['festival'])
  assert.ok(!on('2026-09-14').some(event => event.id === 'vinayaka-chaturthi'))
  assert.ok(!getCalendarEvents(pickerDateFromKey('2026-11-17'), { ...city, calendarTradition: 'tamil' })
    .some(event => event.id === 'masik-durgashtami'))
})

test('Moon phases shows localized Purnima and Amavasya, including a skipped sunrise tithi', () => {
  const city = { lat: 23.18239, lon: 75.77643 }
  const phases = (key, calendarTradition) => getCalendarEvents(pickerDateFromKey(key), { ...city, calendarTradition })
    .filter(event => event.filters.includes('moon-phases'))
    .map(event => event.name)
  for (const [tradition, fullMoon, newMoon] of [
    [null, 'Purnima', 'Amavasya'],
    ['tamil', 'Pournami', 'Amavasai'],
    ['telugu', 'Pournami', 'Amavasya'],
    ['ujjain', 'Purnima', 'Amavasya'],
  ]) {
    assert.deepEqual(phases('2026-11-24', tradition), [fullMoon])
    assert.deepEqual(phases('2026-11-09', tradition), [newMoon])
  }
  const skipped = getPanchaAngaAtSunrise(dateFromKey('2026-12-23'), { ...city, utcOffsetMinutes: 330 })
  assert.equal(skipped.tithi.adjustedNumber, 14)
  assert.deepEqual(phases('2026-12-23', 'ujjain'), ['Purnima'])
  assert.deepEqual(phases('2026-12-24', 'ujjain'), [])
})

test('Calendar sunrise tithi can repeat or pass entirely between sunrises', () => {
  const bengaluru = { lat: 12.9716, lon: 77.5946, utcOffsetMinutes: 330 }
  const chennai = { lat: 13.0827, lon: 80.2707, utcOffsetMinutes: 330 }
  const ujjain = { lat: 23.18239, lon: 75.77643, utcOffsetMinutes: 330 }
  const tithiAt = (city, monthDay) => {
    const { tithi } = getPanchaAngaAtSunrise(dateFromKey(`2026-${monthDay}`), city)
    return `${tithi.paksha} ${tithi.adjustedNumber}`
  }
  assert.deepEqual(['11-18', '11-19', '11-21', '11-22', '12-09', '12-10', '12-24', '12-25'].map(day => tithiAt(bengaluru, day)),
    ['Shukla 9', 'Shukla 9', 'Shukla 11', 'Shukla 13', 'Shukla 1', 'Shukla 1', 'Shukla 15', 'Krishna 2'])
  assert.equal(tithiAt(chennai, '12-09'), 'Krishna 15')
  assert.equal(tithiAt(ujjain, '11-21'), 'Shukla 12')
  assert.equal(tithiAt(ujjain, '12-24'), 'Krishna 1')
})

test('Calendar tithi timelines retain every intervening tithi for all supported cities', () => {
  const dates = [
    ...['11-18', '11-19', '11-21', '11-22', '11-30', '12-09', '12-10', '12-24', '12-25', '12-31'].map(day => `2026-${day}`),
    '2027-01-19', '2027-02-01', '2027-03-03', '2027-03-04', '2027-09-30',
  ]
  const counts = new Set()
  for (const { name, lat, lon } of cities) {
    for (const key of dates) {
      const date = dateFromKey(key)
      const { sunrise, tithi } = getPanchaAngaAtSunrise(date, { lat, lon, utcOffsetMinutes: 330 })
      const previousSunrise = getSunriseForDate(new Date(+date - DAY_MS), lat, lon, 330)
      const nextSunrise = getSunriseForDate(new Date(+date + DAY_MS), lat, lon, 330)
      const timeline = getTithiTimeline(sunrise, nextSunrise)
      const previousTithi = getTithiFromAngle(getMoonPhaseAngle(previousSunrise))
      const nextTithi = getTithiFromAngle(getMoonPhaseAngle(nextSunrise))
      const label = `${name} ${key}`
      assert.equal(timeline[0].tithi.number, tithi.number, label)
      assert.equal(timeline.at(-1).tithi.number, nextTithi.number, label)
      const additional = getAdditionalTithi(previousTithi, tithi, nextTithi)
      if (timeline.length === 3) {
        assert.deepEqual(additional, { tithi: timeline[1].tithi, label: 'Between sunrises' }, label)
      } else if (timeline.length === 2 && previousTithi.number === tithi.number) {
        assert.deepEqual(additional, { tithi: timeline[1].tithi, label: 'After sunrise' }, label)
      } else {
        assert.equal(additional, null, label)
      }
      counts.add(timeline.length)
      let start = sunrise
      for (const { tithi: entry, end } of timeline) {
        assert.ok(start < nextSunrise && end > start, label)
        assert.equal(getTithiFromAngle(getMoonPhaseAngle(new Date(+end - 10))).number, entry.number, label)
        assert.equal(getTithiFromAngle(getMoonPhaseAngle(new Date(+end + 10))).number, entry.number % 30 + 1, label)
        start = end
      }
      assert.ok(start >= nextSunrise, label)
    }
  }
  assert.deepEqual([...counts].sort(), [1, 2, 3])
  assert.equal(getAdditionalTithi({ number: 29 }, { number: 30 }, { number: 2 }).tithi.name, 'Pratipada (Prathama)')
})

test('Tamil month starts agree with the Lahiri ephemeris and local sunset in Chennai and Madurai', () => {
  // Gregorian day of each Tamil month start, January through December.
  // Dates were calculated independently using Swiss Ephemeris 2.10 Lahiri.
  const chennaiStarts = [
    [15, 13, 15, 14, 15, 16, 17, 17, 17, 18, 17, 16],
    [15, 13, 14, 14, 15, 15, 16, 17, 17, 17, 16, 16],
    [14, 13, 15, 14, 15, 15, 16, 17, 17, 17, 16, 16],
    [14, 13, 15, 14, 15, 15, 17, 17, 17, 18, 17, 16],
    [15, 13, 15, 14, 15, 16, 17, 17, 17, 18, 17, 16],
    [15, 13, 14, 14, 15, 15, 16, 17, 17, 17, 16, 16],
    [14, 13, 15, 14, 15, 15, 17, 17, 17, 17, 16, 16],
    [14, 13, 15, 14, 15, 15, 17, 17, 17, 18, 17, 16],
    [15, 13, 15, 14, 15, 16, 17, 17, 17, 18, 17, 17],
    [15, 13, 14, 14, 15, 15, 16, 17, 17, 17, 16, 16],
  ]
  const cities = [
    { name: 'Chennai', lat: 13.0827, lon: 80.2707, overrides: {} },
    { name: 'Madurai', lat: 9.9252, lon: 78.1198, overrides: { '2029-10': 17, '2035-12': 16 } },
  ]
  const monthNames = ['Thai', 'Maasi', 'Panguni', 'Chithirai', 'Vaikasi', 'Aani', 'Aadi', 'Avani', 'Purattasi', 'Aippasi', 'Karthigai', 'Margazhi']
  for (const city of cities) {
    chennaiStarts.forEach((months, yearIndex) => months.forEach((day, monthIndex) => {
      const prefix = `${2027 + yearIndex}-${String(monthIndex + 1).padStart(2, '0')}`
      const date = dateFromKey(`${prefix}-${city.overrides[prefix] ?? day}`)
      const month = monthNames[monthIndex]
      assert.deepEqual(getTamilSolarDate(date, city), { month, day: 1 }, `${city.name} ${prefix}`)
      assert.notEqual(getTamilSolarDate(new Date(+date - DAY_MS), city).month, month, `${city.name} ${prefix}`)
    }))
  }
})

test('regional festival rules choose one civil date across competing ritual windows', () => {
  const chennai = { lat: 13.0827, lon: 80.2707, utcOffsetMinutes: 330 }
  const tirupati = { lat: 13.63551, lon: 79.41989, utcOffsetMinutes: 330 }
  const ujjain = { lat: 23.18239, lon: 75.77643, utcOffsetMinutes: 330 }
  const cases = [
    [chennai, 'tamil', '2033-08-03', 'Aadi Perukku'],
    [chennai, 'tamil', '2029-04-23', 'Rama Navami'],
    [chennai, 'tamil', '2033-08-28', 'Vinayagar Chathurthi'],
    [tirupati, 'telugu', '2029-04-23', 'Sri Rama Navami'],
    [tirupati, 'telugu', '2026-08-28', 'Raksha Bandhan'],
    [tirupati, 'telugu', '2031-08-02', 'Raksha Bandhan'],
    [tirupati, 'telugu', '2027-09-04', 'Vinayaka Chavithi'],
    [ujjain, 'ujjain', '2029-04-22', 'Ram Navami'],
    [ujjain, 'ujjain', '2029-08-23', 'Raksha Bandhan'],
    [ujjain, 'ujjain', '2032-08-20', 'Raksha Bandhan'],
    [ujjain, 'ujjain', '2032-09-08', 'Ganesh Chaturthi'],
  ]
  for (const [city, tradition, key, festival] of cases) {
    const target = +dateFromKey(key)
    const dates = []
    for (let offset = -2; offset <= 2; offset++) {
      const date = new Date(target + offset * DAY_MS)
      const snapshot = getPanchaAngaAtSunrise(date, city)
      const month = getRegionalMonth(date, snapshot, city, tradition)
      const names = getRegionalFestivals(date, snapshot, city, tradition, month).map(entry => entry.name)
      if (names.includes(festival)) dates.push(offset)
    }
    assert.deepEqual(dates, [0], `${tradition} ${festival} ${key}`)
  }
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
