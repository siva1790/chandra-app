import { useState, useEffect, useRef } from 'react'
import { CalendarDays } from 'lucide-react'
import BottomSheet from './ui/BottomSheet'
import Button from './ui/Button'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const DAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

const THIS_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 201 }, (_, i) => THIS_YEAR - 100 + i)

const DatePickerSheet = ({ open, onClose, selectedDate, onSelect, triggerRef, monthOnly = false }) => {
  const selectedYearRef  = useRef(null)
  const touchStartX      = useRef(null)
  const touchStartY      = useRef(null)

  const [viewYear, setViewYear]               = useState(selectedDate.getFullYear())
  const [viewMonth, setViewMonth]             = useState(selectedDate.getMonth())
  const [showYearPicker, setShowYearPicker]   = useState(false)

  // Sync the picker view whenever the sheet opens
  useEffect(() => {
    if (open) {
      setViewYear(selectedDate.getFullYear())
      setViewMonth(selectedDate.getMonth())
      setShowYearPicker(monthOnly)
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Navigation ──
  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  // ── Build day grid ──
  const buildDays = () => {
    const today       = new Date(); today.setHours(0, 0, 0, 0)
    const selDay      = new Date(selectedDate); selDay.setHours(0, 0, 0, 0)
    const firstDay    = new Date(viewYear, viewMonth, 1).getDay()
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

  // Build accessible label for a day cell
  const dayLabel = (cell) => {
    const base = new Date(viewYear, viewMonth, cell.day)
      .toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    if (cell.isSelected && cell.isToday) return `${base}, today, selected`
    if (cell.isSelected) return `${base}, selected`
    if (cell.isToday)    return `${base}, today`
    return base
  }

  // ── Handlers ──
  const handleSelectDay = (cell) => {
    if (!cell) return
    onSelect(new Date(cell.date))
    onClose()
  }

  const handleToday = () => {
    onSelect(new Date())
    onClose()
  }

  const handleSelectYear = (y) => {
    setViewYear(y)
  }

  const handleSelectMonth = (m) => {
    if (monthOnly) {
      onSelect(new Date(viewYear, m, 1))
      onClose()
      return
    }
    setViewMonth(m)
    setShowYearPicker(false)
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

  const cells = buildDays()
  const isViewingCurrentMonth =
    viewYear === THIS_YEAR && viewMonth === new Date().getMonth()

  return (
    <BottomSheet open={open} onClose={onClose} title={monthOnly ? 'Select month and year' : 'Select date'} triggerRef={triggerRef}>
        <div className="px-5 pb-10">

          {/* ── Header ── */}
          {!monthOnly && <div className="flex items-center justify-between mb-5 mt-1">
            {showYearPicker ? (
              <>
                <button
                  onClick={() => setShowYearPicker(false)}
                  aria-label="Back to month view"
                  className="rounded-control bg-chandra-bg-elevated px-3 py-1.5 text-sm font-medium text-chandra-gold transition-all hover:bg-chandra-bg-primary"
                >
                  Back
                </button>
                <h2 className="text-card-title text-chandra-text-primary" aria-live="polite">Select Month &amp; Year</h2>
                <div className="w-20" />
              </>
            ) : (
              <>
                <button
                  onClick={prevMonth}
                  aria-label="Previous month"
                  className="flex h-10 w-10 items-center justify-center rounded-icon text-2xl text-chandra-gold transition-all hover:bg-chandra-bg-elevated"
                >
                  ‹
                </button>

                <button
                  onClick={() => setShowYearPicker(true)}
                  aria-label={`${MONTH_NAMES[viewMonth]} ${viewYear}. Tap to change month or year.`}
                  className="flex items-center gap-1.5 text-base font-semibold text-chandra-text-primary transition-colors hover:text-chandra-gold"
                >
                  {MONTH_NAMES[viewMonth]} {viewYear}
                  <span className="text-xs text-chandra-text-disabled" aria-hidden="true">▾</span>
                </button>

                <button
                  onClick={nextMonth}
                  aria-label="Next month"
                  className="flex h-10 w-10 items-center justify-center rounded-icon text-2xl text-chandra-gold transition-all hover:bg-chandra-bg-elevated"
                >
                  ›
                </button>
              </>
            )}
          </div>}

          {/* ════════════════════
              MONTH GRID VIEW
          ════════════════════ */}
          {!monthOnly && !showYearPicker && (
            <>
              {/* Day-of-week headers */}
              <div className="grid grid-cols-7 mb-1" role="row" aria-hidden="true">
                {DAY_NAMES.map(d => (
                  <div key={d} className="py-1 text-center text-xs font-medium text-chandra-text-secondary">{d}</div>
                ))}
              </div>

              {/* Day cells */}
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
                    aria-label={cell ? dayLabel(cell) : undefined}
                    aria-pressed={cell?.isSelected || undefined}
                    className={`
                      h-10 rounded-control text-sm font-medium transition-all
                      ${!cell ? 'invisible pointer-events-none' : ''}
                      ${cell?.isSelected
                        ? 'bg-chandra-gold text-chandra-text-inverse font-bold shadow-md'
                        : cell?.isToday
                        ? 'border border-chandra-gold/60 text-chandra-gold'
                        : cell
                        ? 'text-chandra-text-primary hover:bg-chandra-bg-elevated'
                        : ''}
                    `}
                  >
                    {cell?.day}
                  </button>
                ))}
              </div>

              {/* Today button */}
              <Button
                onClick={handleToday}
                disabled={isViewingCurrentMonth && cells.some(c => c?.isSelected && c?.isToday)}
                variant="quiet"
                className="w-full"
              >
                <CalendarDays size={14} aria-hidden="true" className="inline mr-1" /> Go to Today
              </Button>
            </>
          )}

          {/* ════════════════════
              MONTH & YEAR PICKER VIEW
          ════════════════════ */}
          {(monthOnly || showYearPicker) && (
            <div className="max-h-96 overflow-y-auto pb-2">
              {monthOnly && (
                <label className="mb-4 flex items-center justify-between gap-3 text-support text-chandra-text-secondary">
                  Year
                  <select value={viewYear} onChange={event => handleSelectYear(Number(event.target.value))}
                    className="min-h-[44px] rounded-control border border-white/10 bg-chandra-bg-elevated px-3 text-body text-chandra-text-primary">
                    {(!YEARS.includes(viewYear) ? [...YEARS, viewYear].sort((a, b) => a - b) : YEARS).map(year => <option key={year}>{year}</option>)}
                  </select>
                </label>
              )}
              <div className="mb-5">
                <p className="mb-2 text-xs uppercase tracking-widest text-chandra-text-secondary">Month</p>
                <div className="grid grid-cols-3 gap-2">
                  {MONTH_NAMES.map((month, i) => (
                    <button
                      key={month}
                      onClick={() => handleSelectMonth(i)}
                      aria-label={`${month} ${viewYear}`}
                      aria-pressed={i === viewMonth}
                      className={`py-3 rounded-control text-sm font-medium transition-all ${
                        i === viewMonth
                          ? 'bg-chandra-gold text-chandra-text-inverse font-bold'
                          : 'bg-chandra-bg-elevated text-chandra-text-primary hover:bg-chandra-bg-primary'
                      }`}
                    >
                      {month.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>

              {!monthOnly && <div>
                <p className="mb-2 text-xs uppercase tracking-widest text-chandra-text-secondary">Year</p>
                <div className="grid grid-cols-4 gap-2">
                  {YEARS.map(y => (
                    <button
                      key={y}
                      ref={y === viewYear ? selectedYearRef : null}
                      onClick={() => handleSelectYear(y)}
                      aria-label={y === THIS_YEAR ? `${y}, current year` : `${y}`}
                      aria-pressed={y === viewYear}
                      className={`py-3 rounded-control text-sm font-medium transition-all ${
                        y === viewYear
                          ? 'bg-chandra-gold text-chandra-text-inverse font-bold'
                          : y === THIS_YEAR
                          ? 'border border-chandra-gold/60 text-chandra-gold'
                          : 'bg-chandra-bg-elevated text-chandra-text-primary hover:bg-chandra-bg-primary'
                      }`}
                    >
                      {y}
                    </button>
                  ))}
                </div>
              </div>}
            </div>
          )}

        </div>
    </BottomSheet>
  )
}

export default DatePickerSheet
