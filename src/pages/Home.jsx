import { useEffect, useMemo, useRef, useState } from 'react'
import * as Astronomy from 'astronomy-engine'
import MoonVisual from '../components/MoonVisual'
import DateStrip from '../components/DateStrip'
import TodayMessageModal from '../components/TodayMessageModal'
import { useSettings } from '../SettingsContext'
import { useProfile } from '../ProfileContext'
import { toSiderealLongitude } from '../ayanamsha'
import { getNakshatraForDate, getSunriseForDate, getTithiAtSunrise, MASA_NAMES } from '../moonUtils'
import { getFestivalsForDate } from '../festivals'
import { getEclipseForDate } from '../eclipseUtils'
import { EclipseIcon } from '../components/EclipseIcons'
import { buildGenericMyDayMessage, buildPersonalMyDayMessage, getBirthMoonProfile } from '../profileMessages'
import { getVara } from '../tithiMessages'
import {
  ArrowRight,
  CalendarClock,
  CalendarDays,
  LocateFixed,
  MapPin,
  Moon,
  Share2,
  Sparkles,
  Star,
  Sun,
} from 'lucide-react'

const DEFAULT_LOCATION = { lat: 12.9716, lon: 77.5946, city: 'Bengaluru' }

const YOGA_NAMES = [
  'Vishkambha', 'Priti', 'Ayushman', 'Saubhagya', 'Shobhana',
  'Atiganda', 'Sukarma', 'Dhriti', 'Shula', 'Ganda',
  'Vriddhi', 'Dhruva', 'Vyaghata', 'Harshana', 'Vajra',
  'Siddhi', 'Vyatipata', 'Variyan', 'Parigha', 'Shiva',
  'Siddha', 'Sadhya', 'Shubha', 'Shukla', 'Brahma',
  'Indra', 'Vaidhriti',
]

const MOVABLE_KARANAS = ['Bava', 'Balava', 'Kaulava', 'Taitila', 'Garija', 'Vanija', 'Vishti']

const NAKSHATRA_MASA = [
  6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 0, 0,
  1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 5, 5, 11,
]

const getMoonSiderealLongitude = (date) => {
  const moonPos = Astronomy.GeoVector('Moon', date, true)
  const moonEcliptic = Astronomy.Ecliptic(moonPos)
  return toSiderealLongitude(moonEcliptic.elon, date)
}

const getYogaAtTime = (date) => {
  const sunPos = Astronomy.GeoVector('Sun', date, true)
  const sunLon = toSiderealLongitude(Astronomy.Ecliptic(sunPos).elon, date)
  const moonLon = getMoonSiderealLongitude(date)
  return YOGA_NAMES[Math.floor(((sunLon + moonLon) % 360) / (360 / 27))]
}

const getKaranaFromPhase = (phaseAngle) => {
  const n = Math.floor(((phaseAngle % 360) + 360) % 360 / 6)
  if (n === 0) return 'Kimstughna'
  if (n === 57) return 'Shakuni'
  if (n === 58) return 'Chatushpada'
  if (n === 59) return 'Naga'
  return MOVABLE_KARANAS[(n - 1) % 7]
}

const getMasa = (date, tithiIndex, calendarSystem) => {
  try {
    const isKrishnaPaksha = tithiIndex >= 15
    const purnima = isKrishnaPaksha
      ? Astronomy.SearchMoonPhase(180, new Date(date.getTime() - 20 * 24 * 60 * 60 * 1000), 20)
      : Astronomy.SearchMoonPhase(180, date, 20)

    if (!purnima) return MASA_NAMES[0]

    const moonSidLon = getMoonSiderealLongitude(purnima.date)
    const nakshatraIdx = Math.floor(moonSidLon / (360 / 27))
    const masaIndex = NAKSHATRA_MASA[nakshatraIdx % 27]

    if (isKrishnaPaksha && calendarSystem === 'purnimant') {
      return MASA_NAMES[(masaIndex + 1) % 12]
    }

    return MASA_NAMES[masaIndex]
  } catch (err) {
    console.error('getMasa error:', err)
    return MASA_NAMES[0]
  }
}

const getDetailedMoonPhaseLabel = (phase) => {
  if (phase < 0.03 || phase > 0.97) return 'New Moon'
  if (phase < 0.22) return 'Waxing Crescent'
  if (phase < 0.28) return 'First Quarter'
  if (phase < 0.47) return 'Waxing Gibbous'
  if (phase < 0.53) return 'Full Moon'
  if (phase < 0.72) return 'Waning Gibbous'
  if (phase < 0.78) return 'Third Quarter (Last Quarter)'
  return 'Waning Crescent'
}

