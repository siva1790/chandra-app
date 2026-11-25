import { useState, useEffect, useRef } from 'react'
import './index.css'
import Calendar from './pages/Calendar'
import Events from './pages/Events'
import Panchang from './pages/Panchang'
import Settings from './pages/Settings'
import Learn from './pages/Learn'
import { useSettings } from './SettingsContext'
import { useSubscription } from './SubscriptionContext'
import { ENABLE_SETTINGS, ENABLE_SUBSCRIPTIONS } from './featureFlags'
import SubscribeSheet from './components/SubscribeSheet'
import OfflineBanner from './components/OfflineBanner'
import { trackPageView } from './analytics'
import { indianDateKey, indianDayFromPicker, pickerDateFromKey } from './civilDate.js'
import PanchangIcon from './components/PanchangIcon.jsx'
import EventsIcon from './components/EventsIcon.jsx'
import HeaderMenu from './components/HeaderMenu.jsx'
import { Bell, Calendar as CalendarIcon, Settings as SettingsIcon } from 'lucide-react'

const NAV_ITEMS = [
  { id: 'panchang', label: 'Panchang', Icon: PanchangIcon },
  { id: 'calendar', label: 'Calendar', Icon: CalendarIcon },
  { id: 'events', label: 'Events', Icon: EventsIcon },
  { id: 'settings', label: 'Settings', Icon: SettingsIcon },
].filter(item => ENABLE_SETTINGS || item.id !== 'settings')
const TAB_NAMES = { calendar: 'Calendar', events: 'Events', panchang: 'Panchang', settings: 'Settings', learn: 'Learn' }

