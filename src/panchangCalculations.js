import * as Astronomy from 'astronomy-engine'
import { toSiderealLongitude } from './ayanamsha.js'
import { getSunsetForDate, getTithiFromAngle } from './moonUtils.js'
import { getEclipseForDate } from './eclipseUtils.js'
import { DAY_MS, startOfCivilDay } from './civilDate.js'
import { getYogaAtTime, getKaranaFromPhase, getMoonSiderealLongitude, getPanchaAngaAtSunrise, getDailyTimingRanges } from './panchangAnga.js'

// Pure calculation layer: no React, settings storage, or browser APIs.
// Preserve the app's existing local-day boundaries and display conventions.
const nakshatras = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira',
  'Ardra', 'Punarvasu', 'Pushya', 'Ashlesha', 'Magha',
  'Purva Phalguni', 'Uttara Phalguni', 'Hasta', 'Chitra', 'Swati',
  'Vishakha', 'Anuradha', 'Jyeshtha', 'Mula', 'Purva Ashadha',
  'Uttara Ashadha', 'Shravana', 'Dhanishtha', 'Shatabhisha',
  'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati'
]

const SAMVATSARA_NAMES = [
  'Prabhava', 'Vibhava', 'Shukla', 'Pramoda', 'Prajapati',
  'Angirasa', 'Shrimukha', 'Bhava', 'Yuva', 'Dhatu',
  'Ishvara', 'Bahudhanya', 'Pramathi', 'Vikrama', 'Vrisha',
  'Chitrabhanu', 'Svabhanu', 'Tarana', 'Parthiva', 'Vyaya',
  'Sarvajit', 'Sarvadharin', 'Virodhi', 'Vikrita', 'Khara',
  'Nandana', 'Vijaya', 'Jaya', 'Manmatha', 'Durmukhi',
  'Hevilambi', 'Vilambi', 'Vikari', 'Sharvari', 'Plava',
  'Shubhakrit', 'Shobhana', 'Krodhi', 'Vishvavasu', 'Parabhava',
  'Plavanga', 'Kilaka', 'Saumya', 'Sadharana', 'Virodhikrit',
  'Paridhari', 'Pramadicha', 'Ananda', 'Rakshasa', 'Nala',
  'Pingala', 'Kalayukti', 'Siddharthi', 'Raudri', 'Durmathi',
  'Dundubhi', 'Rudhirodgari', 'Raktakshi', 'Krodhana', 'Akshaya'
]

const MASA_NAMES = [
  'Chaitra', 'Vaishakha', 'Jyeshtha', 'Ashadha',
  'Shravana', 'Bhadrapada', 'Ashwin', 'Kartika',
  'Margashirsha', 'Pausha', 'Magha', 'Phalguna'
]

// ── Astronomy helpers ─────────────────────────────────────────────

const getNakshatraIndex = (d) => Math.floor(getMoonSiderealLongitude(d) / (360 / 27))

const getPlanetSiderealLongitude = (body, d) => {
  const pos = Astronomy.GeoVector(body, d, true)
  const ecl = Astronomy.Ecliptic(pos)
  return toSiderealLongitude(ecl.elon, d)
}

// Mean ascending node (Rahu) longitude — sidereal via Lahiri
const getRahuLongitude = (date) => {
  const JD = date.getTime() / 86400000 + 2440587.5
  const T = (JD - 2451545.0) / 36525
  const omega = ((125.04452 - 1934.136261 * T) % 360 + 360) % 360
  return toSiderealLongitude(omega, date)
}

const findNakshatraTransition = (startTime, endTime, startIdx) => {
  let lo = startTime.getTime()
  let hi = endTime.getTime()
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2
    if (getNakshatraIndex(new Date(mid)) === startIdx) lo = mid
    else hi = mid
  }
  return new Date((lo + hi) / 2)
}

const getTithiIndexAtTime = (date) => getTithiFromAngle(Astronomy.MoonPhase(date)).number - 1

const findTithiTransition = (startTime, endTime, startIdx) => {
  let lo = startTime.getTime()
  let hi = endTime.getTime()
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2
    if (getTithiIndexAtTime(new Date(mid)) === startIdx) lo = mid
    else hi = mid
  }
  return new Date((lo + hi) / 2)
}

const TITHI_SCAN_STEP = 30 * 60 * 1000
const TITHI_SCAN_LIMIT = 36 * 60 * 60 * 1000

