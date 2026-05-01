import * as Astronomy from 'astronomy-engine'

// Lahiri Ayanamsha — standard for Indian Panchang
const AYANAMSHA = 23.15

// Get moon phase angle for any date
export const getMoonPhaseAngle = (date) => {
  return Astronomy.MoonPhase(date)
}

// Get Tithi info from phase angle
export const getTithiFromAngle = (phaseAngle) => {
  const tithiNames = [
    'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami',
    'Shashthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami',
    'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi', 'Purnima',
    'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami',
    'Shashthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami',
    'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi', 'Amavasya'
  ]
  const tithiIndex = Math.floor(phaseAngle / 12)
  const tithiNumber = tithiIndex + 1
  const paksha = tithiNumber <= 15 ? 'Shukla' : 'Krishna'
  const adjustedNumber = tithiNumber <= 15 ? tithiNumber : tithiNumber - 15
  const name = tithiNames[Math.min(tithiIndex, 29)]
  return { number: tithiNumber, adjustedNumber, name, paksha }
}

// Get lunar month number (1=Chaitra to 12=Phalguna)
export const getLunarMonth = (date) => {
  const month = date.getMonth()
  const day = date.getDate()
  const lunarMonth = day < 15
    ? ((month + 11) % 12) + 1
    : (month % 12) + 1
  return lunarMonth
}

// Get Nakshatra for a given date using Sidereal (Vedic) system
export const getNakshatraForDate = (date) => {
  const nakshatras = [
    'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira',
    'Ardra', 'Punarvasu', 'Pushya', 'Ashlesha', 'Magha',
    'Purva Phalguni', 'Uttara Phalguni', 'Hasta', 'Chitra', 'Swati',
    'Vishakha', 'Anuradha', 'Jyeshtha', 'Mula', 'Purva Ashadha',
    'Uttara Ashadha', 'Shravana', 'Dhanishtha', 'Shatabhisha',
    'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati'
  ]
  const moonPos = Astronomy.GeoVector('Moon', date, true)
  const moonEcliptic = Astronomy.Ecliptic(moonPos)
  // Apply Ayanamsha to convert Tropical to Sidereal
  const moonLongitude = ((moonEcliptic.elon - AYANAMSHA + 360) % 360)
  const nakshatraIndex = Math.floor(moonLongitude / (360 / 27))
  return nakshatras[nakshatraIndex % 27]
}

// Get all festivals for a given date
export const getFestivalsForDate = (date, festivals) => {
  const phaseAngle = getMoonPhaseAngle(date)
  const tithi = getTithiFromAngle(phaseAngle)
  const lunarMonth = getLunarMonth(date)

  return festivals.filter(f => {
    const tithiMatch = f.tithi === tithi.adjustedNumber
    const pakshaMatch = f.paksha === tithi.paksha

    if (f.monthly) {
      return tithiMatch && pakshaMatch
    }
    return tithiMatch && pakshaMatch && f.month === lunarMonth
  })
}

// Get short phase emoji for calendar
export const getPhaseEmoji = (phaseAngle) => {
  const phase = phaseAngle / 360
  if (phase < 0.03 || phase > 0.97) return '🌑'
  if (phase < 0.25) return '🌒'
  if (phase < 0.27) return '🌓'
  if (phase < 0.48) return '🌔'
  if (phase < 0.52) return '🌕'
  if (phase < 0.73) return '🌖'
  if (phase < 0.77) return '🌗'
  return '🌘'
}