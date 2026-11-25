import { getPhaseEmoji } from './moonUtils.js'
import { getPanchaAngaAtSunrise } from './panchangAnga.js'
import { CALENDAR_TRADITIONS, getCalendarTithiName, getRegionalMonth } from './regionalCalendar.js'
import { getCalendarEvents } from './calendarEvents.js'
import { INDIA_OFFSET_MINUTES, indianDateKey, indianDayFromPicker } from './civilDate.js'

export const phaseLabel = (emoji) => ({
  '🌑': 'New moon',
  '🌒': 'Waxing crescent',
  '🌓': 'First quarter',
  '🌔': 'Waxing gibbous',
  '🌕': 'Full moon',
  '🌖': 'Waning gibbous',
  '🌗': 'Last quarter',
  '🌘': 'Waning crescent',
})[emoji] || 'Moon phase'

export const formatRegionalMonth = ({ name, day }) => (name && day ? `${day} ${name}` : name ?? 'Unavailable')

export function getCalendarDay(date, settings, includeEvents = true) {
  const tradition = Object.hasOwn(CALENDAR_TRADITIONS, settings.calendarTradition) ? settings.calendarTradition : ''
  const day = date.getDate()
  const indiaDate = indianDayFromPicker(date)
  const dateKey = indianDateKey(indiaDate)
  const location = { lat: settings.lat, lon: settings.lon, utcOffsetMinutes: INDIA_OFFSET_MINUTES, calendarSystem: settings.calendarSystem }
  const anga = getPanchaAngaAtSunrise(indiaDate, location)
  const regionalMonth = getRegionalMonth(indiaDate, anga, location, tradition, settings.calendarSystem)
  if (!includeEvents) return { regionalMonth, tithi: anga.tithi }

  const events = getCalendarEvents(date, settings, anga, regionalMonth)
  const festivals = events.filter(event => !event.eclipse)
  const eclipse = events.find(event => event.eclipse)?.eclipse
  const entryNames = events.map(event => event.name)
  return {
    day, date, dateKey, anga, festivals, eclipse, regionalMonth, entryNames,
    tithi: anga.tithi,
    tithiName: getCalendarTithiName(anga.tithi, tradition),
    phaseEmoji: getPhaseEmoji(anga.phaseAngle),
  }
}
