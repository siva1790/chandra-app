import * as Astronomy from 'astronomy-engine'

// Lahiri Ayanamsha — standard for Indian Panchang
const AYANAMSHA = 23.15

// ── Masa (lunar month) names, indexed by sun's sidereal rashi (0=Mesha…11=Meena) ──
// Rule: masa name = rashi the sun occupies at the Amavasya that governs the lunar month.
export const MASA_NAMES = [
  'Chaitra',      // Mesha      0–30°
  'Vaishakha',    // Vrishabha 30–60°
  'Jyeshtha',     // Mithuna   60–90°
  'Ashadha',      // Karka     90–120°
  'Shravana',     // Simha    120–150°
  'Bhadrapada',   // Kanya    150–180°
  'Ashwin',       // Tula     180–210°
  'Kartika',      // Vrischika 210–240°
  'Margashirsha', // Dhanu    240–270°
  'Pausha',       // Makara   270–300°
  'Magha',        // Kumbha   300–330°
  'Phalguna',     // Meena    330–360°
]

// Return the sun's sidereal longitude (0–360°) for a given date.
const getSunSiderealLon = (date) => {
  const sunPos = Astronomy.GeoVector('Sun', date, true)
  const sunEcl = Astronomy.Ecliptic(sunPos)
  return ((sunEcl.elon - AYANAMSHA + 360) % 360)
}

// Return the masa (lunar month name) for a given date.
//
// Amavasyant convention: the masa is named after the solar rashi (sidereal) at the
// Amavasya that ENDS the current lunar month — always in the future.
//
//   Shukla Paksha (phase 0–180°):  ending Amavasya is ~15–29 days ahead
//   Krishna Paksha (phase 180–360°): ending Amavasya is ~0–14 days ahead
//   Amavasya itself (phase ~360°):  ending Amavasya ≈ today
//
// We approximate by projecting forward ((360 − phase)/360) × 29.53 days.
// This is accurate to ±1–2 days — sufficient for rashi (30°) determination
// except in the rare case where the sun crosses a rashi boundary within 2 days
// of the new moon (affects ~2 festival dates per decade).
export const getMasaForDate = (date) => {
  const phaseAngle = Astronomy.MoonPhase(date)
  const SYNODIC = 29.53058867

  // Project forward to the Amavasya that ends this lunar month
  const daysUntil = ((360 - phaseAngle) / 360) * SYNODIC
  const endAmavasya = new Date(date.getTime() + daysUntil * 86400000)

  const sunLon = getSunSiderealLon(endAmavasya)
  return MASA_NAMES[Math.floor(sunLon / 30)]
}

// ── Solar festivals ────────────────────────────────────────────────────────────
// Triggered when the sun crosses a specific sidereal longitude threshold.
// We detect the crossing by comparing today's and yesterday's sun longitude.
const SOLAR_FESTIVALS = [
  {
    name: 'Makar Sankranti / Pongal',
    emoji: '🪁',
    type: 'major',
    sunLon: 270,   // Sun enters Makara (Capricorn) sidereal — always ~Jan 14–15
    description: "Sun's transition into Capricorn — harvest festival",
  },
]

export const getSolarFestivalsForDate = (date) => {
  const todayLon = getSunSiderealLon(date)
  const prevDate = new Date(date.getTime() - 86400000)
  const prevLon  = getSunSiderealLon(prevDate)
  return SOLAR_FESTIVALS.filter(f => prevLon < f.sunLon && todayLon >= f.sunLon)
}

// Get moon phase angle for any date
export const getMoonPhaseAngle = (date) => {
  return Astronomy.MoonPhase(date)
}

// Get Tithi info from phase angle
export const getTithiFromAngle = (phaseAngle) => {
  const tithiNames = [
    'Pratipada (Prathama)', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami',
    'Shashthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami',
    'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi', 'Purnima',
    'Pratipada (Prathama)', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami',
    'Shashthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami',
    'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi', 'Amavasya'
  ]
  const tithiIndex = Math.floor(phaseAngle / 12)
  const tithiNumber = tithiIndex + 1
  const paksha = tithiNumber <= 15 ? 'Shukla' : 'Krishna'
  const adjustedNumber = tithiNumber <= 15 ? tithiNumber : tithiNumber - 15
  const name = tithiNames[Math.min(tithiIndex, 29)]
  return { number: tithiNumber, adjustedNumber, name, paksha }
}

