// Fixed-offset civil days. India has no daylight-saving transitions.
export const INDIA_OFFSET_MINUTES = 330
export const INDIA_TIME_ZONE = 'Asia/Kolkata'
export const DAY_MS = 86400000

export function startOfCivilDay(date, utcOffsetMinutes) {
  const result = new Date(date)
  if (utcOffsetMinutes === undefined) {
    result.setHours(0, 0, 0, 0)
    return result
  }
  const offset = utcOffsetMinutes * 60000
  result.setTime(result.getTime() + offset)
  result.setUTCHours(0, 0, 0, 0)
  return new Date(result.getTime() - offset)
}

export const indianDateKey = (date = new Date()) =>
  new Date(date.getTime() + INDIA_OFFSET_MINUTES * 60000).toISOString().slice(0, 10)

// DateStrip stores the chosen Gregorian date in browser-local fields.
export function indianDayFromPicker(date) {
  const year = String(date.getFullYear()).padStart(4, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return new Date(`${year}-${month}-${day}T00:00:00+05:30`)
}
