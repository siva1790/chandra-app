import CityPageLinks from '../components/CityPageLinks.jsx'
import { useState, useEffect } from 'react'
import { useSettings } from '../SettingsContext'
import { useProfile } from '../ProfileContext'
import { useSubscription } from '../SubscriptionContext'
import { ENABLE_PUSH_NOTIFICATIONS, ENABLE_SUBSCRIPTIONS } from '../featureFlags'
import { cities } from '../cities'
import { initDevice, updateDevice, deactivateDevice } from '../notifications'
import { trackEvent } from '../analytics'
import { MapPin, Globe, Calendar as CalendarIcon, Bell, Mail, LocateFixed, ShieldCheck, BookOpen, User, Clock, CalendarDays, CheckCircle2, LockKeyhole, X, ChevronDown } from 'lucide-react'
import Toggle from '../components/ui/Toggle'
import './Settings.css'

// ── Notification toggle helpers ──
const NOTIF_KEY         = 'chandra-notif-prefs'
const NOTIF_ENABLED_KEY = 'chandra-notif-enabled'
const DEFAULT_PREFS = { festivals: true, eclipses: true, moonrise: true, ekadashi: true }

const CARD_CLASS = 'rounded-card border border-white/10 bg-chandra-bg-surface p-5'
const FEATURED_CARD_CLASS = 'rounded-card border border-chandra-gold/35 bg-chandra-bg-surface p-5'
const SECTION_TITLE_CLASS = 'mb-3 flex items-center gap-2 text-card-title text-chandra-gold'
const INPUT_CLASS = 'mt-2 w-full rounded-control border border-white/10 bg-chandra-bg-elevated px-4 py-3 text-input text-chandra-text-primary placeholder-chandra-text-disabled focus:border-chandra-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-chandra-focus/40'
const SECONDARY_BUTTON_CLASS = 'min-h-[44px] rounded-control border border-white/10 bg-chandra-bg-elevated px-4 py-3 text-control text-chandra-text-secondary transition-all hover:border-white/20 hover:text-chandra-text-primary'
const CHIP_CLASS = 'rounded-pill border px-3 py-1 text-meta transition-all'

const loadNotifPrefs = () => {
  try {
    const saved = localStorage.getItem(NOTIF_KEY)
    return saved ? { ...DEFAULT_PREFS, ...JSON.parse(saved) } : DEFAULT_PREFS
  } catch { return DEFAULT_PREFS }
}

const saveNotifPrefs = (prefs) => {
  try {
    localStorage.setItem(NOTIF_KEY, JSON.stringify(prefs))
  } catch {
    // Local storage may be unavailable in private browsing or restricted webviews.
  }
}

const loadNotifEnabled = () => {
  try {
    const saved = localStorage.getItem(NOTIF_ENABLED_KEY)
    return saved === null ? true : saved === 'true'  // default on when permission granted
  } catch { return true }
}

