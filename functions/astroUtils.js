/**
 * astroUtils.js — astronomy and festival helpers for Cloud Functions (Node.js).
 *
 * Mirrors the logic in src/moonUtils.js and src/festivals.js but runs server-side.
 * All date comparisons use IST (Asia/Kolkata, UTC+5:30) to match the app's convention.
 */

'use strict'

const Astronomy = require('astronomy-engine')

// ── Constants ─────────────────────────────────────────────────────────────────

const AYANAMSHA = 23.15

const TITHI_NAMES = [
  'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami',
  'Shashthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami',
  'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi', 'Purnima',
  'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami',
  'Shashthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami',
  'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi', 'Amavasya',
]

const NAKSHATRAS = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira',
  'Ardra', 'Punarvasu', 'Pushya', 'Ashlesha', 'Magha',
  'Purva Phalguni', 'Uttara Phalguni', 'Hasta', 'Chitra', 'Swati',
  'Vishakha', 'Anuradha', 'Jyeshtha', 'Mula', 'Purva Ashadha',
  'Uttara Ashadha', 'Shravana', 'Dhanishtha', 'Shatabhisha',
  'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati',
]

// ── Festival Data (mirrors src/festivals.js) ──────────────────────────────────

const DATED_FESTIVALS_2026 = [
  { date: '2026-01-14', name: 'Makar Sankranti / Pongal',    emoji: '🪁', description: "Sun's transition into Capricorn — harvest festival",          major: true },
  { date: '2026-01-23', name: 'Vasant Panchami',              emoji: '📚', description: 'Worship of Goddess Saraswati — first day of spring',          major: true },
  { date: '2026-02-15', name: 'Maha Shivaratri',              emoji: '🕉️', description: 'Great night of Lord Shiva',                                    major: true },
  { date: '2026-03-03', name: 'Holika Dahan',                 emoji: '🔥', description: 'Bonfire night before Holi — burning of evil',                  major: true },
  { date: '2026-03-04', name: 'Holi',                         emoji: '🎨', description: 'Festival of colours celebrating spring',                       major: true },
  { date: '2026-03-19', name: 'Ugadi / Gudi Padwa',           emoji: '🎊', description: 'Hindu New Year — celebrated across South and West India',      major: true },
  { date: '2026-03-26', name: 'Ram Navami',                   emoji: '🏹', description: 'Birthday of Lord Rama',                                        major: true },
  { date: '2026-03-31', name: 'Mahavir Jayanti',              emoji: '🙏', description: 'Birthday of Lord Mahavir, founder of Jainism',                 major: true },
  { date: '2026-04-02', name: 'Hanuman Jayanti',              emoji: '🙏', description: 'Birthday of Lord Hanuman',                                     major: true },
  { date: '2026-09-14', name: 'Ganesh Chaturthi',             emoji: '🐘', description: '10-day festival celebrating Lord Ganesha',                     major: true },
  { date: '2026-10-11', name: 'Sharad Navratri Begins',       emoji: '🪔', description: 'Nine nights of Goddess Durga worship',                         major: true },
  { date: '2026-10-20', name: 'Dussehra (Vijayadashami)',     emoji: '🏹', description: 'Victory of Lord Rama over Ravana',                             major: true },
  { date: '2026-10-29', name: 'Karwa Chauth',                 emoji: '🌙', description: "Fasting by married women for husband's long life",              major: true },
  { date: '2026-11-08', name: 'Diwali (Deepavali)',           emoji: '🪔', description: 'Festival of lights — most celebrated Hindu festival',           major: true },
  { date: '2026-11-13', name: 'Chhath Puja',                  emoji: '🌅', description: 'Sun god worship — sacred bathing and offerings',                major: true },
]

