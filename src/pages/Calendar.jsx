import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { getFestivalsForDate } from '../festivals'
import { getPhaseEmoji } from '../moonUtils'
import { getPanchaAngaAtSunrise } from '../panchangAnga.js'
import { getDisplayMasa } from '../panchangCalculations.js'
import { getEclipseForDate, eclipseTypeLabel } from '../eclipseUtils'
import { EclipseIcon } from '../components/EclipseIcons'
import { useSettings } from '../SettingsContext'
import DateStrip from '../components/DateStrip'
import BottomSheet from '../components/ui/BottomSheet'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import PanchangIcon from '../components/PanchangIcon.jsx'
import { Calendar as CalendarIcon, Moon, Star, Clock, BookOpen, Sparkles, MapPin, List } from 'lucide-react'
import './Calendar.css'

// Full names stay in the accessible day label and the day summary.
const COMPACT_TITHI_NAMES = {
  Chaturdashi: 'Chaturd.', Trayodashi: 'Trayod.', Pratipada: 'Pratip.',
  Dwadashi: 'Dwad.', Amavasya: 'Amav.', Panchami: 'Panch.',
  Shashthi: 'Shash.', Chaturthi: 'Chatur.', Ekadashi: 'Ekad.',
  Ashtami: 'Asht.', Dashami: 'Dash.', Dwitiya: 'Dwiti.', Saptami: 'Sapt.',
}

const phaseLabel = (emoji) => ({
  '🌑': 'New moon',
  '🌒': 'Waxing crescent',
  '🌓': 'First quarter',
  '🌔': 'Waxing gibbous',
  '🌕': 'Full moon',
  '🌖': 'Waning gibbous',
  '🌗': 'Last quarter',
  '🌘': 'Waning crescent',
})[emoji] || 'Moon phase'

// ─────────────────────────────────────────────────────────────────

