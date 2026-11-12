import * as Astronomy from 'astronomy-engine'
import { getSunriseForDate, getSunsetForDate, getTithiAtSunrise, getNakshatraForDate } from './moonUtils.js'
import { getYogaAtTime, getKaranaFromPhase } from './panchangAnga.js'
import { getFestivalsForDate } from './festivals.js'
import { DAY_MS, INDIA_OFFSET_MINUTES, INDIA_TIME_ZONE, indianDateKey, startOfCivilDay } from './civilDate.js'

export const BENGALURU = Object.freeze({ city: 'Bengaluru', lat: 12.9716, lon: 77.5946 })
export const BENGALURU_PATH = '/panchang/bengaluru'

export const formatIndiaTime = (value) => value
  ? new Intl.DateTimeFormat('en-IN', { timeZone: INDIA_TIME_ZONE, hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(value))
  : 'No event on this date'

export const formatIndiaDate = (value) => new Intl.DateTimeFormat('en-IN', {
  timeZone: INDIA_TIME_ZONE, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
}).format(new Date(value))

export function dateFromKey(key) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) throw new Error('Choose a valid date.')
  const date = new Date(`${key}T00:00:00+05:30`)
  if (!Number.isFinite(date.getTime()) || indianDateKey(date) !== key) throw new Error('Choose a valid date.')
  return date
}

export function getBengaluruPanchang(dateKey = indianDateKey()) {
  const start = dateFromKey(dateKey)
  const { lat, lon } = BENGALURU
  const sunrise = getSunriseForDate(start, lat, lon, INDIA_OFFSET_MINUTES)
  const sunset = getSunsetForDate(start, lat, lon, INDIA_OFFSET_MINUTES)
  const tithi = getTithiAtSunrise(start, lat, lon, INDIA_OFFSET_MINUTES)
  const observer = new Astronomy.Observer(lat, lon, 0)
  const moonrise = Astronomy.SearchRiseSet('Moon', observer, +1, start, 1)?.date || null
  // Pair the civil day's moonrise with the setting that follows, matching Day View.
  const moonset = moonrise
    ? Astronomy.SearchRiseSet('Moon', observer, -1, moonrise, 2)?.date || null
    : null
  const weekday = new Date(start.getTime() + INDIA_OFFSET_MINUTES * 60000).getUTCDay()
  const slot = (sunset.getTime() - sunrise.getTime()) / 8
  const rahuSlot = [8, 2, 7, 5, 6, 4, 3][weekday]
  const rahuStart = new Date(sunrise.getTime() + (rahuSlot - 1) * slot)
  const rahuEnd = new Date(sunrise.getTime() + rahuSlot * slot)

  return {
    dateKey,
    dateLabel: formatIndiaDate(start),
    tithi: tithi.name,
    paksha: `${tithi.paksha} Paksha`,
    nakshatra: getNakshatraForDate(sunrise),
    yoga: getYogaAtTime(sunrise),
    karana: getKaranaFromPhase(Astronomy.MoonPhase(sunrise)),
    vara: ['Ravivar', 'Somvar', 'Mangalvar', 'Budhvar', 'Guruvar', 'Shukravar', 'Shanivar'][weekday],
    sunrise: sunrise.toISOString(),
    sunset: sunset.toISOString(),
    moonrise: moonrise?.toISOString() || null,
    moonset: moonset?.toISOString() || null,
    rahuStart: rahuStart.toISOString(),
    rahuEnd: rahuEnd.toISOString(),
    festivals: getFestivalsForDate(start, {
      lat, lon, calendarSystem: 'Amavasyant', utcOffsetMinutes: INDIA_OFFSET_MINUTES,
    }).map(({ name, description, type }) => ({ name, description, type })),
  }
}

export const nextIndianMidnight = (now) =>
  new Date(startOfCivilDay(now, INDIA_OFFSET_MINUTES).getTime() + DAY_MS)
