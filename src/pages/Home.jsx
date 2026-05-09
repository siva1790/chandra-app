import { useEffect, useState, useRef } from 'react'
import * as Astronomy from 'astronomy-engine'
import MoonVisual from '../components/MoonVisual'
import DateStrip from '../components/DateStrip'
import { useSettings } from '../SettingsContext'
import { getSunriseForDate, getMoonPhaseAngle, getTithiFromAngle } from '../moonUtils'
import { getDatedFestivalsForDate, getMonthlyFestivalsForTithi } from '../festivals'
import { getEclipseForDate } from '../eclipseUtils'
import { EclipseIcon } from '../components/EclipseIcons'
import { MapPin } from 'lucide-react'

const Home = ({ date = new Date(), onDateChange, onNavigateToPanchang }) => {
  const { settings } = useSettings()
  const [moonData, setMoonData] = useState(null)
  const [location, setLocation] = useState({ lat: 12.9716, lon: 77.5946, city: 'Bengaluru' })
  const [loading, setLoading] = useState(true)
  const [dayHighlight, setDayHighlight] = useState(null)
  const touchStartX = useRef(null)
  const touchStartY = useRef(null)

  useEffect(() => {
    if (settings?.lat && settings?.lon) {
      setLocation({ lat: settings.lat, lon: settings.lon, city: settings.city })
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation(prev => ({
            ...prev,
            lat: pos.coords.latitude,
            lon: pos.coords.longitude
          }))
        },
        () => {}
      )
    }
  }, [settings])

  useEffect(() => {
    calculateMoonData()
    // Auto-refresh only when viewing today (live data)
    const isToday = date.toDateString() === new Date().toDateString()
    if (isToday) {
      const interval = setInterval(calculateMoonData, 60000)
      return () => clearInterval(interval)
    }
  }, [location, date])

  // Swipe handlers for the moon card
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return
    const deltaX = e.changedTouches[0].clientX - touchStartX.current
    const deltaY = e.changedTouches[0].clientY - touchStartY.current
    if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY)) {
      const d = new Date(date)
      d.setDate(d.getDate() + (deltaX < 0 ? 1 : -1))
      onDateChange?.(d)
    }
    touchStartX.current = null
  }

  const calculateMoonData = () => {
    try {
      const observer = new Astronomy.Observer(location.lat, location.lon, 0)

      // Phase fraction for MoonVisual (0 = new, 0.5 = full, 1 = new again)
      const phaseAngle = Astronomy.MoonPhase(date)
      const phase = phaseAngle / 360

      // Illumination %
      const illum = Astronomy.Illumination('Moon', date)
      const illuminationPct = (illum.phase_fraction * 100).toFixed(1)

      // Moonrise / moonset from start of selected day
      const startOfDay = new Date(date)
      startOfDay.setHours(0, 0, 0, 0)
      let moonrise = null
      let moonset = null
      try { moonrise = Astronomy.SearchRiseSet('Moon', observer, +1, startOfDay, 2) } catch (_) {}
      try { moonset = Astronomy.SearchRiseSet('Moon', observer, -1, startOfDay, 2) } catch (_) {}

      // ── Day's highlight (festival or eclipse) ──────────────────
      // Use Drik Panchang convention: tithi at sunrise, but noon overrides if different
      const sunriseTime = getSunriseForDate(date, location.lat, location.lon)
      const sunriseTithi = getTithiFromAngle(getMoonPhaseAngle(sunriseTime))

      const noonTime = new Date(date)
      noonTime.setHours(12, 0, 0, 0)
      const noonTithi = getTithiFromAngle(getMoonPhaseAngle(noonTime))

      const effectiveTithi = sunriseTithi.adjustedNumber !== noonTithi.adjustedNumber
        ? noonTithi
        : sunriseTithi

      const dated = getDatedFestivalsForDate(date)
      const monthly = dated.length > 0
        ? []
        : getMonthlyFestivalsForTithi(effectiveTithi.adjustedNumber, effectiveTithi.paksha)
      const festivals = [...dated, ...monthly]
      const eclipse = getEclipseForDate(date)

      setDayHighlight({ festivals, eclipse, tithi: effectiveTithi })

      setMoonData({
        phase,
        illuminationPct,
        moonriseDate: moonrise?.date ?? null,
        moonsetDate:  moonset?.date  ?? null,
      })
      setLoading(false)
    } catch (err) {
      console.error('Moon calculation error:', err)
      setLoading(false)
    }
  }

  const formatTime = (date) =>
    date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })

  const formatShortDate = (date) =>
    date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })

  const isToday = date.toDateString() === new Date().toDateString()

  return (
    <div className="min-h-screen px-4 py-6 pb-28 max-w-md mx-auto">

      {/* Header */}
      <div className="text-center mb-4">
        <p className="text-gray-500 text-xs mt-1 flex items-center justify-center gap-1">
          <MapPin size={12} aria-hidden="true" /> {location.city}
        </p>
      </div>

      {/* Date Navigator */}
      <DateStrip date={date} onDateChange={onDateChange} mode="day" />

      {loading ? (
        <div aria-live="polite" aria-busy="true" className="text-center text-gray-400 mt-20">
          <p className="text-4xl mb-4" aria-hidden="true">🌙</p>
          <p>Calculating moon data...</p>
        </div>
      ) : moonData ? (
        <div className="flex flex-col gap-5">

          {/* Moon Visual Card — swipe left/right to change date */}
          <div
            className="bg-gray-900 rounded-2xl p-6 flex flex-col items-center border border-gray-800"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <MoonVisual phase={moonData.phase} />

            <p className="text-gray-400 text-sm mt-4">
              {moonData.illuminationPct}% illuminated
            </p>

            {/* Compact moonrise / moonset row */}
            <div className="flex items-center gap-8 mt-5 pt-4 border-t border-gray-800 w-full justify-center">
              <div className="text-center">
                <p className="text-gray-400 text-xs mb-1"><span role="img" aria-label="Moon">🌙</span> Moonrise</p>
                <p className="text-white text-sm font-semibold">
                  {moonData.moonriseDate ? formatTime(moonData.moonriseDate) : 'N/A'}
                </p>
                {moonData.moonriseDate && (
                  <p className="text-gray-500 text-xs mt-0.5">{formatShortDate(moonData.moonriseDate)}</p>
                )}
              </div>
              <div className="w-px h-10 bg-gray-700" />
              <div className="text-center">
                <p className="text-gray-400 text-xs mb-1"><span role="img" aria-label="Waning crescent moon">🌘</span> Moonset</p>
                <p className="text-white text-sm font-semibold">
                  {moonData.moonsetDate ? formatTime(moonData.moonsetDate) : 'N/A'}
                </p>
                {moonData.moonsetDate && (
                  <p className="text-gray-500 text-xs mt-0.5">{formatShortDate(moonData.moonsetDate)}</p>
                )}
              </div>
            </div>
          </div>

          {/* Day Highlight Strip — always visible once data loads; taps to Panchang */}
          {dayHighlight && (
            <button
              onClick={() => onNavigateToPanchang?.(date)}
              className="w-full bg-gray-900 border border-yellow-900 rounded-2xl p-4 flex items-center gap-3 hover:border-yellow-600 active:bg-gray-800 transition-all text-left"
            >
              {dayHighlight.eclipse ? (
                /* ── Eclipse day ── */
                <>
                  <EclipseIcon eclipse={dayHighlight.eclipse} size={30} />
                  <div className="flex-1 min-w-0">
                    <p className="text-yellow-300 text-xs uppercase tracking-widest mb-0.5">{isToday ? "Today's Highlight" : "Day's Highlight"}</p>
                    <p className="text-indigo-200 font-semibold text-sm">{dayHighlight.eclipse.hinduName}</p>
                    <p className="text-gray-500 text-xs mt-0.5">Tap to view full Panchang →</p>
                  </div>
                </>
              ) : dayHighlight.festivals.length > 0 ? (
                /* ── Festival day ── */
                <>
                  <span className="text-2xl flex-shrink-0">{dayHighlight.festivals[0].emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-yellow-300 text-xs uppercase tracking-widest mb-0.5">{isToday ? "Today's Highlight" : "Day's Highlight"}</p>
                    <p className="text-white font-semibold text-sm truncate">{dayHighlight.festivals[0].name}</p>
                    {dayHighlight.festivals.length > 1 ? (
                      <p className="text-gray-500 text-xs mt-0.5">+{dayHighlight.festivals.length - 1} more · Tap for full Panchang →</p>
                    ) : (
                      <p className="text-gray-500 text-xs mt-0.5">Tap to view full Panchang →</p>
                    )}
                  </div>
                </>
              ) : (
                /* ── Plain day — show tithi as highlight ── */
                <>
                  <span className="text-2xl flex-shrink-0" role="img" aria-label="Moon">🌙</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-yellow-300 text-xs uppercase tracking-widest mb-0.5">{isToday ? "Today's Tithi" : "Day's Tithi"}</p>
                    <p className="text-white font-semibold text-sm">{dayHighlight.tithi.name}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{dayHighlight.tithi.paksha} · Tap for full Panchang →</p>
                  </div>
                </>
              )}
            </button>
          )}

        </div>
      ) : (
        <p role="alert" className="text-center text-red-400">Could not load moon data. Please refresh.</p>
      )}
    </div>
  )
}

export default Home
