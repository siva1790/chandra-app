import { useState, useEffect, useRef } from 'react'
import { CalendarDays } from 'lucide-react'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const DAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

// Year range: 100 years back → 100 years forward (201 total)
const THIS_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 201 }, (_, i) => THIS_YEAR - 100 + i)

const DatePickerSheet = ({ open, onClose, selectedDate, onSelect }) => {
  const sheetRef = useRef(null)
  const selectedYearRef = useRef(null)
  const touchStartX = useRef(null)
  const touchStartY = useRef(null)
  const [viewYear, setViewYear]           = useState(selectedDate.getFullYear())
  const [viewMonth, setViewMonth]         = useState(selectedDate.getMonth())
  const [showYearPicker, setShowYearPicker] = useState(false)

  // Sync the picker view whenever the sheet opens
  useEffect(() => {
    if (open) {
      setViewYear(selectedDate.getFullYear())
      setViewMonth(selectedDate.getMonth())
      setShowYearPicker(false)
    }
  }, [open])

  // Close on Escape key
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Focus first interactive element when sheet opens
  useEffect(() => {
    if (open && sheetRef.current) {
      const first = sheetRef.current.querySelector('button, [href], input, [tabindex]')
      first?.focus()
    }
  }, [open])

  // ── Navigation ──────────────────────────────────────────────────
  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  // ── Build day grid ───────────────────────────────────────────────
  const buildDays = () => {
    const today      = new Date(); today.setHours(0, 0, 0, 0)
    const selDay     = new Date(selectedDate); selDay.setHours(0, 0, 0, 0)
    const firstDay   = new Date(viewYear, viewMonth, 1).getDay()
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()

    const cells = []
    for (let i = 0; i < firstDay; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(viewYear, viewMonth, d)
      date.setHours(0, 0, 0, 0)
      cells.push({
        day: d,
        date,
        isToday:    date.getTime() === today.getTime(),
        isSelected: date.getTime() === selDay.getTime(),
      })
    }
    return cells
  }

  // ── Handlers ────────────────────────────────────────────────────
  const handleSelectDay = (cell) => {
    if (!cell) return
    onSelect(new Date(cell.date))
    onClose()
  }

  const handleToday = () => {
    const today = new Date()
    onSelect(today)
    onClose()
  }

  const handleSelectYear = (y) => {
    setViewYear(y)
    setShowYearPicker(false)
  }

  // Auto-scroll to selected year when year picker opens
  useEffect(() => {
    if (showYearPicker && selectedYearRef.current) {
      selectedYearRef.current.scrollIntoView({ block: 'center', behavior: 'instant' })
    }
  }, [showYearPicker])

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

  const cells = buildDays()
  const isViewingToday =
    viewYear === THIS_YEAR && viewMonth === new Date().getMonth()

  return (
    <>
      {/* ── Backdrop ── */}
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-black z-40 transition-opacity duration-300 ${
          open ? 'opacity-60 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* ── Sheet ── */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label="Select date"
        className={`fixed bottom-0 left-0 right-0 z-50 bg-gray-950 rounded-t-3xl border-t border-gray-800
          transition-transform duration-300 ease-out ${open ? 'translate-y-0' : 'translate-y-full'}`}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-gray-700 rounded-full" />
        </div>

        <div className="px-5 pb-10">

          {/* ── Header ── */}
          <div className="flex items-center justify-between mb-5 mt-1">
            {showYearPicker ? (
              <>
                <button
                  onClick={() => setShowYearPicker(false)}
                  className="text-yellow-400 text-sm font-medium px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 transition-all"
                >
                  ← Back
                </button>
                <p className="text-white font-semibold text-base">Select Year</p>
                <div className="w-20" />
              </>
            ) : (
              <>
                <button
                  onClick={prevMonth}
                  aria-label="Previous month"
                  className="w-10 h-10 flex items-center justify-center text-yellow-300 text-2xl rounded-xl hover:bg-gray-800 transition-all"
                >
                  ‹
                </button>

                {/* Tap to open year picker */}
                <button
                  onClick={() => setShowYearPicker(true)}
                  className="flex items-center gap-1.5 text-white font-semibold text-base hover:text-yellow-300 transition-colors"
                >
                  {MONTH_NAMES[viewMonth]} {viewYear}
                  <span className="text-gray-500 text-xs">▾</span>
                </button>

                <button
                  onClick={nextMonth}
                  aria-label="Next month"
                  className="w-10 h-10 flex items-center justify-center text-yellow-300 text-2xl rounded-xl hover:bg-gray-800 transition-all"
                >
                  ›
                </button>
              </>
            )}
          </div>

          {/* ════════════════════════════════
              MONTH GRID VIEW
          ════════════════════════════════ */}
          {!showYearPicker && (
            <>
              {/* Day-of-week headers */}
              <div className="grid grid-cols-7 mb-1">
                {DAY_NAMES.map(d => (
                  <div key={d} className="text-center text-gray-500 text-xs py-1 font-medium">
                    {d}
                  </div>
                ))}
              </div>

              {/* Day cells — swipe left/right to change month */}
              <div
                className="grid grid-cols-7 gap-1 mb-5"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
              >
                {cells.map((cell, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectDay(cell)}
                    disabled={!cell}
                    className={`
                      h-10 rounded-xl text-sm font-medium transition-all
                      ${!cell ? 'invisible pointer-events-none' : ''}
                      ${cell?.isSelected
                        ? 'bg-yellow-400 text-gray-950 font-bold shadow-md'
                        : cell?.isToday
                        ? 'border border-yellow-500 text-yellow-300'
                        : cell
                        ? 'text-white hover:bg-gray-800'
                        : ''}
                    `}
                  >
                    {cell?.day}
                  </button>
                ))}
              </div>

              {/* Today button */}
              <button
                onClick={handleToday}
                className="w-full py-3.5 rounded-2xl bg-gray-800 hover:bg-gray-700 text-yellow-300 font-semibold text-sm transition-all border border-gray-700"
              >
                <CalendarDays size={14} aria-hidden="true" className="inline mr-1" /> Go to Today
              </button>
            </>
          )}

          {/* ════════════════════════════════
              YEAR PICKER VIEW
          ════════════════════════════════ */}
          {showYearPicker && (
            <div className="grid grid-cols-4 gap-2 max-h-72 overflow-y-auto pb-2">
              {YEARS.map(y => (
                <button
                  key={y}
                  ref={y === viewYear ? selectedYearRef : null}
                  onClick={() => handleSelectYear(y)}
                  className={`py-3 rounded-xl text-sm font-medium transition-all ${
                    y === viewYear
                      ? 'bg-yellow-400 text-gray-950 font-bold'
                      : y === THIS_YEAR
                      ? 'border border-yellow-500 text-yellow-300'
                      : 'bg-gray-800 text-white hover:bg-gray-700'
                  }`}
                >
                  {y}
                </button>
              ))}
            </div>
          )}

        </div>
      </div>
    </>
  )
}

export default DatePickerSheet
