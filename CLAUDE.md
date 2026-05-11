# Chandra App — Project Context for Claude

This file is the single source of truth for every Claude session working on this project.
Read it at the start of every session before making any changes or answering questions.

---

## What This App Is

**Chandra** is an Indian Moon Tracker progressive web app (PWA) for Hindu users.
It shows daily moon phase, Tithi, Panchang, Nakshatra, moonrise/moonset times, and a Hindu festival calendar — all calculated for the user's local city in India.

- **App name:** Chandra — Indian Moon Tracker
- **Default location:** Bengaluru (lat: 12.9716, lon: 77.5946)
- **Calendar system:** Amavasyant (South Indian default), configurable in Settings
- **Language:** English (default), configurable

---

## Tech Stack

| Layer | Library / Tool |
|---|---|
| UI framework | React 19 |
| Build tool | Vite 8 |
| Styling | Tailwind CSS 3 |
| Astronomy calculations | astronomy-engine 2.x |
| PWA | vite-plugin-pwa |
| Package manager | npm |
| Subscriber database | Firebase Firestore |
| Email delivery (planned) | Resend |
| Scheduled jobs (planned) | Firebase Cloud Functions + Cloud Scheduler |

---

## Project Structure

```
chandra-app/
├── src/
│   ├── main.jsx               # React entry point, wraps app in SettingsProvider
│   ├── App.jsx                # Root component, bottom nav (Today / Calendar / Panchang / Settings)
│   ├── SettingsContext.jsx    # Global settings state (city, lat, lon, language, calendarSystem)
│   ├── moonUtils.js           # Core astronomy helpers (tithi, nakshatra, sunrise, festivals)
│   ├── festivals.js           # Festival rule engine (window-based tithi evaluation, Amanta/Purnimanta masa)
│   ├── cities.js              # Indian city list with lat/lon
│   ├── pages/
│   │   ├── Home.jsx           # "Today" screen — moon visual, tithi, moonrise/set
│   │   ├── Calendar.jsx       # Monthly calendar with tithi + festivals
│   │   ├── Panchang.jsx       # Full daily Panchang (tithi, nakshatra, yoga, karana)
│   │   └── Settings.jsx       # City picker, language, calendar system, notifications
│   └── components/
│       ├── MoonVisual.jsx     # SVG moon phase renderer (waxing/waning terminator)
│       ├── InstallPrompt.jsx  # PWA install banner
│       └── SubscribeSheet.jsx # Bottom sheet for email subscription (subscribe / manage / unsubscribe)
├── public/
│   ├── favicon.svg
│   └── icons.svg
├── vite.config.js             # Vite + PWA plugin config
├── firestore.rules            # Firestore security rules (allow public create/update, block reads)
├── package.json
├── CLAUDE.md                  # ← this file
└── .gitignore
```

---

## Key Logic Rules (Critical — Do Not Break)

### Tithi Calculation Convention
- Tithi is sampled at **local sunrise** (Drik Panchang convention) for display in the UI (Panchang tab, Home highlight strip).
- **Additionally**, if the tithi at **noon (Madhyahna)** differs from sunrise, the **noon tithi is used** — still the rule for the Home highlight and Panchang display.
- Implemented in: `Home.jsx` → `calculateMoonData()` and `moonUtils.js` → `getTithiAtSunrise()`.
- **Do NOT revert to midnight sampling** — it was the original bug.
- **For festival detection, sunrise/noon sampling is NOT used** — the festival engine uses per-festival ritual windows instead (see Festival Engine section below).

### Festival Engine (`src/festivals.js`)
The festival engine was fully rewritten (git commit `67509fb`) to use rule-based, window-aware evaluation. Do not revert to simple masa+paksha+tithi matching.

**Architecture:**
- Each festival is defined as a rule object with `masa`, `paksha`, `tithi`, and a `window` field.
- `getFestivalsForDate(date, options)` accepts an options object with `{ tithiNumber, paksha, lat, lon, calendarSystem }`. The old positional form `(date, tithiNumber, paksha)` still works for backward compat.
- **Call sites** (`Calendar.jsx`, `Home.jsx`) pass `lat`/`lon` from settings — required for window calculations.

