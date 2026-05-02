/**
 * MoonVisual — renders a textured SVG moon for any phase (0–1).
 *
 * Approach (shadow-overlay):
 *   1. Draw the full lit disc (radial gradient, gold-white).
 *   2. Overlay lunar maria (dark ellipses at real approximate positions).
 *   3. Draw a dark shadow "lune" shape on top to cover the unlit portion.
 *      The shadow path = one semicircle arc + one terminator ellipse arc.
 *   4. The craters/maria in the lit zone remain visible; those under the
 *      shadow are automatically hidden — no clip-path juggling needed.
 *
 * This gives a unique, correct image for all 30 Hindu tithis (and any
 * intermediate phase) without the terminator-formula bugs of the old approach.
 *
 * phase prop:  0 = Amavasya (new moon)
 *             0.5 = Purnima (full moon)
 *               1 = Amavasya again
 */

const SIZE = 200
const CX   = SIZE / 2   // 100
const CY   = SIZE / 2   // 100
const R    = 82

/**
 * Approximate positions of real lunar mare as seen from Earth (North up,
 * East = right).  All coordinates are fractions of the moon radius R.
 *   x > 0 → right (east),  y > 0 → down (south)
 */
const MARIA = [
  { x: -0.22, y: -0.20, rx: 0.22, ry: 0.18, o: 0.23 }, // Mare Tranquillitatis
  { x: -0.10, y: -0.38, rx: 0.18, ry: 0.14, o: 0.20 }, // Mare Serenitatis
  { x:  0.48, y: -0.24, rx: 0.13, ry: 0.10, o: 0.25 }, // Mare Crisium  (east edge)
  { x: -0.34, y:  0.06, rx: 0.26, ry: 0.22, o: 0.17 }, // Oceanus Procellarum
  { x: -0.08, y:  0.35, rx: 0.13, ry: 0.10, o: 0.17 }, // Mare Nubium
  { x:  0.18, y: -0.08, rx: 0.09, ry: 0.08, o: 0.15 }, // Copernicus region
  { x:  0.05, y: -0.56, rx: 0.16, ry: 0.09, o: 0.17 }, // Mare Frigoris (north)
  { x:  0.38, y:  0.22, rx: 0.12, ry: 0.09, o: 0.15 }, // Mare Fecunditatis
  { x: -0.08, y:  0.52, rx: 0.10, ry: 0.08, o: 0.14 }, // Southern highlands
  { x:  0.12, y:  0.10, rx: 0.07, ry: 0.06, o: 0.12 }, // Mare Vaporum (small)
]

/**
 * Build the SVG path string for the dark shadow that covers the unlit half.
 *
 * The shadow is a "lune":
 *   – one semicircle arc along the outer edge of the dark side, and
 *   – one terminator ellipse arc to close the shape.
 *
 * Key insight: cos(phase × 2π) gives us the signed terminator position.
 *   +R → terminator at right edge (new moon: shadow covers everything)
 *    0 → terminator in centre    (quarter moon: exactly half dark)
 *   −R → terminator at left edge (full moon: no shadow)
 *
 * For waxing (phase 0→0.5): shadow is on the LEFT.
 * For waning (phase 0.5→1): shadow is on the RIGHT.
 *
 * The sweep flags for the terminator arc flip at the quarter-moon boundary
 * (phase 0.25 / 0.75) to switch between "crescent" and "gibbous" shadow shape.
 */
const shadowPath = (phase) => {
  const isNewMoon  = phase < 0.02 || phase > 0.98
  const isFullMoon = phase > 0.48 && phase < 0.52
  if (isNewMoon || isFullMoon) return null

  const termCos   = Math.cos(phase * 2 * Math.PI)
  const rx        = Math.max(1, Math.abs(termCos) * R)   // never exactly 0
  const isWaxing  = phase < 0.5
  const isGibbous = (isWaxing && phase > 0.25) || (!isWaxing && phase < 0.75)

  // Outer arc: semicircle on the SHADOW side
  //   waxing → shadow on left  → counterclockwise (sweep 0) = left arc
  //   waning → shadow on right → clockwise        (sweep 1) = right arc
  const outerSweep = isWaxing ? 0 : 1

  // Terminator arc: closes the shadow lune back to the top of the disc.
  //   Crescent  → terminator bulges INTO the lit side  → sweeps toward lit
  //   Gibbous   → terminator is a shallow curve on the shadow side
  //
  //   waxing crescent:  sweep 1 (clockwise   = right side of ellipse)
  //   waxing gibbous:   sweep 0 (counter     = left  side of ellipse)
  //   waning gibbous:   sweep 1
  //   waning crescent:  sweep 0
  let terminatorSweep
  if (isWaxing) terminatorSweep = isGibbous ? 1 : 0
  else          terminatorSweep = isGibbous ? 0 : 1

  return (
    `M ${CX} ${CY - R} ` +
    `A ${R} ${R} 0 0 ${outerSweep} ${CX} ${CY + R} ` +
    `A ${rx.toFixed(2)} ${R} 0 0 ${terminatorSweep} ${CX} ${CY - R} Z`
  )
}

