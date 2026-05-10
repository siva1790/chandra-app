import * as Astronomy from 'astronomy-engine'
import {
  getMasaForDate,
  getMoonPhaseAngle,
  getSunriseForDate,
  getSunsetForDate,
  getTithiFromAngle,
} from './moonUtils'

const DAY_MS = 24 * 60 * 60 * 1000
const HOUR_MS = 60 * 60 * 1000

const festival = (name, emoji, description, rule) => ({
  name,
  emoji,
  description,
  type: 'major',
  ...rule,
})

// Rules are intentionally data, not dated rows. Most Hindu festivals are not
// chosen by sunrise tithi alone, so each rule declares the ritual window that
// matters for that observance.
export const ANNUAL_FESTIVALS = [
  festival('Makar Sankranti / Pongal', '\uD83E\uDE81', "Sun's transition into Capricorn - harvest festival", {
    kind: 'solarIngress',
    sunLon: 270,
  }),

  festival('Ugadi / Gudi Padwa', '\uD83C\uDF8A', 'Hindu New Year - celebrated across South and West India', {
    masa: 'Chaitra',
    paksha: 'Shukla',
    tithi: 1,
    window: 'day',
    firstOccurrence: true,
  }),
  festival('Chaitra Navratri Begins', '\uD83E\uDE94', 'Ghatasthapana, first day of spring Navratri', {
    masa: 'Chaitra',
    paksha: 'Shukla',
    tithi: 1,
    window: 'day',
    firstOccurrence: true,
  }),
  festival('Ram Navami', '\uD83C\uDFF9', 'Birthday of Lord Rama', {
    masa: 'Chaitra',
    paksha: 'Shukla',
    tithi: 9,
    window: 'madhyahna',
  }),
  festival('Mahavir Jayanti', '\uD83D\uDE4F', 'Birthday of Lord Mahavir, founder of Jainism', {
    masa: 'Chaitra',
    paksha: 'Shukla',
    tithi: 13,
    window: 'sunrise',
  }),
  festival('Hanuman Jayanti', '\uD83D\uDE4F', 'Birthday of Lord Hanuman', {
    masa: 'Chaitra',
    paksha: 'Shukla',
    tithi: 15,
    window: 'sunrise',
  }),

  festival('Akshaya Tritiya', '\u2728', 'Most auspicious day - gold, new beginnings, weddings', {
    masa: 'Vaishakha',
    paksha: 'Shukla',
    tithi: 3,
    window: 'sunrise',
  }),
  festival('Buddha Purnima', '\u2638\uFE0F', 'Birthday of Gautama Buddha - Vaishakha Purnima', {
    masa: 'Vaishakha',
    paksha: 'Shukla',
    tithi: 15,
    window: 'sunrise',
  }),

  festival('Vat Savitri Vrat', '\uD83C\uDF33', "Married women fast for husband's longevity - Jyeshtha Amavasya", {
    amantaMasa: 'Vaishakha',
    purnimantaMasa: 'Jyeshtha',
    paksha: 'Krishna',
    tithi: 15,
    window: 'sunrise',
    suppressDuplicateWithinDays: 45,
  }),
  festival('Vat Purnima Vrat', '\uD83C\uDF33', "Married women fast for husband's longevity - Jyeshtha Purnima", {
    masa: 'Jyeshtha',
    paksha: 'Shukla',
    tithi: 15,
    window: 'sunrise',
    suppressDuplicateWithinDays: 45,
  }),

  festival('Guru Purnima', '\uD83D\uDE4F', 'Honouring spiritual teachers - Ashadha Purnima', {
    masa: 'Ashadha',
    paksha: 'Shukla',
    tithi: 15,
    window: 'sunrise',
  }),

  festival('Nag Panchami', '\uD83D\uDC0D', 'Worship of serpent deities', {
    masa: 'Shravana',
    paksha: 'Shukla',
    tithi: 5,
    window: 'sunrise',
  }),
  festival('Raksha Bandhan', '\uD83E\uDEA2', 'Bond of protection between siblings - Shravana Purnima', {
    masa: 'Shravana',
    paksha: 'Shukla',
    tithi: 15,
    window: 'sunrise',
  }),

  festival('Janmashtami', '\uD83E\uDD9A', 'Birthday of Lord Krishna', {
    masa: 'Shravana',
    paksha: 'Krishna',
    tithi: 8,
    window: 'nishita',
  }),
  festival('Ganesh Chaturthi', '\uD83D\uDC18', '10-day festival celebrating Lord Ganesha', {
    masa: 'Bhadrapada',
    paksha: 'Shukla',
    tithi: 4,
    window: 'madhyahna',
  }),

  festival('Sharad Navratri Begins', '\uD83E\uDE94', 'Nine nights of Goddess Durga worship', {
    masa: 'Ashwin',
    paksha: 'Shukla',
    tithi: 1,
    window: 'sunrise',
  }),
  festival('Maha Navami', '\uD83E\uDE94', 'Ninth night of Sharad Navratri - Durga Puja culmination', {
    masa: 'Ashwin',
    paksha: 'Shukla',
    tithi: 9,
    window: 'sunrise',
  }),
  festival('Dussehra (Vijayadashami)', '\uD83C\uDFF9', 'Victory of Lord Rama over Ravana', {
    masa: 'Ashwin',
    paksha: 'Shukla',
    tithi: 10,
    window: 'aparahna',
    firstOccurrence: true,
  }),
  festival('Sharad Purnima', '\uD83C\uDF15', 'Full moon of autumn - Kojagari Purnima', {
    masa: 'Ashwin',
    paksha: 'Shukla',
    tithi: 15,
    window: 'moonrise',
  }),

  festival('Karwa Chauth', '\uD83C\uDF19', "Fasting by married women for husband's long life", {
    amantaMasa: 'Ashwin',
    purnimantaMasa: 'Kartika',
    paksha: 'Krishna',
    tithi: 4,
    window: 'moonrise',
  }),
  festival('Dhanteras', '\uD83D\uDCB0', 'Festival of wealth - buy gold and silver', {
    amantaMasa: 'Ashwin',
    purnimantaMasa: 'Kartika',
    paksha: 'Krishna',
    tithi: 13,
    window: 'pradosh',
  }),
  festival('Naraka Chaturdashi', '\uD83E\uDE94', 'Choti Diwali - day before Diwali', {
    amantaMasa: 'Ashwin',
    purnimantaMasa: 'Kartika',
    paksha: 'Krishna',
    tithi: 14,
    window: 'sunrise',
  }),
  festival('Diwali (Deepavali)', '\uD83E\uDE94', 'Festival of lights - Lakshmi Puja during Pradosh Kaal', {
    amantaMasa: 'Ashwin',
    purnimantaMasa: 'Kartika',
    paksha: 'Krishna',
    tithi: 15,
    window: 'pradosh',
  }),
  festival('Govardhan Puja', '\uD83D\uDC04', 'Lord Krishna lifting Govardhan hill', {
    masa: 'Kartika',
    paksha: 'Shukla',
    tithi: 1,
    window: 'sunrise',
    preferFirstAfter: { paksha: 'Krishna', tithi: 15 },
  }),
  festival('Bhai Dooj', '\uD83D\uDC6B', 'Celebration of brother-sister bond', {
    masa: 'Kartika',
    paksha: 'Shukla',
    tithi: 2,
    window: 'sunrise',
  }),
  festival('Chhath Puja', '\uD83C\uDF05', 'Sun god worship - sacred bathing and offerings', {
    masa: 'Kartika',
    paksha: 'Shukla',
    tithi: 6,
    window: 'sunrise',
  }),
  festival('Dev Diwali / Kartik Purnima', '\uD83E\uDE94', 'Kartik full moon - lamps lit on riverbanks; Guru Nanak Jayanti', {
    masa: 'Kartika',
    paksha: 'Shukla',
    tithi: 15,
    window: 'moonrise',
  }),

  festival('Vasant Panchami', '\uD83D\uDCDA', 'Worship of Goddess Saraswati - first day of spring', {
    masa: 'Magha',
    paksha: 'Shukla',
    tithi: 5,
    window: 'sunrise',
  }),
  festival('Maha Shivaratri', '\uD83D\uDD49\uFE0F', 'Great night of Lord Shiva', {
    masa: 'Magha',
    paksha: 'Krishna',
    tithi: 14,
    window: 'nishita',
  }),

  festival('Holika Dahan', '\uD83D\uDD25', 'Bonfire night - burning of evil', {
    masa: 'Phalguna',
    paksha: 'Shukla',
    tithi: 15,
    window: 'pradosh',
  }),
  festival('Holi', '\uD83C\uDFA8', 'Festival of colours - morning after Holika Dahan', {
    masa: 'Phalguna',
    paksha: 'Krishna',
    tithi: 1,
    window: 'sunrise',
  }),
]

