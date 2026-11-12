# Public city Panchang pages

## Review locally

Run `npm run build`, then `npm run preview`. Open `/panchang/bengaluru` on the printed local URL. Development mode also supports this path, but its initial HTML is a template; inspect the production preview to verify prerendering.

## Behavior

- Each public URL always calculates for its named city. Enabled cities: Bengaluru, Chennai, Pune, Hyderabad, Bhopal, Patna, Delhi, Kolkata and Mumbai. All public pages currently use the explicitly labelled Amavasyant default; app calendar-system settings stay unchanged. It does not mount SettingsProvider, read saved settings, or write localStorage.
- The homepage continues to use the saved city. Links to `/#calendar`, `/#panchang`, `/#settings`, and the existing `/#learn/...` links open the corresponding app screen.
- All public-page day boundaries and displayed times are explicitly Indian time, independent of device/build-server timezone.
- Tithi, Nakshatra, Yoga and Karana are sampled at sunrise. The shared festival engine retains ritual-window rules. The page uses Amavasyant consistently and labels it.
- Moonset follows the selected civil day's moonrise and includes its date. A day without moonrise does not fabricate a moonrise or paired moonset.
- The static page has its own title, description, canonical, social metadata, headings and content. It has a separate client entry, so it does not load Firebase or the full app UI.
- Vercel explicitly rewrites the extensionless public URL to its generated HTML and redirects slash/index.html variants to the canonical URL. Vite dev/preview middleware mirrors the public-page mapping. The service worker no longer falls back to the personalised homepage for this page; it uses the network with a previously visited page as an offline fallback.

## Static snapshot and freshness

`npm run build` prerenders the React page into real HTML with a dated Panchang snapshot and embedded data. The browser hydrates that snapshot and updates to the current Indian day. An open page checks for an Indian-day change every minute and on focus/visibility changes, unless the visitor selected a different date.

The initial HTML snapshot updates **only on build**. Its heading always names the exact date; neither its metadata nor its heading calls an older snapshot “today.” JavaScript-disabled visitors receive a snapshot explanation. Client calculations stay fresh even between builds.

Before promoting this as a reliably current initial-HTML “today” answer at scale, arrange and monitor a daily rebuild or choose cached server rendering. This pilot deliberately does not add a cron, database, paid API, or new server endpoint. Build-time snapshots can also appear in offline caches, so the displayed date is always explicit.

## Checks

- `npm run test:panchang`: date validation, May tithi boundary, existing-app sunrise parity, four host timezones, next-day moonset, absent moonrise, weekday Rahu Kaal, Diwali 2026–2030.
- `node functions/test-local.js`: existing backend regression suite.
- Production HTML assertions: meaningful content before JS, one canonical, embedded snapshot, no unresolved placeholder, and correct linked assets.
- Browser review: 390px mobile layout, no horizontal overflow, no console warnings/errors, date controls, app/Settings links, and saved Mumbai preference preserved across a Bengaluru visit.

Production URL: https://chandrapanchang.app/panchang/bengaluru. Frontend releases deploy through a push to main (Vercel). No Firebase deployment is required for this page. Search Console submission and a daily initial-HTML refresh process remain separate follow-up work.

## City expansion

`src/publicPanchangCities.js` is the rollout registry and reuses `src/cities.js` coordinates. `CityPanchang.jsx` and `cityPanchang.js` provide the shared view and calculations. The original Bengaluru helper remains a compatibility wrapper. `npm run prebuild` generates per-city HTML heads and Vercel routing from the registry; the production build prerenders each page and creates `sitemap.xml` plus `robots.txt`. City links are available on the homepage, in Settings and on each public page. The service worker recognizes only enabled public city URLs. Nine city pages are enabled. Additional cities require an explicit registry entry; visits calculate only the city in the URL.

## Responsive city layout

All public city pages share `CityPanchang.css`, scoped under `.city-page`. Below 768px the page retains the single column and bottom navigation. From 768px, Pancha Anga and daily timings sit side by side with compact top navigation; festivals and city links form the second row. From 1024px, spacing increases and the main/header containers remain capped at 1000px including 30px side padding (940px usable main content). The main app pages retain their existing layout. Date calculations, saved-city behavior, current-date updates and metadata are unchanged. Browser checks cover 320, 390, 767, 768, 820, 1023, 1024 and 1440px widths.