const MoonVisual = ({ phase }) => {
  const isNewMoon  = phase < 0.02 || phase > 0.98
  const isFullMoon = phase > 0.48 && phase < 0.52
  const shadow     = shadowPath(phase)

  // Glow opacity scales with how close we are to full moon
  const glowOpacity = isFullMoon
    ? 0.10
    : Math.max(0, 0.05 - Math.abs(phase - 0.5) * 0.3)

  return (
    <div className="flex flex-col items-center gap-3">
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/*
           * Lit surface — off-centre radial gradient gives a 3-D sphere feel.
           * Bright near the upper-left "sun-point", deep gold at the limb.
           */}
          <radialGradient
            id="chandra-lit"
            cx={CX * 0.82} cy={CY * 0.72}
            r={R * 1.25}
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%"   stopColor="#fffef5" />
            <stop offset="25%"  stopColor="#fdf0a0" />
            <stop offset="60%"  stopColor="#d9a81c" />
            <stop offset="90%"  stopColor="#9a7010" />
            <stop offset="100%" stopColor="#6b4c08" />
          </radialGradient>

          {/*
           * Shadow fill — deep blue-black with a subtly lighter limb to
           * hint at earthshine (the faint glow visible on the dark side
           * of a crescent moon, lit by light reflected off Earth).
           */}
          <radialGradient
            id="chandra-shadow"
            cx={CX} cy={CY}
            r={R}
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%"   stopColor="#0b1420" stopOpacity="0.97" />
            <stop offset="75%"  stopColor="#0d1828" stopOpacity="1.00" />
            <stop offset="100%" stopColor="#1b2f46" stopOpacity="0.94" />
          </radialGradient>

          {/* Clip everything to the circular disc */}
          <clipPath id="chandra-disc">
            <circle cx={CX} cy={CY} r={R} />
          </clipPath>
        </defs>

        {/* ── Outer glow ── */}
        {!isNewMoon && glowOpacity > 0 && (
          <>
            <circle cx={CX} cy={CY} r={R + 18} fill={`rgba(255,240,90,${(glowOpacity * 0.5).toFixed(3)})`} />
            <circle cx={CX} cy={CY} r={R +  9} fill={`rgba(255,240,90,${glowOpacity.toFixed(3)})`} />
          </>
        )}

        {/* ── Everything inside the moon disc ── */}
        <g clipPath="url(#chandra-disc)">

          {/* 1. Always-dark base (new moon shows only this) */}
          <circle cx={CX} cy={CY} r={R} fill="#0b1420" />

          {/* 2. Full lit surface — the shadow will cover the dark portion */}
          {!isNewMoon && (
            <circle cx={CX} cy={CY} r={R} fill="url(#chandra-lit)" />
          )}

          {/* 3. Lunar maria — dark ellipses at approximate real positions */}
          {!isNewMoon && MARIA.map((m, i) => (
            <ellipse
              key={i}
              cx={CX + m.x * R}
              cy={CY + m.y * R}
              rx={m.rx * R}
              ry={m.ry * R}
              fill={`rgba(50, 32, 0, ${m.o})`}
            />
          ))}

          {/* 4. Shadow overlay — covers the unlit lune */}
          {shadow && (
            <path d={shadow} fill="url(#chandra-shadow)" />
          )}

        </g>

        {/* ── Subtle rim line ── */}
        <circle
          cx={CX} cy={CY} r={R}
          fill="none"
          stroke="rgba(255,235,140,0.18)"
          strokeWidth="1.5"
        />
      </svg>

      <p className="text-yellow-300 text-lg font-semibold">
        {getPhaseName(phase)}
      </p>
    </div>
  )
}

/**
 * Human-readable phase name with emoji.
 * Boundaries are aligned to the 30-tithi system (each tithi ≈ 12° = 1/30).
 */
const getPhaseName = (phase) => {
  if (phase < 0.02 || phase > 0.98) return '🌑 Amavasya (New Moon)'
  if (phase < 0.27) return '🌒 Waxing Crescent'
  if (phase < 0.30) return '🌓 First Quarter'
  if (phase < 0.48) return '🌔 Waxing Gibbous'
  if (phase < 0.52) return '🌕 Purnima (Full Moon)'
  if (phase < 0.73) return '🌖 Waning Gibbous'
  if (phase < 0.76) return '🌗 Last Quarter'
  if (phase < 0.98) return '🌘 Waning Crescent'
  return '🌑 Amavasya (New Moon)'
}

export default MoonVisual
