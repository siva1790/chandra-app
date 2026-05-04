import { useState, useEffect } from 'react'
import { useSettings } from '../SettingsContext'
import { useSubscription } from '../SubscriptionContext'
import { cities } from '../cities'

// ── Notification toggle helpers ──
const NOTIF_KEY         = 'chandra-notif-prefs'
const NOTIF_ENABLED_KEY = 'chandra-notif-enabled'
const DEFAULT_PREFS = { festivals: true, eclipses: true, moonrise: true, ekadashi: false }

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
  const [citySearch, setCitySearch] = useState('')
  const [showCityList, setShowCityList] = useState(false)
  const [saved, setSaved] = useState(false)

  // ── Push notification state ──
  const [notifPermission, setNotifPermission] = useState('default')
  const [notifEnabled, setNotifEnabled] = useState(false)
  const [notifPrefs, setNotifPrefs] = useState(loadNotifPrefs)
  const [notifTestSent, setNotifTestSent] = useState(false)

  useEffect(() => {
    if ('Notification' in window) {
      const perm = Notification.permission
      setNotifPermission(perm)
      if (perm === 'granted') setNotifEnabled(loadNotifEnabled())
    }
  }, [])

  // Fires a welcome notification through the service worker (required when SW is present)
  const showWelcomeNotification = async () => {
    try {
      if ('serviceWorker' in navigator) {
        // Always use serviceWorker.ready — resolves once SW is active,
        // regardless of whether it has taken control of the current page yet
        const reg = await navigator.serviceWorker.ready
        await reg.showNotification('🌙 Chandra alerts are on', {
          body: "You'll get festival and eclipse alerts right here. Namaste! 🙏",
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-192.png',
          tag: 'chandra-welcome',  // prevents stacking duplicates
        })
      } else {
        new Notification('🌙 Chandra alerts are on', {
          body: "You'll get festival and eclipse alerts right here. Namaste! 🙏",
          icon: '/icons/icon-192.png',
        })
      }
      // Show in-app confirmation so it's clear the notification fired
      setNotifTestSent(true)
      setTimeout(() => setNotifTestSent(false), 4000)
    } catch (e) {
      console.warn('Chandra: welcome notification failed —', e)
    }
  }

  const requestPermission = async () => {
    if (!('Notification' in window)) return
    const result = await Notification.requestPermission()
    setNotifPermission(result)
    if (result === 'granted') {
      setNotifEnabled(true)
      localStorage.setItem(NOTIF_ENABLED_KEY, 'true')
      await showWelcomeNotification()
    }
  }

  const toggleNotifMaster = async (val) => {
    setNotifEnabled(val)
    localStorage.setItem(NOTIF_ENABLED_KEY, val ? 'true' : 'false')
    // Fire welcome notification whenever alerts are turned on,
    // covering users whose permission was already granted before this session
    if (val && notifPermission === 'granted') {
      await showWelcomeNotification()
    }
  }

  const toggleNotifPref = (key) => {
    const updated = { ...notifPrefs, [key]: !notifPrefs[key] }
    setNotifPrefs(updated)
    saveNotifPrefs(updated)
  }

  const filteredCities = cities.filter(c =>
    c.name.toLowerCase().includes(citySearch.toLowerCase()) ||
    c.state.toLowerCase().includes(citySearch.toLowerCase())
  )

  const selectCity = (city) => {
    updateSettings('city', city.name)
    updateSettings('lat', city.lat)
    updateSettings('lon', city.lon)
    setCitySearch('')
    setShowCityList(false)
    showSavedBadge()
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

      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-yellow-300 mb-1">⚙️ Settings</h1>
        <p className="text-gray-400 text-sm">Personalise your Chandra experience</p>
      </div>

      {/* Saved Badge */}
      {saved && (
        <div className="bg-green-900 border border-green-600 rounded-xl p-3 text-center mb-4 transition-all">
          <p className="text-green-300 text-sm">✓ Settings saved</p>
        </div>
      )}

      <div className="flex flex-col gap-5">

        {/* Current Settings Summary */}
        <div className="bg-gray-900 rounded-2xl p-5 border border-yellow-900">
          <p className="text-yellow-500 text-xs uppercase tracking-widest mb-3">Current Settings</p>
          <div className="flex flex-col gap-2">
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm">📍 City</span>
              <span className="text-white text-sm font-medium">{settings.city}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm">🌐 Language</span>
              <span className="text-white text-sm font-medium">{settings.language}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm">📅 Calendar</span>
              <span className="text-white text-sm font-medium">{settings.calendarSystem}</span>
            </div>
          </div>
        </div>

        {/* City Selector */}
        <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
          <p className="text-yellow-500 text-xs uppercase tracking-widest mb-3">
            📍 Your City
          </p>
          <p className="text-gray-400 text-xs mb-3">
            Used for accurate moonrise, moonset and Rahu Kaal timings
          </p>

          {/* Search Input */}
          <input
            type="text"
            placeholder="Search city or state..."
            value={citySearch}
            onChange={(e) => {
              setCitySearch(e.target.value)
              setShowCityList(true)
            }}
            onFocus={() => setShowCityList(true)}
            className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 text-sm border border-gray-700 focus:border-yellow-600 focus:outline-none placeholder-gray-500"
          />

          {/* City Dropdown */}
          {showCityList && citySearch.length > 0 && (
            <div className="mt-2 bg-gray-800 rounded-xl border border-gray-700 max-h-48 overflow-y-auto">
              {filteredCities.length > 0 ? (
                filteredCities.map((city, i) => (
                  <button
                    key={i}
                    onClick={() => selectCity(city)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-700 transition-all border-b border-gray-700 last:border-0"
                  >
                    <p className="text-white text-sm font-medium">{city.name}</p>
                    <p className="text-gray-400 text-xs">{city.state}</p>
                  </button>
                ))
              ) : (
                <p className="text-gray-500 text-sm px-4 py-3">No cities found</p>
              )}
            </div>
          )}

          {/* Quick Select Popular Cities */}
          {!showCityList || citySearch.length === 0 ? (
            <div className="mt-3">
              <p className="text-gray-500 text-xs mb-2">Popular cities:</p>
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
          <p className="text-yellow-500 text-xs uppercase tracking-widest mb-3">
            🌐 Language
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
          <p className="text-yellow-500 text-xs uppercase tracking-widest mb-3">
            📅 Calendar System
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
          <p className="text-yellow-500 text-xs uppercase tracking-widest mb-3">
            🔔 Push Notifications
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

          {/* In-app confirmation after test notification fires */}
          {notifTestSent && (
            <div className="bg-yellow-950 border border-yellow-700 rounded-xl px-4 py-2.5 mb-3 flex items-center gap-2">
              <span className="text-yellow-400 text-sm">🔔</span>
              <p className="text-yellow-200 text-xs">
                Notification sent — pull down your notification bar to see it
              </p>
            </div>
          )}

          {/* Master toggle + sub-toggles — locked until permission granted */}
          <div className={notifPermission !== 'granted' ? 'opacity-30 pointer-events-none' : ''}>
            {notifPermission !== 'granted' && (
              <p className="text-gray-500 text-xs mb-3 flex items-center gap-1.5">
                <span>🔒</span> Grant permission above to configure alerts
              </p>
            )}

            {/* Master toggle */}
            <div className="flex items-center justify-between py-2 border-b border-gray-800">
              <span className="text-white text-sm">Enable all alerts</span>
              <Toggle on={notifEnabled} onToggle={() => toggleNotifMaster(!notifEnabled)} />
            </div>
            {!notifEnabled && notifPermission === 'granted' && (
              <p className="text-gray-500 text-xs leading-relaxed mt-2 mb-1">
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
                    <p className="text-gray-500 text-xs">{hint}</p>
                  </div>
                  <SubToggle on={notifPrefs[key]} onToggle={() => toggleNotifPref(key)} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Email Alerts */}
        <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
          <p className="text-yellow-500 text-xs uppercase tracking-widest mb-1">
            ✉️ Email Alerts
          </p>
          <p className="text-gray-500 text-xs mb-4 leading-relaxed">
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
              <p className="text-gray-500 text-xs mb-2">Send me guides for</p>
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

// Toggle — 44×24px container, 20×20px knob
const Toggle = ({ on, onToggle }) => (
  <button
    onClick={onToggle}
    aria-pressed={on}
    style={{
      position: 'relative',
      width: '44px',
      height: '24px',
      borderRadius: '12px',
      background: on ? '#fbbf24' : '#374151',
      border: 'none',
      cursor: 'pointer',
      flexShrink: 0,
      transition: 'background 0.2s',
      padding: 0,
    }}
  >
    <span style={{
      position: 'absolute',
      top: '2px',
      left: on ? '22px' : '2px',
      width: '20px',
      height: '20px',
      background: '#ffffff',
      borderRadius: '50%',
      transition: 'left 0.2s',
      display: 'block',
    }} />
  </button>
)

// SubToggle — 36×20px container, 16×16px knob
const SubToggle = ({ on, onToggle }) => (
  <button
    onClick={onToggle}
    aria-pressed={on}
    style={{
      position: 'relative',
      width: '36px',
      height: '20px',
      borderRadius: '10px',
      background: on ? '#fbbf24' : '#374151',
      border: 'none',
      cursor: 'pointer',
      flexShrink: 0,
      transition: 'background 0.2s',
      padding: 0,
    }}
  >
    <span style={{
      position: 'absolute',
      top: '2px',
      left: on ? '18px' : '2px',
      width: '16px',
      height: '16px',
      background: '#ffffff',
      borderRadius: '50%',
      transition: 'left 0.2s',
      display: 'block',
    }} />
  </button>
)

export default Settings
