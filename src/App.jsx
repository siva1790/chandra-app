import { useState } from 'react'
import './index.css'
import Home from './pages/Home'
import Calendar from './pages/Calendar'
import Panchang from './pages/Panchang'
import Settings from './pages/Settings'
import { useSettings } from './SettingsContext'
import { useSubscription } from './SubscriptionContext'
import InstallPrompt from './components/InstallPrompt'
import SubscribeSheet from './components/SubscribeSheet'

function App() {
  const [screen, setScreen] = useState('home')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [panchangDate, setPanchangDate] = useState(new Date())
  const { settings } = useSettings()
  const { subscription } = useSubscription()

  // Direct tab tap — always resets Panchang to today
  const navigate = (tab) => {
    if (tab === 'panchang') setPanchangDate(new Date())
    setScreen(tab)
    window.scrollTo(0, 0)
  }

  // Called from Home highlight strip or Calendar day tap — jumps to a specific date
  const navigateToPanchang = (date) => {
    setPanchangDate(new Date(date))
    setScreen('panchang')
    window.scrollTo(0, 0)
  }

  return (
    <div className="min-h-screen">

      {/* ── Persistent Top Bar ── */}
      <div className="fixed top-0 left-0 right-0 h-14 bg-gray-950 border-b border-gray-800 flex items-center justify-between px-4 z-40">

        {/* Logo — left */}
        <div className="flex items-center gap-2">
          <span className="text-xl">🌙</span>
          <span className="text-yellow-300 font-bold text-lg tracking-wide">Chandra</span>
        </div>

        {/* Bell icon — right */}
        <button
          onClick={() => setSheetOpen(true)}
          className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 transition-all"
          aria-label={subscription ? 'View subscription' : 'Subscribe to alerts'}
        >
          <span className="text-base">🔔</span>
          {subscription ? (
            <>
              {/* Green dot for subscribed state */}
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-gray-950" />
              <span className="text-green-400 text-xs font-medium">Subscribed</span>
            </>
          ) : (
            <span className="text-gray-300 text-xs font-medium">Get alerts</span>
          )}
        </button>
      </div>

      {/* ── Page content — pushed below top bar and above bottom nav ── */}
      <div className="pt-14 pb-20">
        <InstallPrompt />
        {screen === 'home'     && <Home location={settings} onNavigateToPanchang={navigateToPanchang} />}
        {screen === 'calendar' && <Calendar onSelectDate={navigateToPanchang} />}
        {screen === 'panchang' && <Panchang location={settings} initialDate={panchangDate} />}
        {screen === 'settings' && <Settings onOpenSubscribe={() => setSheetOpen(true)} />}
      </div>

      {/* ── Bottom Navigation ── */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-950 border-t border-gray-800 flex justify-around items-center px-4 py-3 z-40">
        <button
          onClick={() => navigate('home')}
          className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all ${
            screen === 'home' ? 'text-yellow-300' : 'text-gray-500'
          }`}
        >
          <span className="text-xl">🌙</span>
          <span className="text-xs">Today</span>
        </button>

        <button
          onClick={() => navigate('calendar')}
          className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all ${
            screen === 'calendar' ? 'text-yellow-300' : 'text-gray-500'
          }`}
        >
          <span className="text-xl">🗓️</span>
          <span className="text-xs">Calendar</span>
        </button>

        <button
          onClick={() => navigate('panchang')}
          className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all ${
            screen === 'panchang' ? 'text-yellow-300' : 'text-gray-500'
          }`}
        >
          <span className="text-xl">📿</span>
          <span className="text-xs">Panchang</span>
        </button>

        <button
          onClick={() => navigate('settings')}
          className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all ${
            screen === 'settings' ? 'text-yellow-300' : 'text-gray-500'
          }`}
        >
          <span className="text-xl">⚙️</span>
          <span className="text-xs">Settings</span>
        </button>
      </div>

      {/* ── Subscribe / Details Bottom Sheet ── */}
      <SubscribeSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />

    </div>
  )
}

export default App
