import * as Astronomy from 'astronomy-engine'
import { DAY_MS, INDIA_OFFSET_MINUTES, startOfCivilDay } from './civilDate.js'

// Indian civil-day display policy shared by Home and public city pages.
// Search failures propagate; a null result means no event, not a failed search.
export function getMoonEventsForDate(date, { lat, lon }) {
  const observer = new Astronomy.Observer(lat, lon, 0)
  const start = startOfCivilDay(date, INDIA_OFFSET_MINUTES)
  const end = start.getTime() + DAY_MS
  const withinDay = event => event && event.getTime() >= start.getTime() && event.getTime() < end ? event : null
  const moonrise = withinDay(Astronomy.SearchRiseSet('Moon', observer, +1, start, 1)?.date)
  // Preserve the dated following-moonset pair when a rise exists. Otherwise,
  // independently show any moonset within the selected day, without borrowing
  // tomorrow's moonrise or moonset to fill an absent event.
  const moonset = moonrise
    ? Astronomy.SearchRiseSet('Moon', observer, -1, moonrise, 2)?.date || null
    : withinDay(Astronomy.SearchRiseSet('Moon', observer, -1, start, 1)?.date)
  return { moonrise, moonset }
}
