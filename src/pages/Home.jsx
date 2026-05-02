import { useEffect, useState } from 'react'
import * as Astronomy from 'astronomy-engine'
import MoonVisual from '../components/MoonVisual'
import { useSettings } from '../SettingsContext'
import { getSunriseForDate } from '../moonUtils'

const Home = () => {
  const { settings } = useSettings()
  const [moonData, setMoonData] = useState(null)
  const [location, setLocation] = useState({ lat: 12.9716, lon: 77.5946, city: 'Bengaluru' })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (settings?.lat && settings?.lon) {
      setLocation({
        lat: settings.lat,
        lon: settings.lon,
        city: settings.city
      })
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
    const interval = setInterval(() => {
      calculateMoonData()
    }, 60000)
    return () => clearInterval(interval)
  }, [location])

  const calculateMoonData = () => {
    try {
      const now = new Date()
      const observer = new Astronomy.Observer(location.lat, location.lon, 0)

      // Moon phase angle (0–360 degrees)
      const phaseAngle = Astronomy.MoonPhase(now)

      // FIX: phase fraction for MoonVisual
      // 0 = new moon, 0.5 = full moon, 1 = new moon again
      // MoonPhase returns 0–360 where 0/360=new, 180=full
      const phase = phaseAngle / 360

      // Illumination percentage
      const illum = Astronomy.Illumination('Moon', now)
      const illuminationPct = (illum.phase_fraction * 100).toFixed(1)
      // FIX: Moonrise — search from start of current day to catch rise
      // that may have already passed or is upcoming
      const startOfDay = new Date(now)
      startOfDay.setHours(0, 0, 0, 0)

      let moonrise = null
      let moonset = null

      // Search moonrise from start of day forward (up to 2 days)
      try {
        moonrise = Astronomy.SearchRiseSet('Moon', observer, +1, startOfDay, 2)
      } catch (e) { moonrise = null }

      // Search moonset from start of day forward (up to 2 days)
      try {
        moonset = Astronomy.SearchRiseSet('Moon', observer, -1, startOfDay, 2)
      } catch (e) { moonset = null }

      // Tithi calculation — sample at LOCAL SUNRISE per Drik Panchang convention.
      // (Visual + illumination above stay at `now` so they animate through the day.)
      const sunriseTime = getSunriseForDate(now, location.lat, location.lon)
      const tithiPhaseAngle = Astronomy.MoonPhase(sunriseTime)
      const tithi = getTithi(tithiPhaseAngle)

      setMoonData({
        phase,
        phaseAngle,
        illuminationPct,
        moonrise: moonrise ? formatTime(moonrise.date) : 'N/A',
        moonset: moonset ? formatTime(moonset.date) : 'N/A',
        tithi,
      })
      setLoading(false)
    } catch (err) {
      console.error('Moon calculation error:', err)
      setLoading(false)
    }
  }

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  const getTithi = (phaseAngle) => {
    const tithiNumber = Math.floor(phaseAngle / 12) + 1
    const tithiNames = [
      'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami',
      'Shashthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami',
      'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi', 'Purnima',
      'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami',
      'Shashthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami',
      'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi', 'Amavasya'
    ]
    const paksha = tithiNumber <= 15 ? 'Shukla Paksha ☀️' : 'Krishna Paksha 🌑'
    const name = tithiNames[Math.min(tithiNumber - 1, 29)]
    return { number: tithiNumber, name, paksha }
  }

  const today = new Date()
  const dateString = today.toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })

  return (
    <div className="min-h-screen px-4 py-8 max-w-md mx-auto">

      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-yellow-300 mb-1">🌙 Chandra</h1>
        <p className="text-gray-400 text-sm">{dateString}</p>
        <p className="text-gray-500 text-xs mt-1">📍 {location.city}</p>
      </div>

      {loading ? (
        <div className="text-center text-gray-400 mt-20">
          <p className="text-4xl mb-4">🌙</p>
          <p>Calculating moon data...</p>
        </div>
      ) : moonData ? (
        <div className="flex flex-col gap-6">

          {/* Moon Visual */}
          <div className="bg-gray-900 rounded-2xl p-6 flex flex-col items-center border border-gray-800">
            <MoonVisual phase={moonData.phase} />
            <p className="text-gray-400 text-sm mt-4">
              {moonData.illuminationPct}% illuminated
            </p>
          </div>

          {/* Tithi Card */}
          <div className="bg-gray-900 rounded-2xl p-5 border border-yellow-900">
            <p className="text-yellow-500 text-xs uppercase tracking-widest mb-2">
              Today's Tithi
            </p>
            <p className="text-white text-2xl font-bold">{moonData.tithi.name}</p>
            <p className="text-gray-400 text-sm mt-1">{moonData.tithi.paksha}</p>
          </div>

          {/* Moonrise / Moonset */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800 text-center">
              <p className="text-gray-400 text-xs uppercase tracking-widest mb-2">
                🌙 Moonrise
              </p>
              <p className="text-white text-xl font-semibold">{moonData.moonrise}</p>
            </div>
            <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800 text-center">
              <p className="text-gray-400 text-xs uppercase tracking-widest mb-2">
                🌘 Moonset
              </p>
              <p className="text-white text-xl font-semibold">{moonData.moonset}</p>
            </div>
          </div>

          {/* Ekadashi reminder */}
          {moonData.tithi.name === 'Dashami' && (
            <div className="bg-orange-950 border border-orange-700 rounded-2xl p-4 text-center">
              <p className="text-orange-300 text-sm">
                🔔 Ekadashi is tomorrow — a day of fasting and devotion
              </p>
            </div>
          )}

          {/* Amavasya / Purnima reminder */}
          {(moonData.tithi.name === 'Amavasya' || moonData.tithi.name === 'Purnima') && (
            <div className="bg-purple-950 border border-purple-700 rounded-2xl p-4 text-center">
              <p className="text-purple-300 text-sm">
                ✨ {moonData.tithi.name === 'Purnima' ? 'Full Moon — Purnima today' : 'New Moon — Amavasya today'}
              </p>
            </div>
          )}

        </div>
      ) : (
        <p className="text-center text-red-400">Could not load moon data. Please refresh.</p>
      )}
    </div>
  )
}

export default Home
