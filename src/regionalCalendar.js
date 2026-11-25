import { DAY_MS } from './civilDate.js'
import { ANNUAL_FESTIVALS, getFestivalsForDate } from './festivals.js'
import { getMoonPhaseAngle, getSunriseForDate } from './moonUtils.js'
import { getLunarMonthLabels } from './panchangCalculations.js'
import { getTamilSolarDate } from './tamilSolarCalendar.js'
import { getRegionalLunarFestivalNames } from './regionalFestivalDates.js'

export const CALENDAR_TRADITIONS = {
  tamil: { name: 'Tamil · Solar', highlightLabel: 'Tamil tradition' },
  telugu: { name: 'Telugu · Amavasyant', highlightLabel: 'Telugu tradition' },
  ujjain: { name: 'Ujjain tradition · Purnimant', highlightLabel: 'Ujjain tradition' },
}

const TELUGU_MONTHS = {
  Chaitra: 'Chaitramu', Vaishakha: 'Vaisakhamu', Jyeshtha: 'Jyesthamu', Ashadha: 'Ashadhamu',
  Shravana: 'Sravanamu', Bhadrapada: 'Bhadrapadamu', Ashwin: 'Asvayujamu', Kartika: 'Karthikamu',
  Margashirsha: 'Margasiramu', Pausha: 'Pushyamu', Magha: 'Maghamu', Phalguna: 'Phalgunamu',
}
const TAMIL_TITHIS = ['Pirathamai', 'Thuthiyai', 'Thiruthiyai', 'Sathurthi', 'Panjami', 'Sashti', 'Sapthami', 'Ashtami', 'Navami', 'Dasami', 'Ekadasi', 'Dwadasi', 'Thirayodasi', 'Sathuradasi']
const TELUGU_TITHIS = ['Padyami', 'Vidiya', 'Thadiya', 'Chavithi', 'Panchami', 'Shashti', 'Sapthami', 'Ashtami', 'Navami', 'Dasami', 'Ekadasi', 'Dwadasi', 'Thrayodasi', 'Chathurdasi']

export function getCalendarTithiName(tithi, tradition) {
  if (tradition === 'tamil') {
    if (tithi.adjustedNumber === 15) return tithi.paksha === 'Shukla' ? 'Pournami' : 'Amavasai'
    return TAMIL_TITHIS[tithi.adjustedNumber - 1]
  }
  if (tradition === 'telugu') {
    if (tithi.adjustedNumber === 15) return tithi.paksha === 'Shukla' ? 'Pournami' : 'Amavasya'
    return TELUGU_TITHIS[tithi.adjustedNumber - 1]
  }
  return tithi.name.replace(' (Prathama)', '')
}

export function getRegionalMonth(date, snapshot, location, tradition, calendarSystem) {
  if (tradition === 'tamil') {
    const solarDate = getTamilSolarDate(date, location)
    return { name: solarDate?.month, day: solarDate?.day }
  }
  const { amavasyant, purnimant } = getLunarMonthLabels(snapshot.sunrise, `${snapshot.tithi.paksha} Paksha`)
  const usePurnimant = tradition === 'ujjain' || (!tradition && calendarSystem === 'Purnimant')
  const name = usePurnimant ? purnimant : amavasyant
  return { name: tradition === 'telugu' ? name?.replace(/\w+$/, word => TELUGU_MONTHS[word] ?? word) : name }
}

const major = name => ({ name, type: 'major' })

const TELUGU_FESTIVALS = {
  'Dussehra (Vijayadashami)': 'Vijayadashami',
  'Diwali (Deepavali)': 'Deepavali',
}
const UJJAIN_FESTIVALS = {
  'Dussehra (Vijayadashami)': 'Vijayadashami',
  'Diwali (Deepavali)': 'Diwali',
}
const regionalRules = {
  telugu: ANNUAL_FESTIVALS.filter(rule => Object.hasOwn(TELUGU_FESTIVALS, rule.name)),
  ujjain: ANNUAL_FESTIVALS.filter(rule => Object.hasOwn(UJJAIN_FESTIVALS, rule.name)),
}