const MONTHLY_FESTIVALS = [
  { name: 'Ekadashi',           paksha: 'Shukla',  tithi: 11, emoji: '🙏', description: 'Fasting day dedicated to Lord Vishnu' },
  { name: 'Ekadashi',           paksha: 'Krishna', tithi: 11, emoji: '🙏', description: 'Fasting day dedicated to Lord Vishnu' },
  { name: 'Purnima',            paksha: 'Shukla',  tithi: 15, emoji: '🌕', description: 'Full moon — auspicious for prayers and rituals' },
  { name: 'Amavasya',           paksha: 'Krishna', tithi: 15, emoji: '🌑', description: 'New moon — day for ancestral offerings' },
  { name: 'Pradosh Vrat',       paksha: 'Shukla',  tithi: 13, emoji: '🕉️', description: 'Fasting dedicated to Lord Shiva' },
  { name: 'Pradosh Vrat',       paksha: 'Krishna', tithi: 13, emoji: '🕉️', description: 'Fasting dedicated to Lord Shiva' },
  { name: 'Sankashti Chaturthi',paksha: 'Krishna', tithi:  4, emoji: '🐘', description: 'Ganesha fast for removal of obstacles' },
  { name: 'Masik Shivaratri',   paksha: 'Krishna', tithi: 14, emoji: '🕉️', description: 'Monthly night of Lord Shiva' },
  { name: 'Kalashtami',         paksha: 'Krishna', tithi:  8, emoji: '⚔️', description: 'Dedicated to Lord Bhairava / Goddess Durga' },
]

// ── Timezone helpers ──────────────────────────────────────────────────────────

/**
 * Returns today's date string in IST as 'YYYY-MM-DD'.
 * Cloud Functions run in UTC — this converts correctly for Indian festival matching.
 */
const getISTDateKey = (utcDate = new Date()) => {
  return utcDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
  // en-CA locale gives ISO format YYYY-MM-DD
}

/**
 * Returns a Date object representing midnight IST for the given UTC date.
 * Used to anchor astronomical searches (sunrise, moonrise) to the correct IST day.
 */
const getISTMidnight = (utcDate = new Date()) => {
  const istString = utcDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
  const [yyyy, mm, dd] = istString.split('-').map(Number)
  // Create as UTC but offset so it represents IST midnight
  return new Date(Date.UTC(yyyy, mm - 1, dd, 0, 0, 0) - (5.5 * 60 * 60 * 1000))
}

// ── Astronomy helpers ─────────────────────────────────────────────────────────

const getTithiFromAngle = (phaseAngle) => {
  const tithiIndex  = Math.floor(phaseAngle / 12)
  const paksha      = tithiIndex < 15 ? 'Shukla' : 'Krishna'
  const adjusted    = tithiIndex < 15 ? tithiIndex + 1 : tithiIndex - 14
  const name        = TITHI_NAMES[Math.min(tithiIndex, 29)]
  return { adjustedNumber: adjusted, paksha, name }
}

const getSunrise = (date, lat, lon) => {
  try {
    const observer  = new Astronomy.Observer(lat, lon, 0)
    const dayStart  = getISTMidnight(date)
    const result    = Astronomy.SearchRiseSet('Sun', observer, +1, dayStart, 1)
    if (result) return result.date
  } catch (_) {}
  // Fallback: 6 AM local
  const fb = new Date(date)
  fb.setHours(6, 0, 0, 0)
  return fb
}

/**
 * Tithi at sunrise — with noon override (Drik Panchang convention).
 * Matches exactly what the frontend calculates in moonUtils.js.
 */
const getTithiAtSunrise = (date, lat, lon) => {
  const sunriseTime   = getSunrise(date, lat, lon)
  const sunriseTithi  = getTithiFromAngle(Astronomy.MoonPhase(sunriseTime))

  // Noon override: if tithi at noon differs from sunrise, use noon tithi
  const noon = new Date(sunriseTime)
  noon.setHours(12, 0, 0, 0)
  const noonTithi = getTithiFromAngle(Astronomy.MoonPhase(noon))

  return sunriseTithi.adjustedNumber !== noonTithi.adjustedNumber ? noonTithi : sunriseTithi
}

const getNakshatra = (date) => {
  try {
    const moonPos      = Astronomy.GeoVector('Moon', date, true)
    const moonEcliptic = Astronomy.Ecliptic(moonPos)
    const longitude    = ((moonEcliptic.elon - AYANAMSHA + 360) % 360)
    return NAKSHATRAS[Math.floor(longitude / (360 / 27)) % 27]
  } catch (_) {
    return 'Unknown'
  }
}

const getMoonrise = (date, lat, lon) => {
  try {
    const observer = new Astronomy.Observer(lat, lon, 0)
    const dayStart = getISTMidnight(date)
    const result   = Astronomy.SearchRiseSet('Moon', observer, +1, dayStart, 2)
    return result ? result.date : null
  } catch (_) {
    return null
  }
}