const Home = ({ date = new Date(), onDateChange, onNavigateToPanchang, onNavigateToSettings }) => {
  const { settings } = useSettings()
  const { profile, profileComplete } = useProfile()
  const [moonData, setMoonData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [dayHighlight, setDayHighlight] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const touchStartX = useRef(null)
  const touchStartY = useRef(null)

  const location = useMemo(() => ({
    lat: settings?.lat ?? DEFAULT_LOCATION.lat,
    lon: settings?.lon ?? DEFAULT_LOCATION.lon,
    city: settings?.city ?? DEFAULT_LOCATION.city,
  }), [settings?.city, settings?.lat, settings?.lon])

  const birthProfile = useMemo(
    () => (profileComplete ? getBirthMoonProfile(profile) : null),
    [profile, profileComplete]
  )

  useEffect(() => {
    calculateMoonData()
    const isToday = date.toDateString() === new Date().toDateString()
    if (isToday) {
      const interval = setInterval(calculateMoonData, 60000)
      return () => clearInterval(interval)
    }
  }, [location, date, settings?.calendarSystem]) // eslint-disable-line react-hooks/exhaustive-deps

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

  function calculateMoonData() {
    try {
      const observer = new Astronomy.Observer(location.lat, location.lon, 0)
      const sunriseTime = getSunriseForDate(date, location.lat, location.lon)
      const phaseAngle = Astronomy.MoonPhase(sunriseTime)
      const phase = phaseAngle / 360
      const illum = Astronomy.Illumination('Moon', sunriseTime)
      const illuminationPct = (illum.phase_fraction * 100).toFixed(1)
      const effectiveTithi = getTithiAtSunrise(date, location.lat, location.lon)
      const todayNakshatra = getNakshatraForDate(sunriseTime)
      const yoga = getYogaAtTime(sunriseTime)
      const karana = getKaranaFromPhase(phaseAngle)
      const masa = getMasa(sunriseTime, effectiveTithi.number - 1, (settings?.calendarSystem || 'Amavasyant').toLowerCase())

      const startOfDay = new Date(date)
      startOfDay.setHours(0, 0, 0, 0)
      let moonrise = null
      let moonset = null
      try {
        moonrise = Astronomy.SearchRiseSet('Moon', observer, +1, startOfDay, 2)
      } catch {
        moonrise = null
      }
      try {
        moonset = moonrise
          ? Astronomy.SearchRiseSet('Moon', observer, -1, moonrise.date, 2)
          : Astronomy.SearchRiseSet('Moon', observer, -1, startOfDay, 2)
      } catch {
        moonset = null
      }

      const festivals = getFestivalsForDate(date, {
        tithiNumber: effectiveTithi.adjustedNumber,
        paksha: effectiveTithi.paksha,
        lat: location.lat,
        lon: location.lon,
        calendarSystem: settings?.calendarSystem,
      })
      const eclipse = getEclipseForDate(date)

      setDayHighlight({ festivals, eclipse, tithi: effectiveTithi, nakshatra: todayNakshatra, yoga, karana, masa })
      setMoonData({
        phase,
        illuminationPct,
        moonriseDate: moonrise?.date ?? null,
        moonsetDate: moonset?.date ?? null,
      })
      setLoading(false)
    } catch (err) {
      console.error('Moon calculation error:', err)
      setLoading(false)
    }
  }

  const formatTime = (value) =>
    value ? value.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : 'N/A'

  const formatShortDate = (value) =>
    value ? value.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''

  const vara = getVara(date)
  const moonPhaseLabel = moonData ? getDetailedMoonPhaseLabel(moonData.phase) : ''
  const hasPersonalMessage = Boolean(profileComplete && birthProfile)
  const myDayMessage = dayHighlight
    ? hasPersonalMessage
      ? buildPersonalMyDayMessage({
        tithi: dayHighlight.tithi,
        vara,
        nakshatra: dayHighlight.nakshatra,
        highlight: dayHighlight,
        birthProfile,
        name: profile.name,
      })
      : buildGenericMyDayMessage({
        tithi: dayHighlight.tithi,
        vara,
        nakshatra: dayHighlight.nakshatra,
        highlight: dayHighlight,
      })
    : ''

  return (
    <div className="min-h-screen px-4 py-6 pb-28 max-w-md mx-auto">
      <div className="text-center mb-3">
        {settings.usingGps ? (
          <p className="text-blue-400 text-xs mt-1 flex items-center justify-center gap-1">
            <LocateFixed size={12} aria-hidden="true" />
            <span>GPS</span>
            <span className="text-gray-500">-</span>
            <span>{location.city}</span>
          </p>
        ) : (
          <p className="text-gray-400 text-xs mt-1 flex items-center justify-center gap-1">
            <MapPin size={12} aria-hidden="true" /> {location.city}
          </p>
        )}
      </div>

      <DateStrip date={date} onDateChange={onDateChange} mode="day" />

      {loading ? (
        <div aria-live="polite" aria-busy="true" className="text-center text-gray-400 mt-20">
          <p className="text-4xl mb-4" aria-hidden="true">🌙</p>
          <p>Calculating moon data...</p>
        </div>
      ) : moonData && dayHighlight ? (
        <div className="flex flex-col gap-4 mt-5">
          {(dayHighlight.eclipse || dayHighlight.festivals.length > 0) && (
            <TodayHighlightCard
              dayHighlight={dayHighlight}
              date={date}
              onNavigateToPanchang={onNavigateToPanchang}
            />
          )}

          <section className="bg-gray-900 rounded-2xl p-4 border border-gray-800">
            <div className="flex items-center justify-between gap-3 mb-3">
              <p className="text-yellow-300 text-xs uppercase tracking-widest font-semibold flex items-center gap-1.5">
                <Sparkles size={13} aria-hidden="true" /> My Day
              </p>
              {hasPersonalMessage ? (
                <button
                  type="button"
                  onClick={() => setShowModal(true)}
                  className="min-h-[36px] px-3 py-1.5 rounded-full bg-gray-800 border border-gray-700 text-yellow-300 text-xs font-medium flex items-center gap-1.5 hover:border-yellow-700 transition-all"
                >
                  <Share2 size={13} aria-hidden="true" />
                  Share
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onNavigateToSettings}
                  className="min-h-[36px] px-3 py-1.5 rounded-full bg-yellow-400 text-gray-950 text-xs font-bold flex items-center gap-1.5"
                >
                  Personalize
                  <ArrowRight size={13} aria-hidden="true" />
                </button>
              )}
            </div>

            <p className="text-white text-sm leading-relaxed">{myDayMessage}</p>

            {hasPersonalMessage ? (
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="px-2.5 py-1 rounded-full bg-gray-800 border border-gray-700 text-gray-300 text-xs">
                  {birthProfile.rasi} Rasi
                </span>
                <span className="px-2.5 py-1 rounded-full bg-gray-800 border border-gray-700 text-gray-300 text-xs">
                  {birthProfile.nakshatra} Nakshatra
                </span>
              </div>
            ) : (
              <p className="text-gray-400 text-xs leading-relaxed mt-3">
                Add birth details to include your Rasi and Nakshatra in this message.
              </p>
            )}
          </section>

          <section
            className="bg-gray-900 rounded-2xl p-4 border border-gray-800"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <p className="text-yellow-300 text-xs uppercase tracking-widest font-semibold flex items-center gap-1.5 mb-3">
              <Moon size={13} aria-hidden="true" /> Today's Cosmos
            </p>
            <div className="grid grid-cols-[116px_minmax(0,1fr)] gap-5 items-center">
              <div className="w-[116px] h-[116px] flex items-center justify-center overflow-hidden">
                <div className="scale-[0.64] origin-center">
                  <MoonVisual
                    phase={moonData.phase}
                    showLabel={false}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 min-w-0">
                <Metric label="Moon phase" value={moonPhaseLabel} />
                <Metric label="Illumination" value={`${moonData.illuminationPct}%`} />
                <Metric label="Moonrise" value={formatTime(moonData.moonriseDate)} sub={formatShortDate(moonData.moonriseDate)} />
                <Metric label="Moonset" value={formatTime(moonData.moonsetDate)} sub={formatShortDate(moonData.moonsetDate)} />
              </div>
            </div>
          </section>

          <section className="bg-gray-900 rounded-2xl p-4 border border-gray-800">
            <div className="flex items-center justify-between gap-3 mb-3">
              <p className="text-yellow-300 text-xs uppercase tracking-widest font-semibold flex items-center gap-1.5">
                <CalendarClock size={13} aria-hidden="true" /> Today's Panchanga
              </p>
              <button
                type="button"
                onClick={() => onNavigateToPanchang?.(date)}
                className="text-[#8EA8FF] text-xs font-medium flex items-center gap-1 min-h-[36px]"
              >
                View full panchanga
                <ArrowRight size={13} aria-hidden="true" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Snapshot icon={Moon} label="Tithi" value={dayHighlight.tithi.name} sub={dayHighlight.tithi.paksha} />
              <Snapshot icon={Star} label="Nakshatra" value={dayHighlight.nakshatra} />
              <Snapshot icon={Sparkles} label="Yoga" value={dayHighlight.yoga} />
              <Snapshot icon={CalendarClock} label="Karana" value={dayHighlight.karana} />
              <Snapshot icon={Sun} label="Vara" value={vara} />
              <Snapshot icon={CalendarDays} label="Masa" value={dayHighlight.masa} />
            </div>
          </section>
        </div>
      ) : (
        <div role="alert" className="bg-gray-900 rounded-2xl p-8 flex flex-col items-center gap-4 border border-red-900 mt-6 text-center">
          <span className="text-5xl" aria-hidden="true">🌑</span>
          <div>
            <p className="text-red-400 font-semibold mb-1">Could not calculate moon data</p>
            <p className="text-gray-400 text-sm leading-relaxed">
              This sometimes happens if your device clock is off or the calculation hit an edge case.
              Try again or change the date.
            </p>
          </div>
          <button
            type="button"
            onClick={() => { setLoading(true); calculateMoonData() }}
            className="px-5 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-bold text-sm rounded-xl transition-all"
          >
            Try again
          </button>
        </div>
      )}

      {hasPersonalMessage && dayHighlight && moonData && (
        <TodayMessageModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          vara={vara}
          dateLabel={date.toLocaleDateString('en-IN', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
          })}
          tithiName={dayHighlight.tithi.name}
          paksha={dayHighlight.tithi.paksha}
          illuminationPct={moonData.illuminationPct}
          message={myDayMessage}
          phase={moonData.phase}
          profileLabel={`${birthProfile.rasi} Rasi · ${birthProfile.nakshatra} Nakshatra`}
        />
      )}
    </div>
  )
}

