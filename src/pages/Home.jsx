import CityPageLinks from '../components/CityPageLinks.jsx'
import PanchangIcon from '../components/PanchangIcon.jsx'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as Astronomy from 'astronomy-engine'
import MoonVisual from '../components/MoonVisual'
import DateStrip from '../components/DateStrip'
import TodayMessageModal from '../components/TodayMessageModal'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Chip from '../components/ui/Chip'
import { useSettings } from '../SettingsContext'
import { useProfile } from '../ProfileContext'
import { getPanchaAngaAtSunrise } from '../panchangAnga.js'
import { getDisplayMasa } from '../panchangCalculations.js'
import { formatEventTime, formatEventDate } from '../timeFormatting.js'
import { getMoonEventsForDate } from '../moonEvents.js'
import { getFestivalsForDate } from '../festivals'
import { getEclipseForDate } from '../eclipseUtils'
import { EclipseIcon } from '../components/EclipseIcons'
import { buildGenericMyDayMessage, buildPersonalMyDayMessage, getBirthMoonProfile } from '../profileMessages'
import { getVara } from '../tithiMessages'
import './Home.css'
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
      const snapshot = getPanchaAngaAtSunrise(date, location)
      const { sunrise: sunriseTime, phaseAngle } = snapshot
      const phase = phaseAngle / 360
      const illum = Astronomy.Illumination('Moon', sunriseTime)
      const illuminationPct = (illum.phase_fraction * 100).toFixed(1)
      const effectiveTithi = snapshot.tithi
      const todayNakshatra = snapshot.nakshatra
      const yoga = snapshot.yoga
      const karana = snapshot.karana
      const masa = getDisplayMasa(sunriseTime, effectiveTithi.number - 1, (settings?.calendarSystem || 'Amavasyant').toLowerCase())

      const { moonrise, moonset } = getMoonEventsForDate(date, location)

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
        moonriseDate: moonrise,
        moonsetDate: moonset,
      })
      setLoading(false)
    } catch (err) {
      console.error('Moon calculation error:', err)
      setMoonData(null)
      setLoading(false)
    }
  }

  const formatTime = (value) =>
    value ? formatEventTime(value) : 'N/A'

  const formatShortDate = (value) =>
    value ? formatEventDate(value) : ''

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
    <div className="day-view-page min-h-screen px-4 py-6 pb-28 max-w-md mx-auto">
      <div className="day-view-heading text-center mb-3">
        <h1>Day View</h1>
        <p className="day-view-subtitle">Your day, guided by the Moon</p>
        {settings.usingGps ? (
          <p className="day-view-context mt-1 flex items-center justify-center gap-1 text-xs text-chandra-info">
            <LocateFixed size={12} aria-hidden="true" />
            <span>GPS</span>
            <span className="text-chandra-text-disabled">-</span>
            <span>{location.city}</span>
            <span aria-hidden="true">·</span><span>{settings.calendarSystem}</span>
          </p>
        ) : (
          <p className="day-view-context mt-1 flex items-center justify-center gap-1 text-xs text-chandra-text-secondary">
            <MapPin size={12} aria-hidden="true" /> <span>{location.city}</span>
            <span aria-hidden="true">·</span><span>{settings.calendarSystem}</span>
          </p>
        )}
      </div>

      <DateStrip date={date} onDateChange={onDateChange} mode="day" responsive />

      {loading ? (
        <div aria-live="polite" aria-busy="true" className="mt-20 text-center text-chandra-text-secondary">
          <p className="text-4xl mb-4" aria-hidden="true">🌙</p>
          <p>Calculating moon data...</p>
        </div>
      ) : moonData && dayHighlight ? (
        <div className="day-view-layout">
          {(dayHighlight.eclipse || dayHighlight.festivals.length > 0) && (
            <TodayHighlightCard
              dayHighlight={dayHighlight}
              date={date}
              onNavigateToPanchang={onNavigateToPanchang}
            />
          )}

          <Card className="day-view-panel day-view-my-day">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h2 className="flex items-center gap-1.5 text-chandra-gold text-card-title">
                <Sparkles size={13} aria-hidden="true" /> My Day
              </h2>
              {hasPersonalMessage ? (
                <button
                  type="button"
                  onClick={() => setShowModal(true)}
                  className="flex min-h-[44px] items-center gap-1.5 rounded-control border border-white/10 bg-chandra-bg-elevated px-3 py-1.5 text-xs font-medium text-chandra-gold transition-all hover:border-chandra-gold/40"
                >
                  <Share2 size={13} aria-hidden="true" />
                  Share
                </button>
              ) : (
                <Button
                  onClick={onNavigateToSettings}
                  size="sm"
                  className="min-h-[44px] py-1.5"
                >
                  Personalize
                  <ArrowRight size={13} aria-hidden="true" />
                </Button>
              )}
            </div>

            <p className="text-sm leading-relaxed text-chandra-text-primary">{myDayMessage}</p>

            {hasPersonalMessage ? (
              <div className="flex flex-wrap gap-2 mt-3">
                <Chip variant="nakshatra">
                  {birthProfile.rasi} Rasi
                </Chip>
                <Chip variant="nakshatra">
                  {birthProfile.nakshatra} Nakshatra
                </Chip>
              </div>
            ) : (
              <p className="mt-3 text-xs leading-relaxed text-chandra-text-secondary">
                Add birth details to include your Rasi and Nakshatra in this message.
              </p>
            )}
          </Card>

          <Card
            className="day-view-panel day-view-cosmos"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <h2 className="mb-3 flex items-center gap-1.5 text-chandra-gold text-card-title">
              <Moon size={13} aria-hidden="true" /> Today's Cosmos
            </h2>
            <div className="day-view-cosmos-content">
              <div className="day-view-moon">
                  <MoonVisual
                    phase={moonData.phase}
                    showLabel={false}
                  />
              </div>
              <div className="day-view-metrics grid grid-cols-2 gap-4 min-w-0">
                <Metric label="Moon phase" value={moonPhaseLabel} />
                <Metric label="Illumination" value={`${moonData.illuminationPct}%`} />
                <Metric label="Moonrise" value={moonData.moonriseDate ? formatTime(moonData.moonriseDate) : 'No moonrise on this date'} sub={formatShortDate(moonData.moonriseDate)} />
                <Metric label="Moonset" value={moonData.moonsetDate ? formatTime(moonData.moonsetDate) : (moonData.moonriseDate ? 'No following moonset found' : 'No moonset on this date')} sub={formatShortDate(moonData.moonsetDate)} />
              </div>
            </div>
          </Card>

          <Card className="day-view-panel day-view-panchanga">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h2 className="flex items-center gap-1.5 text-chandra-gold text-card-title">
                <PanchangIcon size={13} aria-hidden="true" /> Today's Panchanga
              </h2>
            </div>
            <div className="day-view-snapshot grid grid-cols-2 gap-2">
              <Snapshot icon={Moon} label="Tithi" value={dayHighlight.tithi.name} sub={dayHighlight.tithi.paksha} />
              <Snapshot icon={Star} label="Nakshatra" value={dayHighlight.nakshatra} />
              <Snapshot icon={Sparkles} label="Yoga" value={dayHighlight.yoga} />
              <Snapshot icon={CalendarClock} label="Karana" value={dayHighlight.karana} />
              <Snapshot icon={Sun} label="Vara" value={vara} />
              <Snapshot icon={CalendarDays} label="Masa" value={dayHighlight.masa} />
            </div>
            <button type="button" onClick={() => onNavigateToPanchang?.(date)} className="day-view-full-panchanga text-chandra-focus">
              View full panchanga<ArrowRight size={14} aria-hidden="true" />
            </button>
          </Card>
        </div>
      ) : (
        <Card role="alert" variant="alert" className="mt-6 flex flex-col items-center gap-4 p-8 text-center">
          <span className="text-5xl" aria-hidden="true">🌑</span>
          <div>
            <p className="mb-1 font-semibold text-chandra-error">Could not calculate moon data</p>
            <p className="text-sm leading-relaxed text-chandra-text-secondary">
              This sometimes happens if your device clock is off or the calculation hit an edge case.
              Try again or change the date.
            </p>
          </div>
          <Button
            onClick={() => { setLoading(true); calculateMoonData() }}
          >
            Try again
          </Button>
        </Card>
      )}

      <div className="day-view-cities"><CityPageLinks /></div>
      <footer className="day-view-footer">
        <span>Moon and Panchanga at local sunrise</span><span>Chandra · Indian Moon Tracker</span>
      </footer>

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
        className="flex w-full items-center gap-3 rounded-card border border-chandra-gold/35 bg-chandra-bg-surface p-4 text-left transition-all hover:border-chandra-gold/60 active:bg-chandra-bg-elevated"
      >
        <EclipseIcon eclipse={dayHighlight.eclipse} size={30} />
        <div className="flex-1 min-w-0">
          <p className="mb-0.5 text-xs uppercase tracking-widest text-chandra-gold">Day's Highlight</p>
          <p className="text-sm font-semibold text-chandra-focus">{dayHighlight.eclipse.hinduName}</p>
          <p className="mt-0.5 text-xs text-chandra-text-secondary">Tap to view full Panchanga</p>
        </div>
      </button>
    )
  }

  if (dayHighlight.festivals.length > 0) {
    return (
      <button
        type="button"
        onClick={() => onNavigateToPanchang?.(date)}
        className="flex w-full items-center gap-3 rounded-card border border-chandra-gold/35 bg-chandra-bg-surface p-4 text-left transition-all hover:border-chandra-gold/60 active:bg-chandra-bg-elevated"
      >
        <span className="flex-shrink-0 text-2xl" role="img" aria-label={dayHighlight.festivals[0].name}>{dayHighlight.festivals[0].emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="mb-0.5 text-xs uppercase tracking-widest text-chandra-gold">Day's Highlight</p>
          <p className="truncate text-sm font-semibold text-chandra-text-primary">{dayHighlight.festivals[0].name}</p>
          <p className="mt-0.5 text-xs text-chandra-text-secondary">
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
    <p className="mb-0.5 text-xs text-chandra-text-secondary">{label}</p>
    <p className="break-words text-sm font-semibold leading-tight text-chandra-text-primary">{value}</p>
    {sub && <p className="mt-0.5 text-xs text-chandra-text-secondary">{sub}</p>}
  </div>
)

const Snapshot = ({ icon: Icon, label, value, sub }) => (
  <div className="min-w-0 rounded-inset border border-white/10 bg-chandra-bg-elevated px-3 py-3">
    <p className="mb-1 flex items-center gap-1.5 text-xs text-chandra-text-secondary">
      <Icon size={12} aria-hidden="true" />
      {label}
    </p>
    <p className="break-words text-sm font-semibold text-chandra-text-primary">{value}</p>
    {sub && <p className="mt-0.5 text-xs text-chandra-gold">{sub}</p>}
  </div>
)

export default Home
