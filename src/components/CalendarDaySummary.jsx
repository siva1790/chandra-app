import { useId, useLayoutEffect, useMemo, useRef } from 'react'
import { Calendar as CalendarIcon, Clock, Star } from 'lucide-react'
import { DAY_MS, INDIA_OFFSET_MINUTES, indianDateKey, indianDayFromPicker } from '../civilDate.js'
import { formatRegionalMonth, phaseLabel } from '../calendarDay.js'
import { eclipseTypeLabel } from '../eclipseUtils.js'
import { getSunriseForDate } from '../moonUtils.js'
import { getTithiTimeline } from '../panchangCalculations.js'
import { CALENDAR_TRADITIONS, getCalendarTithiName } from '../regionalCalendar.js'
import { formatEventDate, formatEventTime, roundTimeForDisplay } from '../timeFormatting.js'
import { EclipseIcon } from './EclipseIcons.jsx'
import BottomSheet from './ui/BottomSheet.jsx'
import Button from './ui/Button.jsx'
import Card from './ui/Card.jsx'

export default function CalendarDaySummary({ day, settings, triggerRef, onClose, onSelectDate }) {
  const titleId = useId()
  const navigating = useRef(false)
  const open = Boolean(day)
  const { lat, lon, calendarTradition } = settings
  const tradition = Object.hasOwn(CALENDAR_TRADITIONS, calendarTradition) ? calendarTradition : ''
  const tithiTimeline = useMemo(() => {
    if (!day) return []
    const nextDay = new Date(+indianDayFromPicker(day.date) + DAY_MS)
    const nextSunrise = getSunriseForDate(nextDay, lat, lon, INDIA_OFFSET_MINUTES)
    return getTithiTimeline(day.anga.sunrise, nextSunrise)
  }, [day, lat, lon])

  useLayoutEffect(() => {
    if (!open) return
    navigating.current = false
    const scrollY = window.scrollY
    const { style } = document.body
    const previousStyles = { position: style.position, top: style.top, width: style.width, overflow: style.overflow }
    Object.assign(style, { position: 'fixed', top: `-${scrollY}px`, width: '100%', overflow: 'hidden' })
    return () => {
      Object.assign(style, previousStyles)
      window.scrollTo(0, navigating.current ? 0 : scrollY)
    }
  }, [open])

  const openPanchang = () => {
    navigating.current = true
    onClose()
    onSelectDate?.(day.date)
  }

  return (
    <BottomSheet open={open} onClose={onClose} labelledBy={titleId} className="calendar-day-sheet mx-auto max-w-md"
      triggerRef={triggerRef}>
      {day && (
        <div className="px-5 pb-10">
          {/* Date header */}
          <div className="mb-4">
            <h2 id={titleId} className="text-card-title text-chandra-text-primary">
              {day.date.toLocaleDateString('en-IN', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
              })}
            </h2>
            <p className="mt-0.5 text-sm text-chandra-gold">
              <span role="img" aria-label={phaseLabel(day.phaseEmoji)}>{day.phaseEmoji}</span> {day.tithiName} · {day.tithi.paksha}
            </p>
            <p className="text-support text-chandra-text-secondary">
              {formatRegionalMonth(day.regionalMonth)}{tradition && ` · ${CALENDAR_TRADITIONS[tradition].name}`}
            </p>
          </div>

          {/* Eclipse highlight */}
          {day.eclipse && (
            <div className="mb-4 flex items-center gap-3 rounded-card border border-chandra-warning/30 bg-chandra-warning/15 p-3">
              <EclipseIcon eclipse={day.eclipse} size={28} />
              <div>
                <p className="text-sm font-semibold text-chandra-warning-text">{day.eclipse.hinduName}</p>
                <p className="mt-0.5 text-xs text-chandra-warning">{eclipseTypeLabel(day.eclipse)}</p>
                <p className="mt-0.5 text-support text-chandra-text-secondary">
                  Global peak {formatEventTime(day.eclipse.peakTime)}, {formatEventDate(day.eclipse.peakTime)} IST
                </p>
              </div>
            </div>
          )}

          {/* Events for the selected date */}
          {day.festivals.length > 0 && (
            <div className="flex flex-col gap-2 mb-4">
              {day.festivals.map(f => (
                <div key={f.key} className="flex items-center gap-2 rounded-card border border-chandra-success/30 bg-chandra-success/15 px-3 py-2">
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
                    const endDate = end && indianDateKey(roundTimeForDisplay(end)) !== day.dateKey
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
              <ModalRow icon={Star} label="Nakshatra" value={day.anga.nakshatra} sub={`Pada ${day.anga.pada}`} />
              <ModalRow icon={Clock} label="Yoga" value={day.anga.yoga} />
              <ModalRow icon="½" label="Karana" value={day.anga.karana} />
              <ModalRow icon={CalendarIcon} label="Vara" value={day.anga.vara} sub={day.anga.varaDeity} />
            </div>
          </Card>

          {/* CTA */}
          <Button onClick={openPanchang} className="w-full">
            View Full Panchang
          </Button>
        </div>
      )}
    </BottomSheet>
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