const TodayHighlightCard = ({ dayHighlight, date, onNavigateToPanchang }) => {
  if (dayHighlight.eclipse) {
    return (
      <button
        type="button"
        onClick={() => onNavigateToPanchang?.(date)}
        className="w-full bg-gray-900 border border-yellow-900 rounded-2xl p-4 flex items-center gap-3 hover:border-yellow-600 active:bg-gray-800 transition-all text-left"
      >
        <EclipseIcon eclipse={dayHighlight.eclipse} size={30} />
        <div className="flex-1 min-w-0">
          <p className="text-yellow-300 text-xs uppercase tracking-widest mb-0.5">Day's Highlight</p>
          <p className="text-indigo-200 font-semibold text-sm">{dayHighlight.eclipse.hinduName}</p>
          <p className="text-gray-400 text-xs mt-0.5">Tap to view full Panchanga</p>
        </div>
      </button>
    )
  }

  if (dayHighlight.festivals.length > 0) {
    return (
      <button
        type="button"
        onClick={() => onNavigateToPanchang?.(date)}
        className="w-full bg-gray-900 border border-yellow-900 rounded-2xl p-4 flex items-center gap-3 hover:border-yellow-600 active:bg-gray-800 transition-all text-left"
      >
        <span className="text-2xl flex-shrink-0">{dayHighlight.festivals[0].emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-yellow-300 text-xs uppercase tracking-widest mb-0.5">Day's Highlight</p>
          <p className="text-white font-semibold text-sm truncate">{dayHighlight.festivals[0].name}</p>
          <p className="text-gray-400 text-xs mt-0.5">
            {dayHighlight.festivals.length > 1
              ? `+${dayHighlight.festivals.length - 1} more · Tap for full Panchanga`
              : 'Tap to view full Panchanga'}
          </p>
        </div>
      </button>
    )
  }
  return null
}

const Metric = ({ label, value, sub }) => (
  <div className="min-w-0">
    <p className="text-gray-400 text-[11px] mb-0.5">{label}</p>
    <p className="text-white text-sm font-semibold leading-tight break-words">{value}</p>
    {sub && <p className="text-gray-400 text-[11px] mt-0.5">{sub}</p>}
  </div>
)

const Snapshot = ({ icon: Icon, label, value, sub }) => (
  <div className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-3 min-w-0">
    <p className="text-gray-400 text-xs flex items-center gap-1.5 mb-1">
      <Icon size={12} aria-hidden="true" />
      {label}
    </p>
    <p className="text-white text-sm font-semibold truncate">{value}</p>
    {sub && <p className="text-yellow-300 text-xs mt-0.5">{sub}</p>}
  </div>
)

export default Home