const findTithiEnd = (date, tithiIndex) => {
  for (let offset = TITHI_SCAN_STEP; offset <= TITHI_SCAN_LIMIT; offset += TITHI_SCAN_STEP) {
    const scan = new Date(+date + offset)
    if (getTithiIndexAtTime(scan) !== tithiIndex) {
      return findTithiTransition(new Date(+scan - TITHI_SCAN_STEP), scan, tithiIndex)
    }
  }
  return null
}

const getTithiWindowAtTime = (date) => {
  const tithiIndex = getTithiIndexAtTime(date)
  let start = null
  for (let offset = TITHI_SCAN_STEP; offset <= TITHI_SCAN_LIMIT; offset += TITHI_SCAN_STEP) {
    const scan = new Date(date.getTime() - offset)
    if (getTithiIndexAtTime(scan) !== tithiIndex) {
      start = findTithiTransition(scan, new Date(+scan + TITHI_SCAN_STEP), getTithiIndexAtTime(scan))
      break
    }
  }

  return { start, end: findTithiEnd(date, tithiIndex) }
}

export function getAdditionalTithi(previousTithi, tithi, nextTithi) {
  const steps = (nextTithi.number - tithi.number + 30) % 30
  if (steps === 2) {
    return { tithi: getTithiFromAngle((tithi.number % 30) * 12), label: 'Between sunrises' }
  }
  if (steps === 1 && previousTithi.number === tithi.number) {
    return { tithi: nextTithi, label: 'After sunrise' }
  }
  return null
}

// Include each tithi active from sunrise to the next sunrise. The final
// tithi's actual end may be later, which explains a repeated sunrise label.
export function getTithiTimeline(sunrise, nextSunrise) {
  const timeline = []
  let cursor = sunrise
  while (cursor < nextSunrise) {
    const tithi = getTithiFromAngle(Astronomy.MoonPhase(cursor))
    const end = findTithiEnd(cursor, tithi.number - 1)
    timeline.push({ tithi, end })
    if (!end) break
    // The binary search can return the last millisecond of the outgoing tithi.
    cursor = new Date(+end + 1)
  }
  return timeline
}

// ── Yoga helpers ──────────────────────────────────────────────────

const findYogaTransition = (startTime, endTime, startYoga) => {
  let lo = startTime.getTime()
  let hi = endTime.getTime()
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2
    if (getYogaAtTime(new Date(mid)) === startYoga) lo = mid
    else hi = mid
  }
  return new Date((lo + hi) / 2)
}

// ── Karana helpers ────────────────────────────────────────────────

const findKaranaTransition = (startTime, endTime, startKarana) => {
  let lo = startTime.getTime()
  let hi = endTime.getTime()
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2
    if (getKaranaFromPhase(Astronomy.MoonPhase(new Date(mid))) === startKarana) lo = mid
    else hi = mid
  }
  return new Date((lo + hi) / 2)
}

// ── Calendar helpers ──────────────────────────────────────────────

// Anchor: 2024 CE Ugadi → Krodhi (38th / index 37, zero-based)
const getSamvatsara = (date) => {
  const ANCHOR_YEAR = 2024
  const ANCHOR_INDEX = 37
  const year = date.getFullYear()
  // Ugadi = first new moon on/after spring equinox (~March 20)
  let ugadi = new Date(year, 2, 20)
  try {
    const start = new Date(year, 2, 15)
    const result = Astronomy.SearchMoonPhase(0, start, 45)
    if (result) ugadi = result.date
  } catch { /* Keep the existing equinox fallback if the search fails. */ }
  const svYear = date >= ugadi ? year : year - 1
  const index = (((svYear - ANCHOR_YEAR) % 60) + ANCHOR_INDEX + 60) % 60
  return { name: SAMVATSARA_NAMES[index], number: index + 1 }
}

