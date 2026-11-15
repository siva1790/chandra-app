import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, BookOpen, CalendarDays, Clock, MapPin, Moon, Star, Sunrise, Sun, Settings, Sparkles } from 'lucide-react'
import { dateFromKey, formatIndiaTime, getCityPanchang } from '../cityPanchang.js'
import CityPageLinks from '../components/CityPageLinks.jsx'
import PanchangIcon from '../components/PanchangIcon.jsx'
import HeaderMenu from '../components/HeaderMenu.jsx'
import { DAY_MS, indianDateKey } from '../civilDate.js'
import { formatEventDate, formatEventRange } from '../timeFormatting.js'
import './CityPanchang.css'

function Row({ label, value, detail, icon: Icon }) {
  return <div className="city-row flex items-start justify-between gap-4 border-b border-white/10 py-3 last:border-0">
    <dt className="flex items-center gap-2 text-sm text-chandra-text-secondary">
      {Icon && <Icon size={16} strokeWidth={1.75} aria-hidden="true" />}{label}
    </dt>
    <dd className="text-right text-body font-semibold tabular-nums text-chandra-text-primary">
      {value}{detail && <span className="mt-1 block text-xs font-normal text-chandra-text-secondary">{detail}</span>}
    </dd>
  </div>
}

function eventDate(value) {
  if (!value) return undefined
  return formatEventDate(value)
}

function CityNavigation({ position }) {
  return <nav aria-label="Main navigation" className={`city-navigation city-${position}-navigation`}>
    {[
      ['/', 'Panchang', PanchangIcon], ['/#calendar', 'Calendar', CalendarDays], ['/#settings', 'Settings', Settings],
    ].map(([href, label, Icon]) => <a key={label} href={href} aria-current={label === 'Panchang' ? 'page' : undefined} className={`city-navigation-link ${label === 'Panchang' ? 'city-navigation-active' : ''}`}>
      <Icon size={22} strokeWidth={1.75} aria-hidden="true" /><span>{label}</span>
    </a>)}
  </nav>
}

