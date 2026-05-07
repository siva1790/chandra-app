import { useState, useEffect, useRef } from 'react'
import * as Astronomy from 'astronomy-engine'
import { getDatedFestivalsForDate, getMonthlyFestivalsForTithi } from '../festivals'
import { getMoonPhaseAngle, getTithiFromAngle, getPhaseEmoji, getSunriseForDate } from '../moonUtils'
import { getEclipseForDate, eclipseTypeLabel } from '../eclipseUtils'
import { EclipseIcon } from '../components/EclipseIcons'
import { useSettings } from '../SettingsContext'
import { Calendar as CalendarIcon } from 'lucide-react'

// ── Constants for on-tap Pancha Anga calculation ──────────────────
const AYANAMSHA = 23.15

const NAKSHATRA_NAMES = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira',
  'Ardra', 'Punarvasu', 'Pushya', 'Ashlesha', 'Magha',
  'Purva Phalguni', 'Uttara Phalguni', 'Hasta', 'Chitra', 'Swati',
  'Vishakha', 'Anuradha', 'Jyeshtha', 'Mula', 'Purva Ashadha',
  'Uttara Ashadha', 'Shravana', 'Dhanishtha', 'Shatabhisha',
  'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati',
]

const YOGA_NAMES = [
  'Vishkambha', 'Priti', 'Ayushman', 'Saubhagya', 'Shobhana',
  'Atiganda', 'Sukarma', 'Dhriti', 'Shula', 'Ganda',
  'Vriddhi', 'Dhruva', 'Vyaghata', 'Harshana', 'Vajra',
  'Siddhi', 'Vyatipata', 'Variyan', 'Parigha', 'Shiva',
  'Siddha', 'Sadhya', 'Shubha', 'Shukla', 'Brahma',
  'Indra', 'Vaidhriti',
]

const KARANA_NAMES = [
  'Bava', 'Balava', 'Kaulava', 'Taitila', 'Garija',
  'Vanija', 'Vishti', 'Shakuni', 'Chatushpada', 'Naga', 'Kimstughna',
]

const VARA_NAMES = ['Ravivar', 'Somvar', 'Mangalvar', 'Budhvar', 'Guruvar', 'Shukravar', 'Shanivar']
const VARA_DEVA  = ['Sun ☀️', 'Moon 🌙', 'Mars ♂️', 'Mercury ☿', 'Jupiter ♃', 'Venus ♀️', 'Saturn ♄']

const JUMP_YEARS = Array.from({ length: 201 }, (_, i) => 1926 + i)

// ─────────────────────────────────────────────────────────────────

