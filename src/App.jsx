import { useState, useEffect, useRef } from 'react'
import './index.css'
import Home from './pages/Home'
import Calendar from './pages/Calendar'
import Panchang from './pages/Panchang'
import Settings from './pages/Settings'
import { useSettings } from './SettingsContext'
import { useSubscription } from './SubscriptionContext'
import InstallPrompt from './components/InstallPrompt'
import SubscribeSheet from './components/SubscribeSheet'
import { trackPageView } from './analytics'
import { Bell, Moon, Calendar as CalendarIcon, Clock, Settings as SettingsIcon } from 'lucide-react'

function App() {
  const [screen, setScreen] = useState('home')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [globalDate, setGlobalDate] = useState(new Date())
  const bellButtonRef = useRef(null)
  const { settings } = useSettings()
  const { subscription } = useSubscription()

  const TAB_NAMES = { home: 'Day View', calendar: 'Calendar', panchang: 'Panchang', settings: 'Settings' }

  // Track initial page view
  useEffect(() => { trackPageView('Day View') }, [])

  // Direct tab tap — preserves current globalDate (no reset)
  const navigate = (tab) => {
    setScreen(tab)
    window.scrollTo(0, 0)
    trackPageView(TAB_NAMES[tab])
  }

  // Called from Home highlight strip or Calendar day tap — jumps to a specific date in Panchang
  const navigateToPanchang = (date) => {
    setGlobalDate(new Date(date))
    setScreen('panchang')
    window.scrollTo(0, 0)
  }

  return (
    <div className="min-h-screen">
      <a href="#main-content" className="skip-link">Skip to content</a>

      {/* ── Persistent Top Bar ── */}
      <div
        className="fixed top-0 left-0 right-0 h-14 bg-gray-950 border-b border-gray-800 flex items-center justify-between px-4 z-40"
        aria-hidden={sheetOpen || undefined}
        {...(sheetOpen ? { inert: '' } : {})}
      >

        {/* Logo — left */}
        <div className="flex items-center gap-2">
          <img
            src="/icons/icon-192.png"
            alt="Chandra"
            className="w-8 h-8 rounded-lg"
          />
          <span className="text-yellow-300 font-bold text-lg tracking-wide">Chandra</span>
        </div>

        {/* Bell icon — right */}
        <button
          ref={bellButtonRef}
          onClick={() => setSheetOpen(true)}
          className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 transition-all"
          aria-label={subscription ? 'View subscription' : 'Subscribe to alerts'}
        >
          <Bell size={16} aria-hidden="true" />
          {subscription ? (
            <>
              {/* Green dot for subscribed state */}
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-gray-950" />
              <span className="text-green-400 text-xs font-medium">Subscribed</span>
            </>
          ) : (
            <span className="text-gray-300 text-xs font-medium">Subscribe</span>
          )}
        </button>
      </div>

      {/* ── Page content — pushed below top bar and above bottom nav ── */}
      <main
        id="main-content"
        className="pt-14 pb-20"
        aria-hidden={sheetOpen || undefined}
        {...(sheetOpen ? { inert: '' } : {})}
      >
        <InstallPrompt />
        <div style={{ display: screen === 'home'     ? 'block' : 'none' }}><Home location={settings} date={globalDate} onDateChange={setGlobalDate} onNavigateToPanchang={navigateToPanchang} /></div>
        <div style={{ display: screen === 'calendar' ? 'block' : 'none' }}><Calendar selectedDate={globalDate} onDateChange={setGlobalDate} onSelectDate={navigateToPanchang} /></div>
        <div style={{ display: screen === 'panchang' ? 'block' : 'none' }}><Panchang location={settings} initialDate={globalDate} onDateChange={setGlobalDate} /></div>
        <div style={{ display: screen === 'settings' ? 'block' : 'none' }}><Settings onOpenSubscribe={() => setSheetOpen(true)} /></div>
      </main>

      {/* ── Bottom Navigation ── */}
      <nav
        aria-label="Main navigation"
        className="fixed bottom-0 left-0 right-0 bg-gray-950 border-t border-gray-800 flex justify-around items-center px-4 py-3 z-40"
        aria-hidden={sheetOpen || undefined}
        {...(sheetOpen ? { inert: '' } : {})}
      >
        {[
          { id: 'home',     label: 'Day View',  Icon: Moon },
          { id: 'calendar', label: 'Calendar', Icon: CalendarIcon },
          { id: 'panchang', label: 'Panchang', Icon: Clock },
          { id: 'settings', label: 'Settings', Icon: SettingsIcon },
        ].map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => navigate(id)}
            aria-current={screen === id ? 'page' : undefined}
            className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all min-h-[44px] justify-center ${
              screen === id ? 'text-[#DDBB6A]' : 'text-gray-500'
            }`}
          >
            <Icon size={22} aria-hidden="true" strokeWidth={1.75} />
            <span className="text-xs">{label}</span>
          </button>
        ))}
      </nav>

      {/* ── Subscribe / Details Bottom Sheet ── */}
      <SubscribeSheet open={sheetOpen} onClose={() => setSheetOpen(false)} triggerRef={bellButtonRef} />

    </div>
  )
}

export default App
