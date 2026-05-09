import { useState, useEffect } from 'react'
import * as Astronomy from 'astronomy-engine'
import { getSunriseForDate, getSunsetForDate } from '../moonUtils'
import { getEclipseForDate, eclipseTypeLabel, lunarTotalityLabel } from '../eclipseUtils'
import DateStrip from '../components/DateStrip'
import { EclipseIcon } from '../components/EclipseIcons'
import { Clock, Moon, Star, Sun, Calendar as CalendarIcon, Sunrise, Sparkles, AlertTriangle, Timer, ChevronDown } from 'lucide-react'

const AYANAMSHA = 23.15

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
  return ((ecl.elon - AYANAMSHA + 360) % 360)
}

const getNakshatraIndex = (d) => Math.floor(getMoonSiderealLongitude(d) / (360 / 27))

const getPlanetSiderealLongitude = (body, d) => {
  const pos = Astronomy.GeoVector(body, d, true)
  const ecl = Astronomy.Ecliptic(pos)
  return ((ecl.elon - AYANAMSHA + 360) % 360)
}

// Mean ascending node (Rahu) longitude — sidereal via Lahiri
const getRahuLongitude = (date) => {
  const JD = date.getTime() / 86400000 + 2440587.5
  const T = (JD - 2451545.0) / 36525
  const omega = ((125.04452 - 1934.136261 * T) % 360 + 360) % 360
  return ((omega - AYANAMSHA + 360) % 360)
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
    const moonSidLon = ((moonEcl.elon - AYANAMSHA + 360) % 360)

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

const Panchang = ({ location, initialDate, onDateChange }) => {
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
      const tithiNames = [
        'Pratipada (Prathama)', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami',
        'Shashthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami',
        'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi', 'Purnima',
        'Pratipada (Prathama)', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami',
        'Shashthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami',
        'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi', 'Amavasya'
      ]
      const tithiIndex = Math.floor(phaseAngle / 12)
      const tithiName = tithiNames[Math.min(tithiIndex, 29)]
      const paksha = tithiIndex < 15 ? 'Shukla Paksha' : 'Krishna Paksha'

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

      const nakshatraName = nakshatraList[0]?.name || nakshatras[currentIdx % 27]
      const nakshatraPada = nakshatraList[0]?.pada || 1

      // --- Yoga ---
      const sunPos = Astronomy.GeoVector('Sun', sunriseTime, true)
      const sunEcliptic = Astronomy.Ecliptic(sunPos)
      const sunLongitude = ((sunEcliptic.elon - AYANAMSHA + 360) % 360)
      const yogaNames = [
        'Vishkambha', 'Priti', 'Ayushman', 'Saubhagya', 'Shobhana',
        'Atiganda', 'Sukarma', 'Dhriti', 'Shula', 'Ganda',
        'Vriddhi', 'Dhruva', 'Vyaghata', 'Harshana', 'Vajra',
        'Siddhi', 'Vyatipata', 'Variyan', 'Parigha', 'Shiva',
        'Siddha', 'Sadhya', 'Shubha', 'Shukla', 'Brahma',
        'Indra', 'Vaidhriti'
      ]
      const yogaIndex = Math.floor(((sunLongitude + moonLongitude) % 360) / (360 / 27))
      const yogaName = yogaNames[yogaIndex % 27]

      // --- Karana ---
      const karanaNames = [
        'Bava', 'Balava', 'Kaulava', 'Taitila', 'Garija',
        'Vanija', 'Vishti', 'Shakuni', 'Chatushpada', 'Naga', 'Kimstughna'
      ]
      const karanaIndex = Math.floor((phaseAngle / 6) % 11)
      const karanaName = karanaNames[karanaIndex]

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
      const calendarSystem = location?.calendarSystem || 'amavasyant'
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
      const isVishti   = karanaName === 'Vishti'
      const eclipse    = getEclipseForDate(date)

      setPanchang({
        tithi: tithiName, paksha,
        nakshatra: nakshatraName, nakshatraPada, nakshatraList,
        yoga: yogaName, karana: karanaName,
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
    <div className="min-h-screen px-4 py-8 pb-28 max-w-md mx-auto">

      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-yellow-300 mb-1 flex items-center justify-center gap-2">
          <Clock size={22} aria-hidden="true" strokeWidth={1.75} /> Panchang
        </h1>
        <p className="text-gray-400 text-sm">Daily Hindu Almanac</p>
      </div>

      {/* Date Navigator */}
      <DateStrip date={selectedDate} onDateChange={changeDate} mode="day" />

      {panchang ? (
        <div className="flex flex-col gap-4">

          {/* ── Eclipse Banner (always visible, outside accordions) ── */}
          {panchang.eclipse && (
            <div className="bg-indigo-950 border border-indigo-600 rounded-2xl p-5">
              <div className="flex items-center gap-4">
                <EclipseIcon eclipse={panchang.eclipse} size={44} />
                <div className="flex-1">
                  <p className="text-indigo-200 font-bold text-base">{panchang.eclipse.hinduName}</p>
                  <p className="text-indigo-400 text-xs mt-0.5">{eclipseTypeLabel(panchang.eclipse)}</p>
                  <p className="text-indigo-300 text-sm mt-1.5 font-medium">
                    Peak: {panchang.eclipse.peakTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })} IST
                  </p>
                  {lunarTotalityLabel(panchang.eclipse) && (
                    <p className="text-indigo-400 text-xs mt-0.5">{lunarTotalityLabel(panchang.eclipse)}</p>
                  )}
                  {panchang.eclipse.type === 'lunar' && (
                    <p className="text-indigo-500 text-xs mt-1.5 leading-relaxed">Avoid auspicious activities during the eclipse. Perform ritual bath after eclipse ends.</p>
                  )}
                  {panchang.eclipse.type === 'solar' && (
                    <p className="text-indigo-500 text-xs mt-1.5 leading-relaxed">Surya Grahan — avoid eating during the eclipse period. Chant mantras and pray.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Special Day Banners (always visible) ── */}
          {panchang.isPurnima && (
            <div className="bg-yellow-950 border border-yellow-600 rounded-2xl p-4 text-center">
              <p className="text-yellow-300 font-semibold"><span role="img" aria-label="Full moon">🌕</span> Purnima — Full Moon Day</p>
              <p className="text-yellow-500 text-xs mt-1">Auspicious for prayers, charity and fasting</p>
            </div>
          )}
          {panchang.isAmavasya && (
            <div className="bg-indigo-950 border border-indigo-600 rounded-2xl p-4 text-center">
              <p className="text-indigo-300 font-semibold"><span role="img" aria-label="New moon">🌑</span> Amavasya — New Moon Day</p>
              <p className="text-indigo-400 text-xs mt-1">Sacred for ancestral offerings (Pitru Tarpan)</p>
            </div>
          )}
          {panchang.isEkadashi && (
            <div className="bg-orange-950 border border-orange-600 rounded-2xl p-4 text-center">
              <p className="text-orange-300 font-semibold"><span role="img" aria-label="Folded hands">🙏</span> Ekadashi — Fasting Day</p>
              <p className="text-orange-400 text-xs mt-1">Dedicated to Lord Vishnu — avoid grains today</p>
            </div>
          )}
          {panchang.isVishti && (
            <div className="bg-red-950 border border-red-800 rounded-2xl p-4 text-center">
              <p className="text-red-400 font-semibold"><span role="img" aria-label="Warning">⚠️</span> Bhadra (Vishti Karana)</p>
              <p className="text-red-500 text-xs mt-1">Avoid auspicious activities during this period</p>
            </div>
          )}

          {/* ── Collapse / Expand All ── */}
          <div className="flex justify-end">
            <button
              onClick={toggleAll}
              className="text-yellow-500 text-xs underline underline-offset-2 px-2 py-1 min-h-[44px] flex items-center"
            >
              {allExpanded ? 'Collapse All' : 'Expand All'}
            </button>
          </div>

          {/* ── 1. Pancha Anga ── */}
          <AccordionSection
            title="Pancha Anga — Five Limbs"
            isOpen={sections.panchaAnga}
            onToggle={() => toggleSection('panchaAnga')}
          >
            <div className="flex flex-col gap-3">
              <PanchangRow icon={Moon} label="Tithi" value={panchang.tithi} sub={panchang.paksha} />

              {panchang.nakshatraList?.length > 0 ? (
                <div className="py-2 border-b border-gray-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Star size={16} aria-hidden="true" strokeWidth={1.75} className="text-gray-400 shrink-0" />
                    <span className="text-gray-400 text-sm">Nakshatra</span>
                  </div>
                  {panchang.nakshatraList.map((n, i) => (
                    <div key={i} className="ml-6 mb-2 bg-gray-800 rounded-xl px-3 py-2">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-white text-sm font-semibold">{n.name}</p>
                        <p className="text-gray-400 text-xs">Pada {n.pada}</p>
                      </div>
                      <p className="text-yellow-300 text-xs font-medium">
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

              <PanchangRow icon={Clock}        label="Yoga"   value={panchang.yoga} />
              <PanchangRow icon="½"             label="Karana" value={panchang.karana} />
              <PanchangRow icon={CalendarIcon}  label="Vara"   value={panchang.vara} sub={panchang.varaDeity} />
            </div>
          </AccordionSection>

          {/* ── 2. Daily Timings ── */}
          <AccordionSection
            title="Daily Timings"
            isOpen={sections.dailyTimings}
            onToggle={() => toggleSection('dailyTimings')}
          >
            <div className="flex flex-col gap-3">
              <PanchangRow icon={Sunrise}       label="Brahma Muhurta"  value={panchang.brahmaMuhurta}  sub="Most auspicious for meditation" />
              <PanchangRow icon={Sparkles}      label="Abhijit Muhurta" value={panchang.abhijitMuhurta} sub="Auspicious for new beginnings" />
              <PanchangRow icon={AlertTriangle} label="Rahu Kaal"       value={panchang.rahuKaal}       sub="Avoid important work"          highlight="red" />
              <PanchangRow icon={Timer}         label="Yamagandam"      value={panchang.yamagandam}     sub="Avoid auspicious activities"   highlight="red" />
            </div>
          </AccordionSection>

          {/* ── 3. Nakshatra Details ── */}
          <AccordionSection
            title="Nakshatra Details"
            isOpen={sections.nakshatraDetails}
            onToggle={() => toggleSection('nakshatraDetails')}
          >
            <div className="flex flex-col gap-4">
              {panchang.nakshatraList?.map((n, i) => (
                <div key={i}>
                  <p className="text-yellow-400 text-xs font-medium mb-2">
                    {n.name}
                    {panchang.nakshatraList.length > 1
                      ? ` · ${formatTime(n.start)}, ${formatShortDate(n.start)} – ${formatTime(n.end)}, ${formatShortDate(n.end)}`
                      : " — Today's Nakshatra"
                    }
                  </p>
                  <p className="text-gray-300 text-sm leading-relaxed">{getNakshatraDescription(n.name)}</p>
                  {i < panchang.nakshatraList.length - 1 && (
                    <div className="border-t border-gray-800 mt-4" />
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
          <AccordionSection
            title="Planetary Positions — Navagraha"
            isOpen={sections.planetary}
            onToggle={() => toggleSection('planetary')}
          >
            <p className="text-gray-500 text-xs mb-3">Sidereal longitudes (Lahiri Ayanamsha) at sunrise</p>
            <div className="flex flex-col">
              {[
                { symbol: '☀',  name: 'Sun',     sanskrit: 'Surya',      lon: panchang.navagraha.Sun     },
                { symbol: '🌙', name: 'Moon',    sanskrit: 'Chandra',    lon: panchang.navagraha.Moon    },
                { symbol: '♂',  name: 'Mars',    sanskrit: 'Mangala',    lon: panchang.navagraha.Mars    },
                { symbol: '☿',  name: 'Mercury', sanskrit: 'Budha',      lon: panchang.navagraha.Mercury },
                { symbol: '♃',  name: 'Jupiter', sanskrit: 'Guru',       lon: panchang.navagraha.Jupiter },
                { symbol: '♀',  name: 'Venus',   sanskrit: 'Shukra',     lon: panchang.navagraha.Venus   },
                { symbol: '♄',  name: 'Saturn',  sanskrit: 'Shani',      lon: panchang.navagraha.Saturn  },
                { symbol: '☊',  name: 'Rahu',    sanskrit: 'North Node', lon: panchang.navagraha.Rahu    },
                { symbol: '☋',  name: 'Ketu',    sanskrit: 'South Node', lon: panchang.navagraha.Ketu    },
              ].map(({ symbol, name, sanskrit, lon }) => (
                <div key={name} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-base w-5 text-center leading-none" aria-hidden="true">{symbol}</span>
                    <div>
                      <span className="text-gray-300 text-sm">{name}</span>
                      <span className="text-gray-600 text-xs ml-1.5">({sanskrit})</span>
                    </div>
                  </div>
                  <p className="text-white text-sm font-medium tabular-nums">{formatLongitude(lon)}</p>
                </div>
              ))}
            </div>
          </AccordionSection>

        </div>
      ) : (
        <div aria-live="polite" aria-busy="true" className="text-center text-gray-400 mt-20">
          <Clock size={36} aria-hidden="true" strokeWidth={1.25} className="mx-auto mb-4 text-yellow-800" />
          <p>Calculating Panchang...</p>
        </div>
      )}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────

const AccordionSection = ({ title, isOpen, onToggle, children }) => (
  <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
    <button
      onClick={onToggle}
      aria-expanded={isOpen}
      className="w-full flex items-center justify-between px-5 py-4 text-left min-h-[44px]"
    >
      <p className="text-yellow-500 text-xs uppercase tracking-widest">{title}</p>
      <ChevronDown
        size={16}
        strokeWidth={1.75}
        aria-hidden="true"
        className={`text-gray-400 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
      />
    </button>
    {isOpen && (
      <div className="px-5 pb-5">
        {children}
      </div>
    )}
  </div>
)

const PanchangRow = ({ icon: Icon, label, value, sub, highlight }) => (
  <div className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
    <div className="flex items-center gap-2">
      {typeof Icon === 'string'
        ? <span className="text-base" aria-hidden="true">{Icon}</span>
        : <Icon size={16} aria-hidden="true" strokeWidth={1.75} className="text-gray-400 shrink-0" />
      }
      <span className="text-gray-400 text-sm">{label}</span>
    </div>
    <div className="text-right">
      <p className={`text-sm font-semibold ${highlight === 'red' ? 'text-red-400' : 'text-white'}`}>{value}</p>
      {sub && <p className="text-gray-500 text-xs">{sub}</p>}
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
