const MoonVisual = ({ phase }) => {
  const size = 180
  const cx = size / 2
  const cy = size / 2
  const r = 80

  // phase: 0 = new moon, 0.5 = full moon, 1 = new moon again
  // We need to draw the illuminated portion correctly:
  // Waxing (0 to 0.5): right side lit, crescent grows to full
  // Waning (0.5 to 1): left side lit, full shrinks to crescent

  const getMoonPath = () => {
    if (phase <= 0.01 || phase >= 0.99) return null // new moon — no lit path
    if (phase >= 0.49 && phase <= 0.51) return 'full' // full moon

    const isWaxing = phase < 0.5

    // How far through the half-cycle are we (0 to 1)
    const halfPhase = isWaxing ? phase * 2 : (phase - 0.5) * 2

    // The terminator ellipse x-radius
    // At halfPhase=0: terminator is at full width (crescent)
    // At halfPhase=1: terminator is at 0 (full)
    const terminatorRx = Math.abs(r * Math.cos(halfPhase * Math.PI))

    if (isWaxing) {
      // Waxing: right half always lit, left half defined by terminator
      // Draw right semicircle + terminator ellipse (curving left = dark side)
      return `
        M ${cx} ${cy - r}
        A ${r} ${r} 0 0 1 ${cx} ${cy + r}
        A ${terminatorRx} ${r} 0 0 0 ${cx} ${cy - r}
        Z
      `
    } else {
      // Waning: left half always lit, right half defined by terminator
      return `
        M ${cx} ${cy - r}
        A ${r} ${r} 0 0 0 ${cx} ${cy + r}
        A ${terminatorRx} ${r} 0 0 1 ${cx} ${cy - r}
        Z
      `
    }
  }

  const moonPath = getMoonPath()
  const phaseName = getPhaseName(phase)

  return (
    <div className="flex flex-col items-center gap-3">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Outer glow */}
        <circle cx={cx} cy={cy} r={r + 8} fill="rgba(245,230,66,0.05)" />

        {/* Dark moon base */}
        <circle cx={cx} cy={cy} r={r} fill="#1a1a2e" stroke="#333" strokeWidth="1" />

        {/* Lit portion */}
        {moonPath === 'full' ? (
          <circle cx={cx} cy={cy} r={r} fill="#f5e642" />
        ) : moonPath ? (
          <path d={moonPath} fill="#f5e642" />
        ) : null}

        {/* Subtle rim */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke="#f5e642"
          strokeWidth="1.5"
          opacity="0.25"
        />
      </svg>
      <p className="text-yellow-300 text-lg font-semibold">{phaseName}</p>
    </div>
  )
}

const getPhaseName = (phase) => {
  if (phase < 0.03 || phase > 0.97) return '🌑 Amavasya (New Moon)'
  if (phase < 0.10) return '🌒 Waxing Crescent'
  if (phase < 0.23) return '🌒 Waxing Crescent'
  if (phase < 0.27) return '🌓 First Quarter'
  if (phase < 0.47) return '🌔 Waxing Gibbous'
  if (phase < 0.53) return '🌕 Purnima (Full Moon)'
  if (phase < 0.73) return '🌖 Waning Gibbous'
  if (phase < 0.77) return '🌗 Last Quarter'
  if (phase < 0.97) return '🌘 Waning Crescent'
  return '🌑 Amavasya (New Moon)'
}

export default MoonVisual
