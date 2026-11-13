# Corner radius system

The values in `public/radius-tokens.css` are the single source of truth for the
app, public city pages, Privacy and the design guide. The app and city HTML heads
load that stylesheet; the city-page preparation script copies the shared head.

| Purpose | CSS token / Tailwind utility | Value |
| --- | --- | --- |
| Square icon hit area | `--radius-icon` / `rounded-icon` | 8px |
| Button, input, select, navigation item | `--radius-control` / `rounded-control` | 12px |
| Nested content, date cell, dropdown | `--radius-inset` / `rounded-inset` | 12px |
| Card, accordion shell, standalone event or status panel | `--radius-card` / `rounded-card` | 16px |
| Dialog / sheet | `--radius-dialog` / `rounded-dialog` | 24px |
| Chip, tag, toggle track or thumb | `--radius-pill` / `rounded-pill` | 9999px |
| Explicit circular element | `--radius-circle` / `rounded-circle` | 50% |

Keep these values unchanged at every breakpoint. Mobile sheets use
`rounded-t-dialog` (24px top corners, square bottom corners); centered dialogs use
24px on all corners. Flat list rows inside a card stay square and inherit clipping
from their container. Decorative dots, festival markers and toggle geometry may
use the pill/circle tokens. Logos are not ordinary form controls.

Use the shared Button, Input, Card, Chip and BottomSheet components where their
behavior fits. Button exposes `shape="control|icon|pill|circle"`; do not append a
second radius class to override it. A clickable card uses the card radius rather
than the ordinary button radius. Hover, selected, disabled and keyboard-focus
states retain the same shape.

Run `npm run check:radii` before review. It rejects generic Tailwind radius
utilities, arbitrary numeric radii in UI styles, and inline JSX radii. The command
also runs before ESLint through `npm run lint` and before every production build.
Add new values only by revising
this policy and the central tokens, not through a page-specific exception.

Review at 320, 390, 767, 768, 800, 1023, 1024 and 1440px. Include the date picker,
month/year picker, Calendar event list/day dialog, Settings city suggestions and
validation/profile states. Check equal-height Settings pairs at tablet/desktop,
Panchang column sizing, dialog clipping and horizontal overflow. Subscription and
push interfaces remain feature-disabled; style their source without enabling them.
