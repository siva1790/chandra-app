import { useState, useEffect } from 'react'
import { useSettings } from '../SettingsContext'
import { useSubscription } from '../SubscriptionContext'
import { cities } from '../cities'
import { initDevice, updateDevice, deactivateDevice } from '../notifications'
import { trackEvent } from '../analytics'
import { Settings as SettingsIcon, MapPin, Globe, Calendar as CalendarIcon, Bell, Mail, LocateFixed } from 'lucide-react'

// ── Notification toggle helpers ──
const NOTIF_KEY         = 'chandra-notif-prefs'
const NOTIF_ENABLED_KEY = 'chandra-notif-enabled'
const DEFAULT_PREFS = { festivals: true, eclipses: true, moonrise: true, ekadashi: true }

const loadNotifPrefs = () => {
  try {
    const saved = localStorage.getItem(NOTIF_KEY)
    return saved ? { ...DEFAULT_PREFS, ...JSON.parse(saved) } : DEFAULT_PREFS
  } catch { return DEFAULT_PREFS }
}

const saveNotifPrefs = (prefs) => {
  try { localStorage.setItem(NOTIF_KEY, JSON.stringify(prefs)) } catch {}
}

const loadNotifEnabled = () => {
  try {
    const saved = localStorage.getItem(NOTIF_ENABLED_KEY)
    return saved === null ? true : saved === 'true'  // default on when permission granted
  } catch { return true }
}