// ── Eclipse helpers ───────────────────────────────────────────────────────────

const _eclipseCache = {}

const getEclipsesForYear = (year) => {
  if (_eclipseCache[year]) return _eclipseCache[year]
  const results  = []
  const yearStart = new Date(year, 0, 1)
  const yearEnd   = new Date(year + 1, 0, 1)

  try {
    let e = Astronomy.SearchLunarEclipse(yearStart)
    while (e && e.peak.date < yearEnd) {
      results.push({
        type: 'lunar', kind: e.kind, peakTime: e.peak.date,
        hinduName: { total: 'Purna Chandra Grahan', partial: 'Khand Chandra Grahan', penumbral: 'Chhaya Grahan' }[e.kind] ?? 'Chandra Grahan',
      })
      e = Astronomy.SearchLunarEclipse(new Date(e.peak.date.getTime() + 29 * 864e5))
    }
  } catch (_) {}

  try {
    let e = Astronomy.SearchGlobalSolarEclipse(yearStart)
    while (e && e.peak.date < yearEnd) {
      results.push({
        type: 'solar', kind: e.kind, peakTime: e.peak.date,
        hinduName: { total: 'Purna Surya Grahan', annular: 'Kankana Surya Grahan', partial: 'Khand Surya Grahan', hybrid: 'Surya Grahan' }[e.kind] ?? 'Surya Grahan',
      })
      e = Astronomy.SearchGlobalSolarEclipse(new Date(e.peak.date.getTime() + 29 * 864e5))
    }
  } catch (_) {}

  results.sort((a, b) => a.peakTime - b.peakTime)
  _eclipseCache[year] = results
  return results
}

const getEclipseForDate = (utcDate) => {
  const istKey  = getISTDateKey(utcDate)
  const year    = parseInt(istKey.split('-')[0], 10)
  return getEclipsesForYear(year).find(e => getISTDateKey(e.peakTime) === istKey) || null
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * getDayInfo — compute everything the backend needs for a given city and date.
 *
 * Returns:
 *   tithi         — { adjustedNumber, paksha, name }
 *   nakshatra     — string
 *   moonrise      — Date | null
 *   festivals     — array of festival objects (dated + monthly, same logic as app)
 *   datedFestivals — only the hardcoded annual festivals (used for emailFrequency='major')
 *   eclipse       — eclipse object | null
 */
const getDayInfo = (utcDate, lat, lon) => {
  const istDateKey = getISTDateKey(utcDate)
  const year       = parseInt(istDateKey.split('-')[0], 10)

  // Tithi (noon-override convention)
  const tithi     = getTithiAtSunrise(utcDate, lat, lon)
  const nakshatra = getNakshatra(utcDate)
  const moonrise  = getMoonrise(utcDate, lat, lon)
  const eclipse   = getEclipseForDate(utcDate)

  // Dated festivals (hardcoded annual list)
  const datedList    = year === 2026 ? DATED_FESTIVALS_2026 : []
  const datedFests   = datedList.filter(f => f.date === istDateKey)

  // Monthly observances are suppressed if a dated festival exists (same rule as app)
  const monthlyFests = datedFests.length > 0
    ? []
    : MONTHLY_FESTIVALS.filter(
        f => f.tithi === tithi.adjustedNumber && f.paksha === tithi.paksha
      )

  return {
    tithi,
    nakshatra,
    moonrise,
    festivals:      [...datedFests, ...monthlyFests],
    datedFestivals: datedFests,
    eclipse,
  }
}

/**
 * getUpcomingFestivals — returns dated festivals in the next `daysAhead` days.
 * Used for monthly digest emails.
 */
const getUpcomingFestivals = (utcDate, daysAhead = 30) => {
  const upcoming = []
  for (let i = 0; i < daysAhead; i++) {
    const d       = new Date(utcDate.getTime() + i * 864e5)
    const dateKey = getISTDateKey(d)
    const year    = parseInt(dateKey.split('-')[0], 10)
    const list    = year === 2026 ? DATED_FESTIVALS_2026 : []
    const found   = list.filter(f => f.date === dateKey)
    if (found.length > 0) upcoming.push({ date: d, dateKey, festivals: found })
  }
  return upcoming
}

module.exports = { getDayInfo, getUpcomingFestivals, getISTDateKey }
