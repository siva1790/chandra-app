import { MapPin } from 'lucide-react'
import CalendarTraditionSelect from './CalendarTraditionSelect.jsx'

export default function CalendarMasthead({ title, titleId, subtitle, city }) {
  return (
    <header className="calendar-masthead">
      <div className="calendar-header">
        <h1 id={titleId} className="text-chandra-gold text-page-title">{title}</h1>
        <div className="calendar-header-details">
          <p className="calendar-subtitle text-sm text-chandra-text-secondary">{subtitle}</p>
          <p className="calendar-context">
            <MapPin size={14} strokeWidth={1.75} aria-hidden="true" />
            <span>{city}</span>
          </p>
        </div>
      </div>
      <CalendarTraditionSelect />
    </header>
  )
}