const sunriseNear = (date, days, { lat, lon, utcOffsetMinutes }) =>
  getSunriseForDate(new Date(+date + days * DAY_MS), lat, lon, utcOffsetMinutes)

function isChaitraPratipadaObservance(date, sunrise, location) {
  const phase = getMoonPhaseAngle(sunrise)
  if (phase < 12) {
    return getMoonPhaseAngle(sunriseNear(date, -1, location)) >= 12 &&
      getLunarMonthLabels(sunrise, 'Shukla Paksha').amavasyant === 'Chaitra'
  }
  if (phase < 345) return false
  const nextSunrise = sunriseNear(date, 1, location)
  const nextPhase = getMoonPhaseAngle(nextSunrise)
  // If Pratipada starts and ends between sunrises, use the date it begins.
  return nextPhase >= 12 && nextPhase < 24 &&
    getLunarMonthLabels(nextSunrise, 'Shukla Paksha').amavasyant === 'Chaitra'
}

function isTamilDeepavali(date, snapshot, location) {
  const { sunrise, tithi } = snapshot
  const phaseBeforeSunrise = (sample, minutes) => getMoonPhaseAngle(new Date(+sample - minutes * 60000))
  const start = phaseBeforeSunrise(sunrise, 96)
  const end = phaseBeforeSunrise(sunrise, 48)
  const inBrahmaMuhurtham = start < 348 && end >= 336
  const atSunrise = tithi.paksha === 'Krishna' && tithi.adjustedNumber === 14
  if (!inBrahmaMuhurtham && !atSunrise) return false
  if (getLunarMonthLabels(sunrise, 'Krishna Paksha').amavasyant !== 'Ashwin') return false
  if (inBrahmaMuhurtham) return true
  // Use the sunrise date if Chaturdashi misses both pre-sunrise windows.
  const nextStart = phaseBeforeSunrise(sunriseNear(date, 1, location), 96)
  return nextStart >= 348 || nextStart < 336
}

export function getRegionalFestivals(date, snapshot, location, tradition, regionalMonth) {
  const options = { ...location, tithiNumber: snapshot.tithi.adjustedNumber, paksha: snapshot.tithi.paksha }
  if (!Object.hasOwn(CALENDAR_TRADITIONS, tradition)) return getFestivalsForDate(date, options)
  const regionalFestivals = getRegionalLunarFestivalNames(date, snapshot, location, tradition).map(major)

  if (tradition === 'tamil') {
    const festivals = regionalFestivals
    if (regionalMonth.name === 'Chithirai' && regionalMonth.day === 1) festivals.push(major('Puthandu'))
    if (regionalMonth.name === 'Thai' && regionalMonth.day === 1) festivals.push(major('Thai Pongal'))
    if (regionalMonth.name === 'Aadi' && regionalMonth.day === 18) festivals.push(major('Aadi Perukku'))
    if (isTamilDeepavali(date, snapshot, location)) festivals.push(major('Deepavali'))
    return festivals
  }

  const names = tradition === 'telugu' ? TELUGU_FESTIVALS : UJJAIN_FESTIVALS
  const calendarSystem = tradition === 'ujjain' ? 'Purnimant' : 'Amavasyant'
  const festivals = getFestivalsForDate(date, { ...options, calendarSystem, annualRules: regionalRules[tradition], includeObservances: false })
    .map(festival => ({ ...festival, name: names[festival.name] }))
  if (isChaitraPratipadaObservance(date, snapshot.sunrise, location)) {
    festivals.unshift(major(tradition === 'telugu' ? 'Ugadi' : 'Chaitra Navratri Begins'))
  }
  return [...festivals, ...regionalFestivals]
}
