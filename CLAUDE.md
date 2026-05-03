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

---

## Project Structure

```
chandra-app/
├── src/
│   ├── main.jsx               # React entry point, wraps app in SettingsProvider
│   ├── App.jsx                # Root component, bottom nav (Today / Calendar / Panchang / Settings)
│   ├── SettingsContext.jsx    # Global settings state (city, lat, lon, language, calendarSystem)
│   ├── moonUtils.js           # Core astronomy helpers (tithi, nakshatra, sunrise, festivals)
│   ├── festivals.js           # Festival definitions (tithi + paksha + lunar month)
│   ├── cities.js              # Indian city list with lat/lon
│   ├── pages/
│   │   ├── Home.jsx           # "Today" screen — moon visual, tithi, moonrise/set
│   │   ├── Calendar.jsx       # Monthly calendar with tithi + festivals
│   │   ├── Panchang.jsx       # Full daily Panchang (tithi, nakshatra, yoga, karana)
│   │   └── Settings.jsx       # City picker, language, calendar system, notifications
│   └── components/
│       ├── MoonVisual.jsx     # SVG moon phase renderer (waxing/waning terminator)
│       └── InstallPrompt.jsx  # PWA install banner
├── public/
│   ├── favicon.svg
│   └── icons.svg
├── vite.config.js             # Vite + PWA plugin config
├── package.json
├── CLAUDE.md                  # ← this file
└── .gitignore
```

---

## Key Logic Rules (Critical — Do Not Break)

### Tithi Calculation Convention
- Tithi is sampled at **local sunrise** (Drik Panchang convention).
- **Additionally**, if the tithi at **noon (Madhyahna)** differs from sunrise, the **noon tithi is used** — this is the traditional rule for festival determination (e.g. Ganesh Chaturthi on Sep 14 when Chaturthi begins after sunrise but prevails at midday).
- Implemented in: `Home.jsx` → `calculateMoonData()` and `moonUtils.js` → `getTithiAtSunrise()`.
- **Do NOT revert to midnight sampling** — it was the original bug.

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

---

## How Claude Should Work in This Project

1. **Read this file first** at the start of every session.
2. **Edit source files** in `src/` directly using the Edit/Write tools.
3. **Deploy** by running the git commands above (or instructing the user to run them if the bash sandbox is unavailable).
4. **Never revert** the tithi noon-check or the waning `sin` formula — these were deliberate fixes for real bugs.
5. **Update the "Known Issues Fixed" table** above whenever a new bug is fixed.
