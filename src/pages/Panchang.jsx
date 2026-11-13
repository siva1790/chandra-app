import { useState, useEffect } from 'react'
import * as Astronomy from 'astronomy-engine'
import { toSiderealLongitude } from '../ayanamsha.js'
import { getSunriseForDate, getSunsetForDate, getTithiAtSunrise, getTithiFromAngle } from '../moonUtils'
import { getEclipseForDate, eclipseTypeLabel, lunarTotalityLabel } from '../eclipseUtils'
import DateStrip from '../components/DateStrip'
import { getYogaAtTime, getKaranaFromPhase } from '../panchangAnga.js'
import { EclipseIcon } from '../components/EclipseIcons'
import { Clock, Moon, Star, Sun, Calendar as CalendarIcon, Sunrise, Sparkles, AlertTriangle, Timer, ChevronDown, BookOpen, MapPin } from 'lucide-react'
import './Panchang.css'

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

const RASI_NAMES = [
  'Mesha', 'Vrishabha', 'Mithuna', 'Karka',
  'Simha', 'Kanya', 'Tula', 'Vrischika',
  'Dhanu', 'Makara', 'Kumbha', 'Meena'
]

// ── Astronomy helpers ─────────────────────────────────────────────

const getMoonSiderealLongitude = (d) => {
  const pos = Astronomy.GeoVector('Moon', d, true)
  const ecl = Astronomy.Ecliptic(pos)
  return toSiderealLongitude(ecl.elon, d)
}

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

