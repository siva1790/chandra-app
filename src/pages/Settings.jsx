import { useState } from 'react'
import { useSettings } from '../SettingsContext'
import { cities } from '../cities'

const Settings = () => {
  const { settings, updateSettings } = useSettings()
  const [citySearch, setCitySearch] = useState('')
  const [showCityList, setShowCityList] = useState(false)
  const [saved, setSaved] = useState(false)

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
    <div className="min-h-screen px-4 py-8 max-w-md mx-auto">

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
                onClick={() => !lang.disabled && handleLanguageChange(lang.code)}
                className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                  lang.disabled
                    ? 'opacity-40 cursor-not-allowed border-gray-800 bg-gray-800'
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
          <p className="text-gray-400 text-xs mb-3">
            Amavasyant ends the month on new moon (South India). Purnimant ends on full moon (North India).
          </p>
          <div className="flex flex-col gap-2">
            {[
              {
                code: 'Amavasyant',
                label: 'Amavasyant',
                desc: 'South Indian — Karnataka, Tamil Nadu, Andhra, Kerala, Maharashtra'
              },
              {
                code: 'Purnimant',
                label: 'Purnimant',
                desc: 'North Indian — UP, Bihar, Rajasthan, Punjab, Haryana'
              }
            ].map(system => (
              <button
                key={system.code}
                onClick={() => handleCalendarChange(system.code)}
                className={`text-left px-4 py-3 rounded-xl border transition-all ${
                  settings.calendarSystem === system.code
                    ? 'bg-yellow-900 border-yellow-600'
                    : 'bg-gray-800 border-gray-700 hover:border-gray-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-white text-sm font-medium">{system.label}</p>
                  {settings.calendarSystem === system.code && (
                    <span className="text-yellow-400 text-sm">✓</span>
                  )}
                </div>
                <p className="text-gray-400 text-xs mt-1">{system.desc}</p>
              </button>
            ))}
          </div>
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

export default Settings