// Feature flag — set to true to re-enable the subscription UI
function App() {
  const [screen, setScreen] = useState('panchang')
  const [learnTarget, setLearnTarget] = useState(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [globalDate, setGlobalDate] = useState(() => pickerDateFromKey(indianDateKey()))
  const [eventTarget, setEventTarget] = useState(null)
  const [learnReturnContext, setLearnReturnContext] = useState(null)
  const [todayKey, setTodayKey] = useState(indianDateKey)
  const bellButtonRef = useRef(null)
  const { settings } = useSettings()
  const { subscription } = useSubscription()

  useEffect(() => {
    const syncFromHash = () => {
      const hash = window.location.hash.replace(/^#/, '')
      const eventLink = /^panchang\/(\d{4}-\d{2}-\d{2})\/([a-z0-9-]+)$/.exec(hash)
      setEventTarget(null)
      if (eventLink) {
        const [, key, id] = eventLink
        const date = pickerDateFromKey(key)
        if (!Number.isNaN(+date) && indianDateKey(indianDayFromPicker(date)) === key) {
          setGlobalDate(date)
          setEventTarget(`${key}-${id}`)
          setScreen('panchang')
          trackPageView('Panchang')
          return
        }
      }
      if (hash === 'settings' && !ENABLE_SETTINGS) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search)
        setScreen('panchang')
        trackPageView('Panchang')
        return
      }
      if (['calendar', 'events', 'panchang', 'settings'].includes(hash)) {
        setScreen(hash)
        trackPageView(TAB_NAMES[hash])
        return
      }
      if (!hash.startsWith('learn')) {
        if (!['', 'home', 'today'].includes(hash)) return
        setScreen('panchang')
        trackPageView('Panchang')
        return
      }
      const [, target] = hash.split('/')
      setLearnTarget(target || null)
      setScreen('learn')
      trackPageView('Learn')
    }

    syncFromHash()
    window.addEventListener('hashchange', syncFromHash)
    return () => window.removeEventListener('hashchange', syncFromHash)
  }, [])

  // Follow an open Today's page across midnight; deliberately selected dates stay put.
  useEffect(() => {
    const refreshToday = () => {
      const today = indianDateKey()
      if (today === todayKey) return
      setTodayKey(today)
      if (!eventTarget) {
        setGlobalDate(previous => indianDateKey(indianDayFromPicker(previous)) === todayKey ? pickerDateFromKey(today) : previous)
      }
    }
    const interval = window.setInterval(refreshToday, 60000)
    window.addEventListener('focus', refreshToday)
    document.addEventListener('visibilitychange', refreshToday)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', refreshToday)
      document.removeEventListener('visibilitychange', refreshToday)
    }
  }, [todayKey, eventTarget])

  // Direct tab tap — preserves current globalDate (no reset)
  const navigate = (tab) => {
    setScreen(tab)
    setEventTarget(null)
    if (tab !== 'learn') setLearnReturnContext(null)
    if (tab !== 'learn') {
      const hash = tab === 'panchang' ? '' : `#${tab}`
      if (window.location.hash !== hash) window.history.pushState(null, '', window.location.pathname + window.location.search + hash)
    }
    window.scrollTo(0, 0)
    trackPageView(TAB_NAMES[tab])
  }

  // Calendar opens the same homepage at the selected date.
  const navigateToPanchang = (date) => {
    setGlobalDate(new Date(date))
    navigate('panchang')
  }

  const changePanchangDate = date => {
    setGlobalDate(date)
    if (!eventTarget) return
    setEventTarget(null)
    window.history.replaceState(null, '', window.location.pathname + window.location.search)
  }

  const navigateToLearn = (target) => {
    if (screen !== 'learn') {
      setLearnReturnContext({
        screen,
        scrollY: window.scrollY,
        focusElement: document.activeElement instanceof HTMLElement ? document.activeElement : null,
      })
    }
    setLearnTarget(target || null)
    setScreen('learn')
    const nextHash = target ? `#learn/${target}` : '#learn'
    if (window.location.hash !== nextHash) window.location.hash = nextHash
    window.scrollTo(0, 0)
    trackPageView(target ? `Learn: ${target}` : 'Learn')
  }

  const navigateBackFromLearn = () => {
    const context = learnReturnContext
    const returnScreen = context?.screen || 'panchang'

    setScreen(returnScreen)
    setLearnTarget(null)
    setLearnReturnContext(null)
    if (window.location.hash.startsWith('#learn')) {
      const hash = returnScreen === 'panchang' ? '' : `#${returnScreen}`
      window.history.replaceState(null, '', window.location.pathname + window.location.search + hash)
    }

    window.requestAnimationFrame(() => {
      window.scrollTo(0, context?.scrollY ?? 0)
      if (context?.focusElement?.isConnected) {
        context.focusElement.focus({ preventScroll: true })
      }
    })

    trackPageView(TAB_NAMES[returnScreen])
  }

  return (
    <div className={`min-h-screen responsive-app-shell ${screen === 'calendar' ? 'calendar-screen' : ''}`}>
      <a href="#main-content" className="skip-link">Skip to content</a>

      {/* ── Persistent Top Bar ── */}
      <div
        className="app-topbar fixed top-0 left-0 right-0 z-40 flex h-14 items-center justify-between border-b border-white/10 bg-chandra-bg-primary px-4"
        aria-hidden={sheetOpen || undefined}
        {...(sheetOpen ? { inert: '' } : {})}
      >

        {/* Logo — left */}
        <button
          onClick={() => navigate('panchang')}
          aria-label="Go to Panchang home"
          className="flex items-center gap-2 rounded-control transition-opacity active:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-chandra-focus"
        >
          <img
            src="/icons/chandra-mark-topbar-96.png"
            alt="Chandra"
            className="w-8 h-8 rounded-icon"
          />
          <span className="text-lg font-bold tracking-wide text-chandra-gold">Chandra</span>
        </button>

        <nav className="calendar-top-navigation" aria-label="Main navigation">
          {NAV_ITEMS.map(({ id, label, Icon }) => (
            <button key={id} type="button" onClick={() => navigate(id)} aria-current={screen === id ? 'page' : undefined}>
              <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        {/* Bell icon — right (hidden until ENABLE_SUBSCRIPTIONS = true) */}
        {ENABLE_SUBSCRIPTIONS && (
          <button
            ref={bellButtonRef}
            onClick={() => setSheetOpen(true)}
            className="relative flex items-center gap-1.5 rounded-control border border-white/10 bg-chandra-bg-elevated px-3 py-1.5 transition-all hover:border-white/20 hover:bg-chandra-bg-surface"
            aria-label={subscription ? 'View subscription' : 'Subscribe to alerts'}
          >
            <Bell size={16} aria-hidden="true" />
            {subscription ? (
              <>
                {/* Green dot for subscribed state */}
                <span className="absolute -right-1 -top-1 h-3 w-3 rounded-pill border-2 border-chandra-bg-primary bg-chandra-success" />
                <span className="text-xs font-medium text-chandra-success">Subscribed</span>
              </>
            ) : (
              <span className="text-xs font-medium text-chandra-text-secondary">Subscribe</span>
            )}
          </button>
        )}
        <HeaderMenu onLearn={navigateToLearn} />
      </div>

      <OfflineBanner sheetOpen={sheetOpen} />

      {/* ── Page content — pushed below top bar and above bottom nav ── */}
      <main
        id="main-content"
        className="pt-14 pb-20"
        aria-hidden={sheetOpen || undefined}
        {...(sheetOpen ? { inert: '' } : {})}
      >
        <div style={{ display: screen === 'calendar' ? 'block' : 'none' }}><Calendar active={screen === 'calendar'} selectedDate={globalDate} todayKey={todayKey} onDateChange={setGlobalDate} onSelectDate={navigateToPanchang} /></div>
        <div hidden={screen !== 'events'}><Events active={screen === 'events'} todayKey={todayKey} onSelectDate={navigateToPanchang} /></div>
        <div style={{ display: screen === 'panchang' ? 'block' : 'none' }}><Panchang location={settings} initialDate={globalDate} eventTarget={eventTarget} onDateChange={changePanchangDate} onLearn={navigateToLearn} /></div>
        <div style={{ display: screen === 'settings' ? 'block' : 'none' }}>
          <Settings
            onOpenSubscribe={ENABLE_SUBSCRIPTIONS ? () => setSheetOpen(true) : undefined}
            onLearn={navigateToLearn}
          />
        </div>
        <div style={{ display: screen === 'learn'    ? 'block' : 'none' }}>
          <Learn
            targetSection={learnTarget}
            active={screen === 'learn'}
            onBack={navigateBackFromLearn}
            returnLabel={TAB_NAMES[learnReturnContext?.screen] || 'Panchang'}
          />
        </div>
      </main>

      {/* ── Bottom Navigation ── */}
      <nav
        aria-label="Main navigation"
        className="app-bottom-navigation fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-white/10 bg-chandra-bg-primary px-4 py-3"
        aria-hidden={sheetOpen || undefined}
        {...(sheetOpen ? { inert: '' } : {})}
      >
        {NAV_ITEMS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => navigate(id)}
            aria-current={screen === id ? 'page' : undefined}
            className={`flex min-h-[44px] flex-col items-center justify-center gap-1 rounded-control px-3 py-1 transition-all ${
              screen === id
                ? 'bg-chandra-gold/10 text-chandra-gold'
                : 'text-chandra-text-disabled hover:bg-chandra-bg-elevated hover:text-chandra-text-secondary'
            }`}
          >
            <Icon size={22} aria-hidden="true" strokeWidth={1.75} />
            <span className="text-xs">{label}</span>
          </button>
        ))}
      </nav>

      {/* ── Subscribe / Details Bottom Sheet ── */}
      {ENABLE_SUBSCRIPTIONS && (
        <SubscribeSheet open={sheetOpen} onClose={() => setSheetOpen(false)} triggerRef={bellButtonRef} />
      )}

    </div>
  )
}

export default App