const Calendar = ({ onSelectDate }) => {
  const { settings } = useSettings()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [calendarDays, setCalendarDays] = useState([])
  const [selectedDay, setSelectedDay] = useState(null)   // for modal
  const [dayPanchang, setDayPanchang] = useState(null)   // computed on tap
  const [showJumpPicker, setShowJumpPicker] = useState(false)
  const [jumpMonth, setJumpMonth] = useState(new Date().getMonth())
  const [jumpYear, setJumpYear] = useState(new Date().getFullYear())
  const touchStartX = useRef(null)
  const touchStartY = useRef(null)
  const selectedYearRef = useRef(null)

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  useEffect(() => {
    buildCalendar()
  }, [currentDate, settings])

  // Calculate Pancha Anga whenever a day is tapped
  useEffect(() => {
    if (!selectedDay) { setDayPanchang(null); return }
    calculateDayPanchang(selectedDay.date)
  }, [selectedDay])

  // Close modal on Escape key
  useEffect(() => {
    if (!selectedDay) return
    const onKey = (e) => { if (e.key === 'Escape') closeModal() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [selectedDay])

  // Close jump picker on Escape key
  useEffect(() => {
    if (!showJumpPicker) return
    const onKey = (e) => { if (e.key === 'Escape') setShowJumpPicker(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [showJumpPicker])

  // Auto-scroll to selected year when jump picker opens
  useEffect(() => {
    if (showJumpPicker && selectedYearRef.current) {
      selectedYearRef.current.scrollIntoView({ block: 'center', behavior: 'instant' })
    }
  }, [showJumpPicker])

  const buildCalendar = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const today = new Date()

    const days = []

    for (let i = 0; i < firstDay; i++) {
      days.push(null)
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d)
      const sunriseTime = getSunriseForDate(date, settings?.lat, settings?.lon)
      const phaseAngle = getMoonPhaseAngle(sunriseTime)
      const tithi = getTithiFromAngle(phaseAngle)
      const dated = getDatedFestivalsForDate(date)
      const monthly = dated.length > 0
        ? []
        : getMonthlyFestivalsForTithi(tithi.adjustedNumber, tithi.paksha)
      const dayFestivals = [...dated, ...monthly]
      const isToday = d === today.getDate() &&
        month === today.getMonth() &&
        year === today.getFullYear()
      const eclipse = getEclipseForDate(date)

      days.push({
        day: d,
        date,
        phaseAngle,
        phaseEmoji: getPhaseEmoji(phaseAngle),
        tithi,
        festivals: dayFestivals,
        isToday,
        eclipse,
      })
    }
    setCalendarDays(days)
  }

  // Compute simplified Pancha Anga for the modal (sunrise snapshot, no timed transitions)
  const calculateDayPanchang = (date) => {
    try {
      const sunriseTime = getSunriseForDate(date, settings?.lat, settings?.lon)

      // Moon sidereal longitude at sunrise
      const moonPos = Astronomy.GeoVector('Moon', sunriseTime, true)
      const moonEcl = Astronomy.Ecliptic(moonPos)
      const moonLon = ((moonEcl.elon - AYANAMSHA + 360) % 360)

      // Nakshatra + pada
      const nakshatraIdx = Math.floor(moonLon / (360 / 27))
      const nakshatra = NAKSHATRA_NAMES[nakshatraIdx % 27]
      const pada = Math.floor((moonLon % (360 / 27)) / (360 / 108)) + 1

      // Yoga = (sun lon + moon lon) / (360/27)
      const sunPos = Astronomy.GeoVector('Sun', sunriseTime, true)
      const sunEcl = Astronomy.Ecliptic(sunPos)
      const sunLon = ((sunEcl.elon - AYANAMSHA + 360) % 360)
      const yoga = YOGA_NAMES[Math.floor(((sunLon + moonLon) % 360) / (360 / 27)) % 27]

      // Karana from phase angle
      const phaseAngle = getMoonPhaseAngle(sunriseTime)
      const karana = KARANA_NAMES[Math.floor((phaseAngle / 6) % 11)]

      // Vara
      const vara = VARA_NAMES[date.getDay()]
      const varaDeity = VARA_DEVA[date.getDay()]

      setDayPanchang({ nakshatra, pada, yoga, karana, vara, varaDeity })
    } catch (err) {
      console.error('Calendar panchang calc error:', err)
      setDayPanchang({ nakshatra: '—', pada: 1, yoga: '—', karana: '—', vara: '—', varaDeity: '' })
    }
  }

  const openModal = (day) => {
    setSelectedDay(day)
    setDayPanchang(null)   // reset while computing
  }

  const closeModal = () => {
    setSelectedDay(null)
    setDayPanchang(null)
  }

  const goToPanchang = () => {
    const date = selectedDay.date
    closeModal()
    onSelectDate?.(date)
  }

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const openJumpPicker = () => {
    setJumpMonth(currentDate.getMonth())
    setJumpYear(currentDate.getFullYear())
    setShowJumpPicker(true)
  }

  const applyJump = () => {
    setCurrentDate(new Date(jumpYear, jumpMonth, 1))
    setShowJumpPicker(false)
  }

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return
    const deltaX = e.changedTouches[0].clientX - touchStartX.current
    const deltaY = e.changedTouches[0].clientY - touchStartY.current
    if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY)) {
      deltaX < 0 ? nextMonth() : prevMonth()
    }
    touchStartX.current = null
  }

  const upcomingFestivals = calendarDays
    .filter(d => d && (d.festivals.length > 0 || d.eclipse))
    .filter(d => d.date >= new Date(new Date().setHours(0, 0, 0, 0)))
    .slice(0, 5)

  return (
    <div className="min-h-screen px-4 py-8 pb-28 max-w-md mx-auto">

      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-yellow-300 mb-1 flex items-center justify-center gap-2">
          <CalendarIcon size={22} aria-hidden="true" strokeWidth={1.75} /> Lunar Calendar
        </h1>
        <p className="text-gray-400 text-sm">Hindu Panchang Festival View</p>
      </div>

      {/* Month Navigator */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          aria-label="Previous month"
          className="text-yellow-300 text-2xl px-3 py-1 rounded-lg hover:bg-gray-800 min-h-[44px] min-w-[44px]"
        >‹</button>
        <button
          onClick={openJumpPicker}
          className="text-white text-lg font-semibold hover:text-yellow-300 transition-colors flex items-center gap-1.5"
          aria-label={`${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}, tap to select month and year`}
        >
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          <span className="text-gray-500 text-xs" aria-hidden="true">▾</span>
        </button>
        <button
          onClick={nextMonth}
          aria-label="Next month"
          className="text-yellow-300 text-2xl px-3 py-1 rounded-lg hover:bg-gray-800 min-h-[44px] min-w-[44px]"
        >›</button>
      </div>

      {/* Day Headers */}
      <div className="grid grid-cols-7 mb-2">
        {dayNames.map(day => (
          <div key={day} className="text-center text-gray-500 text-xs py-1">{day}</div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div
        className="grid grid-cols-7 gap-1 mb-6"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {calendarDays.map((day, idx) => (
          day ? (
            <button
              key={idx}
              onClick={() => openModal(day)}
              aria-label={`${day.day} ${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}, ${day.tithi.name}${day.festivals.length > 0 ? ', ' + day.festivals[0].name : ''}${day.eclipse ? ', ' + day.eclipse.hinduName : ''}`}
              className={`
                relative flex flex-col items-center justify-start pt-1 pb-1 rounded-xl min-h-14
                transition-all duration-150 cursor-pointer hover:bg-gray-800 active:bg-gray-700
                ${day.isToday ? 'bg-yellow-900 border border-yellow-500' : 'bg-gray-900'}
              `}
            >
              <span className={`text-xs font-semibold ${day.isToday ? 'text-yellow-300' : 'text-white'}`}>
                {day.day}
              </span>
              <span className="text-xs" aria-hidden="true">{day.phaseEmoji}</span>
              {day.eclipse ? (
                <EclipseIcon eclipse={day.eclipse} size={13} />
              ) : day.festivals.length > 0 ? (
                <span className="text-xs" aria-hidden="true">{day.festivals[0].emoji}</span>
              ) : null}
            </button>
          ) : (
            <div key={idx} aria-hidden="true" />
          )
        ))}
      </div>

      {/* Upcoming Festivals */}
      {upcomingFestivals.length > 0 && (
        <div>
          <p className="text-gray-400 text-xs uppercase tracking-widest mb-3">
            Upcoming Festivals
          </p>
          <div className="flex flex-col gap-3">
            {upcomingFestivals.map((day, i) => (
              <button
                key={i}
                onClick={() => openModal(day)}
                className="w-full text-left bg-gray-900 rounded-xl p-4 border border-gray-800 flex items-center gap-4 hover:border-yellow-800 active:bg-gray-800 transition-all"
              >
                <div className="text-center min-w-10">
                  <p className="text-yellow-300 font-bold text-lg">{day.day}</p>
                  <p className="text-gray-500 text-xs">{monthNames[day.date.getMonth()].slice(0, 3)}</p>
                </div>
                <div className="flex-1">
                  {day.eclipse && (
                    <div className="flex items-center gap-1.5 mb-1">
                      <EclipseIcon eclipse={day.eclipse} size={14} />
                      <p className="text-indigo-300 text-sm font-medium">{day.eclipse.hinduName}</p>
                    </div>
                  )}
                  {day.festivals.map((f, fi) => (
                    <p key={fi} className="text-white text-sm font-medium">{f.emoji} {f.name}</p>
                  ))}
                  <p className="text-gray-500 text-xs mt-1">{day.tithi.name} · {day.tithi.paksha}</p>
                </div>
                <span className="text-2xl" aria-hidden="true">{day.phaseEmoji}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Month / Year Jump Picker ────────────────────────────── */}
      {showJumpPicker && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Select month and year"
          className="fixed inset-0 z-50 flex items-end justify-center"
          onClick={() => setShowJumpPicker(false)}
        >
          <div className="absolute inset-0 bg-black/60" />
          <div
            className="relative w-full max-w-md bg-gray-950 rounded-t-3xl border-t border-gray-800 px-5 pt-4 pb-10"
            onClick={e => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div className="w-10 h-1 bg-gray-700 rounded-full mx-auto mb-4" />

            <p className="text-white font-semibold text-base text-center mb-4">Go to Month</p>

            {/* Month grid */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              {monthNames.map((m, i) => (
                <button
                  key={m}
                  onClick={() => setJumpMonth(i)}
                  className={`py-2.5 rounded-xl text-sm font-medium transition-all ${
                    i === jumpMonth
                      ? 'bg-yellow-400 text-gray-950 font-bold'
                      : 'bg-gray-800 text-white hover:bg-gray-700'
                  }`}
                >
                  {m.slice(0, 3)}
                </button>
              ))}
            </div>

            {/* Year grid — scrollable, auto-scrolls to selected year on open */}
            <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto mb-5 pb-1">
              {JUMP_YEARS.map(y => (
                <button
                  key={y}
                  ref={y === jumpYear ? selectedYearRef : null}
                  onClick={() => setJumpYear(y)}
                  className={`py-2.5 rounded-xl text-sm font-medium transition-all ${
                    y === jumpYear
                      ? 'bg-yellow-400 text-gray-950 font-bold'
                      : y === new Date().getFullYear()
                      ? 'border border-yellow-500 text-yellow-300'
                      : 'bg-gray-800 text-white hover:bg-gray-700'
                  }`}
                >
                  {y}
                </button>
              ))}
            </div>

            {/* Confirm */}
            <button
              onClick={applyJump}
              className="w-full py-3.5 rounded-2xl bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-bold text-sm transition-all"
            >
              Go to {monthNames[jumpMonth]} {jumpYear}
            </button>
          </div>
        </div>
      )}

      {/* ── Day Detail Modal (bottom sheet) ─────────────────────── */}
      {selectedDay && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="day-modal-title"
          className="fixed inset-0 z-50 flex items-end justify-center"
          onClick={closeModal}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60" />

          {/* Sheet */}
          <div
            className="relative w-full max-w-md bg-gray-950 rounded-t-3xl border-t border-gray-800 px-5 pt-5 pb-10"
            onClick={e => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div className="w-10 h-1 bg-gray-700 rounded-full mx-auto mb-5" />

            {/* Close button */}
            <button
              onClick={closeModal}
              className="absolute top-5 right-5 text-gray-500 hover:text-white text-lg leading-none"
              aria-label="Close"
            >✕</button>

            {/* Date header */}
            <div className="mb-4">
              <p id="day-modal-title" className="text-white font-bold text-lg">
                {selectedDay.date.toLocaleDateString('en-IN', {
                  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                })}
              </p>
              <p className="text-yellow-400 text-sm mt-0.5">
                {selectedDay.phaseEmoji} {selectedDay.tithi.name} · {selectedDay.tithi.paksha}
              </p>
            </div>

            {/* Eclipse highlight */}
            {selectedDay.eclipse && (
              <div className="bg-indigo-950 border border-indigo-800 rounded-2xl p-3 mb-4 flex items-center gap-3">
                <EclipseIcon eclipse={selectedDay.eclipse} size={28} />
                <div>
                  <p className="text-indigo-200 font-semibold text-sm">{selectedDay.eclipse.hinduName}</p>
                  <p className="text-indigo-400 text-xs mt-0.5">{eclipseTypeLabel(selectedDay.eclipse)}</p>
                </div>
              </div>
            )}

            {/* Festival highlights */}
            {selectedDay.festivals.length > 0 && (
              <div className="flex flex-col gap-2 mb-4">
                {selectedDay.festivals.map((f, i) => (
                  <div key={i} className="bg-gray-800 rounded-xl px-3 py-2 flex items-center gap-2">
                    <span className="text-lg">{f.emoji}</span>
                    <p className="text-white text-sm font-medium">{f.name}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Pancha Anga */}
            <div className="bg-gray-900 rounded-2xl p-4 mb-5 border border-gray-800">
              <p className="text-yellow-500 text-xs uppercase tracking-widest mb-3">Pancha Anga</p>
              {dayPanchang ? (
                <div className="flex flex-col gap-2">
                  <ModalRow icon="🌙" label="Tithi"     value={selectedDay.tithi.name} />
                  <ModalRow icon="⭐" label="Nakshatra" value={dayPanchang.nakshatra} sub={`Pada ${dayPanchang.pada}`} />
                  <ModalRow icon="☯️" label="Yoga"      value={dayPanchang.yoga} />
                  <ModalRow icon="½"  label="Karana"    value={dayPanchang.karana} />
                  <ModalRow icon="📅" label="Vara"      value={dayPanchang.vara} sub={dayPanchang.varaDeity} />
                </div>
              ) : (
                <div className="text-center text-gray-500 py-3 text-sm">Calculating…</div>
              )}
            </div>

            {/* CTA */}
            <button
              onClick={goToPanchang}
              className="w-full py-3.5 bg-yellow-400 hover:bg-yellow-300 active:bg-yellow-500 text-gray-950 font-bold rounded-2xl text-sm transition-all"
            >
              View Full Panchang →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Compact row for modal Pancha Anga
const ModalRow = ({ icon, label, value, sub }) => (
  <div className="flex items-center justify-between py-1.5 border-b border-gray-800 last:border-0">
    <div className="flex items-center gap-2">
      <span className="text-sm">{icon}</span>
      <span className="text-gray-400 text-sm">{label}</span>
    </div>
    <div className="text-right">
      <p className="text-white text-sm font-semibold">{value}</p>
      {sub && <p className="text-gray-500 text-xs">{sub}</p>}
    </div>
  </div>
)

export default Calendar
