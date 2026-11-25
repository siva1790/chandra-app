import { SearchMoonPhase } from 'astronomy-engine'
import { DAY_MS, INDIA_OFFSET_MINUTES, startOfCivilDay } from './civilDate.js'
import { getMoonPhaseAngle, getSunriseForDate, getSunsetForDate } from './moonUtils.js'
import { getLunarMonthLabels } from './panchangCalculations.js'

const overlap = (start, end, from, to) => Math.max(0, Math.min(end, to) - Math.max(start, from))

function ritualScore(start, end, sunrise, sunset, nextSunrise, isRakshaBandhan) {
  const daylight = sunset - sunrise
  if (isRakshaBandhan) {
    // Start is the end of Bhadra (Vishti, the first karana of Purnima).
    const aparahna = overlap(start, end, sunrise + 3 * daylight / 5, sunrise + 4 * daylight / 5)
    const pradosh = overlap(start, end, sunset, sunset + (nextSunrise - sunset) / 5)
    if (aparahna || pradosh) return 2 * DAY_MS + (aparahna || pradosh)
    // The next morning qualifies only if Purnima survives three muhurtas
    // (one fifth of the daylight period) after sunrise.
    if (start <= sunrise && end >= sunrise + daylight / 5) return DAY_MS
  } else {
    const madhyahna = overlap(start, end, sunrise + 2 * daylight / 5, sunrise + 3 * daylight / 5)
    if (madhyahna) return DAY_MS + madhyahna
  }
  return overlap(start, end, sunrise, nextSunrise)
}

function matchesFestivalDate(date, snapshot, location, { angle, masa, isRakshaBandhan }) {
  const phase = snapshot.phaseAngle ?? getMoonPhaseAngle(snapshot.sunrise)
  if (phase < angle - 20 || phase > angle + 32) return false
  const { lat, lon, utcOffsetMinutes = INDIA_OFFSET_MINUTES } = location
  const civilDay = +startOfCivilDay(date, utcOffsetMinutes)
  const searchStart = new Date(civilDay - DAY_MS)
  const start = SearchMoonPhase(angle + (isRakshaBandhan ? 6 : 0), searchStart, 4)?.date
  const end = SearchMoonPhase(angle + 12, searchStart, 4)?.date
  if (!start || !end || start >= end || getLunarMonthLabels(start, 'Shukla Paksha').amavasyant !== masa) return false

  let bestDay
  let bestScore = 0
  const firstDay = +startOfCivilDay(start, utcOffsetMinutes) - DAY_MS
  for (let candidate = firstDay; candidate < +end; candidate += DAY_MS) {
    const day = new Date(candidate)
    const sunrise = +getSunriseForDate(day, lat, lon, utcOffsetMinutes)
    const sunset = +getSunsetForDate(day, lat, lon, utcOffsetMinutes)
    const nextSunrise = +getSunriseForDate(new Date(candidate + DAY_MS), lat, lon, utcOffsetMinutes)
    const score = ritualScore(+start, +end, sunrise, sunset, nextSunrise, isRakshaBandhan)
    if (score > bestScore) {
      bestDay = candidate
      bestScore = score
    }
  }
  return bestDay === civilDay
}

const RAM_NAVAMI = { angle: 96, masa: 'Chaitra' }
const RAKSHA_BANDHAN = { angle: 168, masa: 'Shravana', isRakshaBandhan: true }
const GANESH_CHATURTHI = { angle: 36, masa: 'Bhadrapada' }

export function getRegionalLunarFestivals(date, snapshot, location, tradition) {
  const festivals = []
  if (matchesFestivalDate(date, snapshot, location, RAM_NAVAMI)) {
    festivals.push({ id: 'ram-navami', name: { tamil: 'Rama Navami', telugu: 'Sri Rama Navami', ujjain: 'Ram Navami' }[tradition] })
  }
  if (tradition !== 'tamil' && matchesFestivalDate(date, snapshot, location, RAKSHA_BANDHAN)) {
    festivals.push({ id: 'raksha-bandhan', name: 'Raksha Bandhan' })
  }
  if (matchesFestivalDate(date, snapshot, location, GANESH_CHATURTHI)) {
    festivals.push({ id: 'ganesh-chaturthi', name: { tamil: 'Vinayagar Chathurthi', telugu: 'Vinayaka Chavithi', ujjain: 'Ganesh Chaturthi' }[tradition] })
  }
  return festivals
}