// Nakshatra of the Full Moon (Purnima) → masa index (0–11)
// Each lunar month is named after the nakshatra where its defining Purnima falls.
const NAKSHATRA_MASA = [
  6,  // 0  Ashwini         → Ashwin
  6,  // 1  Bharani         → Ashwin
  7,  // 2  Krittika        → Kartika
  7,  // 3  Rohini          → Kartika
  8,  // 4  Mrigashira      → Margashirsha
  8,  // 5  Ardra           → Margashirsha
  9,  // 6  Punarvasu       → Pausha
  9,  // 7  Pushya          → Pausha
  10, // 8  Ashlesha        → Magha
  10, // 9  Magha           → Magha
  11, // 10 Purva Phalguni  → Phalguna
  11, // 11 Uttara Phalguni → Phalguna
  0,  // 12 Hasta           → Chaitra
  0,  // 13 Chitra          → Chaitra
  1,  // 14 Swati           → Vaishakha
  1,  // 15 Vishakha        → Vaishakha
  2,  // 16 Anuradha        → Jyeshtha
  2,  // 17 Jyeshtha        → Jyeshtha
  3,  // 18 Mula            → Ashadha
  3,  // 19 Purva Ashadha   → Ashadha
  4,  // 20 Uttara Ashadha  → Shravana
  4,  // 21 Shravana        → Shravana
  5,  // 22 Dhanishtha      → Bhadrapada
  5,  // 23 Shatabhisha     → Bhadrapada
  5,  // 24 Purva Bhadrapada→ Bhadrapada
  5,  // 25 Uttara Bhadrapada→ Bhadrapada
  11, // 26 Revati          → Phalguna
]

// Determine lunar month (Masa) from the nakshatra of the defining Purnima.
// Amavasyant: the Purnima inside the current new-moon-to-new-moon cycle names the month.
//   Shukla Paksha → upcoming Purnima; Krishna Paksha → most recent Purnima.
// Purnimant: same base month; but during Krishna Paksha the month name advances by one
//   (the waning half belongs to the NEXT Purnimant month).
export const getDisplayMasa = ({ sunrise, tithi }, calendarSystem) => {
  try {
    const isKrishnaPaksha = tithi.paksha === 'Krishna'
    const purnima = Astronomy.SearchMoonPhase(180, sunrise, isKrishnaPaksha ? -20 : 20)
    if (!purnima) return null

    // Moon's sidereal longitude at that Purnima
    const moonSidLon = getMoonSiderealLongitude(purnima.date)

    // Nakshatra → masa
    const nakshatraIdx = Math.floor(moonSidLon / (360 / 27))
    const masaIndex = NAKSHATRA_MASA[nakshatraIdx % 27]

    // Purnimant adjustment: Krishna Paksha belongs to the next calendar month
    if (isKrishnaPaksha && calendarSystem === 'purnimant') {
      return MASA_NAMES[(masaIndex + 1) % 12]
    }

    return MASA_NAMES[masaIndex]
  } catch (err) {
    console.error('getMasa error:', err)
    return null
  }
}

// A lunar month takes the name following the Sun's sign at its opening new moon.
// An Adhik month contains no solar ingress and keeps both fortnights in both systems.
export const getLunarMonthLabels = (sunrise, paksha) => {
  const opening = Astronomy.SearchMoonPhase(0, sunrise, -35)
  const closing = Astronomy.SearchMoonPhase(0, sunrise, 35)
  if (!opening || !closing) return { amavasyant: null, purnimant: null }

  const openingSign = Math.floor(getPlanetSiderealLongitude('Sun', opening.date) / 30)
  const closingSign = Math.floor(getPlanetSiderealLongitude('Sun', closing.date) / 30)
  const monthForSign = sign => MASA_NAMES[(sign + 1) % MASA_NAMES.length]
  const name = monthForSign(openingSign)
  if (openingSign === closingSign) {
    const adhikName = `Adhik ${name}`
    return { amavasyant: adhikName, purnimant: adhikName }
  }

  // In the regular cycle, Purnimant counts the waning half with the next month.
  return {
    amavasyant: name,
    purnimant: paksha === 'Krishna Paksha' ? monthForSign(closingSign) : name,
  }
}

// Six Hindu seasons (2 solar months each)
const getRitu = (sunLongitude) => {
  const ritus = [
    { name: 'Vasanta', meaning: 'Spring' },
    { name: 'Grishma', meaning: 'Summer' },
    { name: 'Varsha', meaning: 'Monsoon' },
    { name: 'Sharad', meaning: 'Autumn' },
    { name: 'Hemanta', meaning: 'Pre-Winter' },
    { name: 'Shishira', meaning: 'Winter' },
  ]
  return ritus[Math.floor(sunLongitude / 60) % 6]
}

// Uttarayana: Sun in Makara–Mithuna (270°–90°); Dakshinayana: Karka–Dhanu (90°–270°)
const getAyana = (sunLongitude) =>
  (sunLongitude >= 270 || sunLongitude < 90) ? 'Uttarayana' : 'Dakshinayana'


