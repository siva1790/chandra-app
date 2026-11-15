# Merged Panchang homepage

The primary navigation is Panchang, Calendar and Settings. The root page contains
date navigation, a conditional Day's highlight, Cosmos, the full six Panchang
accordions, city links and the learning-guide link. Legacy Day View remains in
source but is not mounted. Existing birth profiles remain stored.

The city/calendar control expands an editor above the date bar. It shows popular
public cities initially and searches every supported Indian city by name/state.
City and calendar-system choices remain drafts until Apply changes is pressed.
Apply updates coordinates, city and calendar system together through SettingsContext;
Calendar and Settings see the same saved values. Calendar-only changes retain GPS
state; choosing another city clears it. Cancel, close and Escape discard drafts.
Opening the picker focuses search; closing returns focus to its trigger.

The selected date is shared across Calendar and Panchang, remains unchanged by
preference updates, and survives Learn return navigation. An open Today's page
advances across the Indian day boundary, while historical/future selections stay
put. Root and legacy hash links continue to resolve to Panchang.

Cosmos reuses the existing moon renderer, sunrise phase/illumination and shared
moon-event helper. It distinguishes calculation errors from genuinely absent
events, preserves dated following moonsets, and formats only presentation in IST.
Festival detection still uses the existing location-aware ritual windows.

The approved design system owns typography, geometry and responsive behavior.
All accordions start open for this release, with subsequent choices persisted in
the versioned existing accordion-storage key. Shared grid rows stretch card shells
without spacer elements; Planetary Positions remains full width below the grid.

Public city and Learn navigation now also use the three labels. Their canonical
paths, prerendering and sitemap entries remain unchanged.

## Verification

- Production build, radius and typography guards passed; 36 Panchang calculation
  regressions and 10 city/Learn production checks passed.
- Chromium interaction checks cover the three menus, Apply/Cancel/Escape, city and
  state search, calendar selection, saved coordinates/system, unchanged profiles,
  Calendar-to-Panchang date selection, Learn return and legacy homepage hashes.
- Browser checks at 320, 390, 767, 768, 800, 1023, 1024 and 1440px confirm no
  horizontal page/picker overflow, equal Cosmos columns/gaps and aligned grid rows.
  Screenshots at 390, 800 and 1440px were visually reviewed.
- 200% text at 320px retains the page and picker without horizontal overflow.
  Cosmos labels wrap, mobile planetary rows reflow and closed date dialogs are
  excluded from layout. Bengaluru 1 December 2026 shows no moonrise and retains
  the 12:27 PM IST moonset.
- Targeted lint passes for App, Panchang, the new components, MoonVisual, public
  city/Learn screens and Learn. Existing lint findings remain in SettingsContext
  (mixed component/hook exports) and Settings (an existing state-setting effect).

Run `node tests/merged-homepage.browser.mjs` with Playwright installed, or provide
`PLAYWRIGHT_MODULE` as its entry path. `CHROMIUM_EXECUTABLE` may select an installed
Chromium binary. The check starts and closes a local Vite server unless
`PANCHANG_TEST_URL` is provided. Local screenshots are written under
`tmp/merged-panchang-review/`.
