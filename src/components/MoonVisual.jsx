const MoonVisual = ({ phase }) => {
  const size = 180
  const cx = size / 2
  const cy = size / 2
  const r = 80

  // phase: 0 = new moon, 0.5 = full moon, 1 = new moon again
  const isWaxing = phase <= 0.5
  const normalizedPhase = isWaxing ? phase * 2 : (phase - 0.5) * 2

  const terminatorX = r - normalizedPhase * 2 * r

  const leftArcSweep = isWaxing ? 1 : 0
  const rightArcSweep = 1

  const d = `
    M ${cx} ${cy - r}
    A ${r} ${r} 0 0 ${rightArcSweep} ${cx} ${cy + r}
    A ${Math.abs(terminatorX)} ${r} 0 0 ${leftArcSweep} ${cx} ${cy - r}
  `

  const phaseName = getPhaseName(phase)

  return (
    <div className="flex flex-col items-center gap-3">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Dark moon background */}
        <circle cx={cx} cy={cy} r={r} fill="#1a1a2e" stroke="#444" strokeWidth="1" />
        {/* Lit portion */}
        {phase > 0.01 && phase < 0.99 && (
          <path d={d} fill="#f5e642" opacity="0.95" />
        )}
        {/* Full moon */}
        {phase >= 0.99 || phase <= 0.01 ? (
          <circle
            cx={cx} cy={cy} r={r}
            fill={phase >= 0.99 ? "#f5e642" : "#1a1a2e"}
            stroke="#444" strokeWidth="1"
          />
        ) : null}
        {/* Glow effect */}
        <circle cx={cx} cy={cy} r={r} fill="none"
          stroke="#f5e642" strokeWidth="2" opacity="0.3" />
      </svg>
      <p className="text-yellow-300 text-lg font-semibold">{phaseName}</p>
    </div>
  )
}

const getPhaseName = (phase) => {
  if (phase < 0.03 || phase > 0.97) return "🌑 Amavasya (New Moon)"
  if (phase < 0.22) return "🌒 Waxing Crescent"
  if (phase < 0.28) return "🌓 First Quarter"
  if (phase < 0.47) return "🌔 Waxing Gibbous"
  if (phase < 0.53) return "🌕 Purnima (Full Moon)"
  if (phase < 0.72) return "🌖 Waning Gibbous"
  if (phase < 0.78) return "🌗 Last Quarter"
  return "🌘 Waning Crescent"
}

export default MoonVisual