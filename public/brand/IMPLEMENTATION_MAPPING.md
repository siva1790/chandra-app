# Chandra Logo System - Implementation Mapping

This is the file mapping used to wire the staged logo system into the live app.

## Asset Copy Plan

| Purpose | Staged source | Live destination | Notes |
|---|---|---|---|
| Browser fallback favicon | `public/brand/icons/favicon.ico` | `public/favicon.ico` | Contains 16, 32, and 48 px PNG entries. Good conventional fallback for crawlers/browsers. |
| SVG favicon | `public/brand/ui/chandra-mark-simplified.svg` | `public/favicon.svg` | Simplified vector mark for small browser/search contexts. |
| Google-safe PNG favicon | `public/brand/icons/favicon-48.png` | `public/icons/favicon-48.png` | 48x48, opaque, Google Search friendly. |
| High-density PNG favicon | `public/brand/icons/favicon-96.png` | `public/icons/favicon-96.png` | 96x96, opaque, multiple of 48. |
| Notification badge/icon fallback | `public/brand/icons/notification-icon-72.png` | `public/icons/icon-72.png` | Fixes existing `sw.js` reference to missing `/icons/icon-72.png`. Simplified for small notification contexts. |
| PWA/app icon 192 | `public/brand/icons/pwa-icon-192.png` | `public/icons/icon-192.png` | Full detailed logo for app install/top-bar contexts. |
| PWA/app icon 512 | `public/brand/icons/google-play-icon-512.png` | `public/icons/icon-512.png` | Full detailed logo for launcher/Play/PWA icon contexts. |
| Maskable icon 192 | `public/brand/icons/maskable-icon-192.png` | `public/icons/maskable-icon-192.png` | Simplified adaptive-safe icon with generous safe zone. |
| Maskable icon 512 | `public/brand/icons/maskable-icon-512.png` | `public/icons/maskable-icon-512.png` | Simplified adaptive-safe icon with generous safe zone. |
| App top bar mark | `public/brand/ui/chandra-mark-topbar-96.png` | `public/icons/chandra-mark-topbar-96.png` | Optional. Prefer this over `/icons/icon-192.png` in `App.jsx`/Settings UI if we want a tighter top-bar asset. |
| Wide social preview | `public/brand/social/chandra-og-wide-1200x630.png` | `public/og-share.png` | Recommended primary OG/Twitter image. Fully opaque, no transparent/white corner risk. |
| Square social preview | `public/brand/social/chandra-og-square-1200.png` | `public/og-share-square.png` | Optional square fallback/reference asset. Fully opaque. |
| Splash/loading artwork | `public/brand/ui/chandra-splash-1080x1920.png` | `public/icons/chandra-splash-1080x1920.png` | Optional for future splash/loading use. Not needed for current metadata wiring. |
| Horizontal lockup | `public/brand/ui/chandra-lockup-horizontal.png` | `public/icons/chandra-lockup-horizontal.png` | Optional for legal/about/share surfaces. Not needed for current top bar unless desired. |

## Reference Update Plan

| File | Current reference | Proposed reference |
|---|---|---|
| `index.html` | `<link rel="icon" type="image/png" href="/icons/icon-192.png" />` | Add `/favicon.ico`, `/favicon.svg`, `/icons/favicon-48.png`, `/icons/favicon-96.png`; stop using 192 app icon as the browser/search favicon. |
| `index.html` | `<link rel="apple-touch-icon" href="/icons/icon-192.png" />` | Keep `/icons/icon-192.png` after replacement, or use a new 180/192 Apple touch icon if generated later. |
| `index.html` | `og:image` -> `/og-share.png`, width/height `512` | Point `/og-share.png` to wide 1200x630 asset and update width/height to `1200`/`630`. |
| `index.html` | `twitter:card` -> `summary` | Use `summary_large_image` with the wide OG image. |
| `index.html` JSON-LD | No explicit logo/image | Add `image` and/or `logo` using `https://chandrapanchang.app/icons/icon-512.png` or add Organization JSON-LD. |
| `public/manifest.json` | `icon-192.png` reused for `any` and `maskable` | Use `icon-192.png`/`icon-512.png` for `any`; use `maskable-icon-192.png`/`maskable-icon-512.png` for `maskable`. |
| `src/App.jsx` | `/icons/icon-192.png` in top bar | Either keep after replacement or switch to `/icons/chandra-mark-topbar-96.png` for a cleaner top-bar mark. |
| `src/pages/Settings.jsx` | `/icons/icon-192.png` in notification preview UI | Keep after replacement or switch to top-bar mark for consistency. |
| `public/privacy.html` | favicon and header image use `/icons/icon-192.png` | Use new favicon links and either `/icons/icon-192.png` or `/icons/chandra-mark-topbar-96.png` for the page brand. |
| `src/sw.js` | `icon: /icons/icon-192.png`, `badge: /icons/icon-72.png` | Keep icon after replacement; add the missing `/icons/icon-72.png` from staged notification asset. |

## Validation Already Done

- `favicon-48.png` and `favicon-96.png` are fully opaque.
- `chandra-og-square-1200.png` and `chandra-og-wide-1200x630.png` are fully opaque.
- All tested social image corners are dark navy with alpha `255`, so they should avoid the previous WhatsApp white-corner issue.
- `favicon.ico` contains 3 images: 16, 32, and 48 px.

## Implementation Order

1. Copy staged assets to the live destinations above.
2. Generate `maskable-icon-192.png` from `maskable-icon-512.png`.
3. Update `index.html`, `manifest.json`, `App.jsx`, `Settings.jsx`, `privacy.html`, and confirm `sw.js` references now resolve.
4. Run `npm run build`.
5. Preview top bar, Settings preview, privacy page, and metadata files.
6. After deploy, use Google Search Console URL Inspection to request recrawl.
