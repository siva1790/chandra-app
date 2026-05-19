// Date-sensitive Lahiri/Chitrapaksha ayanamsha approximation.
//
// The previous implementation used a fixed 23.15 degrees. This helper keeps
// full precision internally and computes by exact timestamp. It is intentionally
// small and dependency-free until a higher-precision ephemeris is adopted.

const J2000_JD = 2451545.0
const UNIX_EPOCH_JD = 2440587.5
const DAYS_PER_JULIAN_YEAR = 365.2425
const LAHIRI_AYANAMSHA_J2000 = 23.853055
const PRECESSION_DEGREES_PER_YEAR = 50.290966 / 3600

const normalizeDegrees = (angle) => ((angle % 360) + 360) % 360

export const getJulianDay = (date) =>
  date.getTime() / 86400000 + UNIX_EPOCH_JD

export const getLahiriAyanamsha = (date) => {
  const yearsFromJ2000 = (getJulianDay(date) - J2000_JD) / DAYS_PER_JULIAN_YEAR
  return LAHIRI_AYANAMSHA_J2000 + yearsFromJ2000 * PRECESSION_DEGREES_PER_YEAR
}

export const toSiderealLongitude = (tropicalLongitude, date) =>
  normalizeDegrees(tropicalLongitude - getLahiriAyanamsha(date))

export const formatAyanamsha = (date, digits = 4) =>
  `${getLahiriAyanamsha(date).toFixed(digits)}°`