// Get lunar month number (1=Chaitra to 12=Phalguna)
export const getLunarMonth = (date) => {
  const month = date.getMonth()
  const day = date.getDate()
  const lunarMonth = day < 15
    ? ((month + 11) % 12) + 1
    : (month % 12) + 1
  return lunarMonth
}

// Get Nakshatra for a given date using Sidereal (Vedic) system
export const getNakshatraForDate = (date) => {
  const nakshatras = [
    'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira',
    'Ardra', 'Punarvasu', 'Pushya', 'Ashlesha', 'Magha',
    'Purva Phalguni', 'Uttara Phalguni', 'Hasta', 'Chitra', 'Swati',
    'Vishakha', 'Anuradha', 'Jyeshtha', 'Mula', 'Purva Ashadha',
    'Uttara Ashadha', 'Shravana', 'Dhanishtha', 'Shatabhisha',
    'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati'
  ]
  const moonPos = Astronomy.GeoVector('Moon', date, true)
  const moonEcliptic = Astronomy.Ecliptic(moonPos)
  // Apply Ayanamsha to convert Tropical to Sidereal
  const moonLongitude = ((moonEcliptic.elon - AYANAMSHA + 360) % 360)
  const nakshatraIndex = Math.floor(moonLongitude / (360 / 27))
  return nakshatras[nakshatraIndex % 27]
}

// Get all festivals for a given date
export const getFestivalsForDate = (date, festivals) => {
  const phaseAngle = getMoonPhaseAngle(date)
  const tithi = getTithiFromAngle(phaseAngle)
  const lunarMonth = getLunarMonth(date)

  return festivals.filter(f => {
    const tithiMatch = f.tithi === tithi.adjustedNumber
    const pakshaMatch = f.paksha === tithi.paksha

    if (f.monthly) {
      return tithiMatch && pakshaMatch
    }
    return tithiMatch && pakshaMatch && f.month === lunarMonth
  })
}

// Compute local sunrise time for a given Gregorian date and lat/lon.
// Falls back to 06:00 local on the date if Astronomy can't find sunrise
// (polar regions, missing inputs, etc.).
export const getSunriseForDate = (date, lat, lon) => {
  try {
    if (typeof lat === 'number' && typeof lon === 'number') {
      const observer = new Astronomy.Observer(lat, lon, 0)
      const dayStart = new Date(date)
      dayStart.setHours(0, 0, 0, 0)
      const sunrise = Astronomy.SearchRiseSet('Sun', observer, +1, dayStart, 1)
      if (sunrise) return sunrise.date
    }
  } catch (e) {
    // fall through to fallback
  }
  const fallback = new Date(date)
  fallback.setHours(6, 0, 0, 0)
  return fallback
}

// Compute local sunset time for a given Gregorian date and lat/lon.
// Falls back to 18:00 local on the date if Astronomy can't find sunset.
export const getSunsetForDate = (date, lat, lon) => {
  try {
    if (typeof lat === 'number' && typeof lon === 'number') {
      const observer = new Astronomy.Observer(lat, lon, 0)
      const dayStart = new Date(date)
      dayStart.setHours(0, 0, 0, 0)
      const sunset = Astronomy.SearchRiseSet('Sun', observer, -1, dayStart, 1)
      if (sunset) return sunset.date
    }
  } catch (e) {
    // fall through to fallback
  }
  const fallback = new Date(date)
  fallback.setHours(18, 0, 0, 0)
  return fallback
}

// Sample tithi at local sunrise — matches Drik Panchang convention that the
// day's tithi is whichever tithi is running at sunrise (not midnight, not "now").
// Without this, Sep 14 2026 reads as Tritiya at 00:00 IST even though it's
// Ganesh Chaturthi by tradition (Chaturthi tithi begins shortly before sunrise).
export const getTithiAtSunrise = (date, lat, lon) => {
  const sunriseTime = getSunriseForDate(date, lat, lon)
  const phaseAngle = Astronomy.MoonPhase(sunriseTime)
  return getTithiFromAngle(phaseAngle)
}

// Get short phase emoji for calendar
export const getPhaseEmoji = (phaseAngle) => {
  const phase = phaseAngle / 360
  if (phase < 0.03 || phase > 0.97) return '🌑'
  if (phase < 0.25) return '🌒'
  if (phase < 0.27) return '🌓'
  if (phase < 0.48) return '🌔'
  if (phase < 0.52) return '🌕'
  if (phase < 0.73) return '🌖'
  if (phase < 0.77) return '🌗'
  return '🌘'
}