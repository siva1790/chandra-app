import { useSyncExternalStore } from 'react'
import { CalendarDays, Settings } from 'lucide-react'
import PanchangIcon from '../components/PanchangIcon.jsx'
import EventsIcon from '../components/EventsIcon.jsx'
import HeaderMenu from '../components/HeaderMenu.jsx'
import { ENABLE_SETTINGS } from '../featureFlags.js'
import Learn from './Learn.jsx'
import './PublicLearn.css'

const subscribe = callback => {
  window.addEventListener('hashchange', callback)
  return () => window.removeEventListener('hashchange', callback)
}
const getHash = () => window.location.hash
const getServerHash = () => ''
const links = [['/', 'Panchang', PanchangIcon], ['/#calendar', 'Calendar', CalendarDays], ['/#events', 'Events', EventsIcon], ['/#settings', 'Settings', Settings]].filter(([, label]) => ENABLE_SETTINGS || label !== 'Settings')

const PublicNavigation = ({ position }) => (
  <nav aria-label="Main navigation" className={`learn-public-navigation learn-public-navigation-${position}`}>
    {links.map(([href, label, Icon]) => <a key={label} href={href} className="min-h-[44px] rounded-control text-chandra-text-secondary hover:bg-chandra-bg-elevated hover:text-chandra-text-primary"><Icon size={18} strokeWidth={1.75} aria-hidden="true" /><span>{label}</span></a>)}
  </nav>
)

export default function PublicLearn() {
  const hash = useSyncExternalStore(subscribe, getHash, getServerHash)
  const target = hash.replace(/^#(?:learn\/)?/, '') || null
  return <div className="learn-public-shell min-h-screen">
    <a href="#main-content" className="skip-link">Skip to content</a>
    <header className="learn-public-topbar fixed inset-x-0 top-0 z-40 border-b border-[color:var(--border-default)] bg-chandra-bg-primary">
      <div className="learn-public-header-content">
        <a href="/" aria-label="Go to Chandra Panchang" className="flex min-h-[44px] items-center gap-2 rounded-control text-lg font-bold text-chandra-gold"><img src="/icons/chandra-mark-topbar-96.png" width="32" height="32" alt="" className="rounded-icon" />Chandra</a>
        <PublicNavigation position="top" />
        <HeaderMenu />
      </div>
    </header>
    <main id="main-content" className="pt-14 pb-20">
      <Learn targetSection={target} onBack={() => window.location.assign('/')} />
    </main>
    <PublicNavigation position="bottom" />
  </div>
}
