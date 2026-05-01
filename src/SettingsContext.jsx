import { createContext, useContext, useState, useEffect } from 'react'

const SettingsContext = createContext()

export const useSettings = () => useContext(SettingsContext)

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(() => {
    // Load saved settings from localStorage on first load
    const saved = localStorage.getItem('chandra-settings')
    return saved ? JSON.parse(saved) : {
      city: 'Bengaluru',
      lat: 12.9716,
      lon: 77.5946,
      language: 'English',
      calendarSystem: 'Amavasyant',
      notifications: false,
    }
  })

  // Save to localStorage whenever settings change
  useEffect(() => {
    localStorage.setItem('chandra-settings', JSON.stringify(settings))
  }, [settings])

  const updateSettings = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  )
}