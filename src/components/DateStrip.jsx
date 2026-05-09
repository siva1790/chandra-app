import { useState, useRef } from 'react'
import DatePickerSheet from './DatePickerSheet'

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
const DateStrip = ({ date, onDateChange, mode = 'day' }) => {
  const [pickerOpen, setPickerOpen] = useState(false)
  const pickerTriggerRef = useRef(null)

  const isToday = date.toDateString() === new Date().toDateString()

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

  const goToToday = () => onDateChange(new Date())

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
        <div className="flex items-center justify-between w-full bg-gray-900 rounded-2xl px-1 py-1 border border-gray-800">
          <button
            onClick={prev}
            aria-label={mode === 'day' ? 'Previous day' : 'Previous month'}
            className="text-yellow-300 text-xl px-3 py-1 rounded-lg hover:bg-gray-800 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >‹</button>

          <button
            ref={pickerTriggerRef}
            onClick={() => setPickerOpen(true)}
            aria-label={`Selected date: ${label}. Tap to change.`}
            aria-haspopup="dialog"
            className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl hover:bg-gray-800 transition-all flex-1"
          >
            <p className="text-white text-sm font-medium text-center">{label}</p>
            {isToday && (
              <p className="text-yellow-500 text-xs">Today</p>
            )}
          </button>

          <button
            onClick={next}
            aria-label={mode === 'day' ? 'Next day' : 'Next month'}
            className="text-yellow-300 text-xl px-3 py-1 rounded-lg hover:bg-gray-800 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >›</button>
        </div>

        {/* Go to Today — only shown when not on today */}
        {!isToday && (
          <button
            onClick={goToToday}
            className="w-full py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-gray-950 text-sm font-bold transition-all"
          >
            ↩ Go to Today
          </button>
        )}
      </div>

      <DatePickerSheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        selectedDate={date}
        onSelect={(d) => { onDateChange(d); setPickerOpen(false) }}
        triggerRef={pickerTriggerRef}
      />
    </>
  )
}

export default DateStrip
