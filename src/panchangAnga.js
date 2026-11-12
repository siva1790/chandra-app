import * as Astronomy from 'astronomy-engine'
import { toSiderealLongitude } from './ayanamsha.js'

const getMoonSiderealLongitude = (date) =>
  toSiderealLongitude(Astronomy.Ecliptic(Astronomy.GeoVector('Moon', date, true)).elon, date)

const YOGA_NAMES = [
  'Vishkambha', 'Priti', 'Ayushman', 'Saubhagya', 'Shobhana',
  'Atiganda', 'Sukarma', 'Dhriti', 'Shula', 'Ganda',
  'Vriddhi', 'Dhruva', 'Vyaghata', 'Harshana', 'Vajra',
  'Siddhi', 'Vyatipata', 'Variyan', 'Parigha', 'Shiva',
  'Siddha', 'Sadhya', 'Shubha', 'Shukla', 'Brahma',
  'Indra', 'Vaidhriti'
]

export const getYogaAtTime = (d) => {
  const sPos = Astronomy.GeoVector('Sun', d, true)
  const sLon = toSiderealLongitude(Astronomy.Ecliptic(sPos).elon, d)
  const mLon = getMoonSiderealLongitude(d)
  return YOGA_NAMES[Math.floor(((sLon + mLon) % 360) / (360 / 27))]
}

const MOVABLE_KARANAS = ['Bava', 'Balava', 'Kaulava', 'Taitila', 'Garija', 'Vanija', 'Vishti']

export const getKaranaFromPhase = (phaseAngle) => {
  const n = Math.floor(((phaseAngle % 360) + 360) % 360 / 6) // 0–59
  if (n === 0)  return 'Kimstughna'
  if (n === 57) return 'Shakuni'
  if (n === 58) return 'Chatushpada'
  if (n === 59) return 'Naga'
  return MOVABLE_KARANAS[(n - 1) % 7]
}

