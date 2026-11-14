'use strict'

// Backend mirror of src/timeFormatting.js. Keep parity covered by timing tests.
// These rounded copies are for text only, never notification scheduling/dedupe.
const roundTimeForDisplay = (value) =>
  new Date(Math.round(new Date(value).getTime() / 60000) * 60000)

const formatEventTime = (value) => new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', hour12: true,
}).format(roundTimeForDisplay(value)).toUpperCase()

const formatEventDate = (value) => new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short',
}).format(roundTimeForDisplay(value))

module.exports = { roundTimeForDisplay, formatEventTime, formatEventDate }
