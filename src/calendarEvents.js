import { Observer, SearchMoonPhase, SearchRiseSet } from 'astronomy-engine'
import { DAY_MS, INDIA_OFFSET_MINUTES, indianDateKey, indianDayFromPicker, startOfCivilDay } from './civilDate.js'
import { getEclipseForDate } from './eclipseUtils.js'
import { MONTHLY_FESTIVALS } from './festivals.js'
import { getNakshatraForDate, getSunriseForDate, getSunsetForDate } from './moonUtils.js'
import { getPanchaAngaAtSunrise } from './panchangAnga.js'
import { getLunarMonthLabels } from './panchangCalculations.js'
import { CALENDAR_TRADITIONS, getRegionalFestivals, getRegionalMonth } from './regionalCalendar.js'

const MINUTE = 60_000
const EKADASHI_NAMES = {
  Chaitra: ['Kamada', 'Varuthini'], Vaishakha: ['Mohini', 'Apara'],
  Jyeshtha: ['Nirjala', 'Yogini'], Ashadha: ['Devshayani', 'Kamika'],
  Shravana: ['Shravana Putrada', 'Aja'], Bhadrapada: ['Parivartini', 'Indira'],
  Ashwin: ['Papankusha', 'Rama'], Kartika: ['Devutthana', 'Utpanna'],
  Margashirsha: ['Mokshada', 'Saphala'], Pausha: ['Pausha Putrada', 'Shattila'],
  Magha: ['Jaya', 'Vijaya'], Phalguna: ['Amalaki', 'Papamochani'],
}
const PRADOSH_VARIANTS = ['Ravi', 'Soma', 'Bhauma', 'Budha', 'Guru', 'Shukra', 'Shani']

function tithiPeriod(angle, day) {
  const searchFrom = new Date(+day - DAY_MS)
  const start = SearchMoonPhase(angle, searchFrom, 3)?.date
  const end = start && SearchMoonPhase((angle + 12) % 360, start, 2)?.date
  return end ? { start, end } : null
}

function windowOverlap(period, start, end) {
  return period ? Math.max(0, Math.min(+period.end, end) - Math.max(+period.start, start)) : 0
}

function pickRitualDay(period, scoreWindow, preferLast) {
  const first = +startOfCivilDay(period.start, INDIA_OFFSET_MINUTES)
  const last = +startOfCivilDay(new Date(+period.end - 1), INDIA_OFFSET_MINUTES)
  let date = last
  let score = 0
  for (let candidate = first; candidate <= last; candidate += DAY_MS) {
    const overlap = scoreWindow(new Date(candidate))
    if (overlap > score || (preferLast && overlap > 0 && overlap === score)) {
      date = candidate
      score = overlap
    }
  }
  return { date, matchesWindow: score > 0 }
}

function firstSunriseDay(start, rise) {
  const startDay = +startOfCivilDay(start, INDIA_OFFSET_MINUTES)
  return rise(new Date(startDay)) >= +start ? startDay : startDay + DAY_MS
}

function sunriseObservanceDay(period, rise) {
  const day = firstSunriseDay(period.start, rise)
  // When a tithi falls between sunrises, use the day on which it starts after sunrise.
  return rise(new Date(day)) < +period.end ? day : day - DAY_MS
}

function getSmartaEkadashiDay(period, angle, rise) {
  const firstDay = firstSunriseDay(period.start, rise)
  const secondDay = firstDay + DAY_MS
  const repeated = +period.end > rise(new Date(secondDay))
  const skipped = +period.end <= rise(new Date(firstDay))
  if (skipped) return firstDay - DAY_MS

  const afterEkadashi = repeated ? secondDay + DAY_MS : secondDay
  const dwadashiEnd = SearchMoonPhase(angle + 24, period.end, 2)?.date
  // Smarta householders use the earlier date when Dwadashi misses sunrise.
  if (dwadashiEnd && +dwadashiEnd <= rise(new Date(afterEkadashi))) return afterEkadashi - 2 * DAY_MS
  return repeated ? secondDay : firstDay
}