export const MONTHLY_FESTIVALS = [
  { name: 'Ekadashi', paksha: 'Shukla', tithi: 11, emoji: '\uD83D\uDE4F', type: 'observance', description: 'Fasting day dedicated to Lord Vishnu' },
  { name: 'Ekadashi', paksha: 'Krishna', tithi: 11, emoji: '\uD83D\uDE4F', type: 'observance', description: 'Fasting day dedicated to Lord Vishnu' },
  { name: 'Purnima', paksha: 'Shukla', tithi: 15, emoji: '\uD83C\uDF15', type: 'observance', description: 'Full moon - auspicious for prayers and rituals' },
  { name: 'Amavasya', paksha: 'Krishna', tithi: 15, emoji: '\uD83C\uDF11', type: 'observance', description: 'New moon - day for ancestral offerings (Pitru Tarpan)' },
  { name: 'Pradosh Vrat', paksha: 'Shukla', tithi: 13, emoji: '\uD83D\uDD49\uFE0F', type: 'observance', description: 'Fasting dedicated to Lord Shiva' },
  { name: 'Pradosh Vrat', paksha: 'Krishna', tithi: 13, emoji: '\uD83D\uDD49\uFE0F', type: 'observance', description: 'Fasting dedicated to Lord Shiva' },
  { name: 'Sankashti Chaturthi', paksha: 'Krishna', tithi: 4, emoji: '\uD83D\uDC18', type: 'observance', description: 'Ganesha fast for removal of obstacles' },
  { name: 'Masik Shivaratri', paksha: 'Krishna', tithi: 14, emoji: '\uD83D\uDD49\uFE0F', type: 'observance', description: 'Monthly night of Lord Shiva' },
  { name: 'Kalashtami', paksha: 'Krishna', tithi: 8, emoji: '\u2694\uFE0F', type: 'observance', description: 'Dedicated to Lord Bhairava / Goddess Durga' },
]

