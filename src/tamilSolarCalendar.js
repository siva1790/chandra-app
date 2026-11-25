import * as Astronomy from 'astronomy-engine'
import { getLahiriAyanamsha } from './ayanamsha.js'
import { DAY_MS, INDIA_OFFSET_MINUTES, startOfCivilDay } from './civilDate.js'
import { findSolarIngressTime } from './festivals.js'
import { getSunsetForDate } from './moonUtils.js'

const TAMIL_MONTHS = ['Chithirai', 'Vaikasi', 'Aani', 'Aadi', 'Avani', 'Purattasi', 'Aippasi', 'Karthigai', 'Margazhi', 'Thai', 'Maasi', 'Panguni']
const MEAN_LAHIRI_J2000 = 23.857092
const LAHIRI_J2000_CORRECTION = MEAN_LAHIRI_J2000 - getLahiriAyanamsha(new Date('2000-01-01T12:00:00Z'))

function tamilSolarLongitude(date) {
  const sun = Astronomy.GeoVector('Sun', date, true)
  const longitude = Astronomy.Ecliptic(sun).elon
  // Ecliptic returns true longitude of date. Subtract nutation to pair it
  // with the mean Lahiri ayanamsha, verified against Swiss Ephemeris Lahiri.
  const nutation = Astronomy.e_tilt(sun.t).dpsi / 3600
  const meanAyanamsha = getLahiriAyanamsha(date) + LAHIRI_J2000_CORRECTION
  return (longitude - nutation - meanAyanamsha + 360) % 360
}

export function getTamilSolarDate(date, { lat, lon, utcOffsetMinutes = INDIA_OFFSET_MINUTES }) {
  const sunset = getSunsetForDate(date, lat, lon, utcOffsetMinutes)
  const sign = Math.floor(tamilSolarLongitude(sunset) / 30)
  const ingress = findSolarIngressTime(new Date(+sunset - 35 * DAY_MS), sunset, sign * 30, tamilSolarLongitude)
  if (!ingress) return null
  let firstDay = startOfCivilDay(ingress, utcOffsetMinutes)
  if (ingress > getSunsetForDate(firstDay, lat, lon, utcOffsetMinutes)) {
    firstDay = new Date(+firstDay + DAY_MS)
  }
  const day = Math.round((+startOfCivilDay(date, utcOffsetMinutes) - +firstDay) / DAY_MS) + 1
  return { month: TAMIL_MONTHS[sign], day }
}
