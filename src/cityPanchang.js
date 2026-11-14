import { getSunsetForDate } from './moonUtils.js'
import { getPanchaAngaAtSunrise, getDailyTimingRanges } from './panchangAnga.js'
import { getFestivalsForDate } from './festivals.js'
import { DAY_MS, INDIA_OFFSET_MINUTES, INDIA_TIME_ZONE, indianDateKey, startOfCivilDay } from './civilDate.js'

import { getPublicPanchangCity } from './publicPanchangCities.js'
import { formatEventTime } from './timeFormatting.js'
import { getMoonEventsForDate } from './moonEvents.js'

export const formatIndiaTime = (value) => value
  ? formatEventTime(value)
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

export function getCityPanchang(slug, dateKey = indianDateKey()) {
  const city = getPublicPanchangCity(slug)
  if (!city) throw new Error('Unknown Panchang city')
  const start = dateFromKey(dateKey)
  const { lat, lon } = city
  const snapshot = getPanchaAngaAtSunrise(start, { lat, lon, utcOffsetMinutes: INDIA_OFFSET_MINUTES })
  const { sunrise, tithi } = snapshot
  const sunset = getSunsetForDate(start, lat, lon, INDIA_OFFSET_MINUTES)
  const { moonrise, moonset } = getMoonEventsForDate(start, city)
  const timings = getDailyTimingRanges(sunrise.getTime(), sunset.getTime(), snapshot.weekday)
  const [rahuStart, rahuEnd] = timings.rahuKaal.map(value => new Date(value))

  return {
    citySlug: city.slug,
    dateKey,
    dateLabel: formatIndiaDate(start),
    tithi: tithi.name,
    paksha: `${tithi.paksha} Paksha`,
    nakshatra: snapshot.nakshatra,
    yoga: snapshot.yoga,
    karana: snapshot.karana,
    vara: snapshot.vara,
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