const Calendar = ({ selectedDate = new Date(), onDateChange, onSelectDate, onLearn, active = true }) => {
  const { settings } = useSettings()
  // currentDate tracks which month is displayed; initialised from selectedDate
  const [currentDate, setCurrentDate] = useState(
    () => new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
  )
  const [calendarDays, setCalendarDays] = useState([])
  const [selectedDay, setSelectedDay] = useState(null)       // for modal
  const [dayPanchang, setDayPanchang] = useState(null)       // computed on tap
  const [tapSelectedDate, setTapSelectedDate] = useState(null) // set only on explicit tap
  const [activeView, setActiveView] = useState('calendar')
  const [displayMode, setDisplayMode] = useState('grid')
  const [listJump, setListJump] = useState({ day: null, sequence: 0 })
  const pageRef = useRef(null)
  const listRef = useRef(null)
  const eventsRef = useRef(null)
  const scrollPositions = useRef(new Map())
  const handledJump = useRef(null)
  const touchStartX = useRef(null)
  const touchStartY = useRef(null)
  const dayTriggerRef = useRef(null)

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const monthKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}`

  // Size the two content areas using the actual app chrome, including enlarged
  // navigation text. Short windows and large fonts use natural page scrolling.
  useLayoutEffect(() => {
    if (!active) return
    const page = pageRef.current
    const topbar = document.querySelector('.app-topbar')
    const bottomNav = document.querySelector('.app-bottom-navigation')
    const layout = page.querySelector('.calendar-layout')
    const resize = () => {
      const top = topbar?.getBoundingClientRect().height || 0
      const bottom = bottomNav?.getBoundingClientRect().height || 0
      page.style.setProperty('--calendar-top-height', `${top}px`)
      page.style.setProperty('--calendar-nav-height', `${bottom}px`)
      const available = window.innerHeight - bottom - layout.getBoundingClientRect().top - 16
      const largeText = parseFloat(getComputedStyle(document.documentElement).fontSize) > 20
      page.classList.toggle('calendar-natural-scroll', available < 240 || largeText)
    }
    const observer = new ResizeObserver(resize)
    ;[topbar, bottomNav, page.querySelector('.calendar-header'), page.querySelector('.calendar-datebar'), page.querySelector('.calendar-list-toolbar')].filter(Boolean).forEach(node => observer.observe(node))
    window.addEventListener('resize', resize)
    resize()
    return () => { observer.disconnect(); window.removeEventListener('resize', resize) }
  }, [active])

  // Allow the final date to reach the top as well as dates earlier in the month.
  useLayoutEffect(() => {
    const pane = listRef.current
    if (!pane || !active || displayMode !== 'list') return
    const resize = () => {
      const lastRow = pane.lastElementChild
      const natural = pageRef.current.classList.contains('calendar-natural-scroll')
      pane.style.paddingBottom = `${!natural && pane.clientHeight && lastRow ? Math.max(6, pane.clientHeight - lastRow.offsetHeight - 4) : 6}px`
    }
    const observer = new ResizeObserver(resize)
    observer.observe(pane)
    resize()
    return () => observer.disconnect()
  }, [active, activeView, displayMode, calendarDays])

  useLayoutEffect(() => {
    if (!active || activeView !== 'calendar' || displayMode !== 'list' || !listRef.current?.clientHeight) return
    if (!calendarDays.some(day => day && day.date.getMonth() === currentDate.getMonth() && day.date.getFullYear() === currentDate.getFullYear())) return
    const signature = `${monthKey}:${listJump.sequence}`
    const pane = listRef.current
    if (handledJump.current === signature) {
      pane.scrollTop = scrollPositions.current.get(`${monthKey}:list`) || 0
      return
    }
    const targetDay = listJump.day || calendarDays.find(day => day?.isToday)?.day || 1
    const row = pane.querySelector(`[data-list-day="${targetDay}"]`)
    if (!row) return
    pane.scrollTop += row.getBoundingClientRect().top - pane.getBoundingClientRect().top - 4
    scrollPositions.current.set(`${monthKey}:list`, pane.scrollTop)
    handledJump.current = signature
  }, [active, activeView, displayMode, calendarDays, currentDate, monthKey, listJump])

  useLayoutEffect(() => {
    if (active && eventsRef.current?.clientHeight) eventsRef.current.scrollTop = scrollPositions.current.get(`${monthKey}:events`) || 0
  }, [active, activeView, calendarDays, monthKey])

  const rememberScroll = (kind, event) => {
    if (event.currentTarget.clientHeight) scrollPositions.current.set(`${monthKey}:${kind}`, event.currentTarget.scrollTop)
  }

  const changeDisplayMode = (mode) => {
    setDisplayMode(mode)
    if (mode === 'list') setListJump(previous => ({ day: null, sequence: previous.sequence + 1 }))
  }

  useEffect(() => {
    buildCalendar()
  }, [currentDate, settings])

  // Sync viewed month when global date changes (e.g. Panchang tab changes date) — loop guard prevents re-entry
  useEffect(() => {
    if (
      selectedDate.getMonth()     !== currentDate.getMonth() ||
      selectedDate.getFullYear()  !== currentDate.getFullYear()
    ) {
      setCurrentDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1))
      setTapSelectedDate(null)
      setListJump(previous => ({ day: null, sequence: previous.sequence + 1 }))
    }
  }, [selectedDate])

  // Month navigation helper — called by both DateStrip and swipe/arrow handlers.
  // Only changes the view; does NOT update the global date or carry over a selection.
  const handleMonthChange = (date) => {
    setCurrentDate(new Date(date.getFullYear(), date.getMonth(), 1))
    setTapSelectedDate(null)
    setListJump(previous => ({ day: null, sequence: previous.sequence + 1 }))
  }

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

  useEffect(() => {
    if (!selectedDay) return

    const scrollY = window.scrollY
    const previousStyles = {
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
      overflow: document.body.style.overflow,
    }

    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollY}px`
    document.body.style.width = '100%'
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.position = previousStyles.position
      document.body.style.top = previousStyles.top
      document.body.style.width = previousStyles.width
      document.body.style.overflow = previousStyles.overflow
      window.scrollTo(0, scrollY)
    }
  }, [selectedDay])

  const buildCalendarDay = (date) => {
    const today = new Date()
    const d = date.getDate()
    const month = date.getMonth()
    const year = date.getFullYear()
    const snapshot = getPanchaAngaAtSunrise(date, settings)
    const { phaseAngle, tithi } = snapshot
    const dayFestivals = getFestivalsForDate(date, {
      tithiNumber: tithi.adjustedNumber,
      paksha: tithi.paksha,
      lat: settings?.lat,
      lon: settings?.lon,
      calendarSystem: settings?.calendarSystem,
    })
    const isToday = d === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    const eclipse = getEclipseForDate(date)

    return {
      day: d,
      date,
      phaseAngle,
      phaseEmoji: getPhaseEmoji(phaseAngle),
      tithi,
      festivals: dayFestivals,
      isToday,
      eclipse,
      anga: snapshot,
      masa: getDisplayMasa(snapshot, (settings.calendarSystem || 'Amavasyant').toLowerCase()),
    }
  }

  const buildCalendar = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    const days = []

    for (let i = 0; i < firstDay; i++) {
      days.push(null)
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d)
      days.push(buildCalendarDay(date))
    }
    setCalendarDays(days)
  }

  // Compute simplified Pancha Anga for the modal (sunrise snapshot, no timed transitions)
  const calculateDayPanchang = (date) => {
    try {
      const { nakshatra, pada, yoga, karana, vara, varaDeity } = getPanchaAngaAtSunrise(date, settings)
      setDayPanchang({ nakshatra, pada, yoga, karana, vara, varaDeity })
    } catch (err) {
      console.error('Calendar panchang calc error:', err)
      setDayPanchang({ nakshatra: '—', pada: 1, yoga: '—', karana: '—', vara: '—', varaDeity: '' })
    }
  }

  const openModal = (day) => {
    dayTriggerRef.current = document.activeElement
    setSelectedDay(day)
    setTapSelectedDate(new Date(day.date))  // mark this date as explicitly selected
    setDayPanchang(null)                     // reset while computing
    onDateChange?.(new Date(day.date))       // update global date on tap
  }

  const handlePickerSelect = (date) => {
    dayTriggerRef.current = document.querySelector('.calendar-datebar [aria-haspopup="dialog"]')
    const pickedDate = new Date(date)
    const pickedDay = buildCalendarDay(pickedDate)

    setCurrentDate(new Date(pickedDate.getFullYear(), pickedDate.getMonth(), 1))
    setSelectedDay(pickedDay)
    setTapSelectedDate(new Date(pickedDate))
    setDayPanchang(null)
    onDateChange?.(pickedDate)
  }

  const handleGoToToday = (date) => {
    const todayDate = new Date(date)
    setCurrentDate(new Date(todayDate.getFullYear(), todayDate.getMonth(), 1))
    setTapSelectedDate(new Date(todayDate))
    setSelectedDay(null)
    setDayPanchang(null)
    setActiveView('calendar')
    setListJump(previous => ({ day: todayDate.getDate(), sequence: previous.sequence + 1 }))
    onDateChange?.(todayDate)
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
    const newMonth = currentDate.getMonth() === 0 ? 11 : currentDate.getMonth() - 1
    const newYear  = currentDate.getMonth() === 0 ? currentDate.getFullYear() - 1 : currentDate.getFullYear()
    handleMonthChange(new Date(newYear, newMonth, 1))
  }

  const nextMonth = () => {
    const newMonth = currentDate.getMonth() === 11 ? 0 : currentDate.getMonth() + 1
    const newYear  = currentDate.getMonth() === 11 ? currentDate.getFullYear() + 1 : currentDate.getFullYear()
    handleMonthChange(new Date(newYear, newMonth, 1))
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

  // All festival / eclipse days in the currently viewed month — no date cap, no slice
  const monthFestivals = calendarDays
    .filter(d => d && (d.festivals.length > 0 || d.eclipse))

  return (
    <div ref={pageRef} className="calendar-page px-4 py-8 max-w-md mx-auto">

      {/* Header */}
      <div className="calendar-header text-center mb-6">
        <h1 className="mb-1 flex items-center justify-center gap-2 text-chandra-gold text-page-title">
          Lunar Calendar
        </h1>
        <p className="calendar-subtitle text-sm text-chandra-text-secondary">Hindu Panchang &amp; festival calendar</p>
        <p className="calendar-context">
          <MapPin size={14} strokeWidth={1.75} aria-hidden="true" />
          <span>{settings.city}</span><span aria-hidden="true">·</span><span>{settings.calendarSystem}</span>
        </p>
      </div>

      {/* Month controls apply to both Calendar and Events. */}
      <DateStrip
        date={currentDate}
        onDateChange={handleMonthChange}
        onPickerSelect={handlePickerSelect}
        onTodaySelect={handleGoToToday}
        mode="month"
        responsive
      />

      <div
        aria-label="Calendar sections"
        className="calendar-view-switch mb-4 grid grid-cols-2 gap-1 rounded-card border border-white/10 bg-chandra-bg-surface p-1"
      >
        <button
          type="button"
          id="calendar-view-tab"
          aria-pressed={activeView === 'calendar'}
          aria-controls="calendar-view-panel"
          onClick={() => setActiveView('calendar')}
          className={`flex min-h-[44px] min-w-0 items-center justify-center gap-1.5 rounded-control px-3 text-xs font-bold transition-all ${
            activeView === 'calendar'
              ? 'bg-chandra-gold text-chandra-text-inverse'
              : 'text-chandra-text-secondary hover:bg-chandra-bg-elevated hover:text-chandra-text-primary'
          }`}
        >
          <CalendarIcon size={14} strokeWidth={1.75} aria-hidden="true" />
          Calendar
        </button>
        <button
          type="button"
          id="events-view-tab"
          aria-pressed={activeView === 'events'}
          aria-controls="events-view-panel"
          aria-label={`Events in ${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`}
          onClick={() => setActiveView('events')}
          className={`flex min-h-[44px] min-w-0 items-center justify-center gap-1.5 rounded-control px-3 text-xs font-bold transition-all ${
            activeView === 'events'
              ? 'bg-chandra-gold text-chandra-text-inverse'
              : 'text-chandra-text-secondary hover:bg-chandra-bg-elevated hover:text-chandra-text-primary'
          }`}
        >
          <Sparkles size={14} strokeWidth={1.75} aria-hidden="true" />
          <span className="truncate min-w-0">Events in {monthNames[currentDate.getMonth()]}</span>
        </button>
      </div>

      <div className="calendar-layout">
      <div
        id="calendar-view-panel"
        role="region"
        aria-label={`${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()} calendar`}
        className="calendar-panel calendar-grid-panel"
        data-active={activeView === 'calendar'}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="calendar-list-toolbar">
          <div>
            <h2 className="text-body font-semibold">Days in {monthNames[currentDate.getMonth()]}</h2>
            <p className="text-meta text-chandra-text-secondary">Tithi at local sunrise</p>
          </div>
          <div className="calendar-display-switch" role="group" aria-label="Calendar display">
            <button type="button" aria-pressed={displayMode === 'grid'} aria-controls="calendar-grid-content" onClick={() => changeDisplayMode('grid')}><CalendarIcon size={16} aria-hidden="true" />Grid</button>
            <button type="button" aria-pressed={displayMode === 'list'} aria-controls="calendar-list-content" onClick={() => changeDisplayMode('list')}><List size={16} aria-hidden="true" />List</button>
          </div>
        </div>
        <div id="calendar-grid-content" className="calendar-grid-content calendar-scroll-area" hidden={displayMode !== 'grid'} tabIndex={0} role="region" aria-label="Monthly calendar grid">
        {/* Day Headers */}
        <div className="grid grid-cols-7 mb-2">
          {dayNames.map(day => (
            <div key={day} className="py-1 text-center text-xs text-chandra-text-secondary">{day}</div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="calendar-days grid grid-cols-7 gap-1">
          {calendarDays.map((day, idx) => {
            if (!day) return <div key={idx} aria-hidden="true" />
                const isSelected = tapSelectedDate !== null &&
                  day.date.toDateString() === tapSelectedDate.toDateString()
                const isToday    = day.isToday
                return (
              <button
                key={idx}
                onClick={() => openModal(day)}
                aria-pressed={isSelected}
                aria-current={isToday ? 'date' : undefined}
                aria-label={`${day.day} ${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}, ${day.tithi.name}${day.festivals.length > 0 ? ', ' + day.festivals[0].name : ''}${day.eclipse ? ', ' + day.eclipse.hinduName : ''}`}
                className={`
                  calendar-day relative flex flex-col items-center justify-start pt-1 pb-1 rounded-inset min-h-14
                  transition-all duration-150 cursor-pointer hover:bg-chandra-bg-elevated active:bg-chandra-bg-elevated
                  ${isSelected
                      ? 'border border-chandra-focus bg-chandra-indigo-cta text-chandra-text-primary'
                      : isToday
                      ? 'border border-chandra-gold/60 bg-chandra-gold/15'
                      : 'bg-chandra-bg-surface'}
                `}
              >
                <span className={`text-support font-semibold tabular-nums ${isToday && !isSelected ? 'text-chandra-gold' : 'text-chandra-text-primary'}`}>
                  {day.day}
                </span>
                <span className="text-xs" role="img" aria-label={phaseLabel(day.phaseEmoji)}>{day.phaseEmoji}</span>
                <span className="calendar-day-tithi" aria-hidden="true">
                  <span className="calendar-tithi-full">{day.tithi.name.replace(' (Prathama)', '')}</span>
                  <span className="calendar-tithi-short">{COMPACT_TITHI_NAMES[day.tithi.name.replace(' (Prathama)', '')] || day.tithi.name.replace(' (Prathama)', '')}</span>
                </span>
                {day.eclipse ? (
                  <EclipseIcon eclipse={day.eclipse} size={13} />
                ) : (() => {
                  const major = day.festivals.find(f => f.type === 'major')
                  if (major) return <span className="calendar-festival-indicator" role="img" aria-label={major.name}><span className="calendar-festival-emoji">{major.emoji}</span></span>
                  if (day.festivals.length > 0) return <span className="mt-0.5 inline-block h-1.5 w-1.5 rounded-pill bg-chandra-warning" aria-hidden="true" />
                  return null
                })()}
              </button>
                )
          })}
        </div>
        <div className="calendar-legend" aria-label="Calendar legend">
          <span><i className="calendar-today-key" aria-hidden="true" />Today</span>
          <span><i className="calendar-festival-key" aria-hidden="true" />Festival</span>
          <span><i className="calendar-observance-key" aria-hidden="true" />Observance</span>
        </div>
        </div>
        <div id="calendar-list-content" ref={listRef} className="calendar-date-list calendar-scroll-area" hidden={displayMode !== 'list'} onScroll={event => rememberScroll('list', event)} tabIndex={0} role="region" aria-label="Daily Panchang for every date in the month">
          {calendarDays.filter(Boolean).map(day => (
            <Card key={day.day} as="article" className={`calendar-list-day ${day.isToday ? 'calendar-list-today' : ''}`} data-list-day={day.day} aria-label={day.date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}>
              <div className="calendar-list-date">
                <h3 className="text-body font-semibold"><time dateTime={`${day.date.getFullYear()}-${String(day.date.getMonth() + 1).padStart(2, '0')}-${String(day.day).padStart(2, '0')}`}>{day.day} {monthNames[day.date.getMonth()].slice(0, 3)}</time></h3>
                <span className="text-support text-chandra-text-secondary">{day.date.toLocaleDateString('en-IN', { weekday: 'long' })}</span>
                <div className="calendar-list-actions">
                  {day.isToday && <span className="text-meta text-chandra-gold" aria-current="date">Today</span>}
                  <button
                    type="button"
                    className="calendar-list-panchang flex h-11 w-11 shrink-0 items-center justify-center rounded-icon text-chandra-gold hover:bg-chandra-gold/10 active:bg-chandra-gold/15"
                    onClick={() => onSelectDate?.(new Date(day.date))}
                    aria-label={`View full Panchang for ${day.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`}
                    title="View full Panchang"
                  >
                    <PanchangIcon size={16} strokeWidth={1.75} aria-hidden="true" />
                  </button>
                </div>
              </div>
              <dl className="calendar-list-anga">
                {[
                  ['Tithi', day.tithi.name.replace(' (Prathama)', '')],
                  ['Nakshatra', day.anga.nakshatra], ['Yoga', day.anga.yoga],
                  ['Karana', day.anga.karana], ['Vara', day.anga.vara], ['Masa', day.masa ?? 'Unavailable'],
                ].map(([label, value]) => <div key={label}><dt className="text-meta text-chandra-text-secondary">{label}</dt><dd className="text-support font-semibold text-chandra-text-primary">{value}</dd></div>)}
              </dl>
            </Card>
          ))}
        </div>
      </div>

      {/* Events this month */}
      <div
        id="events-view-panel"
        role="region"
        aria-labelledby="calendar-events-heading"
        className="calendar-panel calendar-events-panel"
        data-active={activeView === 'events'}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 id="calendar-events-heading" className="text-chandra-text-primary text-card-title">
            Events in {monthNames[currentDate.getMonth()]}
          </h2>
          <button
            type="button"
            onClick={() => onLearn?.('festivals-events')}
            aria-label="Learn about calendar events"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-icon text-chandra-gold hover:bg-chandra-gold/10 active:bg-chandra-gold/15"
          >
            <BookOpen size={16} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
        <div ref={eventsRef} className="calendar-events-scroll calendar-scroll-area" onScroll={event => rememberScroll('events', event)} tabIndex={0} role="region" aria-label="Festivals and observances in the month">
        {monthFestivals.length === 0 ? (
          <p className="py-6 text-center text-sm text-chandra-text-secondary">No events this month</p>
        ) : (
          <div className="calendar-event-list flex flex-col gap-2">
            {monthFestivals.map((day, i) => {
              // A day is observance-only when all its festivals are monthly observances
              // (the engine already suppresses observances when a major festival is present)
              const isObservanceOnly = !day.eclipse &&
                day.festivals.length > 0 &&
                day.festivals.every(f => f.type === 'observance')

              return isObservanceOnly ? (
                /* ── Monthly observance row — amber, muted, dot-prefixed ── */
                <button
                  key={i}
                  onClick={() => openModal(day)}
                  className="flex w-full items-center gap-4 rounded-card border border-chandra-warning/30 px-4 py-3 text-left transition-all hover:border-chandra-warning/50 active:bg-chandra-bg-surface"
                >
                  <div className="text-center min-w-10">
                    <p className="text-base font-semibold text-chandra-gold">{day.day}</p>
                    <p className="text-xs text-chandra-text-secondary">{monthNames[day.date.getMonth()].slice(0, 3)}</p>
                  </div>
                  <div className="flex-1">
                    {day.festivals.map((f, fi) => (
                      <div key={fi} className="flex items-center gap-2">
                        <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-pill bg-chandra-warning" aria-hidden="true" />
                        <p className="text-sm text-chandra-warning-text">{f.name}</p>
                      </div>
                    ))}
                    <p className="mt-1 text-xs text-chandra-text-secondary">{day.tithi.name} · {day.tithi.paksha}</p>
                  </div>
                </button>
              ) : (
                /* ── Major festival / eclipse row — prominent, emoji, full card ── */
                <button
                  key={i}
                  onClick={() => openModal(day)}
                  className="flex w-full items-center gap-4 rounded-card border border-white/10 bg-chandra-bg-surface p-4 text-left transition-all hover:border-chandra-gold/35 active:bg-chandra-bg-elevated"
                >
                  <div className="text-center min-w-10">
                    <p className="text-lg font-bold text-chandra-gold">{day.day}</p>
                    <p className="text-xs text-chandra-text-secondary">{monthNames[day.date.getMonth()].slice(0, 3)}</p>
                  </div>
                  <div className="flex-1">
                    {day.eclipse && (
                      <div className="flex items-center gap-1.5 mb-1">
                        <EclipseIcon eclipse={day.eclipse} size={14} />
                        <p className="text-sm font-medium text-chandra-focus">{day.eclipse.hinduName}</p>
                      </div>
                    )}
                    {day.festivals.map((f, fi) => (
                      <p key={fi} className="text-sm font-medium text-chandra-text-primary">
                        <span role="img" aria-label={f.name}>{f.emoji}</span> {f.name}
                      </p>
                    ))}
                    <p className="mt-1 text-xs text-chandra-text-secondary">{day.tithi.name} · {day.tithi.paksha}</p>
                  </div>
                  <span className="text-2xl" role="img" aria-label={phaseLabel(day.phaseEmoji)}>{day.phaseEmoji}</span>
                </button>
              )
            })}
          </div>
        )}
        </div>
      </div>
      </div>
      <footer className="calendar-footer">
        <span>Tithi at local sunrise · {settings.city}</span>
        <span>Chandra · Indian Moon Tracker</span>
      </footer>

      {/* ── Day Detail Modal (bottom sheet) ─────────────────────── */}
        <BottomSheet
          open={Boolean(selectedDay)}
          onClose={closeModal}
          labelledBy="day-modal-title"
          className="calendar-day-sheet mx-auto max-w-md"
          triggerRef={dayTriggerRef}
        >
          {selectedDay && (
          <div className="px-5 pb-10">
            {/* Date header */}
            <div className="mb-4">
              <h2 id="day-modal-title" className="text-card-title text-chandra-text-primary">
                {selectedDay.date.toLocaleDateString('en-IN', {
                  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                })}
              </h2>
              <p className="mt-0.5 text-sm text-chandra-gold">
                <span role="img" aria-label={phaseLabel(selectedDay.phaseEmoji)}>{selectedDay.phaseEmoji}</span> {selectedDay.tithi.name} · {selectedDay.tithi.paksha}
              </p>
            </div>

            {/* Eclipse highlight */}
            {selectedDay.eclipse && (
              <div className="mb-4 flex items-center gap-3 rounded-card border border-chandra-warning/30 bg-chandra-warning/15 p-3">
                <EclipseIcon eclipse={selectedDay.eclipse} size={28} />
                <div>
                  <p className="text-sm font-semibold text-chandra-warning-text">{selectedDay.eclipse.hinduName}</p>
                  <p className="mt-0.5 text-xs text-chandra-warning">{eclipseTypeLabel(selectedDay.eclipse)}</p>
                </div>
              </div>
            )}

            {/* Festival highlights */}
            {selectedDay.festivals.length > 0 && (
              <div className="flex flex-col gap-2 mb-4">
                {selectedDay.festivals.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-card border border-chandra-success/30 bg-chandra-success/15 px-3 py-2">
                    <span className="text-lg" role="img" aria-label={f.name}>{f.emoji}</span>
                    <p className="text-sm font-medium text-chandra-text-primary">{f.name}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Pancha Anga */}
            <Card className="mb-5">
              <h3 className="mb-3 text-body font-semibold text-chandra-gold">Pancha Anga</h3>
              {dayPanchang ? (
                <div className="flex flex-col gap-2">
                  <ModalRow icon={Moon}        label="Tithi"     value={selectedDay.tithi.name} />
                  <ModalRow icon={Star}        label="Nakshatra" value={dayPanchang.nakshatra} sub={`Pada ${dayPanchang.pada}`} />
                  <ModalRow icon={Clock}       label="Yoga"      value={dayPanchang.yoga} />
                  <ModalRow icon="½"           label="Karana"    value={dayPanchang.karana} />
                  <ModalRow icon={CalendarIcon} label="Vara"     value={dayPanchang.vara} sub={dayPanchang.varaDeity} />
                </div>
              ) : (
                <div className="py-3 text-center text-sm text-chandra-text-secondary">Calculating…</div>
              )}
            </Card>

            {/* CTA */}
            <Button onClick={goToPanchang} className="w-full">
              View Full Panchang
            </Button>
          </div>
          )}
        </BottomSheet>
    </div>
  )
}

// Compact row for modal Pancha Anga — icon can be a Lucide component or emoji string
const ModalRow = ({ icon: Icon, label, value, sub }) => (
  <div className="flex items-center justify-between border-b border-white/10 py-1.5 last:border-0">
    <div className="flex items-center gap-2">
      {typeof Icon === 'string'
        ? <span className="text-sm" aria-hidden="true">{Icon}</span>
        : <Icon size={14} aria-hidden="true" strokeWidth={1.75} className="shrink-0 text-chandra-text-secondary" />
      }
      <span className="text-sm text-chandra-text-secondary">{label}</span>
    </div>
    <div className="text-right">
      <p className="text-body font-semibold text-chandra-text-primary">{value}</p>
      {sub && <p className="text-xs text-chandra-text-secondary">{sub}</p>}
    </div>
  </div>
)

export default Calendar
