import * as Astronomy from 'astronomy-engine'
import { toSiderealLongitude } from './ayanamsha.js'
import { getSunriseForDate, getTithiAtSunrise, getNakshatraForDate } from './moonUtils.js'
import { startOfCivilDay } from './civilDate.js'

export const getMoonSiderealLongitude = (date) =>
  toSiderealLongitude(Astronomy.Ecliptic(Astronomy.GeoVector('Moon', date, true)).elon, date)

const YOGA_NAMES = [
  'Vishkambha', 'Priti', 'Ayushman', 'Saubhagya', 'Shobhana',
  'Atiganda', 'Sukarma', 'Dhriti', 'Shula', 'Ganda',
  'Vriddhi', 'Dhruva', 'Vyaghata', 'Harshana', 'Vajra',
  'Siddhi', 'Vyatipata', 'Variyan', 'Parigha', 'Shiva',
  'Siddha', 'Sadhya', 'Shubha', 'Shukla', 'Brahma',
  'Indra', 'Vaidhriti'
]

export const getYogaAtTime = (d) => {
  const sPos = Astronomy.GeoVector('Sun', d, true)
  const sLon = toSiderealLongitude(Astronomy.Ecliptic(sPos).elon, d)
  const mLon = getMoonSiderealLongitude(d)
  return YOGA_NAMES[Math.floor(((sLon + mLon) % 360) / (360 / 27))]
}

const MOVABLE_KARANAS = ['Bava', 'Balava', 'Kaulava', 'Taitila', 'Garija', 'Vanija', 'Vishti']

export const getKaranaFromPhase = (phaseAngle) => {
  const n = Math.floor(((phaseAngle % 360) + 360) % 360 / 6) // 0–59
  if (n === 0)  return 'Kimstughna'
  if (n === 57) return 'Shakuni'
  if (n === 58) return 'Chatushpada'
  if (n === 59) return 'Naga'
  return MOVABLE_KARANAS[(n - 1) % 7]
}

const VARA_NAMES = ['Ravivar', 'Somvar', 'Mangalvar', 'Budhvar', 'Guruvar', 'Shukravar', 'Shanivar']
const VARA_DEITIES = ['Sun ☀️', 'Moon 🌙', 'Mars ♂️', 'Mercury ☿', 'Jupiter ♃', 'Venus ♀️', 'Saturn ♄']

// A lightweight sunrise snapshot for cards, day summaries and public pages.
// Omit utcOffsetMinutes to preserve the app's local civil-day behavior;
// public Indian pages pass 330 explicitly, independent of the host timezone.
export function getPanchaAngaAtSunrise(date, { lat, lon, utcOffsetMinutes } = {}) {
  const sunrise = getSunriseForDate(date, lat, lon, utcOffsetMinutes)
  const phaseAngle = Astronomy.MoonPhase(sunrise)
  const moonLongitude = getMoonSiderealLongitude(sunrise)
  const sunLongitude = toSiderealLongitude(Astronomy.Ecliptic(Astronomy.GeoVector('Sun', sunrise, true)).elon, sunrise)
  const weekday = utcOffsetMinutes === undefined
    ? date.getDay()
    : new Date(startOfCivilDay(date, utcOffsetMinutes).getTime() + utcOffsetMinutes * 60000).getUTCDay()

  return {
    sunrise, phaseAngle, moonLongitude, sunLongitude, weekday,
    tithi: getTithiAtSunrise(date, lat, lon, utcOffsetMinutes),
    nakshatra: getNakshatraForDate(sunrise),
    pada: Math.floor((moonLongitude % (360 / 27)) / (360 / 108)) + 1,
    yoga: getYogaAtTime(sunrise),
    karana: getKaranaFromPhase(phaseAngle),
    vara: VARA_NAMES[weekday],
    varaDeity: VARA_DEITIES[weekday],
  }
}

// Raw epoch-millisecond ranges. Keep seconds/fractional milliseconds throughout
// the arithmetic; only the presentation layer rounds to a displayed minute.
export function getDailyTimingRanges(sunrise, sunset, weekday) {
  const minute = 60000
  const slot = (sunset - sunrise) / 8
  const range = (order) => [sunrise + (order[weekday] - 1) * slot, sunrise + order[weekday] * slot]
  const midday = (sunrise + sunset) / 2
  return {
    rahuKaal: range([8, 2, 7, 5, 6, 4, 3]),
    yamagandam: range([5, 4, 3, 2, 1, 7, 6]),
    abhijitMuhurta: [midday - 24 * minute, midday + 24 * minute],
    brahmaMuhurta: [sunrise - 96 * minute, sunrise - 48 * minute],
  }
}

