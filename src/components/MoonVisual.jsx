const MoonVisual = ({ phase }) => {
  const size = 180
  const cx = size / 2
  const cy = size / 2
  const r = 80

  // phase: 0 = new moon, 0.5 = full moon, 1 = new moon again
  // Waxing (0–0.5): right side lit, grows from crescent to full
  // Waning (0.5–1): left side lit, shrinks from full to crescent

  const renderMoon = () => {
    // New moon
    if (phase < 0.02 || phase > 0.98) {
      return <circle cx={cx} cy={cy} r={r} fill="#1a1a2e" />
    }

    // Full moon
    if (phase >= 0.48 && phase <= 0.52) {
      return <circle cx={cx} cy={cy} r={r} fill="#f5e642" />
    }

    const isWaxing = phase < 0.5

    // Normalize t: 0 at new moon edge, 1 at full moon
    const t = isWaxing ? phase / 0.5 : (phase - 0.5) / 0.5

    // Terminator ellipse x-radius
    // At t=0 (crescent): rx ≈ r → wide ellipse covering the lit half → thin crescent
    // At t=1 (gibbous): rx ≈ 0 → flat → nearly full circle lit
    const rx = Math.max(0.5, r * Math.abs(Math.cos(t * Math.PI / 2)))

    // Sweep direction of terminator determines waxing vs waning
    const terminatorSweep = isWaxing ? 0 : 1
    const outerSweep = isWaxing ? 1 : 0

    const path = `
      M ${cx} ${cy - r}
      A ${r} ${r} 0 0 ${outerSweep} ${cx} ${cy + r}
      A ${rx.toFixed(4)} ${r} 0 0 ${terminatorSweep} ${cx} ${cy - r}
      Z
    `

    return <path d={path} fill="#f5e642" />
  }

  const phaseName = getPhaseName(phase)

  return (
    <div className="flex flex-col items-center gap-3">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Glow */}
        <circle cx={cx} cy={cy} r={r + 10} fill="rgba(245,230,66,0.04)" />
        {/* Dark base */}
        <circle cx={cx} cy={cy} r={r} fill="#1a1a2e" stroke="#2a2a3e" strokeWidth="1" />
        {/* Lit portion */}
        {renderMoon()}
        {/* Rim */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f5e642" strokeWidth="1.5" opacity="0.2" />
      </svg>
      <p className="text-yellow-300 text-lg font-semibold">{phaseName}</p>
    </div>
  )
}

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