function getObservances(day, snapshot, location, tradition) {
  const { lat, lon, utcOffsetMinutes } = location
  const sunrise = +snapshot.sunrise
  const { paksha, adjustedNumber } = snapshot.tithi
  const phase = snapshot.phaseAngle
  const previous = new Date(+day - DAY_MS)
  const next = new Date(+day + DAY_MS)
  const rise = date => +getSunriseForDate(date, lat, lon, utcOffsetMinutes)
  const set = date => +getSunsetForDate(date, lat, lon, utcOffsetMinutes)
  const results = []
  const add = (id, name, description, { annual = false, filter = id } = {}) => results.push({
    id, name, description, type: annual ? 'major' : 'observance', filters: annual ? [filter, 'festival'] : [filter],
  })
  const matchPeriod = angle => {
    const distance = (phase - angle + 360) % 360
    return distance <= 33 || distance >= 329 ? tithiPeriod(angle, day) : null
  }

  if (adjustedNumber >= 10 && adjustedNumber <= 12) {
    const angle = paksha === 'Shukla' ? 120 : 300
    const period = matchPeriod(angle)
    if (period && getSmartaEkadashiDay(period, angle, rise) === +day) {
      const masa = getLunarMonthLabels(period.start, `${paksha} Paksha`).amavasyant
      const variant = masa?.startsWith('Adhik ')
        ? (paksha === 'Shukla' ? 'Padmini' : 'Parama')
        : EKADASHI_NAMES[masa]?.[paksha === 'Shukla' ? 0 : 1]
      const label = tradition === 'tamil' ? 'Ekadasi' : 'Ekadashi'
      add('ekadashi', variant ? `${variant} ${label}` : label, 'Smarta fasting day dedicated to Lord Vishnu')
    }
  }

  for (const angle of [144, 324]) {
    const period = matchPeriod(angle)
    if (!period) continue
    const ritual = pickRitualDay(period, date => {
      const sunset = set(date)
      const end = sunset + (rise(new Date(+date + DAY_MS)) - sunset) / 5
      return windowOverlap(period, sunset, end)
    }, true)
    if (ritual.date === +day) {
      const label = tradition === 'tamil' || tradition === 'telugu' ? 'Pradosham' : 'Pradosh Vrat'
      const weekday = new Date(+day + INDIA_OFFSET_MINUTES * MINUTE).getUTCDay()
      const variant = tradition === 'tamil' ? (weekday === 6 ? 'Shani ' : '') : `${PRADOSH_VARIANTS[weekday]} `
      add('pradosh', variant + label, ritual.matchesWindow
        ? 'Trayodashi overlaps the period after local sunset'
        : 'Trayodashi observance for Lord Shiva')
    }
  }

  if (tradition === 'tamil' || tradition === 'telugu') {
    const sashti = matchPeriod(60)
    if (sashti) {
      const startDay = startOfCivilDay(sashti.start, utcOffsetMinutes)
      // Prefer the day on which Panchami gives way to Sashti before sunset.
      const observedDay = +startDay + (+sashti.start <= set(startDay) ? 0 : DAY_MS)
      if (observedDay === +day) {
        if (tradition === 'tamil') {
          add('sashti', 'Sashti', 'Waxing Sashti observance for Lord Murugan')
        } else if (getLunarMonthLabels(sashti.start, 'Shukla Paksha').amavasyant === 'Margashirsha') {
          add('sashti', 'Subrahmanya Shashti', 'Margashirsha Shashti festival for Lord Subrahmanya', { annual: true })
        }
      }
    }
  }

  if (tradition === 'tamil') {
    const atSunset = date => getNakshatraForDate(new Date(set(date))) === 'Krittika'
    // Use the first sunset in Krittika, with sunrise as the fallback between sunsets.
    if (!atSunset(previous) && (atSunset(day) || (snapshot.nakshatra === 'Krittika' && !atSunset(next)))) {
      add('krithigai', 'Krithigai', 'Monthly observance during Krittika Nakshatra')
    }
  }
  if (tradition === 'ujjain') {
    const waxing = matchPeriod(36)
    if (waxing) {
      const ritual = pickRitualDay(waxing, date => {
        const sunrise = rise(date)
        const daylight = set(date) - sunrise
        return windowOverlap(waxing, sunrise + 2 * daylight / 5, sunrise + 3 * daylight / 5)
      }, false)
      if (ritual.date === +day && getLunarMonthLabels(waxing.start, 'Shukla Paksha').amavasyant !== 'Bhadrapada') {
        add('vinayaka-chaturthi', 'Vinayaka Chaturti', 'Waxing Chaturthi observance for Lord Ganesha')
      }
    }

    const durgashtami = matchPeriod(84)
    if (durgashtami && sunriseObservanceDay(durgashtami, rise) === +day) {
      add('masik-durgashtami', 'Masik Durgashtami', 'Waxing Ashtami observance for Goddess Durga')
    }
  }

  const waning = matchPeriod(216)
  if (waning) {
    const observer = new Observer(lat, lon, 0)
    const ritual = pickRitualDay(waning, date => {
      const moonrise = SearchRiseSet('Moon', observer, 1, date, 1)?.date
      return Number(Boolean(moonrise && +moonrise < +date + DAY_MS && moonrise >= waning.start && moonrise < waning.end))
    }, false)
    if (ritual.date === +day) {
      const name = tradition === 'tamil' || tradition === 'telugu' ? 'Sankatahara Chaturthi' : 'Sankashti Chaturthi'
      add('sankashti-chaturthi', name, ritual.matchesWindow
        ? 'Waning Chaturthi observance at local moonrise'
        : 'Waning Chaturthi observance for Lord Ganesha')
    }
  }

  for (const rule of MONTHLY_FESTIVALS) {
    if (rule.tithi !== 15) continue
    const fullMoon = rule.paksha === 'Shukla'
    const period = matchPeriod(fullMoon ? 168 : 348)
    if (!period || sunriseObservanceDay(period, rise) !== +day) continue
    const id = fullMoon ? 'purnima' : 'amavasya'
    const name = tradition === 'tamil' ? (id === 'purnima' ? 'Pournami' : 'Amavasai')
      : tradition === 'telugu' && id === 'purnima' ? 'Pournami' : rule.name
    add(id, name, rule.description, { filter: 'moon-phases' })
  }

  const shivaratri = matchPeriod(336)
  if (shivaratri) {
    const duringNishita = (sunset, nextSunrise) => {
      const night = nextSunrise - sunset
      return windowOverlap(shivaratri, sunset + 7 * night / 15, sunset + 8 * night / 15)
    }
    if (duringNishita(set(day), rise(next)) && !duringNishita(set(previous), sunrise)) {
      const name = { tamil: 'Maadha Shivaratri', telugu: 'Masa Shivaratri' }[tradition] ?? 'Masik Shivaratri'
      add('masik-shivaratri', name, 'Monthly night of Lord Shiva')
    }
  }
  const ashtami = matchPeriod(264)
  if (ashtami) {
    const afterPradosh = (sunset, nextSunrise) => sunset + (nextSunrise - sunset) / 5 + 24 * MINUTE
    const eveningCheck = afterPradosh(set(day), rise(next))
    const previousCheck = afterPradosh(set(previous), sunrise)
    if (eveningCheck >= +ashtami.start && eveningCheck < +ashtami.end &&
        !(previousCheck >= +ashtami.start && previousCheck < +ashtami.end)) {
      const telugu = tradition === 'telugu'
      const jayanti = telugu && getLunarMonthLabels(ashtami.start, 'Krishna Paksha').amavasyant === 'Kartika'
      const name = jayanti ? 'Kalabhairava Jayanti' : telugu ? 'Kalabhairava Ashtami' : 'Kalashtami'
      add('kalashtami', name, jayanti ? 'Annual festival of Lord Bhairava' : 'Monthly observance dedicated to Lord Bhairava', { annual: jayanti })
    }
  }
  return results
}

export function getCalendarEvents(date, settings, snapshot, month) {
  const day = indianDayFromPicker(date)
  const dateKey = indianDateKey(day)
  const location = { lat: settings.lat, lon: settings.lon, utcOffsetMinutes: INDIA_OFFSET_MINUTES }
  const tradition = Object.hasOwn(CALENDAR_TRADITIONS, settings.calendarTradition) ? settings.calendarTradition : ''
  const anga = snapshot ?? getPanchaAngaAtSunrise(day, location)
  const regionalMonth = month ?? (tradition === 'tamil' ? getRegionalMonth(day, anga, location, tradition) : null)
  const annual = getRegionalFestivals(day, anga, location, tradition, regionalMonth).map(event => ({
    ...event,
    filters: ['festival'],
  }))
  const eclipse = getEclipseForDate(day, INDIA_OFFSET_MINUTES)
  const astronomical = eclipse ? [{
    id: `${eclipse.type}-eclipse`, name: eclipse.hinduName, filters: ['astronomical'], eclipse,
  }] : []
  return [...astronomical, ...annual, ...getObservances(day, anga, location, tradition)]
    .map(event => ({ ...event, dateKey, key: `${dateKey}-${event.id}` }))
}