export function getPanchang(date, location = {}) {
  const snapshot = getPanchaAngaAtSunrise(date, location)
  const { sunrise: sunriseTime, moonLongitude } = snapshot

  // --- Tithi ---
  const tithi = snapshot.tithi
  const tithiName = tithi.name
  const paksha = `${tithi.paksha} Paksha`
  const tithiWindow = getTithiWindowAtTime(sunriseTime)

  // --- Nakshatra with start/end times (full-day scan) ---
  const dayStart = startOfCivilDay(date, location.utcOffsetMinutes)
  const dayEnd = location.utcOffsetMinutes === undefined
    ? new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)
    : new Date(+dayStart + DAY_MS - 1)
  const nakshatraList = []
  let cursor = new Date(dayStart)
  let currentIdx = getNakshatraIndex(cursor)

  while (cursor < dayEnd) {
    const searchEnd = new Date(Math.min(cursor.getTime() + 24 * 60 * 60 * 1000, dayEnd.getTime()))
    let transitionFound = false
    let scanner = new Date(cursor.getTime() + 30 * 60 * 1000)
    while (scanner <= searchEnd) {
      const scanIdx = getNakshatraIndex(scanner)
      if (scanIdx !== currentIdx) {
        const transitionTime = findNakshatraTransition(
          new Date(scanner.getTime() - 30 * 60 * 1000), scanner, currentIdx
        )
        const midPoint = new Date(cursor.getTime() + (transitionTime.getTime() - cursor.getTime()) / 2)
        const pada = Math.floor((getMoonSiderealLongitude(midPoint) % (360 / 27)) / (360 / 108)) + 1
        nakshatraList.push({
          name: nakshatras[currentIdx % 27], pada,
          start: cursor <= dayStart ? dayStart : cursor,
          end: transitionTime, endsToday: true
        })
        cursor = transitionTime
        currentIdx = scanIdx
        transitionFound = true
        break
      }
      scanner = new Date(scanner.getTime() + 30 * 60 * 1000)
    }
    if (!transitionFound) {
      const midPoint = new Date((cursor.getTime() + dayEnd.getTime()) / 2)
      const pada = Math.floor((getMoonSiderealLongitude(midPoint) % (360 / 27)) / (360 / 108)) + 1
      nakshatraList.push({
        name: nakshatras[currentIdx % 27], pada,
        start: cursor <= dayStart ? dayStart : cursor,
        end: dayEnd, endsToday: false
      })
      break
    }
  }

  // Secondary pass: find actual end time for nakshatra extending past midnight
  const lastNaksh = nakshatraList[nakshatraList.length - 1]
  if (lastNaksh && !lastNaksh.endsToday) {
    const lastIdx = getNakshatraIndex(dayEnd)
    const limit = new Date(dayEnd.getTime() + 30 * 60 * 60 * 1000)
    let sc = new Date(dayEnd.getTime() + 30 * 60 * 1000)
    while (sc <= limit) {
      if (getNakshatraIndex(sc) !== lastIdx) {
        lastNaksh.end = findNakshatraTransition(new Date(sc.getTime() - 30 * 60 * 1000), sc, lastIdx)
        break
      }
      sc = new Date(sc.getTime() + 30 * 60 * 1000)
    }
  }

  // Backward pass: find actual start time for first nakshatra of the day
  const firstNaksh = nakshatraList[0]
  if (firstNaksh) {
    const firstNakshIdx = getNakshatraIndex(dayStart)
    const nBackLimit = new Date(dayStart.getTime() - 30 * 60 * 60 * 1000)
    let nBackSc = new Date(dayStart.getTime() - 30 * 60 * 1000)
    while (nBackSc >= nBackLimit) {
      const backIdx = getNakshatraIndex(nBackSc)
      if (backIdx !== firstNakshIdx) {
        firstNaksh.start = findNakshatraTransition(nBackSc, new Date(nBackSc.getTime() + 30 * 60 * 1000), backIdx)
        break
      }
      nBackSc = new Date(nBackSc.getTime() - 30 * 60 * 1000)
    }
  }

  const nakshatraName = nakshatraList[0]?.name || nakshatras[currentIdx % 27]
  const nakshatraPada = nakshatraList[0]?.pada || 1

  // --- Yoga (with transition times — same scan pattern as Nakshatra/Karana) ---
  const sunLongitude = snapshot.sunLongitude
  const yogaName = snapshot.yoga

  const yogaList = []
  let yCursor = new Date(dayStart)
  let currentYoga = getYogaAtTime(yCursor)

  while (yCursor < dayEnd) {
    const ySearchEnd = new Date(Math.min(yCursor.getTime() + 24 * 60 * 60 * 1000, dayEnd.getTime()))
    let yTransitionFound = false
    let yScanner = new Date(yCursor.getTime() + 30 * 60 * 1000)
    while (yScanner <= ySearchEnd) {
      const scanYoga = getYogaAtTime(yScanner)
      if (scanYoga !== currentYoga) {
        const transitionTime = findYogaTransition(
          new Date(yScanner.getTime() - 30 * 60 * 1000), yScanner, currentYoga
        )
        yogaList.push({
          name: currentYoga,
          start: yCursor <= dayStart ? dayStart : yCursor,
          end: transitionTime, endsToday: true
        })
        yCursor = transitionTime
        currentYoga = scanYoga
        yTransitionFound = true
        break
      }
      yScanner = new Date(yScanner.getTime() + 30 * 60 * 1000)
    }
    if (!yTransitionFound) {
      yogaList.push({
        name: currentYoga,
        start: yCursor <= dayStart ? dayStart : yCursor,
        end: dayEnd, endsToday: false
      })
      break
    }
  }

  // Secondary pass: find actual end time for Yoga extending past midnight
  const lastYoga = yogaList[yogaList.length - 1]
  if (lastYoga && !lastYoga.endsToday) {
    const lyName = lastYoga.name
    const lyLimit = new Date(dayEnd.getTime() + 30 * 60 * 60 * 1000)
    let lySc = new Date(dayEnd.getTime() + 30 * 60 * 1000)
    while (lySc <= lyLimit) {
      if (getYogaAtTime(lySc) !== lyName) {
        lastYoga.end = findYogaTransition(
          new Date(lySc.getTime() - 30 * 60 * 1000), lySc, lyName
        )
        break
      }
      lySc = new Date(lySc.getTime() + 30 * 60 * 1000)
    }
  }

  // Backward pass: find actual start time for first yoga of the day
  const firstYoga = yogaList[0]
  if (firstYoga) {
    const firstYogaName = getYogaAtTime(dayStart)
    const yBackLimit = new Date(dayStart.getTime() - 30 * 60 * 60 * 1000)
    let yBackSc = new Date(dayStart.getTime() - 30 * 60 * 1000)
    while (yBackSc >= yBackLimit) {
      const backYoga = getYogaAtTime(yBackSc)
      if (backYoga !== firstYogaName) {
        firstYoga.start = findYogaTransition(yBackSc, new Date(yBackSc.getTime() + 30 * 60 * 1000), backYoga)
        break
      }
      yBackSc = new Date(yBackSc.getTime() - 30 * 60 * 1000)
    }
  }

  // --- Karana (with transition times — same scan pattern as Nakshatra) ---
  const karanaList = []
  let kCursor = new Date(dayStart)
  let currentKarana = getKaranaFromPhase(Astronomy.MoonPhase(kCursor))

  while (kCursor < dayEnd) {
    const kSearchEnd = new Date(Math.min(kCursor.getTime() + 24 * 60 * 60 * 1000, dayEnd.getTime()))
    let kTransitionFound = false
    let kScanner = new Date(kCursor.getTime() + 30 * 60 * 1000)
    while (kScanner <= kSearchEnd) {
      const scanKarana = getKaranaFromPhase(Astronomy.MoonPhase(kScanner))
      if (scanKarana !== currentKarana) {
        const transitionTime = findKaranaTransition(
          new Date(kScanner.getTime() - 30 * 60 * 1000), kScanner, currentKarana
        )
        karanaList.push({
          name: currentKarana,
          start: kCursor <= dayStart ? dayStart : kCursor,
          end: transitionTime, endsToday: true
        })
        kCursor = transitionTime
        currentKarana = scanKarana
        kTransitionFound = true
        break
      }
      kScanner = new Date(kScanner.getTime() + 30 * 60 * 1000)
    }
    if (!kTransitionFound) {
      karanaList.push({
        name: currentKarana,
        start: kCursor <= dayStart ? dayStart : kCursor,
        end: dayEnd, endsToday: false
      })
      break
    }
  }

  // Secondary pass: find actual end time for Karana extending past midnight
  const lastKarana = karanaList[karanaList.length - 1]
  if (lastKarana && !lastKarana.endsToday) {
    const lkName = lastKarana.name
    const lkLimit = new Date(dayEnd.getTime() + 30 * 60 * 60 * 1000)
    let lkSc = new Date(dayEnd.getTime() + 30 * 60 * 1000)
    while (lkSc <= lkLimit) {
      if (getKaranaFromPhase(Astronomy.MoonPhase(lkSc)) !== lkName) {
        lastKarana.end = findKaranaTransition(
          new Date(lkSc.getTime() - 30 * 60 * 1000), lkSc, lkName
        )
        break
      }
      lkSc = new Date(lkSc.getTime() + 30 * 60 * 1000)
    }
  }

  // Backward pass: find actual start time for first karana of the day
  const firstKarana = karanaList[0]
  if (firstKarana) {
    const firstKaranaName = getKaranaFromPhase(Astronomy.MoonPhase(dayStart))
    const kBackLimit = new Date(dayStart.getTime() - 30 * 60 * 60 * 1000)
    let kBackSc = new Date(dayStart.getTime() - 30 * 60 * 1000)
    while (kBackSc >= kBackLimit) {
      const backKarana = getKaranaFromPhase(Astronomy.MoonPhase(kBackSc))
      if (backKarana !== firstKaranaName) {
        firstKarana.start = findKaranaTransition(kBackSc, new Date(kBackSc.getTime() + 30 * 60 * 1000), backKarana)
        break
      }
      kBackSc = new Date(kBackSc.getTime() - 30 * 60 * 1000)
    }
  }

  const karanaName = snapshot.karana

  // --- Daily Timings (actual sunrise/sunset) ---
  const sunsetTime   = getSunsetForDate(date, location.lat, location.lon, location.utcOffsetMinutes)
  const dailyTimings = getDailyTimingRanges(sunriseTime.getTime(), sunsetTime.getTime(), snapshot.weekday)

  // --- Month & Year ---
  const calendarSystem = (location?.calendarSystem || 'amavasyant').toLowerCase()
  const samvatsara = getSamvatsara(date)
  const masa       = getDisplayMasa(snapshot, calendarSystem)
  const ritu       = getRitu(sunLongitude)
  const ayana      = getAyana(sunLongitude)

  // --- Navagraha (9 planets — sidereal longitudes at sunrise) ---
  const rahuLon  = getRahuLongitude(sunriseTime)
  const navagraha = {
    Sun:     parseFloat(sunLongitude.toFixed(2)),
    Moon:    parseFloat(moonLongitude.toFixed(2)),
    Mars:    parseFloat(getPlanetSiderealLongitude('Mars',    sunriseTime).toFixed(2)),
    Mercury: parseFloat(getPlanetSiderealLongitude('Mercury', sunriseTime).toFixed(2)),
    Jupiter: parseFloat(getPlanetSiderealLongitude('Jupiter', sunriseTime).toFixed(2)),
    Venus:   parseFloat(getPlanetSiderealLongitude('Venus',   sunriseTime).toFixed(2)),
    Saturn:  parseFloat(getPlanetSiderealLongitude('Saturn',  sunriseTime).toFixed(2)),
    Rahu:    parseFloat(rahuLon.toFixed(2)),
    Ketu:    parseFloat(((rahuLon + 180) % 360).toFixed(2)),
  }

  // --- Auspiciousness flags ---
  const isEkadashi = tithiName === 'Ekadashi'
  const isPurnima  = tithiName === 'Purnima'
  const isAmavasya = tithiName === 'Amavasya'
  const vishtiPeriods = karanaList.filter(k => k.name === 'Vishti')
  const isVishti   = vishtiPeriods.length > 0
  const eclipse    = getEclipseForDate(date, location.utcOffsetMinutes)

  return ({
    tithi: tithiName, paksha, tithiWindow,
    nakshatra: nakshatraName, nakshatraPada, nakshatraList,
    yoga: yogaName, yogaList, karana: karanaName, karanaList, vishtiPeriods,
    vara: snapshot.vara, varaDeity: snapshot.varaDeity,
    sunrise: sunriseTime, sunset: sunsetTime,
    dailyTimings,
    samvatsara, masa, ritu, ayana, calendarSystem,
    navagraha,
    isEkadashi, isPurnima, isAmavasya, isVishti,
    eclipse,
  })

}
