import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, BookOpen, CalendarDays, Clock, MapPin, Moon, Star, Sunrise, Sun, Settings } from 'lucide-react'
import { dateFromKey, formatIndiaTime, getCityPanchang } from '../cityPanchang.js'
import CityPageLinks from '../components/CityPageLinks.jsx'
import { DAY_MS, indianDateKey } from '../civilDate.js'

function Row({ label, value, detail, icon: Icon }) {
  return <div className="flex items-start justify-between gap-4 border-b border-white/10 py-3 last:border-0">
    <dt className="flex items-center gap-2 text-sm text-chandra-text-secondary">
      {Icon && <Icon size={16} strokeWidth={1.75} aria-hidden="true" />}{label}
    </dt>
    <dd className="text-right text-sm font-medium text-chandra-text-primary">
      {value}{detail && <span className="mt-1 block text-xs font-normal text-chandra-text-secondary">{detail}</span>}
    </dd>
  </div>
}

function eventDate(value) {
  if (!value) return undefined
  return new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short' }).format(new Date(value))
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

  return <div className="min-h-screen">
    <a href="#main-content" className="skip-link">Skip to content</a>
    <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-white/10 bg-chandra-bg-primary px-4">
      <a href="/" className="flex min-h-[44px] items-center gap-2 rounded-xl" aria-label="Chandra — open the app">
        <img src="/icons/chandra-mark-topbar-96.png" width="32" height="32" alt="" className="rounded-lg" />
        <span className="text-lg font-bold tracking-wide text-chandra-gold">Chandra</span>
      </a>
      <a href="#cities" className="flex min-h-[44px] items-center gap-1.5 text-sm text-chandra-focus"><MapPin size={16} aria-hidden="true" /> Change city</a>
    </header>
    <main id="main-content" className="mx-auto max-w-md px-4 pb-32 pt-20">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-widest text-chandra-gold"><MapPin size={14} aria-hidden="true" /> {city.name}, {city.state}</p>
      <h1 className="text-2xl font-bold text-chandra-text-primary">{city.name} Panchang</h1>
      <p className="mt-3 text-sm leading-relaxed text-chandra-text-secondary">Daily Tithi, Nakshatra, moonrise and Rahu Kaal for {city.displayName}. All times are Indian Standard Time (IST).</p>

      <section aria-labelledby="date-heading" className="mt-6 rounded-xl border border-white/10 bg-chandra-bg-surface p-4">
        <h2 id="date-heading" className="text-base font-semibold text-chandra-text-primary"><time dateTime={data.dateKey}>{data.dateLabel}</time></h2>
        <p className="mt-1 text-xs text-chandra-text-secondary">Amavasyant calendar · {city.name} city centre</p>
        <div className="mt-3 flex items-center gap-2">
          <button type="button" onClick={() => shiftDate(-1)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-white/10 text-chandra-gold" aria-label="Previous day"><ArrowLeft size={18} aria-hidden="true" /></button>
          <div className="min-w-0 flex-1">
            <label htmlFor="panchang-date" className="sr-only">Panchang date in Indian Standard Time</label>
            <input id="panchang-date" type="date" min="1926-01-01" max="2126-12-31" value={data.dateKey} onInput={event => event.currentTarget.value && chooseDate(event.currentTarget.value)} onChange={event => event.target.value && event.target.value !== data.dateKey && chooseDate(event.target.value)} className="min-h-[44px] w-full min-w-0 rounded-lg border border-white/10 bg-chandra-bg-primary px-2 text-sm text-chandra-text-primary [color-scheme:dark]" />
          </div>
          <button type="button" onClick={() => shiftDate(1)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-white/10 text-chandra-gold" aria-label="Next day"><ArrowRight size={18} aria-hidden="true" /></button>
          <button type="button" disabled={data.dateKey === todayKey} onClick={() => chooseDate(indianDateKey())} className="min-h-[44px] rounded-lg px-2 text-sm font-medium text-chandra-gold disabled:cursor-default disabled:text-chandra-text-disabled">Today</button>
        </div>
        <noscript><p className="mt-3 text-xs text-chandra-text-secondary">These values are a dated snapshot from the latest site build. Enable JavaScript for the current day and date navigation.</p></noscript>
      </section>
      <p role="status" className="mt-2 text-xs text-chandra-text-secondary">{error || (live ? 'Calculated for the date above in IST.' : 'Dated Panchang snapshot. Timings update when you open this page.')}</p>

      <section aria-labelledby="anga-heading" className="mt-6 rounded-xl border border-white/10 bg-chandra-bg-surface p-4">
        <h2 id="anga-heading" className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-chandra-gold"><Star size={16} aria-hidden="true" /> Pancha Anga</h2>
        <p className="mt-2 text-xs leading-relaxed text-chandra-text-secondary">The five elements below are sampled at {city.name} sunrise. Tithi and Nakshatra can change later in the day.</p>
        <dl className="mt-1">
          <Row icon={Moon} label="Tithi" value={data.tithi} detail={data.paksha} />
          <Row icon={Star} label="Nakshatra" value={data.nakshatra} />
          <Row icon={Clock} label="Yoga" value={data.yoga} />
          <Row label="Karana" value={data.karana} />
          <Row icon={CalendarDays} label="Vara" value={data.vara} />
        </dl>
        <a href="/#learn/pancha-anga" className="mt-2 flex min-h-[44px] items-center gap-2 text-sm text-chandra-focus"><BookOpen size={16} aria-hidden="true" /> Understand the five elements</a>
      </section>

      <section aria-labelledby="timings-heading" className="mt-4 rounded-xl border border-white/10 bg-chandra-bg-surface p-4">
        <h2 id="timings-heading" className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-chandra-gold"><Clock size={16} aria-hidden="true" /> Daily timings · IST</h2>
        <dl className="mt-2">
          <Row icon={Sunrise} label="Sunrise" value={formatIndiaTime(data.sunrise)} />
          <Row icon={Sun} label="Sunset" value={formatIndiaTime(data.sunset)} />
          <Row icon={Moon} label="Moonrise" value={formatIndiaTime(data.moonrise)} detail={eventDate(data.moonrise)} />
          <Row icon={Moon} label="Following moonset" value={data.moonset ? formatIndiaTime(data.moonset) : 'No paired moonset'} detail={eventDate(data.moonset)} />
          <Row icon={Clock} label="Rahu Kaal" value={`${formatIndiaTime(data.rahuStart)} – ${formatIndiaTime(data.rahuEnd)}`} />
        </dl>
        <p className="mt-2 text-xs leading-relaxed text-chandra-text-secondary">Moonset is paired with the moonrise above and may fall on the next day. Rahu Kaal is a traditional period generally avoided for starting important activities.</p>
      </section>

      <section aria-labelledby="events-heading" className="mt-4 rounded-xl border border-white/10 bg-chandra-bg-surface p-4">
        <h2 id="events-heading" className="text-xs font-semibold uppercase tracking-widest text-chandra-gold">Festivals &amp; observances</h2>
        {data.festivals.length ? <ul className="mt-3 space-y-3">{data.festivals.map(event => <li key={event.name}>
          <h3 className="text-sm font-semibold text-chandra-text-primary">{event.name}</h3>
          <p className="mt-1 text-sm leading-relaxed text-chandra-text-secondary">{event.description}</p>
        </li>)}</ul> : <p className="mt-3 text-sm leading-relaxed text-chandra-text-secondary">No major festival or monthly observance is listed for this date.</p>}
        <p className="mt-3 text-xs leading-relaxed text-chandra-text-secondary">Festival dates use each observance’s ritual window, which can differ from the sunrise Tithi. Regional traditions may vary.</p>
      </section>

      <div id="cities" className="mt-6 scroll-mt-20"><CityPageLinks currentSlug={city.slug} /></div>

      <section aria-labelledby="about-heading" className="mt-6 text-sm leading-relaxed text-chandra-text-secondary">
        <h2 id="about-heading" className="font-semibold text-chandra-text-primary">About this {city.name} Panchang</h2>
        <p className="mt-2">Timings use {city.name} city-centre coordinates ({city.lat.toFixed(4)}° N, {city.lon.toFixed(4)}° E), sunrise-based daily Tithi, and Lahiri sidereal calculations for Nakshatra and Yoga.</p>
        <p className="mt-3">This page always shows {city.name}. Your saved app city stays the same. Open the app for detailed transitions, the festival calendar, or another city.</p>
        <a href="/" className="mt-4 flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-chandra-gold px-4 py-3 font-semibold text-chandra-text-inverse">Go to homepage <ArrowRight size={18} aria-hidden="true" /></a>
        <a href="/privacy.html" className="mt-3 flex min-h-[44px] items-center justify-center text-xs text-chandra-focus">Privacy policy</a>
      </section>
    </main>
    <nav aria-label="Main navigation" className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-white/10 bg-chandra-bg-primary px-2 py-3">
      {[
        ['/', 'Day View', Moon], ['/#calendar', 'Calendar', CalendarDays],
        [city.path, 'Panchang', Clock], ['/#settings', 'Settings', Settings],
      ].map(([href, label, Icon]) => <a key={label} href={href} aria-current={label === 'Panchang' ? 'page' : undefined} className={`flex min-h-[44px] flex-col items-center justify-center gap-1 rounded-xl px-3 py-1 ${label === 'Panchang' ? 'bg-chandra-gold/10 text-chandra-gold' : 'text-chandra-text-secondary'}`}>
        <Icon size={22} strokeWidth={1.75} aria-hidden="true" /><span className="text-xs">{label}</span>
      </a>)}
    </nav>
  </div>
}
