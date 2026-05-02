import { useState, useEffect } from 'react'
import { getDatedFestivalsForDate, getMonthlyFestivalsForTithi } from '../festivals'
import { getMoonPhaseAngle, getTithiFromAngle, getPhaseEmoji } from '../moonUtils'

const Calendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [calendarDays, setCalendarDays] = useState([])
  const [selectedDay, setSelectedDay] = useState(null)

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  useEffect(() => {
    buildCalendar()
  }, [currentDate])

  const buildCalendar = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const today = new Date()

    const days = []

    // Empty slots for first row
    for (let i = 0; i < firstDay; i++) {
      days.push(null)
    }

    // Build each day with moon data
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d)
      const phaseAngle = getMoonPhaseAngle(date)
      const tithi = getTithiFromAngle(phaseAngle)
      // New festival API: combine exact-dated festivals with monthly observances,
      // deduping monthly entries already covered by a dated festival on the same day.
      const dated = getDatedFestivalsForDate(date)
      const monthly = getMonthlyFestivalsForTithi(tithi.adjustedNumber, tithi.paksha)
        .filter(m => !dated.some(df => df.name.includes(m.name)))
      const dayFestivals = [...dated, ...monthly]
      const isToday = d === today.getDate() &&
        month === today.getMonth() &&
        year === today.getFullYear()

      days.push({
        day: d,
        date,
        phaseAngle,
        phaseEmoji: getPhaseEmoji(phaseAngle),
        tithi,
        festivals: dayFestivals,
        isToday
      })
    }
    setCalendarDays(days)
  }

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
    setSelectedDay(null)
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
    setSelectedDay(null)
  }

  const upcomingFestivals = calendarDays
    .filter(d => d && d.festivals.length > 0)
    .filter(d => d.date >= new Date(new Date().setHours(0, 0, 0, 0)))
    .slice(0, 5)

  return (
    <div className="min-h-screen px-4 py-8 max-w-md mx-auto">

      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-yellow-300 mb-1">🗓️ Lunar Calendar</h1>
        <p className="text-gray-400 text-sm">Hindu Panchang Festival View</p>
      </div>

      {/* Month Navigator */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          className="text-yellow-300 text-2xl px-3 py-1 rounded-lg hover:bg-gray-800"
        >‹</button>
        <h2 className="text-white text-lg font-semibold">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h2>
        <button
          onClick={nextMonth}
          className="text-yellow-300 text-2xl px-3 py-1 rounded-lg hover:bg-gray-800"
        >›</button>
      </div>

      {/* Day Headers */}
      <div className="grid grid-cols-7 mb-2">
        {dayNames.map(day => (
          <div key={day} className="text-center text-gray-500 text-xs py-1">{day}</div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1 mb-6">
        {calendarDays.map((day, idx) => (
          <div
            key={idx}
            onClick={() => day && setSelectedDay(day)}
            className={`
              relative flex flex-col items-center justify-start pt-1 pb-1 rounded-xl min-h-14 cursor-pointer
              transition-all duration-150
              ${!day ? '' : 'hover:bg-gray-800'}
              ${day?.isToday ? 'bg-yellow-900 border border-yellow-500' : 'bg-gray-900'}
              ${selectedDay?.day === day?.day ? 'ring-2 ring-yellow-400' : ''}
            `}
          >
            {day && (
              <>
                <span className={`text-xs font-semibold ${day.isToday ? 'text-yellow-300' : 'text-white'}`}>
                  {day.day}
                </span>
                <span className="text-xs">{day.phaseEmoji}</span>
                {day.festivals.length > 0 && (
                  <span className="text-xs">{day.festivals[0].emoji}</span>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {/* Selected Day Detail */}
      {selectedDay && (
        <div className="bg-gray-900 rounded-2xl p-5 border border-yellow-900 mb-6">
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-white font-bold text-lg">
                {selectedDay.date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
              <p className="text-yellow-400 text-sm">
                {selectedDay.tithi.name} · {selectedDay.tithi.paksha}
              </p>
            </div>
            <span className="text-3xl">{selectedDay.phaseEmoji}</span>
          </div>

          {selectedDay.festivals.length > 0 ? (
            <div className="flex flex-col gap-3 mt-3">
              {selectedDay.festivals.map((f, i) => (
                <div key={i} className="bg-gray-800 rounded-xl p-3">
                  <p className="text-white font-semibold">{f.emoji} {f.name}</p>
                  <p className="text-gray-400 text-xs mt-1">{f.description}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm mt-2">No festivals on this day</p>
          )}
        </div>
      )}

      {/* Upcoming Festivals */}
      {upcomingFestivals.length > 0 && (
        <div>
          <p className="text-gray-400 text-xs uppercase tracking-widest mb-3">
            Upcoming Festivals
          </p>
          <div className="flex flex-col gap-3">
            {upcomingFestivals.map((day, i) => (
              <div
                key={i}
                onClick={() => setSelectedDay(day)}
                className="bg-gray-900 rounded-xl p-4 border border-gray-800 flex items-center gap-4 cursor-pointer hover:border-yellow-800 transition-all"
              >
                <div className="text-center min-w-10">
                  <p className="text-yellow-300 font-bold text-lg">{day.day}</p>
                  <p className="text-gray-500 text-xs">{monthNames[currentDate.getMonth()].slice(0, 3)}</p>
                </div>
                <div className="flex-1">
                  {day.festivals.map((f, fi) => (
                    <p key={fi} className="text-white text-sm font-medium">{f.emoji} {f.name}</p>
                  ))}
                  <p className="text-gray-500 text-xs mt-1">{day.tithi.name} · {day.tithi.paksha}</p>
                </div>
                <span className="text-2xl">{day.phaseEmoji}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default Calendar