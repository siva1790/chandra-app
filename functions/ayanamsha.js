'use strict'

// Date-sensitive Lahiri/Chitrapaksha ayanamsha approximation.
// Mirrors src/ayanamsha.js for Cloud Functions.

const J2000_JD = 2451545.0
const UNIX_EPOCH_JD = 2440587.5
const DAYS_PER_JULIAN_YEAR = 365.2425
const LAHIRI_AYANAMSHA_J2000 = 23.853055
const PRECESSION_DEGREES_PER_YEAR = 50.290966 / 3600

const normalizeDegrees = (angle) => ((angle % 360) + 360) % 360

const getJulianDay = (date) =>
  date.getTime() / 86400000 + UNIX_EPOCH_JD

const getLahiriAyanamsha = (date) => {
  const yearsFromJ2000 = (getJulianDay(date) - J2000_JD) / DAYS_PER_JULIAN_YEAR
  return LAHIRI_AYANAMSHA_J2000 + yearsFromJ2000 * PRECESSION_DEGREES_PER_YEAR
}

const toSiderealLongitude = (tropicalLongitude, date) =>
  normalizeDegrees(tropicalLongitude - getLahiriAyanamsha(date))

module.exports = { getLahiriAyanamsha, toSiderealLongitude }
