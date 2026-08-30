import { useState, useRef } from 'react'
import DatePickerSheet from './DatePickerSheet'
import Button from './ui/Button'

/**
 * DateStrip — shared date navigation bar used on Day View, Calendar, and Panchang.
 *
 * Props:
 *   date          Date     — currently selected date
 *   onDateChange  fn(Date) — called when date changes (arrow tap, picker selection, "Go to Today")
 *   mode          'day' | 'month'
 *                   'day'   — arrows step ±1 day   (Day View, Panchang)
 *                   'month' — arrows step ±1 month with day clamping (Calendar)
 */
const DateStrip = ({ date, onDateChange, onPickerSelect, onTodaySelect, mode = 'day' }) => {
  const [pickerOpen, setPickerOpen] = useState(false)
  const pickerTriggerRef = useRef(null)

  const today = new Date()
  const isToday = mode === 'month'
    ? date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear()
    : date.toDateString() === today.toDateString()

  const prev = () => {
    const d = new Date(date)
    if (mode === 'day') {
      d.setDate(d.getDate() - 1)
    } else {
      const newMonth = d.getMonth() === 0 ? 11 : d.getMonth() - 1
      const newYear  = d.getMonth() === 0 ? d.getFullYear() - 1 : d.getFullYear()
      const maxDay   = new Date(newYear, newMonth + 1, 0).getDate()
      d.setFullYear(newYear, newMonth, Math.min(d.getDate(), maxDay))
    }
    onDateChange(d)
  }

  const next = () => {
    const d = new Date(date)
    if (mode === 'day') {
      d.setDate(d.getDate() + 1)
    } else {
      const newMonth = d.getMonth() === 11 ? 0 : d.getMonth() + 1
      const newYear  = d.getMonth() === 11 ? d.getFullYear() + 1 : d.getFullYear()
      const maxDay   = new Date(newYear, newMonth + 1, 0).getDate()
      d.setFullYear(newYear, newMonth, Math.min(d.getDate(), maxDay))
    }
    onDateChange(d)
  }

  const goToToday = () => {
    const todayDate = new Date()
    if (onTodaySelect) onTodaySelect(todayDate)
    else onDateChange(todayDate)
  }

  // Label format:
  //   day mode   → "Saturday, 9 May 2026"
  //   month mode → "May 2026"
  const label = mode === 'month'
    ? date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    : date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <>
      <div className="flex flex-col items-center gap-1 mb-6">
        {/* Arrows + date label row */}
        <div className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-chandra-bg-surface px-1 py-1">
          <button
            onClick={prev}
            aria-label={mode === 'day' ? 'Previous day' : 'Previous month'}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg px-3 py-1 text-xl text-chandra-gold transition-colors hover:bg-chandra-bg-elevated"
          >‹</button>

          <button
            ref={pickerTriggerRef}
            onClick={() => setPickerOpen(true)}
            aria-label={`Selected date: ${label}. Tap to change.`}
            aria-haspopup="dialog"
            className="flex flex-1 flex-col items-center gap-0.5 rounded-xl px-3 py-1 transition-all hover:bg-chandra-bg-elevated"
          >
            <p className="text-center text-sm font-medium text-chandra-text-primary">{label}</p>
            {isToday && (
              <p className="text-xs text-chandra-gold">Today</p>
            )}
          </button>

          <button
            onClick={next}
            aria-label={mode === 'day' ? 'Next day' : 'Next month'}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg px-3 py-1 text-xl text-chandra-gold transition-colors hover:bg-chandra-bg-elevated"
          >›</button>
        </div>

        {/* Go to Today — only shown when not on today */}
        {!isToday && (
          <Button
            onClick={goToToday}
            className="w-full"
          >
            Go to Today
          </Button>
        )}
      </div>

      <DatePickerSheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        selectedDate={date}
        onSelect={(d) => {
          if (onPickerSelect) onPickerSelect(d)
          else onDateChange(d)
          setPickerOpen(false)
        }}
        triggerRef={pickerTriggerRef}
      />
    </>
  )
}

export default DateStrip