const Settings = ({ onOpenSubscribe }) => {
  const { settings, updateSettings } = useSettings()
  const { subscription, updateFrequency } = useSubscription()
  const [citySearch, setCitySearch]           = useState('')
  const [showCityList, setShowCityList]       = useState(false)
  const [activeCityIndex, setActiveCityIndex] = useState(-1)
  const [saved, setSaved] = useState(false)

  // ── Push notification state ──
  const [notifPermission, setNotifPermission] = useState('default')
  const [notifEnabled, setNotifEnabled] = useState(false)
  const [notifPrefs, setNotifPrefs] = useState(loadNotifPrefs)
  const [showPreview, setShowPreview] = useState(false)

  useEffect(() => {
    if ('Notification' in window) {
      const perm = Notification.permission
      setNotifPermission(perm)
      if (perm === 'granted') setNotifEnabled(loadNotifEnabled())
    }
  }, [])

  // Refresh FCM device registration whenever city changes (or on first mount if
  // notifications are already enabled). This keeps the backend's city/lat/lon current.
  useEffect(() => {
    if (notifPermission === 'granted' && notifEnabled) {
      initDevice(settings.city, settings.lat, settings.lon, notifPrefs, settings.calendarSystem).catch(() => {})
    }
  }, [settings.city, settings.lat, settings.lon, settings.calendarSystem]) // eslint-disable-line react-hooks/exhaustive-deps

  // Shows the in-app notification preview for 5 seconds
  const triggerPreview = () => {
    setShowPreview(true)
    setTimeout(() => setShowPreview(false), 5000)
  }

  const requestPermission = async () => {
    if (!('Notification' in window)) return
    const result = await Notification.requestPermission()
    setNotifPermission(result)
    if (result === 'granted') {
      setNotifEnabled(true)
      localStorage.setItem(NOTIF_ENABLED_KEY, 'true')
      triggerPreview()
      trackEvent('notification_enabled', { city: settings.city })
      // Register this device in Firestore so the backend can send push notifications
      initDevice(settings.city, settings.lat, settings.lon, notifPrefs, settings.calendarSystem).catch(() => {})
    }
  }

  const toggleNotifMaster = (val) => {
    setNotifEnabled(val)
    localStorage.setItem(NOTIF_ENABLED_KEY, val ? 'true' : 'false')
    if (!val) trackEvent('notification_disabled')
    if (val && notifPermission === 'granted') {
      triggerPreview()
      // Re-activate device in case it was previously deactivated
      initDevice(settings.city, settings.lat, settings.lon, notifPrefs, settings.calendarSystem).catch(() => {})
    } else if (!val) {
      // Mark device inactive — backend will skip this device until re-enabled
      deactivateDevice().catch(() => {})
    }
  }

  const toggleNotifPref = (key) => {
    const updated = { ...notifPrefs, [key]: !notifPrefs[key] }
    setNotifPrefs(updated)
    saveNotifPrefs(updated)
    // Sync updated prefs to Firestore if device is active
    if (notifPermission === 'granted' && notifEnabled) {
      updateDevice({
        notifPrefs: {
          festivals: updated.festivals,
          eclipses:  updated.eclipses,
          moonrise:  updated.moonrise,
          ekadashi:  updated.ekadashi,
        },
        notifPrefsVersion: 2,
      }).catch(() => {})
    }
  }

  const [gpsLoading, setGpsLoading] = useState(false)
  const [gpsError, setGpsError]     = useState(null)

  // Haversine distance in km between two lat/lon pairs
  const haversine = (lat1, lon1, lat2, lon2) => {
    const R = 6371
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = Math.sin(dLat / 2) ** 2
      + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  }

  const snapToNearest = (lat, lon) => {
    let nearest = cities[0]
    let minDist = Infinity
    for (const city of cities) {
      const d = haversine(lat, lon, city.lat, city.lon)
      if (d < minDist) { minDist = d; nearest = city }
    }
    return nearest
  }

  const handleUseGps = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.')
      return
    }
    setGpsLoading(true)
    setGpsError(null)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        const nearest = snapToNearest(latitude, longitude)
        updateSettings('city', nearest.name)
        updateSettings('lat', nearest.lat)
        updateSettings('lon', nearest.lon)
        updateSettings('usingGps', true)
        setGpsLoading(false)
        showSavedBadge()
        trackEvent('city_changed', { city_name: nearest.name, via: 'gps' })
      },
      (err) => {
        setGpsLoading(false)
        if (err.code === 1)
          setGpsError('Location access denied. Please allow location in your browser settings.')
        else if (err.code === 2)
          setGpsError('Unable to detect your location. Please select a city manually.')
        else
          setGpsError('Location request timed out. Please try again.')
      },
      { timeout: 10000, maximumAge: 60000 }
    )
  }

  const filteredCities = cities.filter(c =>
    c.name.toLowerCase().includes(citySearch.toLowerCase()) ||
    c.state.toLowerCase().includes(citySearch.toLowerCase())
  )

  const selectCity = (city) => {
    updateSettings('city', city.name)
    updateSettings('lat', city.lat)
    updateSettings('lon', city.lon)
    updateSettings('usingGps', false)
    setCitySearch('')
    setShowCityList(false)
    setActiveCityIndex(-1)
    showSavedBadge()
    trackEvent('city_changed', { city_name: city.name })
  }

  const handleCityKeyDown = (e) => {
    if (e.key === 'Escape' && showCityList) {
      setShowCityList(false)
      setActiveCityIndex(-1)
      return
    }
    if (!showCityList || filteredCities.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveCityIndex(i => Math.min(i + 1, filteredCities.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveCityIndex(i => Math.max(i - 1, -1))
    } else if (e.key === 'Enter' && activeCityIndex >= 0) {
      e.preventDefault()
      selectCity(filteredCities[activeCityIndex])
    }
  }

  const showSavedBadge = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleLanguageChange = (lang) => {
    updateSettings('language', lang)
    showSavedBadge()
  }

  const handleCalendarChange = (system) => {
    updateSettings('calendarSystem', system)
    showSavedBadge()
  }

  return (
    <div className="min-h-screen px-4 py-8 pb-28 max-w-md mx-auto">

      <NotificationPreview visible={showPreview} onDismiss={() => setShowPreview(false)} />

      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-yellow-300 mb-1 flex items-center justify-center gap-2">
          <SettingsIcon size={22} aria-hidden="true" strokeWidth={1.75} /> Settings
        </h1>
        <p className="text-gray-400 text-sm">Personalise your Chandra experience</p>
      </div>

      {/* Saved Badge */}
      {saved && (
        <div role="status" aria-live="polite" className="bg-green-900 border border-green-600 rounded-xl p-3 text-center mb-4 transition-all">
          <p className="text-green-300 text-sm">✓ Settings saved</p>
        </div>
      )}

      <div className="flex flex-col gap-5">

        {/* Current Settings Summary */}
        <div className="bg-gray-900 rounded-2xl p-5 border border-yellow-900">
          <p className="text-yellow-500 text-xs uppercase tracking-widest mb-3">Current Settings</p>
          <div className="flex flex-col gap-2">
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm flex items-center gap-1"><MapPin size={13} aria-hidden="true" /> City</span>
              <span className="text-white text-sm font-medium">{settings.city}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm flex items-center gap-1"><Globe size={13} aria-hidden="true" /> Language</span>
              <span className="text-white text-sm font-medium">{settings.language}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm flex items-center gap-1"><CalendarIcon size={13} aria-hidden="true" /> Calendar</span>
              <span className="text-white text-sm font-medium">{settings.calendarSystem}</span>
            </div>
          </div>
        </div>

        {/* City Selector */}
        <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
          <p className="text-yellow-500 text-xs uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <MapPin size={13} aria-hidden="true" /> Your City
          </p>
          <p className="text-gray-400 text-xs mb-3">
            Used for accurate moonrise, moonset and Rahu Kaal timings
          </p>

          {/* GPS Active Banner */}
          {settings.usingGps && (
            <div className="flex items-center gap-2 mb-3 px-3 py-2.5 bg-blue-950 border border-blue-800 rounded-xl">
              <LocateFixed size={13} className="text-blue-400 shrink-0" aria-hidden="true" />
              <p className="text-blue-300 text-xs flex-1">Using GPS — {settings.city}</p>
              <button
                onClick={() => updateSettings('usingGps', false)}
                className="text-blue-400 text-xs hover:text-blue-300 transition-all min-w-[44px] min-h-[44px] flex items-center justify-end"
                aria-label="Stop using GPS location"
              >
                Change
              </button>
            </div>
          )}

          {/* GPS Error */}
          {gpsError && (
            <div role="alert" aria-live="assertive" className="flex items-start gap-2 mb-3 px-3 py-2.5 bg-red-950 border border-red-800 rounded-xl">
              <p className="text-red-300 text-xs leading-relaxed">{gpsError}</p>
            </div>
          )}

          {/* Use my location button */}
          <button
            onClick={handleUseGps}
            disabled={gpsLoading}
            aria-busy={gpsLoading}
            className="w-full flex items-center justify-center gap-2 mb-3 px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-sm text-gray-300 hover:border-gray-600 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
          >
            <LocateFixed size={14} aria-hidden="true" />
            {gpsLoading ? 'Detecting location…' : 'Use my location'}
          </button>

          {/* Search Input — combobox */}
          <label htmlFor="city-search" className="sr-only">Search for a city</label>
          <input
            id="city-search"
            type="text"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={showCityList && citySearch.length > 0}
            aria-controls="settings-city-listbox"
            aria-activedescendant={activeCityIndex >= 0 ? `settings-city-opt-${activeCityIndex}` : undefined}
            placeholder="Search city or state..."
            value={citySearch}
            onChange={(e) => { setCitySearch(e.target.value); setShowCityList(true); setActiveCityIndex(-1) }}
            onFocus={() => setShowCityList(true)}
            onBlur={() => setTimeout(() => { setShowCityList(false); setActiveCityIndex(-1) }, 150)}
            onKeyDown={handleCityKeyDown}
            className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 text-sm border border-gray-700 focus:border-[#8EA8FF] focus-visible:ring-2 focus-visible:ring-[#8EA8FF]/40 focus:outline-none placeholder-gray-500"
          />

          {/* City Listbox */}
          {showCityList && citySearch.length > 0 && (
            <ul
              id="settings-city-listbox"
              role="listbox"
              aria-label="City suggestions"
              className="mt-2 bg-gray-800 rounded-xl border border-gray-700 max-h-48 overflow-y-auto"
            >
              {filteredCities.length > 0 ? (
                filteredCities.map((city, i) => (
                  <li
                    key={i}
                    id={`settings-city-opt-${i}`}
                    role="option"
                    aria-selected={i === activeCityIndex}
                    onMouseDown={() => selectCity(city)}
                    className={`px-4 py-3 transition-all border-b border-gray-700 last:border-0 cursor-pointer ${
                      i === activeCityIndex ? 'bg-gray-700' : 'hover:bg-gray-700'
                    }`}
                  >
                    <p className="text-white text-sm font-medium">{city.name}</p>
                    <p className="text-gray-400 text-xs">{city.state}</p>
                  </li>
                ))
              ) : (
                <li role="option" aria-selected="false" aria-disabled="true"
                    className="text-gray-400 text-sm px-4 py-3">
                  No cities found
                </li>
              )}
            </ul>
          )}

          {/* Quick Select Popular Cities */}
          {!showCityList || citySearch.length === 0 ? (
            <div className="mt-3">
              <p className="text-gray-400 text-xs mb-2">Popular cities:</p>
              <div className="flex flex-wrap gap-2">
                {['Bengaluru', 'Mumbai', 'Delhi', 'Chennai', 'Kolkata', 'Hyderabad'].map(name => {
                  const city = cities.find(c => c.name === name)
                  return (
                    <button
                      key={name}
                      onClick={() => city && selectCity(city)}
                      className={`px-3 py-1 rounded-full text-xs border transition-all ${
                        settings.city === name
                          ? 'bg-yellow-900 border-yellow-600 text-yellow-300'
                          : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500'
                      }`}
                    >
                      {name}
                    </button>
                  )
                })}
              </div>
            </div>
          ) : null}
        </div>

        {/* Language Selector */}
        <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
          <p className="text-yellow-500 text-xs uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <Globe size={13} aria-hidden="true" /> Language
          </p>
          <p className="text-gray-400 text-xs mb-3">
            More languages coming soon
          </p>
          <div className="flex flex-col gap-2">
            {[
              { code: 'English', label: 'English', native: 'English' },
              { code: 'Hindi', label: 'Hindi', native: 'हिन्दी — Coming Soon', disabled: true },
              { code: 'Tamil', label: 'Tamil', native: 'தமிழ் — Coming Soon', disabled: true },
              { code: 'Telugu', label: 'Telugu', native: 'తెలుగు — Coming Soon', disabled: true },
            ].map(lang => (
              <button
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code)}
                disabled={!!lang.disabled}
                aria-disabled={!!lang.disabled}
                className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                  lang.disabled
                    ? 'opacity-40 border-gray-800 bg-gray-800 cursor-not-allowed'
                    : settings.language === lang.code
                    ? 'bg-yellow-900 border-yellow-600'
                    : 'bg-gray-800 border-gray-700 hover:border-gray-600'
                }`}
              >
                <span className="text-white text-sm">{lang.native}</span>
                {settings.language === lang.code && !lang.disabled && (
                  <span className="text-yellow-400 text-sm">✓</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Calendar System */}
        <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
          <p className="text-yellow-500 text-xs uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <CalendarIcon size={13} aria-hidden="true" /> Calendar System
          </p>
          <p className="text-gray-400 text-xs mb-4">
            Choose the lunar calendar tradition followed in your region
          </p>
          <div className="flex flex-col gap-3">
            {[
              {
                code: 'Amavasyant',
                label: 'Amavasyant (Amanta)',
                tag: 'Ends month on 🌑 New Moon',
                desc: 'Followed in South & West India — Karnataka, Tamil Nadu, Andhra Pradesh, Telangana, Kerala, Maharashtra, Gujarat'
              },
              {
                code: 'Purnimant',
                label: 'Purnimant (Purnimanta)',
                tag: 'Ends month on 🌕 Full Moon',
                desc: 'Followed in North & Central India — Uttar Pradesh, Bihar, Rajasthan, Punjab, Haryana, Madhya Pradesh, Himachal Pradesh'
              }
            ].map(system => (
              <button
                key={system.code}
                onClick={() => handleCalendarChange(system.code)}
                className={`text-left px-4 py-4 rounded-xl border transition-all ${
                  settings.calendarSystem === system.code
                    ? 'bg-yellow-900 border-yellow-600'
                    : 'bg-gray-800 border-gray-700 hover:border-gray-600'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-white text-sm font-semibold">{system.label}</p>
                  {settings.calendarSystem === system.code && (
                    <span className="text-yellow-400 text-sm">✓</span>
                  )}
                </div>
                <p className="text-yellow-400 text-xs mb-2">{system.tag}</p>
                <p className="text-gray-400 text-xs leading-relaxed">{system.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Push Notifications */}
        <div className="bg-gray-900 rounded-2xl p-5 border border-yellow-900">
          <p className="text-yellow-500 text-xs uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <Bell size={13} aria-hidden="true" /> Push Notifications
          </p>

          {/* Permission denied state */}
          {notifPermission === 'denied' && (
            <div className="bg-red-950 border border-red-800 rounded-xl p-4 mb-3">
              <p className="text-red-300 text-sm font-medium mb-1">Notifications blocked</p>
              <p className="text-red-400 text-xs leading-relaxed">
                You've blocked notifications for this site. To enable them, open your browser's
                site settings and allow notifications for Chandra, then return here.
              </p>
            </div>
          )}

          {/* Permission not yet asked */}
          {notifPermission === 'default' && (
            <div className="bg-yellow-950 border border-yellow-800 rounded-xl px-4 py-3 mb-4 flex items-center justify-between gap-3">
              <p className="text-yellow-200 text-xs leading-relaxed flex-1">
                Allow Chandra to send festival and eclipse alerts to this device.
              </p>
              <button
                onClick={requestPermission}
                className="bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-bold text-xs px-4 py-2 rounded-lg shrink-0 transition-all"
              >
                Allow
              </button>
            </div>
          )}

          {/* Permission granted — green confirmation */}
          {notifPermission === 'granted' && (
            <div className="bg-green-950 border border-green-800 rounded-xl px-4 py-2.5 mb-3 flex items-center gap-2">
              <span className="text-green-400 text-sm">✓</span>
              <p className="text-green-300 text-xs">Notifications enabled for this device</p>
            </div>
          )}


          {/* Master toggle + sub-toggles — locked until permission granted */}
          <div className={notifPermission !== 'granted' ? 'opacity-30 pointer-events-none' : ''}>
            {notifPermission !== 'granted' && (
              <p className="text-gray-400 text-xs mb-3 flex items-center gap-1.5">
                <span>🔒</span> Grant permission above to configure alerts
              </p>
            )}

            {/* Master toggle */}
            <div className="flex items-center justify-between py-2 border-b border-gray-800">
              <span className="text-white text-sm">Enable all alerts</span>
              <Toggle on={notifEnabled} onToggle={() => toggleNotifMaster(!notifEnabled)} label="Enable all alerts" />
            </div>
            {!notifEnabled && notifPermission === 'granted' && (
              <p className="text-gray-400 text-xs leading-relaxed mt-2 mb-1">
                Alerts paused. To fully revoke, open your browser's site settings and block notifications for Chandra.
              </p>
            )}

            {/* Sub-toggles */}
            <div className={notifEnabled ? '' : 'opacity-40 pointer-events-none'}>
              {[
                { key: 'festivals', label: 'Festival alerts',    hint: 'Morning of the festival' },
                { key: 'eclipses', label: 'Eclipse alerts',      hint: '1 hour before eclipse begins' },
                { key: 'moonrise', label: 'Moonrise reminder',   hint: '30 min before moonrise' },
                { key: 'ekadashi', label: 'Ekadashi & Pradosh',  hint: 'Evening before' },
              ].map(({ key, label, hint }) => (
                <div key={key} className="flex items-center justify-between py-2.5 pl-3 border-b border-gray-800 last:border-0">
                  <div>
                    <p className="text-gray-200 text-sm">{label}</p>
                    <p className="text-gray-400 text-xs">{hint}</p>
                  </div>
                  <SubToggle on={notifPrefs[key]} onToggle={() => toggleNotifPref(key)} label={label} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Email Alerts — hidden until ENABLE_SUBSCRIPTIONS = true in App.jsx */}
        {/* To re-enable: set ENABLE_SUBSCRIPTIONS = true and remove this comment wrapper */}
        {false && (
        <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
          <p className="text-yellow-500 text-xs uppercase tracking-widest mb-1 flex items-center gap-1.5">
            <Mail size={13} aria-hidden="true" /> Email Alerts
          </p>
          <p className="text-gray-400 text-xs mb-4 leading-relaxed">
            Rich festival guides with stories, puja timings and moonrise times for {settings.city}.
          </p>

          {subscription ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-white text-sm font-medium">
                    {subscription.name ? `Hi, ${subscription.name}` : 'Subscribed'}
                  </p>
                  <p className="text-green-400 text-xs mt-0.5">✓ {subscription.email}</p>
                </div>
                <button
                  onClick={onOpenSubscribe}
                  className="text-yellow-400 text-sm font-medium px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 transition-all"
                >
                  Manage
                </button>
              </div>

              {/* Frequency chips */}
              <p className="text-gray-400 text-xs mb-2">Send me guides for</p>
              <div className="flex gap-2 flex-wrap">
                {[
                  { value: 'all',     label: 'All festivals' },
                  { value: 'major',   label: 'Major only' },
                  { value: 'monthly', label: 'Monthly digest' },
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => updateFrequency(value)}
                    className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
                      (subscription.emailFrequency || 'all') === value
                        ? 'bg-yellow-900 border-yellow-600 text-yellow-300'
                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-gray-400 text-sm leading-relaxed flex-1 mr-4">
                Subscribe to get personalised festival guides in your inbox.
              </p>
              <button
                onClick={onOpenSubscribe}
                className="bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-bold px-4 py-2 rounded-xl text-sm transition-all shrink-0"
              >
                Subscribe
              </button>
            </div>
          )}
        </div>
        )}

        {/* About */}
        <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
          <p className="text-yellow-500 text-xs uppercase tracking-widest mb-3">About</p>
          <div className="flex flex-col gap-2">
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm">App</span>
              <span className="text-white text-sm">Chandra</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm">Version</span>
              <span className="text-white text-sm">1.0.0 MVP</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm">Data source</span>
              <span className="text-white text-sm">NASA Astronomy Engine</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm">Calculations</span>
              <span className="text-white text-sm">On-device, no API</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

// Slides in from the top like a real Android notification banner
const NotificationPreview = ({ visible, onDismiss }) => (
  <div role="alert" aria-live="assertive" style={{
    position: 'fixed',
    top: visible ? '64px' : '-140px',
    left: '12px',
    right: '12px',
    zIndex: 999,
    transition: 'top 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
    background: '#1e1e30',
    border: '0.5px solid #3a3a5c',
    borderRadius: '16px',
    padding: '12px 14px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    maxWidth: '480px',
    margin: '0 auto',
  }}>
    <img
      src="/icons/icon-192.png"
      alt=""
      style={{ width: 36, height: 36, borderRadius: 8, flexShrink: 0 }}
    />
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500 }}>Chandra</span>
        <span style={{ fontSize: 11, color: '#9ca3af' }}>now</span>
      </div>
      <p style={{ fontSize: 13, color: '#ffffff', fontWeight: 500, margin: '0 0 3px' }}>
        🌙 Chandra alerts are on
      </p>
      <p style={{ fontSize: 12, color: '#9ca3af', margin: 0, lineHeight: 1.5 }}>
        You'll get festival and eclipse alerts right here. Namaste! 🙏
      </p>
    </div>
    <button
      onClick={onDismiss}
      style={{ background: 'none', border: 'none', color: '#9ca3af',
        cursor: 'pointer', fontSize: 16, padding: '0 0 0 4px', flexShrink: 0 }}
      aria-label="Dismiss"
    >✕</button>
  </div>
)

// Toggle — 44×24px container, 20×20px knob
const Toggle = ({ on, onToggle, label }) => (
  <button
    onClick={onToggle}
    role="switch"
    aria-checked={on}
    aria-label={label}
    style={{
      position: 'relative',
      width: '44px',
      height: '24px',
      borderRadius: '12px',
      background: on ? '#DDBB6A' : '#374151',
      border: '1.5px solid rgba(255,255,255,0.15)',
      cursor: 'pointer',
      flexShrink: 0,
      transition: 'background 0.2s',
      padding: 0,
      outline: 'none',
    }}
    onFocus={e => { e.currentTarget.style.boxShadow = '0 0 0 2px #8EA8FF' }}
    onBlur={e => { e.currentTarget.style.boxShadow = 'none' }}
  >
    <span style={{
      position: 'absolute',
      top: '50%',
      transform: 'translateY(-50%)',
      left: on ? '19px' : '2px',
      width: '20px',
      height: '20px',
      background: '#ffffff',
      borderRadius: '50%',
      transition: 'left 0.2s cubic-bezier(0.34,1.56,0.64,1)',
      display: 'block',
      boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
    }} />
  </button>
)

// SubToggle — 36×20px container, 16×16px knob
const SubToggle = ({ on, onToggle, label }) => (
  <button
    onClick={onToggle}
    role="switch"
    aria-checked={on}
    aria-label={label}
    style={{
      position: 'relative',
      width: '36px',
      height: '20px',
      borderRadius: '10px',
      background: on ? '#DDBB6A' : '#374151',
      border: '1.5px solid rgba(255,255,255,0.15)',
      cursor: 'pointer',
      flexShrink: 0,
      transition: 'background 0.2s',
      padding: 0,
      outline: 'none',
    }}
    onFocus={e => { e.currentTarget.style.boxShadow = '0 0 0 2px #8EA8FF' }}
    onBlur={e => { e.currentTarget.style.boxShadow = 'none' }}
  >
    <span style={{
      position: 'absolute',
      top: '50%',
      transform: 'translateY(-50%)',
      left: on ? '15px' : '2px',
      width: '16px',
      height: '16px',
      background: '#ffffff',
      borderRadius: '50%',
      transition: 'left 0.2s cubic-bezier(0.34,1.56,0.64,1)',
      display: 'block',
      boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
    }} />
  </button>
)

export default Settings
