/**
 * EclipseIcons — SVG icons for lunar and solar eclipses.
 *
 * LunarEclipseIcon  — blood moon: dark reddish disc with a thin bright limb arc
 * SolarEclipseIcon  — corona:     dark centre disc with gold corona rays
 *
 * Both accept a `size` prop (default 18). No gradient IDs are used,
 * avoiding duplicate-ID issues when multiple icons appear on the same page.
 */

// ── Precomputed ray endpoints for the 8-ray solar corona ─────────
// viewBox 0 0 24 24, centre (12,12), inner r=8.5, outer r=11.5
const CORONA_RAYS = [
  // [x1, y1, x2, y2]  (angle °, clockwise from right)
  [20.5, 12.0,  23.5, 12.0],   //   0°
  [18.0, 18.0,  20.1, 20.1],   //  45°
  [12.0, 20.5,  12.0, 23.5],   //  90°
  [ 6.0, 18.0,   3.9, 20.1],   // 135°
  [ 3.5, 12.0,   0.5, 12.0],   // 180°
  [ 6.0,  6.0,   3.9,  3.9],   // 225°
  [12.0,  3.5,  12.0,  0.5],   // 270°
  [18.0,  6.0,  20.1,  3.9],   // 315°
]

// ─────────────────────────────────────────────────────────────────
// Lunar Eclipse Icon — blood moon
// A dark maroon disc with a thin orange-red rim and a small
// bright arc on the upper-left limb, representing the barely-lit
// edge of the moon during a total/partial eclipse.
// ─────────────────────────────────────────────────────────────────
export const LunarEclipseIcon = ({ size = 18 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    aria-label="Lunar eclipse"
  >
    {/* Blood moon disc */}
    <circle cx="12" cy="12" r="10.5" fill="#6b1010" />

    {/* Mid-tone ring — gives slight sphere depth */}
    <circle
      cx="12" cy="12" r="10.5"
      fill="none"
      stroke="#9b2020"
      strokeWidth="1.5"
    />

    {/* Bright limb arc — upper-left edge, the tiny lit sliver */}
    <path
      d="M 5.5 5.5 A 10.5 10.5 0 0 1 12 1.5"
      fill="none"
      stroke="#ff7043"
      strokeWidth="2"
      strokeLinecap="round"
    />

    {/* Subtle dark shadow overlay on the right ~55% — deepens the umbra side */}
    <path
      d="M 12 1.5 A 10.5 10.5 0 0 1 12 22.5 A 5 5 0 0 0 12 1.5 Z"
      fill="#1a0000"
      opacity="0.55"
    />
  </svg>
)

// ─────────────────────────────────────────────────────────────────
// Solar Eclipse Icon — corona
// A dark centre disc (the moon blocking the sun) surrounded by
// 8 short golden rays representing the solar corona.
// ─────────────────────────────────────────────────────────────────
export const SolarEclipseIcon = ({ size = 18 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    aria-label="Solar eclipse"
  >
    {/* Soft outer glow */}
    <circle cx="12" cy="12" r="11.5" fill="#fbbf24" opacity="0.12" />

    {/* Corona rays */}
    {CORONA_RAYS.map(([x1, y1, x2, y2], i) => (
      <line
        key={i}
        x1={x1} y1={y1} x2={x2} y2={y2}
        stroke="#fbbf24"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    ))}

    {/* Dark moon disc covering the sun */}
    <circle cx="12" cy="12" r="7.5" fill="#111827" />

    {/* Thin gold corona rim around the disc */}
    <circle
      cx="12" cy="12" r="7.5"
      fill="none"
      stroke="#f59e0b"
      strokeWidth="0.8"
      opacity="0.7"
    />
  </svg>
)

// ─────────────────────────────────────────────────────────────────
// EclipseIcon — convenience wrapper: picks the right icon by type
// ─────────────────────────────────────────────────────────────────
export const EclipseIcon = ({ eclipse, size = 18 }) => {
  if (!eclipse) return null
  return eclipse.type === 'lunar'
    ? <LunarEclipseIcon size={size} />
    : <SolarEclipseIcon size={size} />
}
