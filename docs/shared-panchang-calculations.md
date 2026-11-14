# Shared Panchang calculations

The calculation layer runs in Node and the browser without mounting React or
reading settings/localStorage. Screens pass their date, coordinates and calendar
system explicitly.

- `src/panchangAnga.js` provides `getPanchaAngaAtSunrise(date, options)` for Home,
  Calendar's day summary, full Panchang and public city pages. It returns the
  sunrise, Tithi object, Nakshatra/Pada, Yoga, Karana, Vara, phase angle and
  sidereal longitudes. Existing Yoga and Karana helpers remain available.
- `src/panchangCalculations.js` provides `getPanchang(date, location)` for the
  complete app Panchang: transition windows/lists, daily timings, month/year,
  Navagraha, eclipse and observance flags. `getDisplayMasa` also serves Home.
- `getDailyTimingRanges` shares Rahu Kaal, Yamagandam, Abhijit and Brahma rules.
  Inputs and outputs are raw epoch milliseconds, retaining seconds and fractional
  slot boundaries. Full Panchang returns these in `dailyTimings`; it does not
  calculate from whole minutes or return preformatted timing strings.
- `src/timeFormatting.js` rounds a copy of an event to the nearest minute only
  for display, explicitly in IST. Home, Panchang, city pages and eclipse timings
  use it. Associated event dates use the same rounded instant for midnight
  rollover. Push/email text uses a tested mirror in `functions/timeFormatting.js`;
  reminder scheduling and festival decisions continue to use the original events.
- `src/cityPanchang.js` remains the public-page adapter: city registry lookup,
  explicit IST, moonrise/following moonset, festivals, serialization and labels.
  Public pages use the lightweight snapshot without running the full transition
  scans or planetary calculations.

## Preserved behavior

Tithi continues to use `getTithiAtSunrise`. Public snapshots pass an explicit
`utcOffsetMinutes: 330`; app screens retain their existing device-local day
boundaries. Applying explicit IST throughout the app is separate work.

The full Panchang's detailed Nakshatra list still begins with the Nakshatra active
at the start of the civil day, whereas summary cards show the sunrise snapshot.
Its transition scans and calendar/year formulas are preserved. Timing precision
now retains seconds until presentation, with a consistent nearest-minute display.
Home retains its existing moonrise search/pairing behavior. Festival detection
continues to use the existing ritual-window engine; display Masa and festival Masa
are distinct paths, and this extraction does not change festival rules.

Calendar's day summary now uses the established Karana helper instead of its
incorrect independent modulo-11 formula. Daily timing displays may also differ
by a minute from the previous truncated-input calculations.

## Verification

`npm run test:panchang` includes six full-output fixtures captured from the app
before extraction (excluding the intentionally changed daily timing strings),
cross-city sunrise parity, all 60 Karana half-tithis and daily timing rules.
Precision tests cover seconds, app/city consistency, display rounding, timezone
independence, midnight rollover, and frontend/backend formatting parity.
The fixtures protect refactoring parity; they are not an independent
astronomical reference. Existing timezone, moonrise and festival regressions remain
in the suite. Run `npm run build` followed by `npm run test:panchang-build` to check
the public HTML and metadata.