const atStartOfDay = (date) => {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

const addMs = (date, ms) => new Date(date.getTime() + ms)

const tithiAt = (date) => getTithiFromAngle(getMoonPhaseAngle(date))

const sunSiderealLongitude = (date) => {
  const sunPos = Astronomy.GeoVector('Sun', date, true)
  const sunEcl = Astronomy.Ecliptic(sunPos)
  return ((sunEcl.elon - 23.15 + 360) % 360)
}

const crossedLongitude = (prevLon, nextLon, targetLon) => {
  const prev = (prevLon - targetLon + 360) % 360
  const next = (nextLon - targetLon + 360) % 360
  return prev > next
}

const getSolarFestivalsForDate = (date) => {
  const start = atStartOfDay(date)
  const previous = addMs(start, -DAY_MS)
  const startLon = sunSiderealLongitude(previous)
  const endLon = sunSiderealLongitude(start)
  return ANNUAL_FESTIVALS.filter(
    f => f.kind === 'solarIngress' && crossedLongitude(startLon, endLon, f.sunLon)
  )
}

const getMoonriseForDate = (date, lat, lon) => {
  try {
    if (typeof lat === 'number' && typeof lon === 'number') {
      const observer = new Astronomy.Observer(lat, lon, 0)
      const moonrise = Astronomy.SearchRiseSet('Moon', observer, +1, atStartOfDay(date), 1)
      if (moonrise) return moonrise.date
    }
  } catch (_) {}
  const fallback = new Date(date)
  fallback.setHours(20, 0, 0, 0)
  return fallback
}

const getWindow = (date, window, lat, lon) => {
  const start = atStartOfDay(date)
  const end = addMs(start, DAY_MS)
  const sunrise = getSunriseForDate(date, lat, lon)
  const sunset = getSunsetForDate(date, lat, lon)
  const moonrise = getMoonriseForDate(date, lat, lon)
  const noon = new Date((sunrise.getTime() + sunset.getTime()) / 2)

  switch (window) {
    case 'sunrise':
      return { sample: sunrise }
    case 'madhyahna':
      return { start: addMs(noon, -2 * HOUR_MS), end: addMs(noon, 2 * HOUR_MS) }
    case 'aparahna':
      return { start: addMs(noon, HOUR_MS), end: sunset }
    case 'pradosh':
      return { start: sunset, end: addMs(sunset, 2.4 * HOUR_MS) }
    case 'nishita': {
      const midnight = addMs(start, DAY_MS)
      return { start: addMs(midnight, -HOUR_MS), end: addMs(midnight, HOUR_MS) }
    }
    case 'moonrise':
      return { sample: moonrise }
    case 'day':
    default:
      return { start, end }
  }
}

const tithiMatches = (tithi, rule) =>
  tithi.paksha === rule.paksha && tithi.adjustedNumber === rule.tithi

const ruleMatchesWindow = (date, rule, lat, lon) => {
  const window = getWindow(date, rule.window || 'sunrise', lat, lon)
  if (window.sample) {
    return tithiMatches(tithiAt(window.sample), rule) ? window.sample : null
  }

  let cursor = new Date(window.start)
  const step = 20 * 60 * 1000
  while (cursor <= window.end) {
    if (tithiMatches(tithiAt(cursor), rule)) return cursor
    cursor = addMs(cursor, step)
  }
  return null
}

const selectedMasaForRule = (date, sampleTime, rule, calendarSystem) => {
  if (rule.masa) return rule.masa
  const system = (calendarSystem || 'Amavasyant').toLowerCase()
  if (system === 'purnimant' && rule.purnimantaMasa) return rule.purnimantaMasa
  return rule.amantaMasa || rule.purnimantaMasa
}

const displayMasaForRule = (date, sampleTime, rule, calendarSystem) => {
  if (rule.masa) return getMasaForDate(sampleTime || date) === rule.masa
  if (rule.amantaMasa || rule.purnimantaMasa) {
    const amantaMasa = getMasaForDate(sampleTime || date)
    return amantaMasa === selectedMasaForRule(date, sampleTime, rule, calendarSystem)
  }
  return true
}

const hasEarlierMatchingDate = (date, rule, lat, lon, calendarSystem, daysBack) => {
  for (let i = 1; i <= daysBack; i++) {
    const previous = addMs(atStartOfDay(date), -i * DAY_MS)
    const sample = ruleMatchesWindow(previous, rule, lat, lon)
    if (sample && displayMasaForRule(previous, sample, rule, calendarSystem)) return true
  }
  return false
}

const hadPreviousTithi = (date, rule, lat, lon) => {
  if (!rule.preferFirstAfter) return true
  for (let i = 1; i <= 16; i++) {
    const previous = addMs(atStartOfDay(date), -i * DAY_MS)
    const sample = ruleMatchesWindow(previous, {
      ...rule,
      paksha: rule.preferFirstAfter.paksha,
      tithi: rule.preferFirstAfter.tithi,
      window: 'day',
    }, lat, lon)
    if (sample) return true
  }
  return false
}

const isAnnualFestivalOnDate = (date, rule, lat, lon, calendarSystem) => {
  if (rule.kind === 'solarIngress') return false
  const sample = ruleMatchesWindow(date, rule, lat, lon)
  if (!sample) return false
  if (!displayMasaForRule(date, sample, rule, calendarSystem)) return false
  if (rule.firstOccurrence && hasEarlierMatchingDate(date, rule, lat, lon, calendarSystem, 2)) return false
  if (
    rule.suppressDuplicateWithinDays &&
    hasEarlierMatchingDate(date, rule, lat, lon, calendarSystem, rule.suppressDuplicateWithinDays)
  ) {
    return false
  }
  return hadPreviousTithi(date, rule, lat, lon)
}

const getObservancesForDate = (date, tithiNumber, paksha, lat, lon) => {
  const sunrise = getWindow(date, 'sunrise', lat, lon).sample
  const sunriseTithi = tithiAt(sunrise)
  const effectiveTithi = tithiNumber && paksha
    ? { adjustedNumber: tithiNumber, paksha }
    : sunriseTithi

  return MONTHLY_FESTIVALS.filter(
    f => f.tithi === effectiveTithi.adjustedNumber && f.paksha === effectiveTithi.paksha
  )
}

export const getFestivalsForDate = (date, tithiNumberOrOptions, pakshaArg) => {
  const options = typeof tithiNumberOrOptions === 'object' && tithiNumberOrOptions !== null
    ? tithiNumberOrOptions
    : {}
  const tithiNumber = typeof tithiNumberOrOptions === 'number'
    ? tithiNumberOrOptions
    : options.tithiNumber
  const paksha = typeof pakshaArg === 'string' ? pakshaArg : options.paksha
  const lat = options.lat
  const lon = options.lon
  const calendarSystem = options.calendarSystem

  const solar = getSolarFestivalsForDate(date)
  const annual = ANNUAL_FESTIVALS.filter(f => isAnnualFestivalOnDate(date, f, lat, lon, calendarSystem))
  const major = [...solar, ...annual]
  const observances = major.length > 0 ? [] : getObservancesForDate(date, tithiNumber, paksha, lat, lon)

  return [...major, ...observances]
}

export const getDatedFestivalsForDate = (_date) => []
export const getMonthlyFestivalsForTithi = (_tithi, _paksha) => []
export const festivals = MONTHLY_FESTIVALS