export default function CityPanchang({ initialData, city }) {
  const [data, setData] = useState(initialData)
  const [error, setError] = useState('')
  const [live, setLive] = useState(false)
  const [followToday, setFollowToday] = useState(true)
  const [todayKey, setTodayKey] = useState(initialData.dateKey)

  useEffect(() => {
    const refresh = () => {
      try {
        const today = indianDateKey()
        setTodayKey(today)
        if (!followToday) return
        setData(previous => previous.dateKey === today ? previous : getCityPanchang(city.slug, today))
        setLive(true)
        setError('')
      } catch {
        setError('Could not update the Panchang. The dated values below are still available. Please reload to try again.')
      }
    }
    refresh()
    const timer = window.setInterval(refresh, 60000)
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [followToday, city.slug])

  const chooseDate = (key) => {
    try {
      if (key < '1926-01-01' || key > '2126-12-31') throw new Error('Date outside supported range')
      setData(getCityPanchang(city.slug, key))
      setFollowToday(key === indianDateKey())
      setLive(true)
      setError('')
    } catch {
      setError('Could not calculate this date. Please choose another date.')
    }
  }
  const shiftDate = (direction) => chooseDate(indianDateKey(new Date(dateFromKey(data.dateKey).getTime() + direction * DAY_MS)))

  return <div className="city-page min-h-screen">
    <a href="#main-content" className="skip-link">Skip to content</a>
    <header className="city-header fixed inset-x-0 top-0 z-40 h-14 border-b border-white/10 bg-chandra-bg-primary">
      <div className="city-header-content">
        <a href="/" className="flex min-h-[44px] items-center gap-2 rounded-control" aria-label="Chandra — open the app">
          <img src="/icons/chandra-mark-topbar-96.png" width="32" height="32" alt="" className="rounded-control" />
          <span className="text-lg font-bold tracking-wide text-chandra-gold">Chandra</span>
        </a>
        <CityNavigation city={city} position="top" />
        <div className="city-header-actions"><a href="#cities" aria-label="Change city" className="flex min-h-[44px] items-center gap-1.5 text-sm text-chandra-focus"><MapPin size={16} aria-hidden="true" /><span>Change city</span></a><HeaderMenu /></div>
      </div>
    </header>
    <main id="main-content" className="city-main mx-auto max-w-md px-4 pb-32 pt-20">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-widest text-chandra-gold"><MapPin size={14} aria-hidden="true" /> {city.name}, {city.state}</p>
      <h1 className="city-title text-chandra-text-primary text-page-title">{city.name} Panchang</h1>
      <p className="mt-3 text-sm leading-relaxed text-chandra-text-secondary">Daily Tithi, Nakshatra, moonrise and Rahu Kaal for {city.displayName}. All times are Indian Standard Time (IST).</p>

      <section aria-labelledby="date-heading" className="city-datebar mt-6 rounded-card border border-white/10 bg-chandra-bg-surface p-4">
        <div className="city-date-summary">
          <h2 id="date-heading" className="text-chandra-text-primary text-card-title"><time dateTime={data.dateKey}>{data.dateLabel}</time></h2>
          <p className="mt-1 text-xs text-chandra-text-secondary">Amavasyant calendar · {city.name} city centre</p>
        </div>
        <div className="city-date-controls mt-3 flex items-center gap-2">
          <button type="button" onClick={() => shiftDate(-1)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-icon border border-white/10 text-chandra-gold" aria-label="Previous day"><ArrowLeft size={18} aria-hidden="true" /></button>
          <div className="min-w-0 flex-1">
            <label htmlFor="panchang-date" className="sr-only">Panchang date in Indian Standard Time</label>
            <input id="panchang-date" type="date" min="1926-01-01" max="2126-12-31" value={data.dateKey} onInput={event => event.currentTarget.value && chooseDate(event.currentTarget.value)} onChange={event => event.target.value && event.target.value !== data.dateKey && chooseDate(event.target.value)} className="min-h-[44px] w-full min-w-0 rounded-control border border-white/10 bg-chandra-bg-primary px-2 text-sm text-chandra-text-primary [color-scheme:dark]" />
          </div>
          <button type="button" onClick={() => shiftDate(1)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-icon border border-white/10 text-chandra-gold" aria-label="Next day"><ArrowRight size={18} aria-hidden="true" /></button>
          <button type="button" disabled={data.dateKey === todayKey} onClick={() => chooseDate(indianDateKey())} className="min-h-[44px] rounded-control px-2 text-sm font-medium text-chandra-gold disabled:cursor-default disabled:text-chandra-text-disabled">Today</button>
        </div>
        <noscript><p className="mt-3 text-xs text-chandra-text-secondary">These values are a dated snapshot from the latest site build. Enable JavaScript for the current day and date navigation.</p></noscript>
      </section>
      <p role="status" className="city-calculation-status mt-2 text-xs text-chandra-text-secondary">{error || (live ? 'Calculated for the date above in IST.' : 'Dated Panchang snapshot. Timings update when you open this page.')}</p>

      <div className="city-primary-grid">
        <section aria-labelledby="anga-heading" className="city-panel mt-6 rounded-card border border-white/10 bg-chandra-bg-surface p-4">
          <h2 id="anga-heading" className="flex items-center gap-2 text-chandra-gold text-card-title"><Star size={16} aria-hidden="true" /> Pancha Anga</h2>
          <p className="city-panel-intro mt-2 text-support leading-relaxed text-chandra-text-secondary">The five elements of the day, sampled at {city.name} sunrise.</p>
          <dl className="mt-1">
            <Row icon={Moon} label="Tithi" value={data.tithi} detail={data.paksha} />
            <Row icon={Star} label="Nakshatra" value={data.nakshatra} />
            <Row icon={Clock} label="Yoga" value={data.yoga} />
            <Row label="Karana" value={data.karana} />
            <Row icon={CalendarDays} label="Vara" value={data.vara} />
          </dl>
          <a href="/learn/panchang-basics#pancha-anga" className="mt-2 flex min-h-[44px] items-center gap-2 text-sm text-chandra-focus"><BookOpen size={16} aria-hidden="true" /> Understand the five elements</a>
          <p className="mt-2 text-support leading-relaxed text-chandra-text-secondary">Tithi and Nakshatra can change later in the day.</p>
        </section>

        <section aria-labelledby="timings-heading" className="city-panel mt-4 rounded-card border border-white/10 bg-chandra-bg-surface p-4">
          <h2 id="timings-heading" className="flex items-center gap-2 text-chandra-gold text-card-title"><Clock size={16} aria-hidden="true" /> Daily timings · IST</h2>
          <p className="city-panel-intro mt-2 text-support leading-relaxed text-chandra-text-secondary">Local sunrise, sunset and moon timings for the selected date.</p>
          <dl className="mt-2">
            <Row icon={Sunrise} label="Sunrise" value={formatIndiaTime(data.sunrise)} />
            <Row icon={Sun} label="Sunset" value={formatIndiaTime(data.sunset)} />
            <Row icon={Moon} label="Moonrise" value={data.moonrise ? formatIndiaTime(data.moonrise) : 'No moonrise on this date'} detail={eventDate(data.moonrise)} />
            <Row icon={Moon} label={data.moonrise ? 'Following moonset' : 'Moonset'} value={data.moonset ? formatIndiaTime(data.moonset) : (data.moonrise ? 'No following moonset found' : 'No moonset on this date')} detail={eventDate(data.moonset)} />
            <Row icon={Clock} label="Rahu Kaal" value={formatEventRange(data.rahuStart, data.rahuEnd)} />
          </dl>
          <p className="mt-2 text-support leading-relaxed text-chandra-text-secondary">{data.moonrise ? 'Moonset is paired with the moonrise above and may fall on the next day.' : 'When no moonrise occurs on this date, any moonset shown is within this date.'} Rahu Kaal is a traditional period generally avoided for starting important activities.</p>
        </section>

      </div>

      <div className="city-secondary-grid">
        <section aria-labelledby="events-heading" className="city-panel mt-4 rounded-card border border-white/10 bg-chandra-bg-surface p-4">
          <h2 id="events-heading" className="flex items-center gap-2 text-chandra-gold text-card-title"><Sparkles size={16} aria-hidden="true" /> Festivals &amp; observances</h2>
          {data.festivals.length ? <ul className="mt-3 space-y-3">{data.festivals.map(event => <li key={event.name}>
            <h3 className="text-chandra-text-primary text-body font-semibold">{event.name}</h3>
            <p className="mt-1 text-sm leading-relaxed text-chandra-text-secondary">{event.description}</p>
          </li>)}</ul> : <p className="mt-3 text-sm leading-relaxed text-chandra-text-secondary">No major festival or monthly observance is listed for this date.</p>}
          <p className="mt-3 text-support leading-relaxed text-chandra-text-secondary">Festival dates use each observance’s ritual window, which can differ from the sunrise Tithi. Regional traditions may vary.</p>
        </section>

        <div id="cities" className="city-cities-panel mt-6 scroll-mt-24"><CityPageLinks currentSlug={city.slug} /></div>
      </div>

      <section aria-labelledby="about-heading" className="city-about mt-6 text-sm leading-relaxed text-chandra-text-secondary">
        <div className="city-about-copy">
          <h2 id="about-heading" className="text-chandra-text-primary text-card-title">About this {city.name} Panchang</h2>
          <p className="mt-2">Timings use {city.name} city-centre coordinates ({city.lat.toFixed(4)}° N, {city.lon.toFixed(4)}° E), sunrise-based daily Tithi, and Lahiri sidereal calculations for Nakshatra and Yoga.</p>
          <p className="mt-3">This page always shows {city.name}. Your saved app city stays the same. Open the app for detailed transitions, the festival calendar, or another city.</p>
        </div>
        <a href="/" className="city-home-cta mt-4 flex min-h-[44px] items-center justify-center gap-2 rounded-control bg-chandra-gold px-4 py-3 font-semibold text-chandra-text-inverse">Go to homepage <ArrowRight size={18} aria-hidden="true" /></a>
        <div className="city-fineprint">
          <span className="city-footer-brand">Chandra · Indian Moon Tracker</span>
          <a href="/privacy.html" className="mt-3 flex min-h-[44px] items-center justify-center text-xs text-chandra-focus">Privacy policy</a>
        </div>
      </section>
    </main>
    <CityNavigation city={city} position="bottom" />
  </div>
}