**Window types** (ritual period the target tithi must be active during):
- `sunrise` — tithi at local sunrise
- `madhyahna` — midday window (±2h around solar noon)
- `aparahna` — afternoon (noon to sunset)
- `pradosh` — ~2.4h after sunset
- `pradoshOrSunrise` — prefer pradosh window; fall back to sunrise if tithi is not present during pradosh (used by Dhanteras to handle the 2029 edge case where Trayodashi ends before pradosh)
- `nishita` — midnight window (±1h around civil midnight)
- `moonrise` — tithi at moonrise
- `day` — anywhere within the calendar day

**Dual masa for Amanta/Purnimanta boundary festivals:**
Festivals in the October/November Krishna Paksha (Diwali cluster) have different masa names in the two systems. These use `amantaMasa` + `purnimantaMasa` fields instead of a single `masa`. The engine uses `getMasaForDate()` (always Amavasyant internally) and selects the correct target masa based on `calendarSystem`:
- Amanta: Ashwin Krishna (Karwa Chauth, Dhanteras, Naraka Chaturdashi, Diwali)
- Purnimanta: Kartika Krishna (same dates, different name)

**Critical: Purnimant masa derivation for Krishna Paksha — do NOT compare `getMasaForDate()` directly against Purnimant masa names.** `getMasaForDate()` always returns the Amavasyant masa. For Purnimant users viewing a Krishna Paksha date, the display masa must be derived by advancing the Amavasyant result by one (`nextMasa(amantaMasa)`). This is handled by `getCalendarMasaForRule()` in `festivals.js`. Bypassing this causes Diwali to drift to December and Vat Savitri to drift to June (regression that occurred in commit `67509fb` and was fixed in `7a11a21`).

**Special rule flags:**
- `firstOccurrence: true` — suppresses the festival if an identical rule matched in the previous 2 days (prevents double-showing when a tithi spans two civil days). Used by Ugadi, Chaitra Navratri, Dussehra.
- `suppressDuplicateWithinDays: N` — suppresses if the same rule matched within N days. Used by Vat Savitri / Vat Purnima (45 days) to prevent both variants appearing in the same season.
- `preferFirstAfter: { paksha, tithi }` — festival only fires on the first matching day after the given tithi was seen in the preceding 16 days. Used by Govardhan Puja (must follow the Diwali Amavasya).

**2026 verified output (Bengaluru, Amavasyant):**
```
2026-01-14  Makar Sankranti / Pongal
2026-02-15  Maha Shivaratri
2026-03-19  Ugadi / Gudi Padwa ; Chaitra Navratri Begins
2026-03-26  Ram Navami
2026-04-20  Akshaya Tritiya
2026-05-16  Vat Savitri Vrat
2026-05-31  Adhik Vat Purnima Vrat   ← intercalary month; labeled separately
2026-06-29  Vat Purnima Vrat
2026-09-14  Ganesh Chaturthi
2026-10-11  Sharad Navratri Begins
2026-10-20  Dussehra (Vijayadashami)
2026-10-29  Karwa Chauth
2026-11-06  Dhanteras
2026-11-08  Diwali (Deepavali)
2026-11-10  Govardhan Puja
2026-11-24  Dev Diwali / Kartik Purnima
```

**Multi-year sweep (key affected festivals, Amavasyant):**
```
2027: Vat Savitri Jun 4 · Karwa Chauth Oct 18 · Dhanteras Oct 27 · Diwali Oct 29
2028: Vat Savitri May 24 · Karwa Chauth Oct 7  · Dhanteras Oct 15 · Diwali Oct 17
2029: Vat Savitri Jun 12 · Karwa Chauth Oct 26 · Dhanteras Nov 4  · Diwali Nov 5
2030: Vat Savitri Jun 1  · Karwa Chauth Oct 15 · Dhanteras Oct 24 · Diwali Oct 26
```
Note: 2029 Dhanteras was missing under strict `pradosh` window; fixed by `pradoshOrSunrise` + `firstOccurrence: true`.

