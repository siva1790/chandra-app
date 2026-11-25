import { useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { getPhaseEmoji, getSunriseForDate, getTithiAtSunrise } from '../moonUtils'
import { getPanchaAngaAtSunrise } from '../panchangAnga.js'
import { getAdditionalTithi, getTithiTimeline } from '../panchangCalculations.js'
import { CALENDAR_TRADITIONS, getCalendarTithiName, getRegionalFestivals, getRegionalMonth } from '../regionalCalendar.js'
import { DAY_MS, INDIA_OFFSET_MINUTES, indianDateKey, indianDayFromPicker } from '../civilDate.js'
import { formatEventDate, formatEventTime, roundTimeForDisplay } from '../timeFormatting.js'
import { getEclipseForDate, eclipseTypeLabel } from '../eclipseUtils'
import { EclipseIcon } from '../components/EclipseIcons'
import { useSettings } from '../SettingsContext'
import DateStrip from '../components/DateStrip'
import BottomSheet from '../components/ui/BottomSheet'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import { Calendar as CalendarIcon, Star, Clock, MapPin, List } from 'lucide-react'
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

const formatRegionalMonth = ({ name, day }) => (name && day ? `${day} ${name}` : name ?? 'Unavailable')

const Calendar = ({ selectedDate = new Date(), todayKey, onDateChange, onSelectDate, active = true }) => {
  const { settings, updateSettings } = useSettings()
  const tradition = Object.hasOwn(CALENDAR_TRADITIONS, settings.calendarTradition) ? settings.calendarTradition : ''
  // currentDate tracks which month is displayed; initialised from selectedDate
  const [currentDate, setCurrentDate] = useState(
    () => new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
  )
  const [calendarDays, setCalendarDays] = useState([])
  const [selectedDay, setSelectedDay] = useState(null)       // for modal
  const tithiTimeline = useMemo(() => {
    if (!selectedDay) return []
    const nextDay = new Date(+indianDayFromPicker(selectedDay.date) + DAY_MS)
    const nextSunrise = getSunriseForDate(nextDay, settings.lat, settings.lon, INDIA_OFFSET_MINUTES)
    return getTithiTimeline(selectedDay.anga.sunrise, nextSunrise)
  }, [selectedDay, settings.lat, settings.lon])
  const [tapSelectedDate, setTapSelectedDate] = useState(null) // set only on explicit tap
  const [displayMode, setDisplayMode] = useState('grid')
  const [listJump, setListJump] = useState({ day: null, sequence: 0 })
  const pageRef = useRef(null)
  const listRef = useRef(null)
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

  // Size the date area using the actual app chrome, including enlarged
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
    ;[topbar, bottomNav, page.querySelector('.calendar-header'), page.querySelector('.calendar-tradition'), page.querySelector('.calendar-datebar'), page.querySelector('.calendar-list-toolbar')].filter(Boolean).forEach(node => observer.observe(node))
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
  }, [active, displayMode, calendarDays])

  useLayoutEffect(() => {
    if (!active || displayMode !== 'list' || !listRef.current?.clientHeight) return
    if (!calendarDays.some(day => day && day.date.getMonth() === currentDate.getMonth() && day.date.getFullYear() === currentDate.getFullYear())) return
    const signature = `${monthKey}:${listJump.sequence}`
    const pane = listRef.current
    if (handledJump.current === signature) {
      pane.scrollTop = scrollPositions.current.get(`${monthKey}:list`) || 0
      return
    }
    const targetDay = listJump.day || calendarDays.find(day => day?.dateKey === todayKey)?.day || 1
    const row = pane.querySelector(`[data-list-day="${targetDay}"]`)
    if (!row) return
    pane.scrollTop += row.getBoundingClientRect().top - pane.getBoundingClientRect().top - 4
    scrollPositions.current.set(`${monthKey}:list`, pane.scrollTop)
    handledJump.current = signature
  }, [active, displayMode, calendarDays, currentDate, monthKey, listJump, todayKey])

  const rememberScroll = (event) => {
    if (event.currentTarget.clientHeight) scrollPositions.current.set(`${monthKey}:list`, event.currentTarget.scrollTop)
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

  const buildCalendarDay = (date, includeEvents = true) => {
    const day = date.getDate()
    const indiaDate = indianDayFromPicker(date)
    const dateKey = indianDateKey(indiaDate)
    const location = { lat: settings.lat, lon: settings.lon, utcOffsetMinutes: INDIA_OFFSET_MINUTES, calendarSystem: settings.calendarSystem }
    const anga = getPanchaAngaAtSunrise(indiaDate, location)
    const regionalMonth = getRegionalMonth(indiaDate, anga, location, tradition, settings.calendarSystem)
    if (!includeEvents) return { regionalMonth, tithi: anga.tithi }

    const festivals = getRegionalFestivals(indiaDate, anga, location, tradition, regionalMonth)
    const eclipse = getEclipseForDate(date)
    const entryNames = [...(eclipse ? [eclipse.hinduName] : []), ...festivals.map(event => event.name)]
    return {
      day, date, dateKey, anga, festivals, eclipse, regionalMonth, entryNames,
      tithi: anga.tithi,
      tithiName: getCalendarTithiName(anga.tithi, tradition),
      phaseEmoji: getPhaseEmoji(anga.phaseAngle),
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

    const lastDayOfPreviousMonth = buildCalendarDay(new Date(year, month, 0), false)
    let previousMonth = lastDayOfPreviousMonth.regionalMonth.name
    for (let d = 1; d <= daysInMonth; d++) {
      const day = buildCalendarDay(new Date(year, month, d))
      const { name, day: solarDay } = day.regionalMonth
      const startsMonth = tradition === 'tamil' ? solarDay === 1 : Boolean(name && previousMonth && name !== previousMonth)
      days.push({ ...day, startsMonth })
      previousMonth = name
    }
    const nextMonth = indianDayFromPicker(new Date(year, month + 1, 1))
    const nextMonthTithi = getTithiAtSunrise(nextMonth, settings.lat, settings.lon, INDIA_OFFSET_MINUTES)
    setCalendarDays(days.map((day, index) => day && {
      ...day,
      additionalTithi: getAdditionalTithi(days[index - 1]?.tithi ?? lastDayOfPreviousMonth.tithi, day.tithi, days[index + 1]?.tithi ?? nextMonthTithi),
    }))
  }

  const openModal = (day) => {
    dayTriggerRef.current = document.activeElement
    setSelectedDay(day)
    setTapSelectedDate(new Date(day.date))  // mark this date as explicitly selected
    onDateChange?.(new Date(day.date))       // update global date on tap
  }

  const handlePickerSelect = (date) => {
    dayTriggerRef.current = document.querySelector('.calendar-datebar [aria-haspopup="dialog"]')
    const pickedDate = new Date(date)
    const pickedDay = buildCalendarDay(pickedDate)

    setCurrentDate(new Date(pickedDate.getFullYear(), pickedDate.getMonth(), 1))
    setSelectedDay(pickedDay)
    setTapSelectedDate(new Date(pickedDate))
    onDateChange?.(pickedDate)
  }

  const handleGoToToday = (date) => {
    const todayDate = new Date(date)
    setCurrentDate(new Date(todayDate.getFullYear(), todayDate.getMonth(), 1))
    setTapSelectedDate(new Date(todayDate))
    setSelectedDay(null)
    setListJump(previous => ({ day: todayDate.getDate(), sequence: previous.sequence + 1 }))
    onDateChange?.(todayDate)
  }

  const closeModal = () => {
    setSelectedDay(null)
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

  return (
    <div ref={pageRef} className="calendar-page px-4 py-8 max-w-md mx-auto">

      <header className="calendar-masthead">
        <div className="calendar-header">
          <h1 className="text-chandra-gold text-page-title">Calendar</h1>
          <div className="calendar-header-details">
            <p className="calendar-subtitle text-sm text-chandra-text-secondary">Hindu Panchang &amp; festival calendar</p>
            <p className="calendar-context">
              <MapPin size={14} strokeWidth={1.75} aria-hidden="true" />
              <span>{settings.city}</span>
            </p>
          </div>
        </div>
        <label className="calendar-tradition">
          <span>Calendar tradition</span>
          <select value={tradition} onChange={event => updateSettings('calendarTradition', event.target.value || null)}>
            <option value="">Shared festivals</option>
            {Object.entries(CALENDAR_TRADITIONS).map(([id, item]) => <option key={id} value={id}>{item.name}</option>)}
          </select>
        </label>
      </header>

      {/* Gregorian month and date controls */}
      <DateStrip
        date={currentDate}
        onDateChange={handleMonthChange}
        onPickerSelect={handlePickerSelect}
        onTodaySelect={handleGoToToday}
        mode="month"
        responsive
      />

      <div className="calendar-layout">
      <div
        id="calendar-view-panel"
        role="region"
        aria-label={`${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()} calendar`}
        className="calendar-panel calendar-grid-panel"
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
                const isToday = day.dateKey === todayKey
                const additionalName = day.additionalTithi && getCalendarTithiName(day.additionalTithi.tithi, tradition)
                return (
              <button
                key={idx}
                onClick={() => openModal(day)}
                aria-haspopup="dialog"
                aria-pressed={isSelected}
                aria-current={isToday ? 'date' : undefined}
                aria-label={[`${day.day} ${monthNames[day.date.getMonth()]} ${day.date.getFullYear()}`, day.tithiName, additionalName && `${day.additionalTithi.label} · ${additionalName}`, phaseLabel(day.phaseEmoji), ...day.entryNames].filter(Boolean).join(', ')}
                data-has-additional-tithi={Boolean(additionalName) || undefined}
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
                  <span className="calendar-tithi-full">{day.tithiName}</span>
                  <span className="calendar-tithi-short">{COMPACT_TITHI_NAMES[day.tithiName] || day.tithiName}</span>
                </span>
                {additionalName && (
                  <span className="calendar-day-tithi calendar-grid-additional-tithi" aria-hidden="true">
                    <span className="calendar-tithi-full">+ {additionalName}</span>
                    <span className="calendar-tithi-short">+ {COMPACT_TITHI_NAMES[additionalName] || additionalName}</span>
                  </span>
                )}
                {day.entryNames.length > 0 && <span className="calendar-entry-marker" aria-hidden="true" />}
              </button>
                )
          })}
        </div>
        <div className="calendar-legend" aria-label="Calendar legend">
          <span><i className="calendar-today-key" aria-hidden="true" />Today</span>
          <span><i className="calendar-entry-marker" aria-hidden="true" />Festival or event</span>
          {calendarDays.some(day => day?.additionalTithi) && <span className="calendar-legend-additional-tithi"><span aria-hidden="true">+</span>Additional tithi after sunrise</span>}
        </div>
        </div>
        <div id="calendar-list-content" ref={listRef} className="calendar-date-list calendar-scroll-area" hidden={displayMode !== 'list'} onScroll={rememberScroll} tabIndex={0} role="region" aria-label="Daily Panchang for every date in the month">
          {calendarDays.filter(Boolean).map(day => {
            const isToday = day.dateKey === todayKey
            const isCompleted = day.dateKey < todayKey
            const dateLabel = [
              day.date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
              day.startsMonth && (tradition === 'tamil' ? 'start of Tamil solar month' : 'start of lunar month'),
              isCompleted && 'completed',
            ].filter(Boolean).join(', ')
            const isLunarPhase = day.tithi.adjustedNumber === 15

            return (
              <Card key={day.day} as="article" className={`calendar-list-day ${isToday ? 'calendar-list-today' : ''}`} data-list-day={day.day} data-completed={isCompleted || undefined} data-month-start={day.startsMonth || undefined} aria-label={dateLabel}>
                <div className="calendar-list-date">
                  <h3 className="text-body font-semibold">
                    <button type="button" className="calendar-list-summary" onClick={() => openModal(day)} aria-label={`Open day summary for ${dateLabel}`} aria-haspopup="dialog">
                      <time dateTime={day.dateKey}>{day.day} {monthNames[day.date.getMonth()].slice(0, 3)}</time>
                    </button>
                  </h3>
                  <span className="text-support text-chandra-text-secondary">{day.date.toLocaleDateString('en-IN', { weekday: 'long' })}</span>
                  {isToday && <span className="calendar-list-today-badge text-meta text-chandra-gold" aria-current="date">Today</span>}
                </div>
                <dl className="calendar-list-anga">
                  <div>
                    <dt className="text-meta text-chandra-text-secondary">{day.additionalTithi ? 'Tithi at sunrise' : 'Tithi'}</dt>
                    <dd className="text-support font-semibold" data-lunar-phase={isLunarPhase || undefined}>{day.tithiName}</dd>
                  </div>
                  {[
                    ['Nakshatra', day.anga.nakshatra], ['Yoga', day.anga.yoga],
                    ['Karana', day.anga.karana], ['Vara', day.anga.vara],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-meta text-chandra-text-secondary">{label}</dt>
                      <dd className="text-support font-semibold">{value}</dd>
                    </div>
                  ))}
                  <div>
                    <dt className="text-meta text-chandra-text-secondary">{tradition === 'tamil' ? 'Tamil date' : 'Masa'}</dt>
                    <dd className="text-support font-semibold" data-calendar-month>{formatRegionalMonth(day.regionalMonth)}</dd>
                  </div>
                  {day.additionalTithi && (
                    <div className="calendar-list-additional-tithi">
                      <dt className="text-support text-chandra-text-secondary">{day.additionalTithi.label}<span aria-hidden="true"> ·</span></dt>
                      <dd className="text-support font-medium">{getCalendarTithiName(day.additionalTithi.tithi, tradition)}</dd>
                    </div>
                  )}
                </dl>
                {day.entryNames.length > 0 && (
                  <ul className="calendar-list-entries text-support" aria-label="Festivals and events">
                    {day.entryNames.slice(0, 2).map(name => <li key={name}>{name}</li>)}
                    {day.entryNames.length > 2 && (
                      <li>+{day.entryNames.length - 2} more</li>
                    )}
                  </ul>
                )}
              </Card>
            )
          })}
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
                <span role="img" aria-label={phaseLabel(selectedDay.phaseEmoji)}>{selectedDay.phaseEmoji}</span> {selectedDay.tithiName} · {selectedDay.tithi.paksha}
              </p>
              <p className="text-support text-chandra-text-secondary">
                {formatRegionalMonth(selectedDay.regionalMonth)}{tradition && ` · ${CALENDAR_TRADITIONS[tradition].name}`}
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
                    {f.emoji && <span className="text-lg" aria-hidden="true">{f.emoji}</span>}
                    <p className="text-sm font-medium text-chandra-text-primary">{f.name}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Pancha Anga */}
            <Card className="mb-5">
              <h3 className="mb-3 text-body font-semibold text-chandra-gold">Pancha Anga</h3>
              <div className="flex flex-col gap-2">
                <div className="calendar-tithi-timeline">
                  <h4 className="text-support font-semibold">Tithi timeline</h4>
                  <p className="text-meta text-chandra-text-secondary">Sunrise to next sunrise · IST</p>
                  <ol className="mt-2 flex flex-col gap-1">
                    {tithiTimeline.map(({ tithi, end }) => {
                      const endDate = end && indianDateKey(roundTimeForDisplay(end)) !== selectedDay.dateKey
                        ? `, ${formatEventDate(end)}` : ''
                      return (
                        <li key={tithi.number} className="calendar-tithi-timeline-entry text-support">
                          <span className="font-semibold">{tithi.paksha} {getCalendarTithiName(tithi, tradition)}</span>
                          <span className="text-chandra-text-secondary">{end ? <>Until <time dateTime={end.toISOString()}>{formatEventTime(end)}{endDate}</time></> : 'End time unavailable'}</span>
                        </li>
                      )
                    })}
                  </ol>
                </div>
                <ModalRow icon={Star} label="Nakshatra" value={selectedDay.anga.nakshatra} sub={`Pada ${selectedDay.anga.pada}`} />
                <ModalRow icon={Clock} label="Yoga" value={selectedDay.anga.yoga} />
                <ModalRow icon="½" label="Karana" value={selectedDay.anga.karana} />
                <ModalRow icon={CalendarIcon} label="Vara" value={selectedDay.anga.vara} sub={selectedDay.anga.varaDeity} />
              </div>
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
