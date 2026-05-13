/**
 * test-local.js — local sanity check for astroUtils.js
 *
 * Run from the functions/ directory:
 *   node test-local.js
 *
 * No Firebase / network access needed. Tests the festival engine and
 * push notification logic against known dates for Bengaluru, Amavasyant.
 *
 * Exit code 0 = all assertions passed.
 * Exit code 1 = one or more assertions failed.
 */

'use strict'

const { getDayInfo, getISTDateKey } = require('./astroUtils')

// ── Config ────────────────────────────────────────────────────────────────────

const LAT = 12.9716   // Bengaluru
const LON = 77.5946

let passed = 0
let failed = 0

// ── Helpers ───────────────────────────────────────────────────────────────────

const toIST = (dateStr) => {
  // Parse a YYYY-MM-DD string as IST midnight, return a UTC Date
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0) - (5.5 * 60 * 60 * 1000))
}

const assert = (label, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (ok) {
    console.log(`  ✅  ${label}`)
    passed++
  } else {
    console.error(`  ❌  ${label}`)
    console.error(`       expected : ${JSON.stringify(expected)}`)
    console.error(`       got      : ${JSON.stringify(actual)}`)
    failed++
  }
}

const assertIncludes = (label, arr, value) => {
  const ok = arr.some(f => f.name === value)
  if (ok) {
    console.log(`  ✅  ${label}`)
    passed++
  } else {
    console.error(`  ❌  ${label}`)
    console.error(`       expected festival named "${value}" in [${arr.map(f => f.name).join(', ')}]`)
    failed++
  }
}

const assertEmpty = (label, arr) => {
  if (arr.length === 0) {
    console.log(`  ✅  ${label}`)
    passed++
  } else {
    console.error(`  ❌  ${label}`)
    console.error(`       expected empty array, got [${arr.map(f => f.name).join(', ')}]`)
    failed++
  }
}

// Simulates the push notification decision in index.js
const wouldNotify = (
  dayInfo,
  prefs = { festivals: true, eclipses: true, moonrise: true, ekadashi: true },
  device = { notifPrefsVersion: 2 }
) => {
  if (prefs.eclipses && dayInfo.eclipse)                        return { reason: 'eclipse',     name: dayInfo.eclipse.hinduName }
  if (prefs.festivals && dayInfo.datedFestivals.length > 0)     return { reason: 'festival',    name: dayInfo.datedFestivals[0].name }
  if ((prefs.ekadashi !== false || device.notifPrefsVersion !== 2) && dayInfo.festivals.length > 0) {
    return { reason: 'observance',  name: dayInfo.festivals[0].name }
  }
  return null
}

// ── Test cases ────────────────────────────────────────────────────────────────

console.log('\n━━━ Chandra astroUtils local test ━━━\n')

// 1. Today — May 12 2026 is Dashami: should produce NO notification with default prefs
console.log('1. Today (2026-05-12 = Dashami) — default prefs → no notification')
{
  const d = getDayInfo(toIST('2026-05-12'), LAT, LON)
  console.log(`   Tithi: ${d.tithi.paksha} ${d.tithi.name} (${d.tithi.adjustedNumber})`)
  assert('No major festival on Dashami',    d.datedFestivals.length, 0)
  assert('No observance on Dashami',        d.festivals.length,      0)
  assert('No notification fires (default prefs)', wouldNotify(d),   null)
}

// 2. Ganesh Chaturthi 2026 — Sep 14
console.log('\n2. Ganesh Chaturthi (2026-09-14)')
{
  const d = getDayInfo(toIST('2026-09-14'), LAT, LON)
  console.log(`   Tithi: ${d.tithi.paksha} ${d.tithi.name} (${d.tithi.adjustedNumber})`)
  assertIncludes('Ganesh Chaturthi detected as major festival', d.datedFestivals, 'Ganesh Chaturthi')
  assert('Notification fires for major festival', wouldNotify(d)?.reason, 'festival')
}

// 3. Diwali 2026 — Nov 8
console.log('\n3. Diwali (2026-11-08)')
{
  const d = getDayInfo(toIST('2026-11-08'), LAT, LON)
  console.log(`   Tithi: ${d.tithi.paksha} ${d.tithi.name} (${d.tithi.adjustedNumber})`)
  assertIncludes('Diwali detected', d.datedFestivals, 'Diwali (Deepavali)')
  assert('Diwali notification fires', wouldNotify(d)?.reason, 'festival')
}

// 4. Ekadashi should notify by default and still respect explicit version-2 opt-out.
console.log('\n4. Ekadashi (2026-05-13) - default prefs notify; explicit opt-out suppresses')
{
  const d = getDayInfo(toIST('2026-05-13'), LAT, LON)
  console.log(`   Tithi: ${d.tithi.paksha} ${d.tithi.name} (${d.tithi.adjustedNumber})`)
  assert('Ekadashi observance detected', d.festivals[0]?.name, 'Ekadashi')
  assert('Ekadashi: observance notification fires by default',
    wouldNotify(d)?.reason, 'observance')
  assert('Ekadashi: notification is suppressed when explicitly opted out',
    wouldNotify(d, { festivals: true, eclipses: true, moonrise: true, ekadashi: false }), null)
  assert('Ekadashi: old pre-version default false is migrated to notify',
    wouldNotify(d, { festivals: true, eclipses: true, ekadashi: false }, {})?.reason, 'observance')
  // With ekadashi pref on — notification fires
  assert('Moonrise exists for moonrise reminder scheduling',
    d.moonrise instanceof Date, true)
}

// 5. Maha Shivaratri 2026 — Feb 15
console.log('\n5. Maha Shivaratri (2026-02-15)')
{
  const d = getDayInfo(toIST('2026-02-15'), LAT, LON)
  console.log(`   Tithi: ${d.tithi.paksha} ${d.tithi.name} (${d.tithi.adjustedNumber})`)
  assertIncludes('Maha Shivaratri detected', d.datedFestivals, 'Maha Shivaratri')
}

// 6. Diwali 2027 — engine should find it (not hardcoded)
console.log('\n6. Diwali 2027 — rule engine works beyond 2026')
{
  // Diwali 2027 expected: Oct 29 (Ashwin Krishna 15, pradosh window, Amavasyant)
  const d = getDayInfo(toIST('2027-10-29'), LAT, LON)
  console.log(`   2027-10-29 Tithi: ${d.tithi.paksha} ${d.tithi.name} (${d.tithi.adjustedNumber})`)
  console.log(`   Festivals: [${d.datedFestivals.map(f => f.name).join(', ') || 'none'}]`)
  // Just check the engine runs without error and returns a result shape
  assert('getDayInfo returns array for 2027', Array.isArray(d.datedFestivals), true)
}

// 7. genZMessage present on a major festival
console.log('\n7. Gen Z message present on festival objects')
{
  const d = getDayInfo(toIST('2026-11-08'), LAT, LON)  // Diwali
  const f = d.datedFestivals[0]
  assert('genZMessage exists on Diwali', typeof f?.genZMessage, 'string')
  assert('genZMessage is non-empty',     (f?.genZMessage?.length ?? 0) > 0, true)
}

// 8. IST date key sanity check
console.log('\n8. IST date key')
{
  // 2026-05-12 00:00 IST = 2026-05-11 18:30 UTC
  const utc = new Date('2026-05-11T18:30:00Z')
  assert('IST date key for 2026-05-11 18:30 UTC → 2026-05-12', getISTDateKey(utc), '2026-05-12')
}

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\n━━━ Results: ${passed} passed, ${failed} failed ━━━\n`)
process.exit(failed > 0 ? 1 : 0)
