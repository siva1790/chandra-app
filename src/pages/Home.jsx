import { useEffect, useState } from 'react'
import * as Astronomy from 'astronomy-engine'
import MoonVisual from '../components/MoonVisual'
import { useSettings } from '../SettingsContext'
import { getSunriseForDate, getMoonPhaseAngle, getTithiFromAngle } from '../moonUtils'
import { getDatedFestivalsForDate, getMonthlyFestivalsForTithi } from '../festivals'
import { getEclipseForDate } from '../eclipseUtils'
import { EclipseIcon } from '../components/EclipseIcons'

const Home = ({ onNavigateToPanchang }) => {
  const { settings } = useSettings()
  const [moonData, setMoonData] = useState(null)
  const [location, setLocation] = useState({ lat: 12.9716, lon: 77.5946, city: 'Bengaluru' })
  const [loading, setLoading] = useState(true)
  const [todayHighlight, setTodayHighlight] = useState(null)

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
    const interval = setInterval(calculateMoonData, 60000)
    return () => clearInterval(interval)
  }, [location])

  const calculateMoonData = () => {
    try {
      const now = new Date()
      const observer = new Astronomy.Observer(location.lat, location.lon, 0)

      // Phase fraction for MoonVisual (0 = new, 0.5 = full, 1 = new again)
      const phaseAngle = Astronomy.MoonPhase(now)
      const phase = phaseAngle / 360

      // Illumination %
      const illum = Astronomy.Illumination('Moon', now)
      const illuminationPct = (illum.phase_fraction * 100).toFixed(1)

      // Moonrise / moonset from start of day
      const startOfDay = new Date(now)
      startOfDay.setHours(0, 0, 0, 0)
      let moonrise = null
      let moonset = null
      try { moonrise = Astronomy.SearchRiseSet('Moon', observer, +1, startOfDay, 2) } catch (_) {}
      try { moonset = Astronomy.SearchRiseSet('Moon', observer, -1, startOfDay, 2) } catch (_) {}

      // ── Today's highlight (festival or eclipse) ──────────────────
      // Use Drik Panchang convention: tithi at sunrise, but noon overrides if different
      const sunriseTime = getSunriseForDate(now, location.lat, location.lon)
      const sunriseTithi = getTithiFromAngle(getMoonPhaseAngle(sunriseTime))

      const noonTime = new Date(now)
      noonTime.setHours(12, 0, 0, 0)
      const noonTithi = getTithiFromAngle(getMoonPhaseAngle(noonTime))

      const effectiveTithi = sunriseTithi.adjustedNumber !== noonTithi.adjustedNumber
        ? noonTithi
        : sunriseTithi

      const dated = getDatedFestivalsForDate(now)
      const monthly = dated.length > 0
        ? []
        : getMonthlyFestivalsForTithi(effectiveTithi.adjustedNumber, effectiveTithi.paksha)
      const festivals = [...dated, ...monthly]
      const eclipse = getEclipseForDate(now)

      setTodayHighlight({ festivals, eclipse })

      setMoonData({
        phase,
        illuminationPct,
        moonrise: moonrise ? formatTime(moonrise.date) : 'N/A',
        moonset:  moonset  ? formatTime(moonset.date)  : 'N/A',
      })
      setLoading(false)
    } catch (err) {
      console.error('Moon calculation error:', err)
      setLoading(false)
    }
  }

  const formatTime = (date) =>
    date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })

  const today = new Date()
  const dateString = today.toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })

  return (
    <div className="min-h-screen px-4 py-6 pb-28 max-w-md mx-auto">

      {/* Header */}
      <div className="text-center mb-6">
        <p className="text-gray-300 text-sm font-medium">{dateString}</p>
        <p className="text-gray-500 text-xs mt-1">📍 {location.city}</p>
      </div>

      {loading ? (
        <div className="text-center text-gray-400 mt-20">
          <p className="text-4xl mb-4">🌙</p>
          <p>Calculating moon data...</p>
        </div>
      ) : moonData ? (
        <div className="flex flex-col gap-5">

          {/* Moon Visual Card — includes illumination + compact moonrise/moonset */}
          <div className="bg-gray-900 rounded-2xl p-6 flex flex-col items-center border border-gray-800">
            <MoonVisual phase={moonData.phase} />

            <p className="text-gray-400 text-sm mt-4">
              {moonData.illuminationPct}% illuminated
            </p>

            {/* Compact moonrise / moonset row */}
            <div className="flex items-center gap-8 mt-5 pt-4 border-t border-gray-800 w-full justify-center">
              <div className="text-center">
                <p className="text-gray-500 text-xs mb-1">🌙 Moonrise</p>
                <p className="text-white text-sm font-semibold">{moonData.moonrise}</p>
              </div>
              <div className="w-px h-8 bg-gray-700" />
              <div className="text-center">
                <p className="text-gray-500 text-xs mb-1">🌘 Moonset</p>
                <p className="text-white text-sm font-semibold">{moonData.moonset}</p>
              </div>
            </div>
          </div>

          {/* Today's Highlight Strip — festival or eclipse, taps to Panchang */}
          {todayHighlight && (todayHighlight.eclipse || todayHighlight.festivals.length > 0) && (
            <button
              onClick={() => onNavigateToPanchang?.(new Date())}
              className="w-full bg-gray-900 border border-yellow-900 rounded-2xl p-4 flex items-center gap-3 hover:border-yellow-600 active:bg-gray-800 transition-all text-left"
            >
              {todayHighlight.eclipse ? (
                <>
                  <EclipseIcon eclipse={todayHighlight.eclipse} size={30} />
                  <div className="flex-1 min-w-0">
                    <p className="text-yellow-300 text-xs uppercase tracking-widest mb-0.5">
                      Today's Highlight
                    </p>
                    <p className="text-indigo-200 font-semibold text-sm">
                      {todayHighlight.eclipse.hinduName}
                    </p>
                    <p className="text-gray-500 text-xs mt-0.5">Tap to view full Panchang →</p>
                  </div>
                </>
              ) : (
                <>
                  <span className="text-2xl flex-shrink-0">{todayHighlight.festivals[0].emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-yellow-300 text-xs uppercase tracking-widest mb-0.5">
                      Today's Highlight
                    </p>
                    <p className="text-white font-semibold text-sm truncate">
                      {todayHighlight.festivals[0].name}
                    </p>
                    {todayHighlight.festivals.length > 1 ? (
                      <p className="text-gray-500 text-xs mt-0.5">
                        +{todayHighlight.festivals.length - 1} more · Tap for full Panchang →
                      </p>
                    ) : (
                      <p className="text-gray-500 text-xs mt-0.5">Tap to view full Panchang →</p>
                    )}
                  </div>
                </>
              )}
            </button>
          )}

        </div>
      ) : (
        <p className="text-center text-red-400">Could not load moon data. Please refresh.</p>
      )}
    </div>
  )
}

export default Home
