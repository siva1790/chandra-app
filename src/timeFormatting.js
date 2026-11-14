import { INDIA_TIME_ZONE, indianDateKey } from './civilDate.js'

const MINUTE_MS = 60000

// Display only: never feed this rounded copy back into calculations or scheduling.
export function roundTimeForDisplay(value) {
  return new Date(Math.round(new Date(value).getTime() / MINUTE_MS) * MINUTE_MS)
}

export function formatEventTime(value) {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: INDIA_TIME_ZONE, hour: 'numeric', minute: '2-digit', hour12: true,
  }).format(roundTimeForDisplay(value)).toUpperCase()
}

// Event dates must use the same rounded instant as their accompanying time,
// including a display that carries from 23:59:30 to the following day's 00:00.
export function formatEventDate(value) {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: INDIA_TIME_ZONE, day: 'numeric', month: 'short',
  }).format(roundTimeForDisplay(value))
}

export function formatEventRange(start, end) {
  const sameDay = indianDateKey(roundTimeForDisplay(start)) === indianDateKey(roundTimeForDisplay(end))
  const label = value => sameDay ? formatEventTime(value) : `${formatEventTime(value)}, ${formatEventDate(value)}`
  return `${label(start)} – ${label(end)}`
}