**Known technical debt in the engine:**
- Lahiri ayanamsha is still a fixed `23.15°` — should eventually be year-sensitive.
- Window evaluation uses 20-minute interval sampling, not exact tithi-transition solving.
- `Panchang.jsx` has its own separate panchang/masa calculation path — not yet unified with the festival engine.

### Moon Phase Visual
- `MoonVisual.jsx` renders a textured SVG moon using a **shadow-overlay approach** — NOT a formula that draws the lit shape directly.
- Rendering order: (1) full lit disc with radial gradient → (2) lunar maria (dark ellipses at real positions) → (3) dark shadow lune drawn ON TOP to cover the unlit portion.
- The shadow lune = one semicircle arc (dark side) + one terminator ellipse arc.
- `termCos = cos(phase × 2π)` drives the terminator x-radius. The sweep flags on both arcs flip at the quarter-moon boundary (phase 0.25/0.75) to correctly handle crescent vs gibbous shapes.
- **Do NOT revert** to the old approach of drawing the lit shape directly — it had incurable edge-case bugs at every quarter boundary.
- The component covers all 30 Hindu tithis correctly for any input phase (0–1).

### Ayanamsha
- Lahiri Ayanamsha = **23.15°** used for Nakshatra calculations (sidereal conversion).
- Defined in `moonUtils.js` as `const AYANAMSHA = 23.15`.

---

## Deployment

### Platform: Vercel
- The app is deployed on **Vercel**.
- Vercel is connected to the **git repository** — pushing to the main branch triggers an automatic deployment.
- There is no `vercel.json` in the project (Vercel auto-detects Vite).

### Git Workflow
- The project uses **Git** for version control.
- The git remote is connected to Vercel for CI/CD.
- VS Code is the primary editor used by the developer.

### Deploy Steps (Every Time)
After making and saving code changes:

```bash
# 1. Navigate to the project folder
cd "C:\Users\Shiv\OneDrive\Desktop\chandra-app"

# 2. Stage the changed files
git add <changed files>
# e.g. git add src/pages/Home.jsx src/components/MoonVisual.jsx

# 3. Commit with a descriptive message
git commit -m "Fix: <brief description of what changed>"

# 4. Push to trigger Vercel auto-deploy
git push
```

Vercel will automatically pick up the push and deploy to the live app within ~1 minute.

### Build Command (Vite)
If a manual build is ever needed (e.g. to test the production bundle locally):
```bash
npm run build      # outputs to dist/
npm run preview    # preview the dist/ build locally
```

---

## Settings & State

- All user settings (city, lat, lon, language, calendarSystem, notifications) are persisted in **localStorage** under the key `chandra-settings`.
- Settings are managed via `SettingsContext.jsx` and accessed anywhere via `useSettings()`.
- Default city: **Bengaluru** (lat: 12.9716, lon: 77.5946).

## Subscription & Notifications

### Email Subscriptions (live)
- Subscriber data is stored in **Firebase Firestore** (`subscribers` collection).
- Each subscriber document contains: `id` (UUID), `name`, `email`, `city`, `lat`, `lon`, `calendarSystem`, `emailFrequency`, `active`, `subscribedAt`.
- `emailFrequency` values: `'all'` (default) | `'major'` | `'monthly'`.
- Unsubscribes are **soft-deletes** — document stays in Firestore with `active: false` and `unsubscribedAt` timestamp.
- Local state is mirrored in **localStorage** under `chandra-subscription` as the local source of truth.
- Security rules in `firestore.rules`: public creates + self-updates allowed; all reads and deletes blocked from client.
- `SubscriptionContext.jsx` exposes: `subscribe()`, `update()`, `updateFrequency()`, `unsubscribe()`.
- UI entry point: bell icon in top bar → `SubscribeSheet.jsx` bottom sheet.

### Push Notifications (frontend complete — Cloud Functions backend pending)
- Permission state managed in `Settings.jsx` via `Notification.requestPermission()`.
- Toggle prefs persisted in localStorage under `chandra-notif-prefs` and `chandra-notif-enabled`.
- FCM device registration is **fully implemented** in `notifications.js` — `initDevice()`, `updateDevice()`, `deactivateDevice()` all write to the Firestore `devices` collection with token, city, lat/lon, prefs.
- In-app preview notification (`NotificationPreview` component) fires on permission grant — **no OS notification API used** (Chrome blocks `new Notification()` when a SW is registered).
- **What's missing**: a Cloud Functions backend to read the `devices` collection and send FCM pushes. Blocked on Firebase Blaze plan upgrade.

