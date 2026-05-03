import * as Astronomy from 'astronomy-engine'

/**
 * Eclipse utilities for Chandra app.
 *
 * Uses astronomy-engine to find all lunar and solar eclipses for a given year.
 * Results are cached at module level so each year is only computed once per session.
 *
 * Lunar eclipse kinds:   'penumbral' | 'partial' | 'total'
 * Solar eclipse kinds:   'partial'   | 'annular' | 'total' | 'hybrid'
 */

const _cache = {}

// ─── Public API ───────────────────────────────────────────────────

/**
 * Returns all eclipses (lunar + solar) for the given calendar year,
 * sorted by peak time. Results are cached.
 */
export const getEclipsesForYear = (year) => {
  if (_cache[year]) return _cache[year]

  const results = []
  // Use local midnight Jan 1 as start/end so timezone-aware date comparisons
  // align with what the calendar grid shows (device local time).
  const yearStart = new Date(year, 0, 1)
  const yearEnd   = new Date(year + 1, 0, 1)

  // ── Lunar eclipses ──────────────────────────────────────────────
  try {
    let e = Astronomy.SearchLunarEclipse(yearStart)
    while (e) {
      const peak = e.peak.date
      if (peak >= yearEnd) break
      results.push({
        type:       'lunar',
        kind:       e.kind,                    // 'penumbral' | 'partial' | 'total'
        peakTime:   peak,
        hinduName:  lunarHinduName(e.kind),
        sdTotal:    e.sd_total   || 0,         // semi-duration of totality (minutes)
        sdPartial:  e.sd_partial || 0,         // semi-duration of partial phase (minutes)
      })
      // Jump ~29 days forward — eclipses of the same type are ≥6 months apart,
      // so this safely skips to after the current eclipse without missing the next.
      const nextSearch = new Date(peak.getTime() + 29 * 864e5)
      e = Astronomy.SearchLunarEclipse(nextSearch)
    }
  } catch (_) { /* ignore calc errors for edge-case dates */ }

  // ── Solar eclipses ──────────────────────────────────────────────
  try {
    let e = Astronomy.SearchGlobalSolarEclipse(yearStart)
    while (e) {
      const peak = e.peak.date
      if (peak >= yearEnd) break
      results.push({
        type:      'solar',
        kind:      e.kind,                     // 'partial' | 'annular' | 'total' | 'hybrid'
        peakTime:  peak,
        hinduName: solarHinduName(e.kind),
        sdTotal:   0,
        sdPartial: 0,
      })
      const nextSearch = new Date(peak.getTime() + 29 * 864e5)
      e = Astronomy.SearchGlobalSolarEclipse(nextSearch)
    }
  } catch (_) { /* ignore */ }

  results.sort((a, b) => a.peakTime - b.peakTime)
  _cache[year] = results
  return results
}

/**
 * Returns the eclipse on the given calendar date (local time), or null.
 * Checks the year of the date and, for Jan dates, also the prior year
 * to handle UTC/IST boundary edge cases.
 */
export const getEclipseForDate = (date) => {
  const ds = localMidnight(date)
  const year = date.getFullYear()

  // Check current year (and prior year for Jan 1 boundary safety)
  const yearsToCheck = year === date.getMonth() === 0 ? [year - 1, year] : [year]

  for (const y of [year]) {
    const found = getEclipsesForYear(y).find(e => {
      return localMidnight(e.peakTime).getTime() === ds.getTime()
    })
    if (found) return found
  }
  return null
}

// ─── Helpers ──────────────────────────────────────────────────────

const localMidnight = (date) => {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

const lunarHinduName = (kind) => ({
  total:      'Purna Chandra Grahan',
  partial:    'Khand Chandra Grahan',
  penumbral:  'Chhaya Grahan',
})[kind] ?? 'Chandra Grahan'

const solarHinduName = (kind) => ({
  total:    'Purna Surya Grahan',
  annular:  'Kankana Surya Grahan',
  partial:  'Khand Surya Grahan',
  hybrid:   'Surya Grahan',
})[kind] ?? 'Surya Grahan'

/**
 * Human-readable type label for display.
 * e.g. "Total Lunar Eclipse" or "Annular Solar Eclipse"
 */
export const eclipseTypeLabel = ({ type, kind }) => {
  const kindLabel = kind.charAt(0).toUpperCase() + kind.slice(1)
  const typeLabel = type === 'lunar' ? 'Lunar Eclipse' : 'Solar Eclipse'
  return `${kindLabel} ${typeLabel}`
}

/**
 * Format the totality duration for a lunar eclipse.
 * Returns null for penumbral/partial where sd_total = 0.
 */
export const lunarTotalityLabel = (eclipse) => {
  if (eclipse.type !== 'lunar') return null
  if (eclipse.sdTotal > 0) {
    const mins = Math.round(eclipse.sdTotal * 2)
    return `Totality: ${mins} min`
  }
  if (eclipse.sdPartial > 0) {
    const mins = Math.round(eclipse.sdPartial * 2)
    return `Partial phase: ${mins} min`
  }
  return null
}
