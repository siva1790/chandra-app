import { useEffect, useRef, useState } from 'react'
import { BookOpen, ChevronDown, LocateFixed, MapPin, Search, X } from 'lucide-react'
import { cities } from '../cities.js'
import { PUBLIC_PANCHANG_CITIES } from '../publicPanchangCities.js'
import { useSettings } from '../SettingsContext.jsx'
import { trackEvent } from '../analytics.js'
import { getNearestCity } from '../locationUtils.js'
import Button from './ui/Button.jsx'
import './PanchangPreferences.css'

const cityNames = new Set(PUBLIC_PANCHANG_CITIES.map(city => city.name))
const orderedCities = [...cities].sort((a, b) => a.name.localeCompare(b.name, 'en'))

export default function PanchangPreferences() {
  const { settings, updateSettings } = useSettings()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(settings)
  const [query, setQuery] = useState('')
  const [feedback, setFeedback] = useState('')
  const [gpsLoading, setGpsLoading] = useState(false)
  const [gpsStatus, setGpsStatus] = useState(null)
  const gpsRequestRef = useRef(0)
  const triggerRef = useRef(null)
  const searchRef = useRef(null)

  useEffect(() => {
    if (open) searchRef.current?.focus()
  }, [open])
  useEffect(() => () => { gpsRequestRef.current++ }, [])

  const cancelGps = () => {
    gpsRequestRef.current++
    setGpsLoading(false)
    setGpsStatus(null)
  }

  const close = () => {
    cancelGps()
    setOpen(false)
    triggerRef.current?.focus()
  }
  const toggle = () => {
    if (open) return close()
    setDraft(settings)
    setQuery('')
    setFeedback('')
    cancelGps()
    setOpen(true)
  }
  const cityChanged = draft.city !== settings.city || draft.lat !== settings.lat || draft.lon !== settings.lon
  const systemChanged = draft.calendarSystem !== settings.calendarSystem
  const gpsSourceChanged = Boolean(draft.usingGps) !== Boolean(settings.usingGps)
  const apply = () => {
    if (gpsLoading || (!cityChanged && !systemChanged && !gpsSourceChanged)) return
    updateSettings({
      city: draft.city, lat: draft.lat, lon: draft.lon,
      calendarSystem: draft.calendarSystem,
      usingGps: Boolean(draft.usingGps),
    })
    if (cityChanged || gpsSourceChanged) trackEvent('city_changed', { city_name: draft.city, via: draft.usingGps ? 'gps' : 'panchang' })
    if (systemChanged) trackEvent('calendar_system_changed', { calendar_system: draft.calendarSystem, via: 'panchang' })
    setFeedback(`Panchang updated for ${draft.city} · ${draft.calendarSystem}.`)
    close()
  }
  const useMyLocation = () => {
    const request = ++gpsRequestRef.current
    const fail = error => {
      if (request !== gpsRequestRef.current) return
      setGpsLoading(false)
      const message = error?.code === 1
        ? 'Location access denied. Choose a city manually, or allow location access in your browser and try again.'
        : error?.code === 3
          ? 'Location request timed out. Please try again or choose a city manually.'
          : 'Unable to detect your location. Please choose a city manually.'
      setGpsStatus({ error: true, message })
    }
    if (!navigator.geolocation) {
      setGpsStatus({ error: true, message: 'Location is not supported by this browser. Please choose a city manually.' })
      return
    }
    setGpsLoading(true)
    setGpsStatus(null)
    try {
      navigator.geolocation.getCurrentPosition(position => {
        if (request !== gpsRequestRef.current) return
        try {
          const city = getNearestCity(position.coords.latitude, position.coords.longitude)
          setDraft(previous => ({ ...previous, city: city.name, lat: city.lat, lon: city.lon, usingGps: true }))
          setQuery('')
          setGpsLoading(false)
          setGpsStatus({ error: false, message: `Nearest supported city: ${city.name}, ${city.state}.` })
        } catch { fail() }
      }, fail, { timeout: 10000, maximumAge: 60000 })
    } catch { fail() }
  }
  const normalizedQuery = query.trim().toLowerCase()
  const chooseCity = city => {
    cancelGps()
    setDraft(previous => ({ ...previous, city: city.name, lat: city.lat, lon: city.lon, usingGps: false }))
  }
  const visibleCities = orderedCities.filter(city => normalizedQuery
    ? `${city.name} ${city.state}`.toLowerCase().includes(normalizedQuery)
    : cityNames.has(city.name))
  const selectedExtra = !normalizedQuery && !cityNames.has(draft.city) ? orderedCities.find(city => city.name === draft.city) : null
  const renderCity = (city, extra = false) => <label key={city.name} className={`panchang-city-option${extra ? ' panchang-selected-extra' : ''}`}>
    <input type="radio" name="panchang-city" value={city.name} checked={draft.city === city.name} onClick={() => { if (draft.city === city.name) chooseCity(city) }} onChange={() => chooseCity(city)} />
    <span>{city.name}<small>{city.state}</small></span>
  </label>

  return <div className="panchang-preferences">
    <button ref={triggerRef} type="button" className="panchang-context-picker" aria-expanded={open} aria-controls="panchang-preferences-editor" onClick={toggle}>
      <MapPin size={16} strokeWidth={1.75} aria-hidden="true" />
      <span>{settings.city} <span aria-hidden="true">·</span> {settings.calendarSystem}</span>
      <ChevronDown size={16} strokeWidth={1.75} aria-hidden="true" />
    </button>
    {open && <section id="panchang-preferences-editor" className="panchang-preferences-editor" aria-labelledby="panchang-preferences-title" onKeyDown={event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close() }
    }}>
      <div className="panchang-preferences-heading">
        <div><h2 id="panchang-preferences-title">Location &amp; calendar</h2><p>Choose how your Panchang is calculated.</p></div>
        <Button shape="icon" variant="quiet" onClick={close} aria-label="Cancel changes and close picker"><X size={18} aria-hidden="true" /></Button>
      </div>
      <div className="panchang-preferences-fields">
        <fieldset>
          <legend>Your city</legend>
          <label className="panchang-city-search"><Search size={18} aria-hidden="true" /><input ref={searchRef} type="search" aria-label="Search by city or state" placeholder="Search by city or state" autoComplete="off" value={query} onChange={event => setQuery(event.target.value)} /></label>
          <div className="panchang-city-options">
            {visibleCities.map(city => renderCity(city))}
            <button type="button" className="panchang-city-option panchang-use-location" onClick={useMyLocation} disabled={gpsLoading} aria-busy={gpsLoading}>
              <LocateFixed size={18} strokeWidth={1.75} aria-hidden="true" />
              <span>{gpsLoading ? 'Detecting location…' : 'Use my location'}<small>Nearest supported city</small></span>
            </button>
            {selectedExtra && renderCity(selectedExtra, true)}
          </div>
          {gpsStatus && <p className={`panchang-location-status ${gpsStatus.error ? 'panchang-location-error' : ''}`} role={gpsStatus.error ? 'alert' : 'status'}>{gpsStatus.message}</p>}
          {!visibleCities.length && <p role="status" className="panchang-preferences-empty">No matching cities. Try another city or state.</p>}
        </fieldset>
        <fieldset>
          <legend>Calendar system</legend>
          {[
            ['Amavasyant', 'Month ends at Amavasya (new moon).'],
            ['Purnimant', 'Month ends at Purnima (full moon).'],
          ].map(([system, description]) => <label key={system} className="panchang-system-option">
            <input type="radio" name="panchang-calendar-system" value={system} checked={draft.calendarSystem === system} onChange={() => setDraft(previous => ({ ...previous, calendarSystem: system }))} />
            <span><strong>{system}</strong><small>{description}</small></span>
          </label>)}
          <details className="panchang-system-guide">
            <summary><BookOpen size={16} aria-hidden="true" />Which should I choose?<ChevronDown size={16} aria-hidden="true" /></summary>
            <p>Choose the system followed by your family or local Panchang. Amavasyant is common in South and West India; Purnimant in North and Central India. Your city determines local timings.</p>
          </details>
        </fieldset>
      </div>
      <div className="panchang-preferences-actions">
        <p>{draft.city} · {draft.calendarSystem}</p>
        <div><Button variant="quiet" onClick={close}>Cancel</Button><Button variant="secondary" disabled={gpsLoading || (!cityChanged && !systemChanged && !gpsSourceChanged)} onClick={apply}>Apply changes</Button></div>
      </div>
    </section>}
    <p className="panchang-preferences-feedback" role="status">{feedback}</p>
  </div>
}
