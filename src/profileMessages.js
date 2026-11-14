import * as Astronomy from 'astronomy-engine'
import { toSiderealLongitude } from './ayanamsha.js'
import { TITHI_MESSAGES } from './tithiMessages.js'
import { indianDateKey } from './civilDate.js'

const RASI_NAMES = [
  'Mesha', 'Vrishabha', 'Mithuna', 'Karka', 'Simha', 'Kanya',
  'Tula', 'Vrischika', 'Dhanu', 'Makara', 'Kumbha', 'Meena',
]

const NAKSHATRA_NAMES = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira',
  'Ardra', 'Punarvasu', 'Pushya', 'Ashlesha', 'Magha',
  'Purva Phalguni', 'Uttara Phalguni', 'Hasta', 'Chitra', 'Swati',
  'Vishakha', 'Anuradha', 'Jyeshtha', 'Mula', 'Purva Ashadha',
  'Uttara Ashadha', 'Shravana', 'Dhanishtha', 'Shatabhisha',
  'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati',
]

const RASI_THEMES = {
  Mesha: 'initiative, courage, and direct action',
  Vrishabha: 'patience, steadiness, and practical care',
  Mithuna: 'communication, learning, and flexible thinking',
  Karka: 'family duties, emotional steadiness, and nourishment',
  Simha: 'confidence, leadership, and generous expression',
  Kanya: 'discernment, service, and careful improvement',
  Tula: 'balance, relationships, and thoughtful choices',
  Vrischika: 'depth, focus, and inner transformation',
  Dhanu: 'learning, faith, and a wider perspective',
  Makara: 'discipline, responsibility, and patient progress',
  Kumbha: 'fresh ideas, community, and long-range thinking',
  Meena: 'compassion, intuition, and spiritual reflection',
}

const NAKSHATRA_THEMES = {
  Ashwini: 'quick renewal and healing starts',
  Bharani: 'responsibility and emotional strength',
  Krittika: 'clarity, refinement, and decisive pruning',
  Rohini: 'growth, beauty, and steady creation',
  Mrigashira: 'curiosity and gentle exploration',
  Ardra: 'release, honesty, and weathering change',
  Punarvasu: 'return, restoration, and optimism',
  Pushya: 'nourishment, teaching, and support',
  Ashlesha: 'intuition, protection, and careful boundaries',
  Magha: 'lineage, dignity, and rightful responsibility',
  'Purva Phalguni': 'ease, creativity, and warm connection',
  'Uttara Phalguni': 'commitment, generosity, and agreements',
  Hasta: 'skill, craft, and useful action',
  Chitra: 'design, beauty, and intentional building',
  Swati: 'independence, adaptability, and quiet movement',
  Vishakha: 'focus, ambition, and meaningful goals',
  Anuradha: 'devotion, friendship, and loyal effort',
  Jyeshtha: 'maturity, protection, and wise restraint',
  Mula: 'truth-seeking, roots, and deep simplification',
  'Purva Ashadha': 'conviction, renewal, and inspired effort',
  'Uttara Ashadha': 'endurance, integrity, and lasting progress',
  Shravana: 'listening, learning, and guidance',
  Dhanishtha: 'rhythm, contribution, and shared prosperity',
  Shatabhisha: 'healing, privacy, and patient observation',
  'Purva Bhadrapada': 'intensity, purpose, and inner discipline',
  'Uttara Bhadrapada': 'depth, steadiness, and emotional wisdom',
  Revati: 'care, completion, and gentle protection',
}

// Birthplaces currently come from the Indian city picker. Saved fields are the
// entered Indian wall-clock date/time, not a device-local instant. Interpret
// existing and new profiles as IST without rewriting their saved values.
export const getBirthInstant = (profile) => {
  const dob = profile?.dob
  const time = profile?.birthTime
  if (typeof dob !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dob)) return null
  if (typeof time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null
  const parsed = new Date(`${dob}T${time}:00+05:30`)
  // Date parsing can normalize an impossible date such as 30 February.
  if (!Number.isFinite(parsed.getTime()) || indianDateKey(parsed) !== dob) return null
  return parsed
}

export const getBirthMoonProfile = (profile) => {
  const birthDate = getBirthInstant(profile)
  if (!birthDate) return null

  const moonPos = Astronomy.GeoVector('Moon', birthDate, true)
  const moonEcliptic = Astronomy.Ecliptic(moonPos)
  const moonLon = toSiderealLongitude(moonEcliptic.elon, birthDate)
  const nakshatraSpan = 360 / 27
  const nakshatraIndex = Math.floor(moonLon / nakshatraSpan) % 27
  const pada = Math.floor((moonLon % nakshatraSpan) / (nakshatraSpan / 4)) + 1

  return {
    rasi: RASI_NAMES[Math.floor(moonLon / 30) % 12],
    nakshatra: NAKSHATRA_NAMES[nakshatraIndex],
    nakshatraPada: pada,
  }
}

export const buildGenericMyDayMessage = ({ tithi, vara, nakshatra, highlight }) => {
  if (highlight?.eclipse) {
    return `${highlight.eclipse.hinduName} gives today a rare skyward focus. Move gently, keep plans simple, and use the day for reflection.`
  }

  if (highlight?.festivals?.length > 0) {
    return `${highlight.festivals[0].name} shapes the rhythm of the day. Let today's ${tithi.name} energy support devotion, clarity, and steady attention.`
  }

  const base = TITHI_MESSAGES[tithi.number] ?? TITHI_MESSAGES[1]
  return `${base} ${vara} and ${nakshatra} add their own rhythm, so keep the day intentional and simple.`
}

export const buildPersonalMyDayMessage = ({ tithi, vara, nakshatra, highlight, birthProfile, name }) => {
  const rasiTheme = RASI_THEMES[birthProfile.rasi] || 'steady intention'
  const nakshatraTheme = NAKSHATRA_THEMES[birthProfile.nakshatra] || 'inner clarity'
  const greeting = name?.trim() ? `${name.trim()}, ` : ''

  if (highlight?.eclipse) {
    return `${greeting}${highlight.eclipse.hinduName} brings a reflective tone to the day. For your ${birthProfile.rasi} Rasi and ${birthProfile.nakshatra} Nakshatra, lean into ${rasiTheme} while keeping space for ${nakshatraTheme}.`
  }

  if (highlight?.festivals?.length > 0) {
    return `${greeting}${highlight.festivals[0].name} gives today a devotional center. For your ${birthProfile.rasi} Rasi and ${birthProfile.nakshatra} Nakshatra, this is a good day to honor ${rasiTheme} and ${nakshatraTheme}.`
  }

  return `${greeting}today’s ${tithi.name} in ${tithi.paksha} Paksha carries a ${vara} rhythm with ${nakshatra} active in the sky. For your ${birthProfile.rasi} Rasi and ${birthProfile.nakshatra} Nakshatra, focus on ${rasiTheme} and ${nakshatraTheme}.`
}
