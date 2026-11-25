import { useMemo, useRef, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { getCalendarDay } from '../calendarDay.js'
import { getCalendarEvents } from '../calendarEvents.js'
import { pickerDateFromKey } from '../civilDate.js'
import { eclipseTypeLabel } from '../eclipseUtils.js'
import { formatEventDate, formatEventTime } from '../timeFormatting.js'
import { useSettings } from '../SettingsContext.jsx'
import CalendarDaySummary from '../components/CalendarDaySummary.jsx'
import CalendarMasthead from '../components/CalendarMasthead.jsx'
import DateStrip from '../components/DateStrip.jsx'
import EventFilters from '../components/EventFilters.jsx'
import './Events.css'

const COMMON_FILTERS = [
  ['all', 'All'],
  ['festival', 'Festivals'],
  ['moon-phases', 'Moon phases'],
  ['astronomical', 'Astronomical events'],
]

const DEFAULT_OBSERVANCES = [
  ['ekadashi', 'Ekadashi'],
  ['pradosh', 'Pradosh'],
  ['sankashti-chaturthi', 'Sankashti Chaturthi'],
]

const REGIONAL_OBSERVANCES = {
  tamil: [
    ['pradosh', 'Pradosham'],
    ['ekadashi', 'Ekadasi'],
    ['sashti', 'Sashti'],
    ['sankashti-chaturthi', 'Sankatahara Chaturthi'],
    ['krithigai', 'Krithigai'],
    ['masik-shivaratri', 'Maadha Shivaratri'],
  ],
  telugu: [
    ['ekadashi', 'Ekadashi'],
    ['pradosh', 'Pradosham'],
    ['sankashti-chaturthi', 'Sankatahara Chaturthi'],
    ['masik-shivaratri', 'Masa Shivaratri'],
    ['sashti', 'Subrahmanya Shashti'],
    ['kalashtami', 'Kalabhairava Ashtami'],
  ],
  ujjain: [
    ['ekadashi', 'Ekadashi'],
    ['pradosh', 'Pradosh Vrat'],
    ['sankashti-chaturthi', 'Sankashti Chaturthi'],
    ['vinayaka-chaturthi', 'Vinayaka Chaturti'],
    ['masik-shivaratri', 'Masik Shivaratri'],
    ['masik-durgashtami', 'Masik Durgashtami'],
    ['kalashtami', 'Kalashtami'],
  ],
}

export default function Events({ active, todayKey, onSelectDate }) {
  const { settings } = useSettings()
  const [chosenMonth, setChosenMonth] = useState(null)
  const [selectedFilter, setFilter] = useState('all')
  const [selectedDay, setSelectedDay] = useState(null)
  const triggerRef = useRef(null)
  if (!active && selectedDay) setSelectedDay(null)
  const month = chosenMonth ?? pickerDateFromKey(todayKey)
  const year = month.getFullYear()
  const monthIndex = month.getMonth()
  const { lat, lon, calendarTradition } = settings
  const entries = useMemo(() => {
    if (!active) return []
    const days = new Date(year, monthIndex + 1, 0).getDate()
    return Array.from({ length: days }, (_, index) =>
      getCalendarEvents(new Date(year, monthIndex, index + 1), { lat, lon, calendarTradition })
    ).flat()
  }, [active, year, monthIndex, lat, lon, calendarTradition])
  const observances = Object.hasOwn(REGIONAL_OBSERVANCES, calendarTradition)
    ? REGIONAL_OBSERVANCES[calendarTradition]
    : DEFAULT_OBSERVANCES
  const filters = useMemo(() => [...COMMON_FILTERS, ...observances], [observances])
  const filter = filters.some(([id]) => id === selectedFilter) ? selectedFilter : 'all'
  if (selectedFilter !== filter) setFilter(filter)
  const visible = filter === 'all' ? entries : entries.filter(event => event.filters.includes(filter))

  const openDaySummary = (date, trigger) => {
    triggerRef.current = trigger
    setSelectedDay(getCalendarDay(date, settings))
  }

  return (
    <section className="events-page mx-auto px-4" aria-labelledby="events-heading">
      <CalendarMasthead title="Events" titleId="events-heading" subtitle="Festivals, vrats & celestial events" city={settings.city} />
      <DateStrip date={month} onDateChange={setChosenMonth} onTodaySelect={() => setChosenMonth(null)} mode="month" monthOnly responsive />
      <EventFilters key={calendarTradition} filters={filters} priorityCount={COMMON_FILTERS.length}
        filter={filter} onChange={setFilter} />
      <p className="sr-only" role="status">{visible.length} {visible.length === 1 ? 'event' : 'events'}</p>
      {visible.length === 0 ? (
        <p className="events-empty text-support text-chandra-text-secondary">No matching events this month.</p>
      ) : (
        <ol className="events-list">
          {visible.map(event => {
            const date = pickerDateFromKey(event.dateKey)
            const dayLabel = date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
            const festival = event.filters.includes('festival')
            return (
              <li key={event.key}>
                <button type="button" className="events-row" data-festival={festival || undefined}
                  aria-haspopup="dialog" aria-label={`${festival ? 'Festival: ' : ''}${event.name}, ${dayLabel}. Open day summary`}
                  onClick={click => openDaySummary(date, click.currentTarget)}>
                  <time dateTime={event.dateKey} className="text-support">{dayLabel}</time>
                  <span className="events-row-details">
                    <span className="events-row-title text-body font-semibold">{event.name}</span>
                    {event.eclipse ? <span className="events-row-description text-support text-chandra-text-secondary">
                      {eclipseTypeLabel(event.eclipse)} · Global peak {formatEventTime(event.eclipse.peakTime)}, {formatEventDate(event.eclipse.peakTime)} IST
                    </span> : event.description && <span className="events-row-description text-support text-chandra-text-secondary">{event.description}</span>}
                  </span>
                  <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" />
                </button>
              </li>
            )
          })}
        </ol>
      )}
      <CalendarDaySummary day={active ? selectedDay : null} settings={settings} triggerRef={triggerRef}
        onClose={() => setSelectedDay(null)} onSelectDate={onSelectDate} />
    </section>
  )
}