const formatLongitude = (lon) => {
  const sign = Math.floor(lon / 30)
  const deg = (lon % 30).toFixed(1)
  return `${deg}° ${RASI_NAMES[sign % 12]}`
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

const getTithiWindowAtTime = (date) => {
  const tithiIndex = getTithiIndexAtTime(date)
  const step = 30 * 60 * 1000
  const limit = 36 * 60 * 60 * 1000

  let start = null
  for (let offset = step; offset <= limit; offset += step) {
    const scan = new Date(date.getTime() - offset)
    if (getTithiIndexAtTime(scan) !== tithiIndex) {
      start = findTithiTransition(scan, new Date(scan.getTime() + step), getTithiIndexAtTime(scan))
      break
    }
  }

  let end = null
  for (let offset = step; offset <= limit; offset += step) {
    const scan = new Date(date.getTime() + offset)
    if (getTithiIndexAtTime(scan) !== tithiIndex) {
      end = findTithiTransition(new Date(scan.getTime() - step), scan, tithiIndex)
      break
    }
  }

  return { start, end }
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
  } catch (_) {}
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
const getMasa = (date, tithiIndex, calendarSystem) => {
  try {
    const isKrishnaPaksha = tithiIndex >= 15

    // Find the Purnima that defines this lunar month
    let purnima
    if (isKrishnaPaksha) {
      // Search backward: most recent full moon (within the last ~20 days)
      const searchStart = new Date(date.getTime() - 20 * 24 * 60 * 60 * 1000)
      purnima = Astronomy.SearchMoonPhase(180, searchStart, 20)
    } else {
      // Search forward: next full moon (within the next ~20 days)
      purnima = Astronomy.SearchMoonPhase(180, date, 20)
    }

    if (!purnima) return MASA_NAMES[0]

    // Moon's sidereal longitude at that Purnima
    const moonPos = Astronomy.GeoVector('Moon', purnima.date, true)
    const moonEcl = Astronomy.Ecliptic(moonPos)
    const moonSidLon = toSiderealLongitude(moonEcl.elon, purnima.date)

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
    return MASA_NAMES[0]
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

// ── Accordion defaults ────────────────────────────────────────────

const DEFAULT_SECTIONS = {
  panchaAnga: true,
  dailyTimings: true,
  nakshatraDetails: true,
  monthYear: true,
  planetary: true,
}

// ── Component ─────────────────────────────────────────────────────

const Panchang = ({ location, initialDate, onDateChange, onLearn }) => {
  const [panchang, setPanchang] = useState(null)
  const [selectedDate, setSelectedDate] = useState(initialDate ? new Date(initialDate) : new Date())
  const [sections, setSections] = useState(() => {
    try {
      const saved = localStorage.getItem('chandra-panchang-accordion')
      if (saved) return { ...DEFAULT_SECTIONS, ...JSON.parse(saved) }
    } catch (_) {}
    return { ...DEFAULT_SECTIONS }
  })

  // Sync from global date — loop guard prevents circular updates
  useEffect(() => {
    if (!initialDate) return
    const incoming = new Date(initialDate)
    if (incoming.toDateString() !== selectedDate.toDateString()) {
      setSelectedDate(incoming)
    }
  }, [initialDate])

  useEffect(() => {
    calculatePanchang(selectedDate)
  }, [selectedDate, location])

  const formatTime = (date) =>
    date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })

  const formatShortDate = (date) =>
    date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })

  const formatWindow = (start, end) => {
    const sameDay = start.toDateString() === end.toDateString()
    const startLabel = sameDay ? formatTime(start) : `${formatTime(start)}, ${formatShortDate(start)}`
    const endLabel = sameDay ? formatTime(end) : `${formatTime(end)}, ${formatShortDate(end)}`
    return `${startLabel} - ${endLabel}`
  }

  const formatDate = (date) =>
    date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const changeDate = (d) => {
    setSelectedDate(d)
    onDateChange?.(d)
  }

  const toggleSection = (key) => {
    setSections(prev => {
      const next = { ...prev, [key]: !prev[key] }
      localStorage.setItem('chandra-panchang-accordion', JSON.stringify(next))
      return next
    })
  }

  const allExpanded = Object.values(sections).every(Boolean)
  const toggleAll = () => {
    const next = Object.fromEntries(Object.keys(sections).map(k => [k, !allExpanded]))
    setSections(next)
    localStorage.setItem('chandra-panchang-accordion', JSON.stringify(next))
  }

  const calculatePanchang = (date) => {
    try {
      const sunriseTime = getSunriseForDate(date, location?.lat, location?.lon)
      const phaseAngle = Astronomy.MoonPhase(sunriseTime)

      // --- Tithi ---
      const tithi = getTithiAtSunrise(date, location?.lat, location?.lon)
      const tithiIndex = tithi.number - 1
      const tithiName = tithi.name
      const paksha = `${tithi.paksha} Paksha`
      const tithiWindow = getTithiWindowAtTime(sunriseTime)

      // --- Moon longitude (sidereal at sunrise) ---
      const moonLongitude = getMoonSiderealLongitude(sunriseTime)

      // --- Nakshatra with start/end times (full-day scan) ---
      const dayStart = new Date(date); dayStart.setHours(0, 0, 0, 0)
      const dayEnd   = new Date(date); dayEnd.setHours(23, 59, 59, 999)
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
      const sunPos = Astronomy.GeoVector('Sun', sunriseTime, true)
      const sunEcliptic = Astronomy.Ecliptic(sunPos)
      const sunLongitude = toSiderealLongitude(sunEcliptic.elon, sunriseTime)
      const yogaName = getYogaAtTime(sunriseTime)

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

      const karanaName = getKaranaFromPhase(phaseAngle)

      // --- Vara ---
      const varaNames = ['Ravivar', 'Somvar', 'Mangalvar', 'Budhvar', 'Guruvar', 'Shukravar', 'Shanivar']
      const varaDeva  = ['Sun ☀️', 'Moon 🌙', 'Mars ♂️', 'Mercury ☿', 'Jupiter ♃', 'Venus ♀️', 'Saturn ♄']
      const varaIndex = date.getDay()

      // --- Daily Timings (actual sunrise/sunset) ---
      const sunsetTime   = getSunsetForDate(date, location?.lat, location?.lon)
      const sunriseMins  = sunriseTime.getHours() * 60 + sunriseTime.getMinutes()
      const sunsetMins   = sunsetTime.getHours()  * 60 + sunsetTime.getMinutes()
      const slotDuration = (sunsetMins - sunriseMins) / 8

      const fmt = (mins) => {
        const h    = Math.floor(mins / 60)
        const m    = Math.round(mins % 60)
        const ampm = h >= 12 ? 'PM' : 'AM'
        const hr   = h > 12 ? h - 12 : h === 0 ? 12 : h
        return `${hr}:${m.toString().padStart(2, '0')} ${ampm}`
      }

      const rahuOrder = [8, 2, 7, 5, 6, 4, 3]
      const rahuSlot  = rahuOrder[varaIndex]
      const rahuKaal  = `${fmt(sunriseMins + (rahuSlot - 1) * slotDuration)} – ${fmt(sunriseMins + rahuSlot * slotDuration)}`

      const yamOrder    = [5, 4, 3, 2, 1, 7, 6]
      const yamSlot     = yamOrder[varaIndex]
      const yamagandam  = `${fmt(sunriseMins + (yamSlot - 1) * slotDuration)} – ${fmt(sunriseMins + yamSlot * slotDuration)}`

      const midday        = (sunriseMins + sunsetMins) / 2
      const abhijitMuhurta = `${fmt(midday - 24)} – ${fmt(midday + 24)}`
      const brahmaMuhurta  = `${fmt(sunriseMins - 96)} – ${fmt(sunriseMins - 48)}`

      // --- Month & Year ---
      const calendarSystem = (location?.calendarSystem || 'amavasyant').toLowerCase()
      const samvatsara = getSamvatsara(date)
      const masa       = getMasa(date, tithiIndex, calendarSystem)
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
      const eclipse    = getEclipseForDate(date)

      setPanchang({
        tithi: tithiName, paksha, tithiWindow,
        nakshatra: nakshatraName, nakshatraPada, nakshatraList,
        yoga: yogaName, yogaList, karana: karanaName, karanaList, vishtiPeriods,
        vara: varaNames[varaIndex], varaDeity: varaDeva[varaIndex],
        rahuKaal, yamagandam, abhijitMuhurta, brahmaMuhurta,
        samvatsara, masa, ritu, ayana, calendarSystem,
        navagraha,
        isEkadashi, isPurnima, isAmavasya, isVishti,
        eclipse,
      })
    } catch (err) {
      console.error('Panchang calculation error:', err)
    }
  }

  return (
    <div className="panchang-page min-h-screen px-4 py-8 pb-28 max-w-md mx-auto">

      {/* Header */}
      <div className="panchang-heading text-center mb-6">
        <h1 className="mb-1 flex items-center justify-center gap-2 text-2xl font-bold text-chandra-gold">
          Panchang
        </h1>
        <p className="text-sm text-chandra-text-secondary">Daily Hindu Almanac</p>
        <p className="panchang-context"><MapPin size={14} strokeWidth={1.75} aria-hidden="true" /><span>{location?.city || 'Bengaluru'}</span><span aria-hidden="true">·</span><span>{location?.calendarSystem || 'Amavasyant'}</span></p>
      </div>

      {/* Date Navigator */}
      <DateStrip date={selectedDate} onDateChange={changeDate} mode="day" responsive />

      {panchang ? (
        <div className="flex flex-col gap-4">

          {/* ── Eclipse Banner (always visible, outside accordions) ── */}
          {panchang.eclipse && (
            <div className="rounded-2xl border border-chandra-focus/35 bg-chandra-indigo-cta/20 p-5">
              <div className="flex items-center gap-4">
                <EclipseIcon eclipse={panchang.eclipse} size={44} />
                <div className="flex-1">
                  <p className="text-base font-bold text-chandra-text-primary">{panchang.eclipse.hinduName}</p>
                  <p className="mt-0.5 text-xs text-chandra-focus">{eclipseTypeLabel(panchang.eclipse)}</p>
                  <p className="mt-1.5 text-sm font-medium text-chandra-text-primary">
                    Peak: {panchang.eclipse.peakTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })} IST
                  </p>
                  {lunarTotalityLabel(panchang.eclipse) && (
                    <p className="mt-0.5 text-xs text-chandra-focus">{lunarTotalityLabel(panchang.eclipse)}</p>
                  )}
                  {panchang.eclipse.type === 'lunar' && (
                    <p className="mt-1.5 text-xs leading-relaxed text-chandra-text-secondary">Avoid starting auspicious work during the eclipse. Prayer, mantra and post-eclipse ritual bath are traditionally observed.</p>
                  )}
                  {panchang.eclipse.type === 'solar' && (
                    <p className="mt-1.5 text-xs leading-relaxed text-chandra-text-secondary">Surya Grahan — avoid eating during the eclipse period. Chant mantras and pray.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Special Day Banners (always visible) ── */}
          {panchang.isPurnima && (
            <div className="rounded-2xl border border-chandra-gold/35 bg-chandra-gold/15 p-4 text-center">
              <p className="font-semibold text-chandra-gold"><span role="img" aria-label="Full moon">🌕</span> Purnima — Full Moon Day</p>
              <p className="mt-1 text-xs text-chandra-text-secondary">Auspicious for prayer, charity, fasting and full-moon observance</p>
            </div>
          )}
          {panchang.isAmavasya && (
            <div className="rounded-2xl border border-chandra-focus/35 bg-chandra-indigo-cta/20 p-4 text-center">
              <p className="font-semibold text-chandra-focus"><span role="img" aria-label="New moon">🌑</span> Amavasya — New Moon Day</p>
              <p className="mt-1 text-xs text-chandra-text-secondary">Sacred for ancestral offerings (Pitru Tarpan)</p>
            </div>
          )}
          {panchang.isEkadashi && (
            <div className="rounded-2xl border border-chandra-warning/30 bg-chandra-warning/15 p-4 text-center">
              <p className="font-semibold text-chandra-warning-text"><span role="img" aria-label="Folded hands">🙏</span> Ekadashi — Fasting Day</p>
              <p className="mt-1 text-xs text-chandra-text-secondary">Dedicated to Lord Vishnu — avoid grains today</p>
            </div>
          )}
          {panchang.isVishti && (
            <div className="rounded-2xl border border-chandra-error/40 bg-chandra-error/15 p-4 text-center">
              <p className="font-semibold text-chandra-error"><span role="img" aria-label="Warning">⚠️</span> Bhadra / Vishti Karana Active</p>
              {panchang.vishtiPeriods?.length > 0 && (
                <p className="mt-1 text-xs font-medium text-chandra-text-primary">
                  {panchang.vishtiPeriods.map(k => formatWindow(k.start, k.end)).join(', ')}
                </p>
              )}
              <p className="mt-1 text-xs leading-relaxed text-chandra-text-secondary">Avoid starting new auspicious work during this Karana. Prayer, fasting and charity observances still apply.</p>
            </div>
          )}

          {/* ── Collapse / Expand All ── */}
          <div className="panchang-tools">
            <span>All times in local time · Tithi at sunrise</span>
            <button
              onClick={toggleAll}
              className="panchang-toggle-all flex min-h-[44px] items-center px-2 py-1 text-xs text-chandra-gold underline underline-offset-2"
            >
              {allExpanded ? 'Collapse All' : 'Expand All'}
            </button>
          </div>

          {/* ── 1. Pancha Anga ── */}
          <div className="panchang-primary-grid">
          <AccordionSection
            className="panchang-anga"
            title="Pancha Anga — Five Limbs"
            isOpen={sections.panchaAnga}
            onToggle={() => toggleSection('panchaAnga')}
            onLearn={() => onLearn?.('pancha-anga')}
            learnLabel="Learn about Pancha Anga"
          >
            <div className="flex flex-col gap-3">
              <div className="border-b border-white/10 py-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Moon size={16} aria-hidden="true" strokeWidth={1.75} className="shrink-0 text-chandra-text-secondary" />
                    <span className="text-sm text-chandra-text-secondary">Tithi</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-chandra-text-primary">{panchang.tithi}</p>
                    <p className="text-xs text-chandra-text-secondary">{panchang.paksha}</p>
                  </div>
                </div>
                {panchang.tithiWindow?.start && panchang.tithiWindow?.end && (
                  <div className="ml-6 mt-2 rounded-xl bg-chandra-bg-elevated px-3 py-2">
                    <p className="text-xs font-medium text-chandra-gold">
                      {formatTime(panchang.tithiWindow.start)}, {formatShortDate(panchang.tithiWindow.start)}
                      {' → '}
                      {formatTime(panchang.tithiWindow.end)}, {formatShortDate(panchang.tithiWindow.end)}
                    </p>
                  </div>
                )}
              </div>

              {panchang.nakshatraList?.length > 0 ? (
                <div className="border-b border-white/10 py-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Star size={16} aria-hidden="true" strokeWidth={1.75} className="shrink-0 text-chandra-text-secondary" />
                    <span className="text-sm text-chandra-text-secondary">Nakshatra</span>
                  </div>
                  {panchang.nakshatraList.map((n, i) => (
                    <div key={i} className="mb-2 ml-6 rounded-xl bg-chandra-bg-elevated px-3 py-2">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-semibold text-chandra-text-primary">{n.name}</p>
                        <p className="text-xs text-chandra-text-secondary">Pada {n.pada}</p>
                      </div>
                      <p className="text-xs font-medium text-chandra-gold">
                        {formatTime(n.start)}, {formatShortDate(n.start)}
                        {' → '}
                        {formatTime(n.end)}, {formatShortDate(n.end)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <PanchangRow icon={Star} label="Nakshatra" value={panchang.nakshatra} sub={`Pada ${panchang.nakshatraPada}`} />
              )}

              {panchang.yogaList?.length > 0 ? (
                <div className="border-b border-white/10 py-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock size={16} aria-hidden="true" strokeWidth={1.75} className="shrink-0 text-chandra-text-secondary" />
                    <span className="text-sm text-chandra-text-secondary">Yoga</span>
                  </div>
                  {panchang.yogaList.map((y, i) => (
                    <div key={i} className="mb-2 ml-6 rounded-xl bg-chandra-bg-elevated px-3 py-2">
                      <p className="mb-1 text-sm font-semibold text-chandra-text-primary">{y.name}</p>
                      <p className="text-xs font-medium text-chandra-gold">
                        {formatTime(y.start)}, {formatShortDate(y.start)}
                        {' → '}
                        {formatTime(y.end)}, {formatShortDate(y.end)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <PanchangRow icon={Clock} label="Yoga" value={panchang.yoga} />
              )}
              {panchang.karanaList?.length > 0 ? (
                <div className="border-b border-white/10 py-2">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-5 shrink-0 text-center text-sm font-semibold text-chandra-text-secondary" aria-hidden="true">½</span>
                    <span className="text-sm text-chandra-text-secondary">Karana</span>
                  </div>
                  {panchang.karanaList.map((k, i) => (
                    <div key={i} className="mb-2 ml-6 rounded-xl bg-chandra-bg-elevated px-3 py-2">
                      <p className="mb-1 text-sm font-semibold text-chandra-text-primary">{k.name}</p>
                      <p className="text-xs font-medium text-chandra-gold">
                        {formatTime(k.start)}, {formatShortDate(k.start)}
                        {' → '}
                        {formatTime(k.end)}, {formatShortDate(k.end)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <PanchangRow icon="½" label="Karana" value={panchang.karana} />
              )}
              <PanchangRow icon={CalendarIcon}  label="Vara"   value={panchang.vara} sub={panchang.varaDeity} />
            </div>
          </AccordionSection>

          {/* ── 2. Daily Timings ── */}
          <div className="panchang-side">
          <AccordionSection
            className="panchang-timings"
            title="Daily Timings"
            isOpen={sections.dailyTimings}
            onToggle={() => toggleSection('dailyTimings')}
            onLearn={() => onLearn?.('daily-timings')}
            learnLabel="Learn about daily timings"
          >
            <div className="flex flex-col gap-3">
              <PanchangRow icon={Sunrise}       label="Brahma Muhurta"  value={panchang.brahmaMuhurta}  sub="Most auspicious for meditation" />
              <PanchangRow icon={Sparkles}      label="Abhijit Muhurta" value={panchang.abhijitMuhurta} sub="Auspicious for new beginnings" />
              <PanchangRow icon={AlertTriangle} label="Rahu Kaal"       value={panchang.rahuKaal}       sub="Avoid starting important work" highlight="red" />
              <PanchangRow icon={Timer}         label="Yamagandam"      value={panchang.yamagandam}     sub="Avoid starting auspicious work" highlight="red" />
            </div>
          </AccordionSection>

          {/* ── 3. Nakshatra Details ── */}
          <AccordionSection
            title="Nakshatra Details"
            isOpen={sections.nakshatraDetails}
            onToggle={() => toggleSection('nakshatraDetails')}
            onLearn={() => onLearn?.('nakshatra')}
            learnLabel="Learn about Nakshatra"
          >
            <div className="flex flex-col gap-4">
              {panchang.nakshatraList?.map((n, i) => (
                <div key={i}>
                  <p className="mb-2 text-xs font-medium text-chandra-gold">
                    {n.name}
                    {panchang.nakshatraList.length > 1
                      ? ` · ${formatTime(n.start)}, ${formatShortDate(n.start)} – ${formatTime(n.end)}, ${formatShortDate(n.end)}`
                      : " — Today's Nakshatra"
                    }
                  </p>
                  <p className="text-sm leading-relaxed text-chandra-text-primary">{getNakshatraDescription(n.name)}</p>
                  {i < panchang.nakshatraList.length - 1 && (
                    <div className="mt-4 border-t border-white/10" />
                  )}
                </div>
              ))}
            </div>
          </AccordionSection>

          {/* ── 4. Month & Year ── */}
          <AccordionSection
            title="Month & Year"
            isOpen={sections.monthYear}
            onToggle={() => toggleSection('monthYear')}
            onLearn={() => onLearn?.('month-year')}
            learnLabel="Learn about month and year"
          >
            <div className="flex flex-col gap-3">
              <PanchangRow
                icon={CalendarIcon}
                label="Samvatsara"
                value={panchang.samvatsara.name}
                sub={`${panchang.samvatsara.number}th year of 60-year cycle`}
              />
              <PanchangRow
                icon={Moon}
                label="Masa"
                value={panchang.masa}
                sub="Lunar month"
              />
              <PanchangRow
                icon={Sun}
                label="Ritu"
                value={panchang.ritu.name}
                sub={panchang.ritu.meaning}
              />
              <PanchangRow
                icon={Sunrise}
                label="Ayana"
                value={panchang.ayana}
                sub={panchang.ayana === 'Uttarayana' ? 'Sun moving northward' : 'Sun moving southward'}
              />
            </div>
          </AccordionSection>

          {/* ── 5. Planetary Positions ── */}
          </div>
          </div>
          <AccordionSection
            className="panchang-planets"
            title="Planetary Positions — Navagraha"
            isOpen={sections.planetary}
            onToggle={() => toggleSection('planetary')}
            onLearn={() => onLearn?.('navagraha')}
            learnLabel="Learn about Navagraha"
          >
            <p className="mb-3 text-xs text-chandra-text-secondary">Sidereal longitudes (Lahiri Ayanamsha) at sunrise</p>
            <div className="panchang-planet-grid">
              {[
                { symbol: '☀',  name: 'Sun',     sanskrit: 'Surya',      lon: panchang.navagraha.Sun     },
                { symbol: '☽',  name: 'Moon',    sanskrit: 'Chandra',    lon: panchang.navagraha.Moon    },
                { symbol: '♂',  name: 'Mars',    sanskrit: 'Mangala',    lon: panchang.navagraha.Mars    },
                { symbol: '☿',  name: 'Mercury', sanskrit: 'Budha',      lon: panchang.navagraha.Mercury },
                { symbol: '♃',  name: 'Jupiter', sanskrit: 'Guru',       lon: panchang.navagraha.Jupiter },
                { symbol: '♀',  name: 'Venus',   sanskrit: 'Shukra',     lon: panchang.navagraha.Venus   },
                { symbol: '♄',  name: 'Saturn',  sanskrit: 'Shani',      lon: panchang.navagraha.Saturn  },
                { symbol: '☊',  name: 'Rahu',    sanskrit: 'North Node', lon: panchang.navagraha.Rahu    },
                { symbol: '☋',  name: 'Ketu',    sanskrit: 'South Node', lon: panchang.navagraha.Ketu    },
              ].map(({ symbol, name, sanskrit, lon }) => (
                <div key={name} className="panchang-planet flex items-center justify-between border-b border-white/10 py-2 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-base w-5 text-center leading-none" aria-hidden="true">{symbol}</span>
                    <div>
                      <span className="text-sm text-chandra-text-primary">{name}</span>
                      <span className="ml-1.5 text-xs text-chandra-text-secondary">({sanskrit})</span>
                    </div>
                  </div>
                  <p className="text-sm font-medium tabular-nums text-chandra-text-primary">{formatLongitude(lon)}</p>
                </div>
              ))}
            </div>
          </AccordionSection>

          <button
            type="button"
            onClick={() => onLearn?.('basics')}
            className="group flex min-h-[64px] w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-chandra-bg-surface p-5 text-left transition-all hover:border-chandra-gold/35 active:bg-chandra-bg-elevated"
          >
            <span className="flex items-center gap-2 text-sm font-medium text-chandra-text-primary">
              <BookOpen size={16} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-chandra-gold" />
              Learn Panchang basics
            </span>
            <span className="shrink-0 text-sm text-chandra-focus group-hover:underline">Open</span>
          </button>

        </div>
      ) : (
        <div aria-live="polite" aria-busy="true" className="mt-20 text-center text-chandra-text-secondary">
          <Clock size={36} aria-hidden="true" strokeWidth={1.25} className="mx-auto mb-4 text-chandra-gold/45" />
          <p>Calculating Panchang...</p>
        </div>
      )}
      <footer className="panchang-footer"><span>Calculated for {location?.city || 'Bengaluru'} · {location?.calendarSystem || 'Amavasyant'}</span><span>Chandra · Indian Moon Tracker</span></footer>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────

const AccordionSection = ({ title, isOpen, onToggle, onLearn, learnLabel, children, className = '' }) => (
  <div className={`panchang-panel overflow-hidden rounded-2xl border border-white/10 bg-chandra-bg-surface ${className}`}>
    <div className="panchang-panel-heading flex min-h-[60px] items-center px-5 py-2">
      <button
        onClick={onToggle}
        aria-expanded={isOpen}
        className="min-w-0 flex-1 rounded-lg py-2 pr-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-chandra-focus"
      >
        <p className="text-xs uppercase tracking-widest leading-snug text-chandra-gold">{title}</p>
      </button>
      {onLearn && (
        <button
          type="button"
          onClick={onLearn}
          aria-label={learnLabel || `Learn about ${title}`}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-chandra-gold hover:bg-chandra-gold/10 active:bg-chandra-gold/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-chandra-focus"
        >
          <BookOpen size={16} strokeWidth={1.75} aria-hidden="true" />
        </button>
      )}
      <button
        type="button"
        onClick={onToggle}
        aria-label={isOpen ? `Collapse ${title}` : `Expand ${title}`}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl hover:bg-chandra-bg-elevated active:bg-chandra-bg-elevated focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-chandra-focus"
      >
        <ChevronDown
          size={16}
          strokeWidth={1.75}
          aria-hidden="true"
          className={`text-chandra-text-secondary transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
    </div>
    {isOpen && (
      <div className="panchang-panel-content px-5 pb-5">
        {children}
      </div>
    )}
  </div>
)

const PanchangRow = ({ icon: Icon, label, value, sub, highlight }) => (
  <div className="panchang-row flex items-center justify-between border-b border-white/10 py-2 last:border-0">
    <div className="flex items-center gap-2">
      {typeof Icon === 'string'
        ? <span className="text-base" aria-hidden="true">{Icon}</span>
        : <Icon size={16} aria-hidden="true" strokeWidth={1.75} className="shrink-0 text-chandra-text-secondary" />
      }
      <span className="text-sm text-chandra-text-secondary">{label}</span>
    </div>
    <div className="text-right">
      <p className={`text-sm font-semibold ${highlight === 'red' ? 'text-chandra-error' : 'text-chandra-text-primary'}`}>{value}</p>
      {sub && <p className="text-xs text-chandra-text-secondary">{sub}</p>}
    </div>
  </div>
)

const getNakshatraDescription = (name) => {
  const descriptions = {
    'Ashwini':           'Ruled by Ketu. Associated with healing, speed and new beginnings. Deity: Ashwini Kumaras.',
    'Bharani':           'Ruled by Venus. Associated with transformation and restraint. Deity: Yama.',
    'Krittika':          'Ruled by Sun. Associated with sharp focus and purification. Deity: Agni.',
    'Rohini':            'Ruled by Moon. Most fertile Nakshatra — associated with growth and beauty. Deity: Brahma.',
    'Mrigashira':        'Ruled by Mars. Associated with searching, gentleness and curiosity. Deity: Soma.',
    'Ardra':             'Ruled by Rahu. Associated with storms, effort and transformation. Deity: Rudra.',
    'Punarvasu':         'Ruled by Jupiter. Associated with renewal and restoration. Deity: Aditi.',
    'Pushya':            'Ruled by Saturn. Most auspicious Nakshatra — nourishing and supportive. Deity: Brihaspati.',
    'Ashlesha':          'Ruled by Mercury. Associated with serpent energy and mysticism. Deity: Nagas.',
    'Magha':             'Ruled by Ketu. Associated with ancestors, authority and royalty. Deity: Pitrus.',
    'Purva Phalguni':    'Ruled by Venus. Associated with pleasure, creativity and rest. Deity: Bhaga.',
    'Uttara Phalguni':   'Ruled by Sun. Associated with partnerships and generosity. Deity: Aryaman.',
    'Hasta':             'Ruled by Moon. Associated with skill, craftsmanship and healing. Deity: Savitar.',
    'Chitra':            'Ruled by Mars. Associated with beauty, art and architecture. Deity: Vishwakarma.',
    'Swati':             'Ruled by Rahu. Associated with independence and the wind. Deity: Vayu.',
    'Vishakha':          'Ruled by Jupiter. Associated with purpose, ambition and triumph. Deity: Indra-Agni.',
    'Anuradha':          'Ruled by Saturn. Associated with devotion and friendship. Deity: Mitra.',
    'Jyeshtha':          'Ruled by Mercury. Associated with seniority and protection. Deity: Indra.',
    'Mula':              'Ruled by Ketu. Associated with roots, destruction and investigation. Deity: Nirriti.',
    'Purva Ashadha':     'Ruled by Venus. Associated with invincibility and purification. Deity: Apas.',
    'Uttara Ashadha':    'Ruled by Sun. Associated with final victory and universal principles. Deity: Vishvedevas.',
    'Shravana':          'Ruled by Moon. Associated with learning, listening and connection. Deity: Vishnu.',
    'Dhanishtha':        'Ruled by Mars. Associated with wealth, music and abundance. Deity: Eight Vasus.',
    'Shatabhisha':       'Ruled by Rahu. Associated with healing and hidden truths. Deity: Varuna.',
    'Purva Bhadrapada':  'Ruled by Jupiter. Associated with spiritual fire and transformation. Deity: Aja Ekapad.',
    'Uttara Bhadrapada': 'Ruled by Saturn. Associated with depth, wisdom and rain. Deity: Ahir Budhanya.',
    'Revati':            'Ruled by Mercury. Associated with journeys, nourishment and endings. Deity: Pushan.',
  }
  return descriptions[name] || 'A sacred lunar mansion with deep Vedic significance.'
}

export default Panchang