const Settings = ({ onOpenSubscribe, onLearn, onBack, returnLabel = 'Panchang', entryReason }) => {
  const { settings, updateSettings } = useSettings()
  const { profile, profileComplete, saveProfile } = useProfile()
  const { subscription, updateFrequency } = useSubscription()
  const [citySearch, setCitySearch]           = useState('')
  const [showCityList, setShowCityList]       = useState(false)
  const [activeCityIndex, setActiveCityIndex] = useState(-1)
  const [saved, setSaved] = useState(false)
  const [profileForm, setProfileForm] = useState(profile)
  const [profileErrors, setProfileErrors] = useState({})
  const [editingProfile, setEditingProfile] = useState(() => !profileComplete)
  const [profileSavedFromPersonalize, setProfileSavedFromPersonalize] = useState(false)
  const [birthCitySearch, setBirthCitySearch] = useState('')
  const [showBirthCityList, setShowBirthCityList] = useState(false)
  const [activeBirthCityIndex, setActiveBirthCityIndex] = useState(-1)

  // ── Push notification state ──
  const [notifPermission, setNotifPermission] = useState(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) return Notification.permission
    return 'default'
  })
  const [notifEnabled, setNotifEnabled] = useState(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      return loadNotifEnabled()
    }
    return false
  })
  const [notifPrefs, setNotifPrefs] = useState(loadNotifPrefs)
  const [showPreview, setShowPreview] = useState(false)

  useEffect(() => {
    if (entryReason !== 'personalize') setProfileSavedFromPersonalize(false)
  }, [entryReason])

  // Refresh FCM device registration whenever city changes (or on first mount if
  // notifications are already enabled). This keeps the backend's city/lat/lon current.
  useEffect(() => {
    if (!ENABLE_PUSH_NOTIFICATIONS) return
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

  const filteredBirthCities = cities.filter(c =>
    c.name.toLowerCase().includes(birthCitySearch.toLowerCase()) ||
    c.state.toLowerCase().includes(birthCitySearch.toLowerCase())
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

  const updateProfileForm = (key, value) => {
    setProfileForm(prev => ({ ...prev, [key]: value }))
    setProfileErrors(prev => ({ ...prev, [key]: undefined, form: undefined }))
    setProfileSavedFromPersonalize(false)
  }

  const selectBirthCity = (city) => {
    setProfileForm(prev => ({
      ...prev,
      birthPlace: city.name,
      birthState: city.state,
      birthLat: city.lat,
      birthLon: city.lon,
      sameAsCurrentLocation: false,
    }))
    setBirthCitySearch('')
    setShowBirthCityList(false)
    setActiveBirthCityIndex(-1)
    setProfileErrors(prev => ({ ...prev, birthPlace: undefined, form: undefined }))
    setProfileSavedFromPersonalize(false)
  }

  const toggleSameAsCurrentLocation = (checked) => {
    setProfileForm(prev => ({
      ...prev,
      sameAsCurrentLocation: checked,
      ...(checked ? {
        birthPlace: settings.city,
        birthState: '',
        birthLat: settings.lat,
        birthLon: settings.lon,
      } : {
        birthPlace: '',
        birthState: '',
        birthLat: null,
        birthLon: null,
      }),
    }))
    setBirthCitySearch('')
    setShowBirthCityList(false)
    setActiveBirthCityIndex(-1)
    setProfileErrors(prev => ({ ...prev, birthPlace: undefined, form: undefined }))
    setProfileSavedFromPersonalize(false)
  }

  const validateProfileForm = () => {
    const errors = {}
    if (!profileForm.dob) errors.dob = 'Date of birth is required.'
    if (!profileForm.birthTime) errors.birthTime = 'Time of birth is required.'

    const hasBirthLocation = profileForm.sameAsCurrentLocation
      ? Boolean(settings.city && Number.isFinite(settings.lat) && Number.isFinite(settings.lon))
      : Boolean(profileForm.birthPlace && Number.isFinite(profileForm.birthLat) && Number.isFinite(profileForm.birthLon))

    if (!hasBirthLocation) errors.birthPlace = 'Birth location is required.'
    return errors
  }

  const handleSaveProfile = () => {
    const errors = validateProfileForm()
    if (Object.keys(errors).length > 0) {
      setProfileErrors(errors)
      return
    }

    const nextProfile = profileForm.sameAsCurrentLocation
      ? {
        ...profileForm,
        birthPlace: settings.city,
        birthState: '',
        birthLat: settings.lat,
        birthLon: settings.lon,
      }
      : profileForm

    saveProfile(nextProfile)
    setProfileForm(nextProfile)
    setProfileErrors({})
    setEditingProfile(false)
    setProfileSavedFromPersonalize(entryReason === 'personalize')
    showSavedBadge()
  }

  const handleCancelProfileEdit = () => {
    setProfileForm(profile)
    setProfileErrors({})
    setBirthCitySearch('')
    setShowBirthCityList(false)
    setActiveBirthCityIndex(-1)
    setProfileSavedFromPersonalize(false)
    setEditingProfile(false)
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

  const handleBirthCityKeyDown = (e) => {
    if (e.key === 'Escape' && showBirthCityList) {
      setShowBirthCityList(false)
      setActiveBirthCityIndex(-1)
      return
    }
    if (!showBirthCityList || filteredBirthCities.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveBirthCityIndex(i => Math.min(i + 1, filteredBirthCities.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveBirthCityIndex(i => Math.max(i - 1, -1))
    } else if (e.key === 'Enter' && activeBirthCityIndex >= 0) {
      e.preventDefault()
      selectBirthCity(filteredBirthCities[activeBirthCityIndex])
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
    <div className="settings-page min-h-screen px-4 py-8 pb-28 max-w-md mx-auto">

      {ENABLE_PUSH_NOTIFICATIONS && (
        <NotificationPreview visible={showPreview} onDismiss={() => setShowPreview(false)} />
      )}

      {/* Header */}
      <div className="settings-heading text-center mb-6">
        <h1 className="mb-1 flex items-center justify-center gap-2 text-chandra-gold text-page-title">
          Settings
        </h1>
        <p className="text-sm text-chandra-text-secondary">Personalise your Chandra experience</p>
      </div>

      {/* Saved Badge */}
      {saved && (
        <div role="status" aria-live="polite" className="mb-4 rounded-card border border-chandra-success/35 bg-chandra-success/15 p-3 text-center transition-all">
          <p className="text-sm text-chandra-success">Settings saved</p>
        </div>
      )}

      <div className="settings-grid flex flex-col gap-5">

        {/* Current Settings Summary */}
        <div className={`settings-summary ${FEATURED_CARD_CLASS}`}>
          <h2 className="mb-3 text-chandra-gold text-card-title">Current Settings</h2>
          <div className="settings-summary-content flex flex-col gap-2">
            <div className="flex justify-between">
              <span className="flex items-center gap-1 text-sm text-chandra-text-secondary"><MapPin size={13} aria-hidden="true" /> City</span>
              <span className="text-sm font-medium text-chandra-text-primary">{settings.city}</span>
            </div>
            <div className="flex justify-between">
              <span className="flex items-center gap-1 text-sm text-chandra-text-secondary"><Globe size={13} aria-hidden="true" /> Language</span>
              <span className="text-sm font-medium text-chandra-text-primary">{settings.language}</span>
            </div>
            <div className="flex justify-between">
              <span className="flex items-center gap-1 text-sm text-chandra-text-secondary"><CalendarIcon size={13} aria-hidden="true" /> Calendar</span>
              <span className="text-sm font-medium text-chandra-text-primary">{settings.calendarSystem}</span>
            </div>
          </div>
        </div>

        {/* Personal Details */}
        <div className={`settings-personal ${CARD_CLASS}`}>
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <h2 className={SECTION_TITLE_CLASS}>
                <User size={13} aria-hidden="true" /> Personal Details
              </h2>
              <p className="mt-2 text-support leading-relaxed text-chandra-text-secondary">
                Stored on this device. Used later for Rasi, Nakshatra and personalised daily messages.
              </p>
            </div>
            {!editingProfile && (
              <button
                type="button"
                onClick={() => {
                  setProfileSavedFromPersonalize(false)
                  setEditingProfile(true)
                }}
                className="min-h-[44px] rounded-control border border-white/10 bg-chandra-bg-elevated px-3 py-2 text-control text-chandra-gold transition-all hover:border-chandra-gold/35"
              >
                Edit
              </button>
            )}
          </div>

          {!editingProfile ? (
            <div className="flex flex-col gap-2">
              {profileSavedFromPersonalize && profileComplete && onBack && (
                <div role="status" aria-live="polite" className="mb-2 flex items-start gap-3 rounded-card border border-chandra-success/35 bg-chandra-success/15 p-3">
                  <CheckCircle2 size={20} strokeWidth={1.8} aria-hidden="true" className="mt-0.5 shrink-0 text-chandra-success" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-chandra-text-primary">Your details are saved</p>
                    <p className="mt-1 text-support leading-relaxed text-chandra-text-secondary">
                      Your birth details are saved for future personalized features.
                    </p>
                    <button
                      type="button"
                      onClick={onBack}
                      className="mt-3 min-h-[44px] rounded-control bg-chandra-gold px-4 text-control text-chandra-text-inverse hover:bg-chandra-gold-hover"
                    >
                      Return to {returnLabel}
                    </button>
                  </div>
                </div>
              )}
              <div className="flex justify-between gap-3">
                <span className="text-sm text-chandra-text-secondary">Status</span>
                <span className={`text-sm font-medium ${profileComplete ? 'text-chandra-success' : 'text-chandra-gold'}`}>
                  {profileComplete ? 'Complete' : 'Not set'}
                </span>
              </div>
              {profile.name && (
                <div className="flex justify-between gap-3">
                  <span className="text-sm text-chandra-text-secondary">Name</span>
                  <span className="text-right text-sm font-medium text-chandra-text-primary">{profile.name}</span>
                </div>
              )}
              <div className="flex justify-between gap-3">
                <span className="text-sm text-chandra-text-secondary">Date of birth</span>
                <span className="text-sm font-medium text-chandra-text-primary">{profile.dob || 'Not added'}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-sm text-chandra-text-secondary">Time of birth (IST)</span>
                <span className="text-sm font-medium text-chandra-text-primary">{profile.birthTime || 'Not added'}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-sm text-chandra-text-secondary">Birth location</span>
                <span className="text-right text-sm font-medium text-chandra-text-primary">{profile.birthPlace || 'Not added'}</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div>
                <label htmlFor="profile-name" className="text-sm font-medium text-chandra-text-primary">Name <span className="font-normal text-chandra-text-disabled">(optional)</span></label>
                <input
                  id="profile-name"
                  type="text"
                  autoComplete="name"
                  value={profileForm.name}
                  onChange={(e) => updateProfileForm('name', e.target.value)}
                  placeholder="Your name"
                  className={INPUT_CLASS}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="profile-dob" className="flex items-center gap-1.5 text-sm font-medium text-chandra-text-primary">
                    <CalendarDays size={13} aria-hidden="true" /> Date of birth
                  </label>
                  <input
                    id="profile-dob"
                    type="date"
                    value={profileForm.dob}
                    onChange={(e) => updateProfileForm('dob', e.target.value)}
                    aria-invalid={!!profileErrors.dob}
                    aria-describedby={profileErrors.dob ? 'profile-dob-error' : undefined}
                    className={INPUT_CLASS}
                  />
                  {profileErrors.dob && <p id="profile-dob-error" className="mt-1 text-support text-chandra-error">{profileErrors.dob}</p>}
                </div>

                <div>
                  <label htmlFor="profile-birth-time" className="flex items-center gap-1.5 text-sm font-medium text-chandra-text-primary">
                    <Clock size={13} aria-hidden="true" /> Time of birth (IST)
                  </label>
                  <input
                    id="profile-birth-time"
                    type="time"
                    value={profileForm.birthTime}
                    onChange={(e) => updateProfileForm('birthTime', e.target.value)}
                    aria-invalid={!!profileErrors.birthTime}
                    aria-describedby={profileErrors.birthTime ? 'profile-birth-time-error' : undefined}
                    className={INPUT_CLASS}
                  />
                  {profileErrors.birthTime && <p id="profile-birth-time-error" className="mt-1 text-support text-chandra-error">{profileErrors.birthTime}</p>}
                </div>
              </div>

              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="flex items-center gap-1.5 text-sm font-medium text-chandra-text-primary">
                      <MapPin size={13} aria-hidden="true" /> Place of birth
                    </p>
                    <p className="mt-1 text-support text-chandra-text-secondary">Required for accurate birth Rasi and Nakshatra.</p>
                  </div>
                </div>

                <label className="settings-birth-location mt-3 flex cursor-pointer items-start gap-3 rounded-control border border-white/10 bg-chandra-bg-elevated px-3 py-3">
                  <input
                    type="checkbox"
                    checked={profileForm.sameAsCurrentLocation}
                    onChange={(e) => toggleSameAsCurrentLocation(e.target.checked)}
                    className="mt-1 accent-chandra-gold"
                  />
                  <span>
                    <span className="block text-sm font-medium text-chandra-text-primary">Same as current location</span>
                    <span className="mt-0.5 block text-support text-chandra-text-secondary">{settings.city}</span>
                  </span>
                </label>

                {!profileForm.sameAsCurrentLocation && (
                  <div className="mt-3">
                    <label htmlFor="birth-city-search" className="sr-only">Search birth city</label>
                    <input
                      id="birth-city-search"
                      type="text"
                      role="combobox"
                      aria-autocomplete="list"
                      aria-expanded={showBirthCityList && birthCitySearch.length > 0}
                      aria-controls="birth-city-listbox"
                      aria-activedescendant={activeBirthCityIndex >= 0 ? `birth-city-opt-${activeBirthCityIndex}` : undefined}
                      placeholder={profileForm.birthPlace ? `${profileForm.birthPlace}${profileForm.birthState ? `, ${profileForm.birthState}` : ''}` : 'Search birth city or state...'}
                      value={birthCitySearch}
                      onChange={(e) => { setBirthCitySearch(e.target.value); setShowBirthCityList(true); setActiveBirthCityIndex(-1) }}
                      onFocus={() => setShowBirthCityList(true)}
                      onBlur={() => setTimeout(() => { setShowBirthCityList(false); setActiveBirthCityIndex(-1) }, 150)}
                      onKeyDown={handleBirthCityKeyDown}
                      aria-invalid={!!profileErrors.birthPlace}
                      aria-describedby={profileErrors.birthPlace ? 'birth-city-error' : undefined}
                      className={INPUT_CLASS}
                    />

                    {showBirthCityList && birthCitySearch.length > 0 && (
                      <ul
                        id="birth-city-listbox"
                        role="listbox"
                        aria-label="Birth city suggestions"
                        className="mt-2 max-h-48 overflow-y-auto rounded-control border border-white/10 bg-chandra-bg-elevated"
                      >
                        {filteredBirthCities.length > 0 ? (
                          filteredBirthCities.map((city, i) => (
                            <li
                              key={`${city.name}-${city.state}`}
                              id={`birth-city-opt-${i}`}
                              role="option"
                              aria-selected={i === activeBirthCityIndex}
                              onMouseDown={() => selectBirthCity(city)}
                              className={`cursor-pointer border-b border-white/10 px-4 py-3 transition-all last:border-0 ${
                                i === activeBirthCityIndex ? 'bg-chandra-bg-primary' : 'hover:bg-chandra-bg-primary'
                              }`}
                            >
                              <p className="text-sm font-medium text-chandra-text-primary">{city.name}</p>
                              <p className="text-support text-chandra-text-secondary">{city.state}</p>
                            </li>
                          ))
                        ) : (
                          <li role="option" aria-selected="false" aria-disabled="true" className="px-4 py-3 text-sm text-chandra-text-secondary">
                            No cities found
                          </li>
                        )}
                      </ul>
                    )}

                    {profileForm.birthPlace && (
                      <p className="mt-2 text-support text-chandra-success">Selected: {profileForm.birthPlace}{profileForm.birthState ? `, ${profileForm.birthState}` : ''}</p>
                    )}
                  </div>
                )}
                {profileErrors.birthPlace && <p id="birth-city-error" className="mt-2 text-support text-chandra-error">{profileErrors.birthPlace}</p>}
              </div>

              <div className="settings-profile-actions flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  className="min-h-[44px] flex-1 rounded-control bg-chandra-gold px-4 py-3 text-control text-chandra-text-inverse transition-all hover:bg-chandra-gold-hover"
                >
                  Save Details
                </button>
                {profileComplete && (
                  <button
                    type="button"
                    onClick={handleCancelProfileEdit}
                    className={SECONDARY_BUTTON_CLASS}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* City Selector */}
        <div className={`settings-city ${CARD_CLASS}`}>
          <h2 className={SECTION_TITLE_CLASS}>
            <MapPin size={13} aria-hidden="true" /> Your City
          </h2>
          <p className="mb-3 text-support text-chandra-text-secondary">
            Used for accurate moonrise, moonset and Rahu Kaal timings
          </p>

          {/* GPS Active Banner */}
          {settings.usingGps && (
            <div className="mb-3 flex items-center gap-2 rounded-card border border-chandra-info/35 bg-chandra-info/15 px-3 py-2.5">
              <LocateFixed size={13} className="shrink-0 text-chandra-info" aria-hidden="true" />
              <p className="flex-1 text-support text-chandra-info">Using GPS — {settings.city}</p>
              <button
                onClick={() => updateSettings('usingGps', false)}
                className="flex min-h-[44px] min-w-[44px] items-center justify-end text-support text-chandra-focus transition-all hover:underline"
                aria-label="Stop using GPS location"
              >
                Change
              </button>
            </div>
          )}

          {/* GPS Error */}
          {gpsError && (
            <div role="alert" aria-live="assertive" className="mb-3 flex items-start gap-2 rounded-card border border-chandra-error/40 bg-chandra-error/15 px-3 py-2.5">
              <p className="text-support leading-relaxed text-chandra-error">{gpsError}</p>
            </div>
          )}

          {/* Use my location button */}
          <button
            onClick={handleUseGps}
            disabled={gpsLoading}
            aria-busy={gpsLoading}
            className="mb-3 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-control border border-white/10 bg-chandra-bg-elevated px-4 py-2.5 text-sm text-chandra-text-secondary transition-all hover:border-white/20 hover:text-chandra-text-primary disabled:cursor-not-allowed disabled:opacity-50"
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
            className={INPUT_CLASS}
          />

          {/* City Listbox */}
          {showCityList && citySearch.length > 0 && (
            <ul
              id="settings-city-listbox"
              role="listbox"
              aria-label="City suggestions"
              className="mt-2 max-h-48 overflow-y-auto rounded-control border border-white/10 bg-chandra-bg-elevated"
            >
              {filteredCities.length > 0 ? (
                filteredCities.map((city, i) => (
                  <li
                    key={i}
                    id={`settings-city-opt-${i}`}
                    role="option"
                    aria-selected={i === activeCityIndex}
                    onMouseDown={() => selectCity(city)}
                    className={`cursor-pointer border-b border-white/10 px-4 py-3 transition-all last:border-0 ${
                      i === activeCityIndex ? 'bg-chandra-bg-primary' : 'hover:bg-chandra-bg-primary'
                    }`}
                  >
                    <p className="text-sm font-medium text-chandra-text-primary">{city.name}</p>
                    <p className="text-support text-chandra-text-secondary">{city.state}</p>
                  </li>
                ))
              ) : (
                <li role="option" aria-selected="false" aria-disabled="true"
                    className="px-4 py-3 text-sm text-chandra-text-secondary">
                  No cities found
                </li>
              )}
            </ul>
          )}

          {/* Quick Select Popular Cities */}
          {!showCityList || citySearch.length === 0 ? (
            <div className="mt-3">
              <p className="mb-2 text-support text-chandra-text-secondary">Popular cities:</p>
              <div className="flex flex-wrap gap-2">
                {['Bengaluru', 'Mumbai', 'Delhi', 'Chennai', 'Kolkata', 'Hyderabad'].map(name => {
                  const city = cities.find(c => c.name === name)
                  return (
                    <button
                      key={name}
                      onClick={() => city && selectCity(city)}
                      className={`${CHIP_CLASS} ${
                        settings.city === name
                          ? 'border-chandra-gold/60 bg-chandra-gold/15 text-chandra-gold'
                          : 'border-white/10 bg-chandra-bg-elevated text-chandra-text-secondary hover:border-white/20'
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
        <div className={`settings-language ${CARD_CLASS}`}>
          <h2 className={SECTION_TITLE_CLASS}>
            <Globe size={13} aria-hidden="true" /> Language
          </h2>
          <p className="mb-3 text-support text-chandra-text-secondary">
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
                className={`flex items-center justify-between rounded-control border px-4 py-3 transition-all ${
                  lang.disabled
                    ? 'cursor-not-allowed border-white/10 bg-chandra-bg-elevated opacity-40'
                    : settings.language === lang.code
                    ? 'border-chandra-gold/60 bg-chandra-gold/15'
                    : 'border-white/10 bg-chandra-bg-elevated hover:border-white/20'
                }`}
              >
                <span className="text-sm text-chandra-text-primary">{lang.native}</span>
                {settings.language === lang.code && !lang.disabled && (
                  <CheckCircle2 size={16} strokeWidth={1.8} aria-hidden="true" className="text-chandra-gold" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Calendar System */}
        <div className={`settings-calendar ${CARD_CLASS}`}>
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 className="flex items-center gap-1.5 text-chandra-gold text-card-title">
              <CalendarIcon size={13} aria-hidden="true" /> Calendar System
            </h2>
            <button
              type="button"
              onClick={() => onLearn?.('calendar-system')}
              aria-label="Learn about calendar systems"
              className="-my-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-icon text-chandra-gold hover:bg-chandra-gold/10 active:bg-chandra-gold/15"
            >
              <BookOpen size={16} strokeWidth={1.75} aria-hidden="true" />
            </button>
          </div>
          <p className="mb-5 text-support text-chandra-text-secondary">
            Choose the lunar calendar tradition followed in your family or region.
          </p>
          <fieldset className="flex flex-col gap-3">
            <legend className="sr-only">Calendar system</legend>
            {[
              {
                code: 'Amavasyant',
                label: 'Amavasyant (Amanta)',
                tag: 'Month ends on the New Moon 🌑',
              },
              {
                code: 'Purnimant',
                label: 'Purnimant (Purnimanta)',
                tag: 'Month ends on the Full Moon 🌕',
              }
            ].map(system => (
              <label
                key={system.code}
                className={`settings-calendar-option flex cursor-pointer items-start gap-3 rounded-control border p-4 text-left transition-all ${
                  settings.calendarSystem === system.code
                    ? 'border-chandra-gold/60 bg-chandra-gold/15'
                    : 'border-white/10 bg-chandra-bg-elevated hover:border-white/20'
                }`}
              >
                <span className="flex min-w-0 flex-1 flex-col gap-2">
                  <span className="text-body font-semibold text-chandra-text-primary">{system.label}</span>
                  <span className="text-support text-chandra-text-secondary">{system.tag}</span>
                </span>
                <input type="radio" name="calendar-system" value={system.code} checked={settings.calendarSystem === system.code} onChange={() => handleCalendarChange(system.code)} className="mt-0.5 h-5 w-5 shrink-0 accent-chandra-gold" />
              </label>
            ))}
          </fieldset>
          <details className="settings-calendar-guide mt-6 border-t border-white/10 pt-3">
            <summary className="flex min-h-[44px] cursor-pointer items-center justify-between gap-3 rounded-control text-control text-chandra-focus">
              Which should I choose?<ChevronDown size={16} aria-hidden="true" />
            </summary>
            <div className="grid gap-5 pt-4 text-support text-chandra-text-secondary">
              <div><h3 className="mb-2 text-body text-chandra-text-primary font-semibold">Amavasyant (Amanta)</h3><p>Common in South and West India: Karnataka, Tamil Nadu, Andhra Pradesh, Telangana, Kerala, Maharashtra and Gujarat.</p></div>
              <div><h3 className="mb-2 text-body text-chandra-text-primary font-semibold">Purnimant (Purnimanta)</h3><p>Common in North and Central India: Uttar Pradesh, Bihar, Rajasthan, Punjab, Haryana, Madhya Pradesh and Himachal Pradesh.</p></div>
              <p className="border-t border-white/10 pt-4">Traditions can vary. Follow the calendar used by your family or local temple.</p>
            </div>
          </details>
          <p className="settings-calendar-summary mt-2 text-support leading-relaxed text-chandra-text-secondary">Amavasyant is common in South and West India; Purnimant in North and Central India.</p>
        </div>

        {/* Push Notifications — hidden until ENABLE_PUSH_NOTIFICATIONS is enabled */}
        {ENABLE_PUSH_NOTIFICATIONS && (
        <div className={FEATURED_CARD_CLASS}>
          <p className={SECTION_TITLE_CLASS}>
            <Bell size={13} aria-hidden="true" /> Push Notifications
          </p>

          {/* Permission denied state */}
          {notifPermission === 'denied' && (
            <div className="mb-3 rounded-card border border-chandra-error/40 bg-chandra-error/15 p-4">
              <p className="mb-1 text-sm font-medium text-chandra-error">Notifications blocked</p>
              <p className="text-support leading-relaxed text-chandra-text-secondary">
                You've blocked notifications for this site. To enable them, open your browser's
                site settings and allow notifications for Chandra, then return here.
              </p>
            </div>
          )}

          {/* Permission not yet asked */}
          {notifPermission === 'default' && (
            <div className="mb-4 flex items-center justify-between gap-3 rounded-card border border-chandra-gold/35 bg-chandra-gold/15 px-4 py-3">
              <p className="flex-1 text-support leading-relaxed text-chandra-text-primary">
                Allow Chandra to send festival and eclipse alerts to this device.
              </p>
              <button
                onClick={requestPermission}
                className="shrink-0 rounded-control bg-chandra-gold px-4 py-2 text-control text-chandra-text-inverse transition-all hover:bg-chandra-gold-hover"
              >
                Allow
              </button>
            </div>
          )}

          {/* Permission granted — green confirmation */}
          {notifPermission === 'granted' && (
            <div className="mb-3 flex items-center gap-2 rounded-card border border-chandra-success/35 bg-chandra-success/15 px-4 py-2.5">
              <CheckCircle2 size={16} strokeWidth={1.8} aria-hidden="true" className="text-chandra-success" />
              <p className="text-support text-chandra-success">Notifications enabled for this device</p>
            </div>
          )}


          {/* Master toggle + sub-toggles — locked until permission granted */}
          <div className={notifPermission !== 'granted' ? 'opacity-30 pointer-events-none' : ''}>
            {notifPermission !== 'granted' && (
              <p className="mb-3 flex items-center gap-1.5 text-support text-chandra-text-secondary">
                <LockKeyhole size={13} strokeWidth={1.75} aria-hidden="true" /> Grant permission above to configure alerts
              </p>
            )}

            {/* Master toggle */}
            <div className="flex items-center justify-between border-b border-white/10 py-2">
              <span className="text-sm text-chandra-text-primary">Enable all alerts</span>
              <Toggle on={notifEnabled} onToggle={() => toggleNotifMaster(!notifEnabled)} label="Enable all alerts" />
            </div>
            {!notifEnabled && notifPermission === 'granted' && (
              <p className="mb-1 mt-2 text-support leading-relaxed text-chandra-text-secondary">
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
                <div key={key} className="flex items-center justify-between border-b border-white/10 py-2.5 pl-3 last:border-0">
                  <div>
                    <p className="text-sm text-chandra-text-primary">{label}</p>
                    <p className="text-support text-chandra-text-secondary">{hint}</p>
                  </div>
                  <Toggle on={notifPrefs[key]} onToggle={() => toggleNotifPref(key)} label={label} size="sm" />
                </div>
              ))}
            </div>
          </div>
        </div>
        )}

        {/* Email Alerts — hidden until ENABLE_SUBSCRIPTIONS is enabled */}
        {ENABLE_SUBSCRIPTIONS && onOpenSubscribe && (
        <div className={CARD_CLASS}>
          <p className="mb-1 flex items-center gap-1.5 text-support uppercase tracking-widest text-chandra-gold">
            <Mail size={13} aria-hidden="true" /> Email Alerts
          </p>
          <p className="mb-4 text-support leading-relaxed text-chandra-text-secondary">
            Rich festival guides with stories, puja timings and moonrise times for {settings.city}.
          </p>

          {subscription ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-medium text-chandra-text-primary">
                    {subscription.name ? `Hi, ${subscription.name}` : 'Subscribed'}
                  </p>
                  <p className="mt-0.5 text-support text-chandra-success">{subscription.email}</p>
                </div>
                <button
                  onClick={onOpenSubscribe}
                  className="rounded-control bg-chandra-bg-elevated px-3 py-1.5 text-sm font-medium text-chandra-gold transition-all hover:bg-chandra-bg-primary"
                >
                  Manage
                </button>
              </div>

              {/* Frequency chips */}
              <p className="mb-2 text-support text-chandra-text-secondary">Send me guides for</p>
              <div className="flex gap-2 flex-wrap">
                {[
                  { value: 'all',     label: 'All festivals' },
                  { value: 'major',   label: 'Major only' },
                  { value: 'monthly', label: 'Monthly digest' },
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => updateFrequency(value)}
                    className={`rounded-pill border px-3 py-1.5 text-support transition-all ${
                      (subscription.emailFrequency || 'all') === value
                        ? 'border-chandra-gold/60 bg-chandra-gold/15 text-chandra-gold'
                        : 'border-white/10 bg-chandra-bg-elevated text-chandra-text-secondary hover:border-white/20'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between">
              <p className="mr-4 flex-1 text-sm leading-relaxed text-chandra-text-secondary">
                Subscribe to get personalised festival guides in your inbox.
              </p>
              <button
                onClick={onOpenSubscribe}
                className="shrink-0 rounded-control bg-chandra-gold px-4 py-2 text-sm font-bold text-chandra-text-inverse transition-all hover:bg-chandra-gold-hover"
              >
                Subscribe
              </button>
            </div>
          )}
        </div>
        )}

        {/* City links and learning resources; About lives in the header menu. */}
        <div className={`settings-resources ${CARD_CLASS}`}>
          <div className="settings-cities"><CityPageLinks /></div>
          <div className="settings-resource-links">
            <button type="button" onClick={() => onLearn?.('pancha-anga')} className="flex min-h-[44px] items-center gap-2 text-sm text-chandra-focus">
              <BookOpen size={16} strokeWidth={1.75} aria-hidden="true" className="text-chandra-gold" />Learn Panchang basics
            </button>
            <a
              href="/privacy.html"
              className="group mt-1 flex min-h-[44px] items-center justify-between border-t border-white/10 pt-2 text-sm"
            >
              <span className="flex items-center gap-1 text-chandra-text-secondary">
                <ShieldCheck size={13} aria-hidden="true" />
                Privacy Policy
              </span>
              <span className="text-chandra-focus group-hover:underline">View</span>
            </a>
          </div>
        </div>

      </div>
      <footer className="settings-footer"><span>Your preferences, your Chandra</span><span>Chandra · Indian Moon Tracker</span></footer>
    </div>
  )
}

// Slides in from the top like a real Android notification banner
const NotificationPreview = ({ visible, onDismiss }) => (
  <div
    role="alert"
    aria-live="assertive"
    aria-hidden={visible ? undefined : 'true'}
    {...(!visible && { inert: '' })}
    className={`fixed left-3 right-3 top-16 z-[999] mx-auto flex max-w-[480px] items-start gap-2.5 rounded-card border border-white/10 bg-chandra-bg-elevated px-3.5 py-3 shadow-[0_8px_24px_rgba(0,0,0,0.45)] transition-transform duration-300 ${
      visible ? 'translate-y-0' : 'pointer-events-none -translate-y-56'
    }`}
  >
    <img
      src="/icons/chandra-mark-topbar-96.png"
      alt=""
      className="h-9 w-9 shrink-0 rounded-icon"
    />
    <div className="min-w-0 flex-1">
      <div className="mb-0.5 flex justify-between">
        <span className="text-meta font-medium text-chandra-text-secondary">Chandra</span>
        <span className="text-meta text-chandra-text-secondary">now</span>
      </div>
      <p className="mb-0.5 text-control text-chandra-text-primary">
        🌙 Chandra alerts are on
      </p>
      <p className="text-support leading-relaxed text-chandra-text-secondary">
        You'll get festival and eclipse alerts right here. Namaste! 🙏
      </p>
    </div>
    <button
      onClick={onDismiss}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-icon text-chandra-text-secondary hover:bg-chandra-bg-primary hover:text-chandra-text-primary"
      aria-label="Dismiss"
    >
      <X size={16} strokeWidth={1.75} aria-hidden="true" />
    </button>
  </div>
)

export default Settings
