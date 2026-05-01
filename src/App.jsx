import { useState } from 'react'
import './index.css'
import Home from './pages/Home'
import Calendar from './pages/Calendar'
import Panchang from './pages/Panchang'
import Settings from './pages/Settings'
import { useSettings } from './SettingsContext'
import InstallPrompt from './components/InstallPrompt'

function App() {
  const [screen, setScreen] = useState('home')
  const { settings } = useSettings()

  return (
    <div className="min-h-screen pb-20">
      <InstallPrompt />
      {screen === 'home' && <Home location={settings} />}
      {screen === 'calendar' && <Calendar />}
      {screen === 'panchang' && <Panchang location={settings} />}
      {screen === 'settings' && <Settings />}

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-950 border-t border-gray-800 flex justify-around items-center px-4 py-3 z-50">
        <button
          onClick={() => setScreen('home')}
          className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all ${
            screen === 'home' ? 'text-yellow-300' : 'text-gray-500'
          }`}
        >
          <span className="text-xl">🌙</span>
          <span className="text-xs">Today</span>
        </button>

        <button
          onClick={() => setScreen('calendar')}
          className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all ${
            screen === 'calendar' ? 'text-yellow-300' : 'text-gray-500'
          }`}
        >
          <span className="text-xl">🗓️</span>
          <span className="text-xs">Calendar</span>
        </button>

        <button
          onClick={() => setScreen('panchang')}
          className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all ${
            screen === 'panchang' ? 'text-yellow-300' : 'text-gray-500'
          }`}
        >
          <span className="text-xl">📿</span>
          <span className="text-xs">Panchang</span>
        </button>

        <button
          onClick={() => setScreen('settings')}
          className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all ${
            screen === 'settings' ? 'text-yellow-300' : 'text-gray-500'
          }`}
        >
          <span className="text-xl">⚙️</span>
          <span className="text-xs">Settings</span>
        </button>
      </div>
    </div>
  )
}

export default App