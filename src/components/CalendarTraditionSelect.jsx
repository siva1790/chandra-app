import { useSettings } from '../SettingsContext.jsx'
import { CALENDAR_TRADITIONS } from '../regionalCalendar.js'

export default function CalendarTraditionSelect() {
  const { settings, updateSettings } = useSettings()
  const tradition = Object.hasOwn(CALENDAR_TRADITIONS, settings.calendarTradition) ? settings.calendarTradition : ''
  return (
    <label className="calendar-tradition">
      <span>Calendar tradition</span>
      <select value={tradition} onChange={event => updateSettings('calendarTradition', event.target.value || null)}>
        <option value="">Shared festivals</option>
        {Object.entries(CALENDAR_TRADITIONS).map(([id, item]) => <option key={id} value={id}>{item.name}</option>)}
      </select>
    </label>
  )
}