### Automated Email (frontend complete — Cloud Functions backend pending)
- Subscriber data model is fully live in Firestore (`subscribers` collection).
- **What's missing**: Cloud Function + Resend API sending layer. Blocked on Firebase Blaze plan upgrade.
- Strategy when built: hybrid — pre-written festival stories + dynamically injected city-specific timing data.

### Analytics (live)
- GA4 analytics implemented in `analytics.js` — tracks page views and key events (subscribe, unsubscribe, notification_enabled, notification_disabled, city_changed).

### Panchang Timings (all live)
- Rahu Kaal, Yamagandam, Abhijit Muhurta, and Brahma Muhurta are all calculated and displayed in `Panchang.jsx`.

---

## Known Issues Fixed (History)

| Date Fixed | Issue | File(s) Changed |
|---|---|---|
| 2026-05 | Sep 14 showing Tritiya instead of Chaturthi — tithi was sampled at midnight instead of sunrise/noon | `Home.jsx`, `moonUtils.js` |
| 2026-05 | Full moon visual rendering as new moon — waning phase used `cos` instead of `sin` for terminator rx | `MoonVisual.jsx` |
| 2026-05 | Full moon rendering as half moon (and other phase errors) — entire MoonVisual rewritten with shadow-overlay approach; adds lunar maria texture, radial gradient, earthshine hint, and glow | `MoonVisual.jsx` |
| 2026-05 | Moon always appeared dark — SVG gradient attributes had invalid "px" suffix in userSpaceOnUse mode; browsers silently fall back to black fill | `MoonVisual.jsx` |
| 2026-05 | All 30 moon phase shapes wrong — terminator arc sweep flags were inverted for all four phase types (waxing/waning × crescent/gibbous); fixed by swapping 0↔1 in terminatorSweep logic | `MoonVisual.jsx` |
| 2026-05 | Added Pratipada alternate name: now shown as "Pratipada (Prathama)" in all tithi arrays | `moonUtils.js`, `Panchang.jsx` |
| 2026-05 | Added Yamagandam to Panchang Daily Timings (slot order [Sun–Sat]: 5,4,3,2,1,6,7; same 8-slot day division as Rahu Kaal) | `Panchang.jsx` |
| 2026-05 | Tab switch preserved scroll position — added window.scrollTo(0,0) to all four nav buttons | `App.jsx` |
| 2026-05 | Empty calendar leading tiles had yellow border/bg — null day cells now render as transparent divs with no styling | `Calendar.jsx` |
| 2026-05 | "Coming Soon" language buttons were focusable/clickable — added disabled + aria-disabled attributes | `Settings.jsx` |
| 2026-05 | Fixed bottom nav obscuring page content — added pb-28 to all four page root containers | `Home.jsx`, `Calendar.jsx`, `Panchang.jsx`, `Settings.jsx` |
| 2026-05 | Added persistent top bar (🌙 Chandra logo + bell icon) and subscription system — SubscriptionContext, SubscribeSheet, Google Apps Script backend | `App.jsx`, `main.jsx`, `SubscriptionContext.jsx`, `SubscribeSheet.jsx`, `Settings.jsx` |
| 2026-05 | Added lunar and solar eclipse support — eclipseUtils.js calculates all eclipses for a year using astronomy-engine; EclipseIcons.jsx has blood moon + corona SVG icons; Calendar and Panchang both show eclipse details | `eclipseUtils.js`, `EclipseIcons.jsx`, `Calendar.jsx`, `Panchang.jsx` |
| 2026-05 | Restructured three-tab navigation to eliminate overlap — Today is now purely the moon screen (visual + moonrise/moonset + tappable Today's Highlight strip); Calendar is now a pure planning grid (tapping any day navigates directly to Panchang with that date pre-selected); Panchang is the single source of truth for any date | `App.jsx`, `Home.jsx`, `Calendar.jsx`, `Panchang.jsx` |
| 2026-05 | Home highlight strip now always visible — shows eclipse → festival → tithi/paksha fallback on plain days; Calendar day tap now opens a bottom-sheet modal with Pancha Anga summary + "View Full Panchang" CTA instead of navigating directly | `Home.jsx`, `Calendar.jsx` |
| 2026-05 | Migrated subscription backend from Google Apps Script to Firebase Firestore — subscribers now stored as individual documents with full data model; soft-delete unsubscribe; security rules block client reads | `src/firebase.js` (new), `src/SubscriptionContext.jsx`, `firestore.rules` (new) |
| 2026-05 | WCAG 2.1 AA accessibility + design system token migration — removed user-scalable=no viewport restriction; added Tailwind chandra colour tokens + CSS custom properties; global :focus-visible ring (#8EA8FF); skip-to-content link; prefers-reduced-motion rule; ARIA roles/labels/live regions across all pages; keyboard trap fixes (Escape key + focus-on-open) for all bottom sheets and modals; min 44×44px touch targets on all interactive elements; role="switch"+aria-checked on all toggles; role="dialog"+aria-modal on DatePickerSheet, SubscribeSheet, Calendar day modal | `index.html`, `tailwind.config.js`, `src/index.css`, `src/App.jsx`, `src/pages/Home.jsx`, `src/pages/Calendar.jsx`, `src/pages/Panchang.jsx`, `src/pages/Settings.jsx`, `src/components/MoonVisual.jsx`, `src/components/DatePickerSheet.jsx`, `src/components/SubscribeSheet.jsx`, `src/components/InstallPrompt.jsx` |
| 2026-05 | UI chrome emoji replaced with Lucide React icons throughout — Bell (notifications), MapPin (location), Globe (language), CalendarIcon (calendar system/vara), Clock (panchang), Moon (tithi), Star (nakshatra), Sun (sun longitude), Sunrise, Sparkles (auspicious), AlertTriangle (inauspicious), Timer (durations), SettingsIcon (settings heading), CalendarDays (date picker); moon phase emoji 🌑🌒🌓🌔🌕🌖🌗🌘 intentionally retained (no Lucide equivalents); Karana "½" string retained | `src/App.jsx`, `src/pages/Home.jsx`, `src/pages/Calendar.jsx`, `src/pages/Panchang.jsx`, `src/pages/Settings.jsx`, `src/components/DatePickerSheet.jsx` |
| 2026-05 | Toggle redesigned to standard pill+thumb pattern — 44×26px track, 20×20px circular thumb, gold #DDBB6A active colour, spring easing cubic-bezier(0.34,1.56,0.64,1); SubToggle at 36×20px; design system HTML updated with anatomy diagram and emoji/icon policy rules | `src/pages/Settings.jsx`, `chandra-design-system.html` |
| 2026-05 | Fixed Rahu Kaal slot order — was off by 1 for every weekday; corrected to Drik Panchang order `[8,2,7,5,6,4,3]` | `Panchang.jsx` |
| 2026-05 | Fixed Yamagandam slot order — Friday/Saturday were swapped; corrected to `[5,4,3,2,1,7,6]` | `Panchang.jsx` |
| 2026-05 | Fixed hardcoded 6AM/6PM sunrise/sunset — all timings now use actual calculated values via `getSunsetForDate()` | `moonUtils.js`, `Panchang.jsx` |
| 2026-05 | Nakshatra transition times now show actual datetime (date + time) including real end time for nakshatras continuing past midnight (30h secondary scan) | `Panchang.jsx` |
| 2026-05 | Home moonrise/moonset now shows date alongside time (for cases where event falls on next day) | `Home.jsx` |
| 2026-05 | Panchang tab kept mounted with CSS display:none — eliminates loading flash on tab switch | `App.jsx` |
| 2026-05 | Calendar + DatePickerSheet: swipe left/right to navigate months; tap month/year heading opens jump picker (201-year range 1926–2126); Calendar day modal Lucide icons | `Calendar.jsx`, `DatePickerSheet.jsx` |
| 2026-05 | Panchang tab restructured as 5 collapsible accordion sections — Pancha Anga, Daily Timings, Nakshatra Details, Month & Year, Planetary Positions; all expanded by default; state persisted in localStorage under `chandra-panchang-accordion`; Collapse All / Expand All toggle | `Panchang.jsx` |
| 2026-05 | Added Samvatsara (60-year Jupiter cycle) to Month & Year section — calculated from Ugadi anchor (Krodhi=38th, 2024); current year (post-Ugadi 2026) = Parabhava | `Panchang.jsx` |
| 2026-05 | Added Masa (lunar month name), Ritu (6 Hindu seasons), and Ayana (Uttarayana/Dakshinayana) to Month & Year section; Masa differentiates Amavasyant vs Purnimant during Krishna Paksha | `Panchang.jsx` |
| 2026-05 | Expanded Planetary Positions to all 9 Navagraha — Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Rahu (mean ascending node), Ketu (South Node); sidereal longitudes with Rashi name | `Panchang.jsx` |
| 2026-05 | WCAG accessibility pass — hidden overlays exposed to AT (inert + aria-hidden on inactive sheets); focus trap in SubscribeSheet + DatePickerSheet; full ARIA combobox/listbox/keyboard-nav on all city search inputs; form semantics (id/htmlFor, autocomplete, aria-invalid, aria-describedby); date picker day button labels + close buttons; triggerRef focus restoration on all bottom sheets | `App.jsx`, `SubscribeSheet.jsx`, `DatePickerSheet.jsx`, `DateStrip.jsx`, `Settings.jsx` |
| 2026-05 | Contrast pass — all text-gray-500/gray-600 (failing 4.5:1 WCAG AA) upgraded to text-gray-400 across all pages and components | `Home.jsx`, `Calendar.jsx`, `Panchang.jsx`, `Settings.jsx`, `InstallPrompt.jsx`, `SubscribeSheet.jsx`, `DatePickerSheet.jsx` |
| 2026-05 | GPS location flow — "Use my location" button in Settings snaps to nearest city via haversine; usingGps flag stored in settings; GPS active banner shown in Settings City section; Home header shows blue LocateFixed icon + "GPS — CityName" indicator when usingGps is true; selecting any city manually clears usingGps | `SettingsContext.jsx`, `Settings.jsx`, `Home.jsx` |
| 2026-05 | Offline banner — `OfflineBanner.jsx` slides in below the top bar when device goes offline; reassures user that all calculations work without internet; shows brief "Back online" green flash on reconnect; hidden when subscribe sheet is open | `src/components/OfflineBanner.jsx`, `App.jsx` |
| 2026-05 | Home moon calc error state — replaced bare red text with a friendly card (🌑, explanation text, "Try again" button that resets loading state and retries calculation) | `Home.jsx` |
| 2026-05 | Calendar + DatePickerSheet: swipe left/right to navigate months; tap month/year heading opens jump picker (201-year range 1926–2126); Calendar day modal Lucide icons | `Calendar.jsx`, `DatePickerSheet.jsx` |
| 2026-05 | Calendar selection behaviour overhauled — today always shows amber/gold highlight; swiping or using month arrows clears any selection (no ghost indigo carry-over); indigo selection only appears after explicit tap; festival list renamed "Festivals in [Month]" and now shows all festivals of the viewed month (no >= today filter, no slice cap) | `Calendar.jsx` |
| 2026-05 | Festival data migration — replaced hard-coded DATED_FESTIVALS_2026 with ANNUAL_FESTIVALS (27 major festivals defined by masa+paksha+tithi rules, works for any year); added getMasaForDate() to moonUtils.js using Amavasyant ending-Amavasya convention; added getSolarFestivalsForDate() for Makar Sankranti; added type:'major'/'observance' field; calendar grid shows emoji for major festivals, amber dot for observances; added missing festivals: Janmashtami, Raksha Bandhan, Akshaya Tritiya, Dhanteras, Govardhan Puja, Bhai Dooj, Chhath Puja, Nag Panchami, Sharad Purnima, Dev Diwali, Guru Purnima, and more; corrected Maha Shivaratri masa to Magha (Amavasyant); Janmashtami masa corrected to Shravana (Amavasyant); added Chaitra Navratri Begins and Maha Navami | `moonUtils.js`, `festivals.js`, `Calendar.jsx`, `Home.jsx` |
| 2026-05 | Festival engine rewritten with window-based ritual evaluation (git `67509fb`) — fixed multiple date offsets caused by simple sunrise-tithi matching; each festival now declares its traditional decision window (sunrise/madhyahna/aparahna/pradosh/nishita/moonrise/day); Diwali cluster (Karwa Chauth, Dhanteras, Diwali) now uses amantaMasa+purnimantaMasa dual field to correctly place these festivals in the October/November Krishna Paksha boundary; Calendar.jsx and Home.jsx updated to pass lat/lon to getFestivalsForDate; all 2026 dates verified against drikpanchang for Bengaluru/Amavasyant | `festivals.js`, `Calendar.jsx`, `Home.jsx` |
| 2026-05 | Adhik Vat Purnima labeled separately (git `dc5b600`) — intercalary Jyeshtha in 2026 produces two Purnima candidates; May 31 now labeled "Adhik Vat Purnima Vrat", Jun 29 is the principal "Vat Purnima Vrat" | `festivals.js` |
| 2026-05 | Purnimant Krishna Paksha regression fix (git `7a11a21`) — festival engine was comparing getMasaForDate() (always Amavasyant) directly against Purnimant masa names, causing Diwali to shift to Dec 8 and Vat Savitri to Jun 15; fixed by adding getCalendarMasaForRule() which advances Amavasyant masa by one for Purnimant users during Krishna Paksha; Dhanteras changed to pradoshOrSunrise + firstOccurrence:true to handle 2029 edge case where Trayodashi ends before Pradosh; 2026–2030 multi-year sweep verified | `festivals.js` |

---

## Iconography Policy (Established 2026-05)

- **UI chrome emoji → Lucide React**: All emoji used as UI icons (navigation, labels, status) are replaced with Lucide components at `size={22} strokeWidth={1.75}` for nav, `size={16} strokeWidth={1.75}` for inline row icons.
- **Moon phase emoji → KEEP**: 🌑🌒🌓🌔🌕🌖🌗🌘 have no Lucide equivalents and carry semantic meaning for Hindu users. Always retain them in content contexts.
- **Decorative emoji** (e.g. 🌙 in InstallPrompt): add `aria-hidden="true"`.

## Design Token Colours (Established 2026-05)

| Token | Value | Usage |
|---|---|---|
| `bg-primary` | `#0B1020` | App background |
| `gold` | `#DDBB6A` | Primary accent, toggle active, selected states |
| `indigo-cta` | `#3D4ECC` | CTA buttons |
| `focus` | `#8EA8FF` | Focus rings (`:focus-visible`) |
| `text-primary` | `#F5F7FA` | Body text |
| `text-secondary` | `#B5BDD1` | Secondary/muted text |

---

## How Claude Should Work in This Project

1. **Read this file first** at the start of every session.
2. **Edit source files** in `src/` directly using the Edit/Write tools.
3. **Deploy** by running the git commands above (or instructing the user to run them if the bash sandbox is unavailable).
4. **Never revert** the tithi noon-check or the waning `sin` formula — these were deliberate fixes for real bugs.
5. **Never revert** the rule-based festival engine in `festivals.js` to simple masa+paksha+tithi matching — the window-based evaluation is required for correct dates.
6. **Never reintroduce fixed Gregorian festival dates** — all festival logic must stay rule-based and work for any year.
7. **Never compare `getMasaForDate()` directly against Purnimant masa names for Krishna Paksha** — `getMasaForDate()` always returns Amavasyant; for Purnimant + Krishna Paksha, use `getCalendarMasaForRule()` which advances by one masa. Bypassing this causes Diwali and Vat Savitri to drift by a full lunar month.
8. **Before changing any festival rule, verify the affected festival across 2026–2030** — the multi-year sweep has already caught a 2029 Dhanteras regression. Any new rule change should be checked for at least 5 years.
7. **Update the "Known Issues Fixed" table** above whenever a new bug is fixed.
