import { useMemo, useState } from 'react'
import { eclipseTypeLabel, lunarTotalityLabel } from '../eclipseUtils'
import DateStrip from '../components/DateStrip'
import { getAdditionalTithi, getLunarMonthLabels, getPanchang } from '../panchangCalculations.js'
import { formatEventTime, formatEventDate, formatEventRange } from '../timeFormatting.js'
import { EclipseIcon } from '../components/EclipseIcons'
import { getFestivalsForDate } from '../festivals.js'
import { CALENDAR_TRADITIONS, getCalendarTithiName, getRegionalFestivals, getRegionalMonth } from '../regionalCalendar.js'
import { getPanchaAngaAtSunrise } from '../panchangAnga.js'
import { DAY_MS, INDIA_OFFSET_MINUTES, indianDateKey, indianDayFromPicker, startOfCivilDay } from '../civilDate.js'
import { getMoonPhaseAngle, getTithiAtSunrise, getTithiFromAngle } from '../moonUtils.js'
import PanchangPreferences from '../components/PanchangPreferences.jsx'
import PanchangMoon from '../components/PanchangMoon.jsx'
import PanchangIcon from '../components/PanchangIcon.jsx'
import CityPageLinks from '../components/CityPageLinks.jsx'
import Button from '../components/ui/Button.jsx'
import { Clock, Moon, Star, Sun, Calendar as CalendarIcon, Sunrise, Sunset, Sparkles, AlertTriangle, Timer, ChevronDown, BookOpen } from 'lucide-react'
import './Panchang.css'

const RASI_NAMES = [
  'Mesha', 'Vrishabha', 'Mithuna', 'Karka',
  'Simha', 'Kanya', 'Tula', 'Vrischika',
  'Dhanu', 'Makara', 'Kumbha', 'Meena'
]

const formatLongitude = (lon) => {
  const sign = Math.floor(lon / 30)
  const deg = (lon % 30).toFixed(1)
  return `${deg}° ${RASI_NAMES[sign % 12]}`
}

// ── Accordion defaults ────────────────────────────────────────────

const DEFAULT_SECTIONS = {
  panchaAnga: true,
  sunTimings: true,
  dailyTimings: true,
  nakshatraDetails: true,
  monthYear: true,
  planetary: true,
}

// ── Component ─────────────────────────────────────────────────────

const Panchang = ({ location, initialDate, onDateChange, onLearn }) => {
  const [fallbackDate, setFallbackDate] = useState(() => new Date())
  const selectedDate = initialDate || fallbackDate
  const [sections, setSections] = useState(() => {
    try {
      const saved = localStorage.getItem('chandra-panchang-accordion')
      const parsed = saved && JSON.parse(saved)
      if (parsed?.version === 2) return { ...DEFAULT_SECTIONS, ...parsed.sections }
    } catch {
      return { ...DEFAULT_SECTIONS }
    }
    return { ...DEFAULT_SECTIONS }
  })

  const lat = location?.lat ?? 12.9716
  const lon = location?.lon ?? 77.5946
  const tradition = Object.hasOwn(CALENDAR_TRADITIONS, location?.calendarTradition) ? location.calendarTradition : ''
  const traditionLabel = CALENDAR_TRADITIONS[tradition]?.highlightLabel
  const { panchang, lunarMonths, festivals, additionalTithi, error } = useMemo(() => {
    try {
      const options = { lat, lon }
      const panchang = getPanchang(selectedDate, options)
      const civilDay = +startOfCivilDay(panchang.sunrise, INDIA_OFFSET_MINUTES)
      const previousDay = new Date(civilDay - DAY_MS)
      const nextDay = new Date(civilDay + DAY_MS)
      const sunriseTithi = getTithiFromAngle(getMoonPhaseAngle(panchang.sunrise))
      const previousSunriseTithi = getTithiAtSunrise(previousDay, lat, lon, INDIA_OFFSET_MINUTES)
      const nextSunriseTithi = getTithiAtSunrise(nextDay, lat, lon, INDIA_OFFSET_MINUTES)
      const additionalTithi = getAdditionalTithi(previousSunriseTithi, sunriseTithi, nextSunriseTithi)
      let festivals
      if (tradition) {
        const indiaDate = indianDayFromPicker(selectedDate)
        const indianLocation = { ...options, utcOffsetMinutes: INDIA_OFFSET_MINUTES }
        const snapshot = getPanchaAngaAtSunrise(indiaDate, indianLocation)
        const regionalMonth = tradition === 'tamil' ? getRegionalMonth(indiaDate, snapshot, indianLocation, tradition) : null
        festivals = getRegionalFestivals(indiaDate, snapshot, indianLocation, tradition, regionalMonth)
      } else {
        festivals = getFestivalsForDate(selectedDate, options)
      }
      return {
        panchang,
        lunarMonths: getLunarMonthLabels(panchang.sunrise, panchang.paksha),
        festivals,
        additionalTithi,
        error: null,
      }
    } catch (error) {
        return { panchang: null, lunarMonths: null, festivals: [], additionalTithi: null, error }
    }
  }, [selectedDate, lat, lon, tradition])
  const isToday = indianDateKey(selectedDate) === indianDateKey()
  const highlights = [...festivals.map(festival => festival.name)]
  if (panchang?.eclipse) highlights.unshift(panchang.eclipse.hinduName)
  for (const [active, name] of [[panchang?.isPurnima, 'Purnima'], [panchang?.isAmavasya, 'Amavasya'], [panchang?.isEkadashi, 'Ekadashi'], [panchang?.isVishti, 'Bhadra / Vishti Karana']]) {
    if (active && !highlights.some(highlight => highlight.toLowerCase().includes(name.toLowerCase()))) highlights.push(name)
  }

  const formatTime = formatEventTime
  const formatShortDate = formatEventDate
  const formatWindow = formatEventRange

  const changeDate = (d) => {
    if (!initialDate) setFallbackDate(d)
    onDateChange?.(d)
  }

  const toggleSection = (key) => {
    setSections(prev => {
      const next = { ...prev, [key]: !prev[key] }
      localStorage.setItem('chandra-panchang-accordion', JSON.stringify({ version: 2, sections: next }))
      return next
    })
  }

  const allExpanded = Object.values(sections).every(Boolean)
  const toggleAll = () => {
    const next = Object.fromEntries(Object.keys(sections).map(k => [k, !allExpanded]))
    setSections(next)
    localStorage.setItem('chandra-panchang-accordion', JSON.stringify({ version: 2, sections: next }))
  }

  return (
    <div className="panchang-page min-h-screen px-4 py-8 pb-28 max-w-md mx-auto">

      {/* Header */}
      <header className="panchang-home-header">
      <div className="panchang-heading">
        <h1 className="mb-1 text-chandra-gold text-page-title">
          Panchang
        </h1>
        <p className="text-sm text-chandra-text-secondary">Your daily Hindu almanac</p>
      </div>
      <PanchangPreferences />
      </header>

      {/* Date Navigator */}
      <DateStrip date={selectedDate} onDateChange={changeDate} mode="day" responsive />

      {panchang ? (
        <div className="flex flex-col gap-4">
          {highlights.length > 0 && <section className="panchang-highlight" aria-labelledby="panchang-highlight-heading">
            <h2 id="panchang-highlight-heading"><Sparkles size={16} aria-hidden="true" />Day's highlight</h2>
            {traditionLabel && <p className="mt-1 text-support text-chandra-text-secondary">{traditionLabel}</p>}
            <div className="panchang-highlight-content">
              {festivals.map(festival => <div key={festival.name} className="panchang-festival-description"><h3>{festival.name}</h3>{festival.description && <p>{festival.description}</p>}</div>)}

          {/* Eclipse and observance details share the day's highlight. */}
          {panchang.eclipse && (
            <div className="rounded-card border border-chandra-focus/35 bg-chandra-indigo-cta/20 p-5">
              <div className="flex items-center gap-4">
                <EclipseIcon eclipse={panchang.eclipse} size={44} />
                <div className="flex-1">
                  <p className="text-base font-bold text-chandra-text-primary">{panchang.eclipse.hinduName}</p>
                  <p className="mt-0.5 text-support text-chandra-focus">{eclipseTypeLabel(panchang.eclipse)}</p>
                  <p className="mt-1.5 text-sm font-medium text-chandra-text-primary">
                    Peak: {formatTime(panchang.eclipse.peakTime)}, {formatShortDate(panchang.eclipse.peakTime)} IST
                  </p>
                  {lunarTotalityLabel(panchang.eclipse) && (
                    <p className="mt-0.5 text-support text-chandra-focus">{lunarTotalityLabel(panchang.eclipse)}</p>
                  )}
                  {panchang.eclipse.type === 'lunar' && (
                    <p className="mt-1.5 text-support leading-relaxed text-chandra-text-secondary">Avoid starting auspicious work during the eclipse. Prayer, mantra and post-eclipse ritual bath are traditionally observed.</p>
                  )}
                  {panchang.eclipse.type === 'solar' && (
                    <p className="mt-1.5 text-support leading-relaxed text-chandra-text-secondary">Surya Grahan — avoid eating during the eclipse period. Chant mantras and pray.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Traditional observance guidance for the selected date. */}
          {panchang.isPurnima && !festivals.some(festival => /purnima/i.test(festival.name)) && (
            <div className="rounded-card border border-chandra-gold/35 bg-chandra-gold/15 p-4 text-center">
              <p className="font-semibold text-chandra-gold"><span role="img" aria-label="Full moon">🌕</span> Purnima — Full Moon Day</p>
              <p className="mt-1 text-support text-chandra-text-secondary">Auspicious for prayer, charity, fasting and full-moon observance</p>
            </div>
          )}
          {panchang.isAmavasya && !festivals.some(festival => /amavasya/i.test(festival.name)) && (
            <div className="rounded-card border border-chandra-focus/35 bg-chandra-indigo-cta/20 p-4 text-center">
              <p className="font-semibold text-chandra-focus"><span role="img" aria-label="New moon">🌑</span> Amavasya — New Moon Day</p>
              <p className="mt-1 text-support text-chandra-text-secondary">Sacred for ancestral offerings (Pitru Tarpan)</p>
            </div>
          )}
          {panchang.isEkadashi && !festivals.some(festival => /ekadashi/i.test(festival.name)) && (
            <div className="rounded-card border border-chandra-warning/30 bg-chandra-warning/15 p-4 text-center">
              <p className="font-semibold text-chandra-warning-text"><span role="img" aria-label="Folded hands">🙏</span> Ekadashi — Fasting Day</p>
              <p className="mt-1 text-support text-chandra-text-secondary">Dedicated to Lord Vishnu — avoid grains today</p>
            </div>
          )}
          {panchang.isVishti && (
            <div className="rounded-card border border-chandra-error/40 bg-chandra-error/15 p-4 text-center">
              <p className="font-semibold text-chandra-error"><span role="img" aria-label="Warning">⚠️</span> Bhadra / Vishti Karana Active</p>
              {panchang.vishtiPeriods?.length > 0 && (
                <p className="mt-1 text-support font-medium text-chandra-text-primary">
                  {panchang.vishtiPeriods.map(k => formatWindow(k.start, k.end)).join(', ')}
                </p>
              )}
              <p className="mt-1 text-support leading-relaxed text-chandra-text-secondary">Avoid starting new auspicious work during this Karana. Prayer, fasting and charity observances still apply.</p>
            </div>
          )}
            </div>
          </section>}

          {/* ── Collapse / Expand All ── */}
          <div className="panchang-tools">
            <div><h2 className="text-card-title text-chandra-text-primary">{isToday ? "Today's Panchang" : 'Panchang details'}</h2><p>Local sunrise snapshot · All times in IST</p></div>
            <button
              onClick={toggleAll}
              className="panchang-toggle-all flex min-h-[44px] items-center px-2 py-1 text-support text-chandra-gold underline underline-offset-2"
            >
              {allExpanded ? 'Collapse all' : 'Expand all'}
            </button>
          </div>

          {/* ── 1. Pancha Anga ── */}
          <div className="panchang-primary-grid">
          <div className="panchang-main">
          <AccordionSection
            className="panchang-anga"
            title="Pancha Anga — Five Limbs"
            isOpen={sections.panchaAnga}
            onToggle={() => toggleSection('panchaAnga')}
            onLearn={() => onLearn?.('pancha-anga')}
            learnLabel="Learn about Pancha Anga"
          >
            <PanchangMoon date={selectedDate} sunrise={panchang.sunrise} lat={lat} lon={lon} />
            <div className="flex flex-col gap-3">
              <div className="border-b border-white/10 py-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Moon size={16} aria-hidden="true" strokeWidth={1.75} className="shrink-0 text-chandra-text-secondary" />
                    <span className="text-sm text-chandra-text-secondary">Tithi</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-chandra-text-primary">{panchang.tithi}</p>
                    <p className="text-support text-chandra-text-secondary">{panchang.paksha}</p>
                  </div>
                </div>
                {panchang.tithiWindow?.start && panchang.tithiWindow?.end && (
                  <div className="ml-6 mt-2 rounded-inset bg-chandra-bg-elevated px-3 py-2">
                    <p className="text-support font-medium text-chandra-gold">
                      {formatTime(panchang.tithiWindow.start)}, {formatShortDate(panchang.tithiWindow.start)}
                      {' → '}
                      {formatTime(panchang.tithiWindow.end)}, {formatShortDate(panchang.tithiWindow.end)}
                    </p>
                  </div>
                )}
                {additionalTithi && (
                  <p className="ml-6 mt-2 text-support text-chandra-text-secondary">
                    {additionalTithi.label} · <strong className="text-chandra-text-primary">{additionalTithi.tithi.paksha} {getCalendarTithiName(additionalTithi.tithi)}</strong>
                  </p>
                )}
              </div>

              {panchang.nakshatraList?.length > 0 ? (
                <div className="border-b border-white/10 py-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Star size={16} aria-hidden="true" strokeWidth={1.75} className="shrink-0 text-chandra-text-secondary" />
                    <span className="text-sm text-chandra-text-secondary">Nakshatra</span>
                  </div>
                  {panchang.nakshatraList.map((n, i) => (
                    <div key={i} className="mb-2 ml-6 rounded-inset bg-chandra-bg-elevated px-3 py-2">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-semibold text-chandra-text-primary">{n.name}</p>
                        <p className="text-support text-chandra-text-secondary">Pada {n.pada}</p>
                      </div>
                      <p className="text-support font-medium text-chandra-gold">
                        {formatTime(n.start)}, {formatShortDate(n.start)}
                        {' → '}
                        {formatTime(n.end)}, {formatShortDate(n.end)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <PanchangRow icon={Star} label="Nakshatra" value={panchang.nakshatra} sub={`Pada ${panchang.nakshatraPada}`} />
              )}

              {panchang.yogaList?.length > 0 ? (
                <div className="border-b border-white/10 py-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock size={16} aria-hidden="true" strokeWidth={1.75} className="shrink-0 text-chandra-text-secondary" />
                    <span className="text-sm text-chandra-text-secondary">Yoga</span>
                  </div>
                  {panchang.yogaList.map((y, i) => (
                    <div key={i} className="mb-2 ml-6 rounded-inset bg-chandra-bg-elevated px-3 py-2">
                      <p className="mb-1 text-sm font-semibold text-chandra-text-primary">{y.name}</p>
                      <p className="text-support font-medium text-chandra-gold">
                        {formatTime(y.start)}, {formatShortDate(y.start)}
                        {' → '}
                        {formatTime(y.end)}, {formatShortDate(y.end)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <PanchangRow icon={Clock} label="Yoga" value={panchang.yoga} />
              )}
              {panchang.karanaList?.length > 0 ? (
                <div className="border-b border-white/10 py-2">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-5 shrink-0 text-center text-sm font-semibold text-chandra-text-secondary" aria-hidden="true">½</span>
                    <span className="text-sm text-chandra-text-secondary">Karana</span>
                  </div>
                  {panchang.karanaList.map((k, i) => (
                    <div key={i} className="mb-2 ml-6 rounded-inset bg-chandra-bg-elevated px-3 py-2">
                      <p className="mb-1 text-sm font-semibold text-chandra-text-primary">{k.name}</p>
                      <p className="text-support font-medium text-chandra-gold">
                        {formatTime(k.start)}, {formatShortDate(k.start)}
                        {' → '}
                        {formatTime(k.end)}, {formatShortDate(k.end)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <PanchangRow icon="½" label="Karana" value={panchang.karana} />
              )}
              <PanchangRow icon={CalendarIcon}  label="Vara"   value={panchang.vara} sub={panchang.varaDeity} />
            </div>
          </AccordionSection>

          <AccordionSection
            className="panchang-sun"
            title="Sunrise & Sunset"
            isOpen={sections.sunTimings}
            onToggle={() => toggleSection('sunTimings')}
          >
            <PanchangRow icon={Sunrise} label="Sunrise" value={`${formatTime(panchang.sunrise)} IST`} />
            <PanchangRow icon={Sunset} label="Sunset" value={`${formatTime(panchang.sunset)} IST`} />
          </AccordionSection>
          </div>

          {/* ── 2. Daily Timings ── */}
          <div className="panchang-side">
          <AccordionSection
            className="panchang-timings"
            title="Daily Timings"
            isOpen={sections.dailyTimings}
            onToggle={() => toggleSection('dailyTimings')}
            onLearn={() => onLearn?.('daily-timings')}
            learnLabel="Learn about daily timings"
          >
            <div className="flex flex-col gap-3">
              <PanchangRow icon={Sunrise}       label="Brahma Muhurta"  value={formatWindow(...panchang.dailyTimings.brahmaMuhurta)}  sub="Most auspicious for meditation" />
              <PanchangRow icon={Sparkles}      label="Abhijit Muhurta" value={formatWindow(...panchang.dailyTimings.abhijitMuhurta)} sub="Auspicious for new beginnings" />
              <PanchangRow icon={AlertTriangle} label="Rahu Kaal"       value={formatWindow(...panchang.dailyTimings.rahuKaal)}       sub="Avoid starting important work" highlight="red" />
              <PanchangRow icon={Timer}         label="Yamagandam"      value={formatWindow(...panchang.dailyTimings.yamagandam)}     sub="Avoid starting auspicious work" highlight="red" />
            </div>
          </AccordionSection>

          {/* ── 3. Nakshatra Details ── */}
          <AccordionSection
            className="panchang-nakshatra"
            title="Nakshatra Details"
            isOpen={sections.nakshatraDetails}
            onToggle={() => toggleSection('nakshatraDetails')}
            onLearn={() => onLearn?.('nakshatra')}
            learnLabel="Learn about Nakshatra"
          >
            <div className="flex flex-col gap-4">
              {panchang.nakshatraList?.map((n, i) => (
                <div key={i}>
                  <p className="mb-2 text-support font-medium text-chandra-gold">
                    {n.name}
                    {panchang.nakshatraList.length > 1
                      ? ` · ${formatTime(n.start)}, ${formatShortDate(n.start)} – ${formatTime(n.end)}, ${formatShortDate(n.end)}`
                      : ' — Nakshatra for the selected date'
                    }
                  </p>
                  <p className="text-sm leading-relaxed text-chandra-text-primary">{getNakshatraDescription(n.name)}</p>
                  {i < panchang.nakshatraList.length - 1 && (
                    <div className="mt-4 border-t border-white/10" />
                  )}
                </div>
              ))}
            </div>
          </AccordionSection>

          {/* ── 4. Month & Year ── */}
          <AccordionSection
            className="panchang-month"
            title="Month & Year"
            isOpen={sections.monthYear}
            onToggle={() => toggleSection('monthYear')}
            onLearn={() => onLearn?.('month-year')}
            learnLabel="Learn about month and year"
          >
            <div className="flex flex-col gap-3">
              <PanchangRow
                icon={CalendarIcon}
                label="Samvatsara"
                value={panchang.samvatsara.name}
                sub={`Year ${panchang.samvatsara.number} of the South Indian 60-year cycle`}
              />
              <PanchangRow
                icon={Moon}
                label="Masa · Amavasyant"
                value={lunarMonths.amavasyant ?? 'Unavailable'}
              />
              <PanchangRow
                icon={Moon}
                label="Masa · Purnimant"
                value={lunarMonths.purnimant ?? 'Unavailable'}
              />
              <PanchangRow
                icon={Sun}
                label="Ritu"
                value={panchang.ritu.name}
                sub={panchang.ritu.meaning}
              />
              <PanchangRow
                icon={Sunrise}
                label="Ayana"
                value={panchang.ayana}
                sub={panchang.ayana === 'Uttarayana' ? 'Sun moving northward' : 'Sun moving southward'}
              />
            </div>
          </AccordionSection>

          {/* ── 5. Planetary Positions ── */}
          </div>
          </div>
          <AccordionSection
            className="panchang-planets"
            title="Planetary Positions — Navagraha"
            isOpen={sections.planetary}
            onToggle={() => toggleSection('planetary')}
            onLearn={() => onLearn?.('navagraha')}
            learnLabel="Learn about Navagraha"
          >
            <p className="mb-3 text-support text-chandra-text-secondary">Sidereal longitudes (Lahiri Ayanamsha) at sunrise</p>
            <div className="panchang-planet-grid">
              {[
                { symbol: '☀',  name: 'Sun',     sanskrit: 'Surya',      lon: panchang.navagraha.Sun     },
                { symbol: '☽',  name: 'Moon',    sanskrit: 'Chandra',    lon: panchang.navagraha.Moon    },
                { symbol: '♂',  name: 'Mars',    sanskrit: 'Mangala',    lon: panchang.navagraha.Mars    },
                { symbol: '☿',  name: 'Mercury', sanskrit: 'Budha',      lon: panchang.navagraha.Mercury },
                { symbol: '♃',  name: 'Jupiter', sanskrit: 'Guru',       lon: panchang.navagraha.Jupiter },
                { symbol: '♀',  name: 'Venus',   sanskrit: 'Shukra',     lon: panchang.navagraha.Venus   },
                { symbol: '♄',  name: 'Saturn',  sanskrit: 'Shani',      lon: panchang.navagraha.Saturn  },
                { symbol: '☊',  name: 'Rahu',    sanskrit: 'North Node', lon: panchang.navagraha.Rahu    },
                { symbol: '☋',  name: 'Ketu',    sanskrit: 'South Node', lon: panchang.navagraha.Ketu    },
              ].map(({ symbol, name, sanskrit, lon }) => (
                <div key={name} className="panchang-planet flex items-center justify-between border-b border-white/10 py-2 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-base w-5 text-center leading-none" aria-hidden="true">{symbol}</span>
                    <div>
                      <span className="text-sm text-chandra-text-primary">{name}</span>
                      <span className="ml-1.5 text-support text-chandra-text-secondary">({sanskrit})</span>
                    </div>
                  </div>
                  <p className="text-sm font-medium tabular-nums text-chandra-text-primary">{formatLongitude(lon)}</p>
                </div>
              ))}
            </div>
          </AccordionSection>

          <CityPageLinks />

          <button
            type="button"
            onClick={() => onLearn?.('basics')}
            className="group flex min-h-[64px] w-full items-center justify-between gap-3 rounded-card border border-white/10 bg-chandra-bg-surface p-5 text-left transition-all hover:border-chandra-gold/35 active:bg-chandra-bg-elevated"
          >
            <span className="flex items-center gap-2 text-sm font-medium text-chandra-text-primary">
              <BookOpen size={16} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-chandra-gold" />
              Learn Panchang basics
            </span>
            <span className="shrink-0 text-sm text-chandra-focus group-hover:underline">Open</span>
          </button>

        </div>
      ) : (
        <div aria-live="polite" aria-busy={!error || undefined} className="mt-20 text-center text-chandra-text-secondary">
          <PanchangIcon size={36} aria-hidden="true" className="mx-auto mb-4 text-chandra-gold/45" />
          <p role="alert">{error ? 'Could not calculate Panchang for this date. Please try again or choose another date.' : 'Calculating Panchang...'}</p>
          {error && <Button className="mt-4" onClick={() => changeDate(new Date(selectedDate))}>Try again</Button>}
        </div>
      )}
      <footer className="panchang-footer"><span>Calculated for {location?.city || 'Bengaluru'}</span><span>Chandra · Indian Moon Tracker</span></footer>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────

const AccordionSection = ({ title, isOpen, onToggle, onLearn, learnLabel, children, className = '' }) => (
  <div className={`panchang-panel overflow-hidden rounded-card border border-white/10 bg-chandra-bg-surface ${className}`}>
    <div className="panchang-panel-heading flex min-h-[60px] items-center px-5 py-2">
      <h2 className="min-w-0 flex-1 text-card-title text-chandra-gold">
      <button
        onClick={onToggle}
        aria-expanded={isOpen}
        className="w-full rounded-control py-2 pr-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-chandra-focus"
      >
        {title}
      </button>
      </h2>
      {onLearn && (
        <button
          type="button"
          onClick={onLearn}
          aria-label={learnLabel || `Learn about ${title}`}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-icon text-chandra-gold hover:bg-chandra-gold/10 active:bg-chandra-gold/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-chandra-focus"
        >
          <BookOpen size={16} strokeWidth={1.75} aria-hidden="true" />
        </button>
      )}
      <button
        type="button"
        onClick={onToggle}
        aria-label={isOpen ? `Collapse ${title}` : `Expand ${title}`}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-icon hover:bg-chandra-bg-elevated active:bg-chandra-bg-elevated focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-chandra-focus"
      >
        <ChevronDown
          size={16}
          strokeWidth={1.75}
          aria-hidden="true"
          className={`text-chandra-text-secondary transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
    </div>
    {isOpen && (
      <div className="panchang-panel-content px-5 pb-5">
        {children}
      </div>
    )}
  </div>
)

const PanchangRow = ({ icon: Icon, label, value, sub, highlight }) => (
  <div className="panchang-row flex items-center justify-between border-b border-white/10 py-2 last:border-0">
    <div className="flex items-center gap-2">
      {typeof Icon === 'string'
        ? <span className="text-base" aria-hidden="true">{Icon}</span>
        : <Icon size={16} aria-hidden="true" strokeWidth={1.75} className="shrink-0 text-chandra-text-secondary" />
      }
      <span className="text-sm text-chandra-text-secondary">{label}</span>
    </div>
    <div className="text-right">
      <p className={`text-sm font-semibold ${highlight === 'red' ? 'text-chandra-error' : 'text-chandra-text-primary'}`}>{value}</p>
      {sub && <p className="text-support text-chandra-text-secondary">{sub}</p>}
    </div>
  </div>
)

const getNakshatraDescription = (name) => {
  const descriptions = {
    'Ashwini':           'Ruled by Ketu. Associated with healing, speed and new beginnings. Deity: Ashwini Kumaras.',
    'Bharani':           'Ruled by Venus. Associated with transformation and restraint. Deity: Yama.',
    'Krittika':          'Ruled by Sun. Associated with sharp focus and purification. Deity: Agni.',
    'Rohini':            'Ruled by Moon. Most fertile Nakshatra — associated with growth and beauty. Deity: Brahma.',
    'Mrigashira':        'Ruled by Mars. Associated with searching, gentleness and curiosity. Deity: Soma.',
    'Ardra':             'Ruled by Rahu. Associated with storms, effort and transformation. Deity: Rudra.',
    'Punarvasu':         'Ruled by Jupiter. Associated with renewal and restoration. Deity: Aditi.',
    'Pushya':            'Ruled by Saturn. Most auspicious Nakshatra — nourishing and supportive. Deity: Brihaspati.',
    'Ashlesha':          'Ruled by Mercury. Associated with serpent energy and mysticism. Deity: Nagas.',
    'Magha':             'Ruled by Ketu. Associated with ancestors, authority and royalty. Deity: Pitrus.',
    'Purva Phalguni':    'Ruled by Venus. Associated with pleasure, creativity and rest. Deity: Bhaga.',
    'Uttara Phalguni':   'Ruled by Sun. Associated with partnerships and generosity. Deity: Aryaman.',
    'Hasta':             'Ruled by Moon. Associated with skill, craftsmanship and healing. Deity: Savitar.',
    'Chitra':            'Ruled by Mars. Associated with beauty, art and architecture. Deity: Vishwakarma.',
    'Swati':             'Ruled by Rahu. Associated with independence and the wind. Deity: Vayu.',
    'Vishakha':          'Ruled by Jupiter. Associated with purpose, ambition and triumph. Deity: Indra-Agni.',
    'Anuradha':          'Ruled by Saturn. Associated with devotion and friendship. Deity: Mitra.',
    'Jyeshtha':          'Ruled by Mercury. Associated with seniority and protection. Deity: Indra.',
    'Mula':              'Ruled by Ketu. Associated with roots, destruction and investigation. Deity: Nirriti.',
    'Purva Ashadha':     'Ruled by Venus. Associated with invincibility and purification. Deity: Apas.',
    'Uttara Ashadha':    'Ruled by Sun. Associated with final victory and universal principles. Deity: Vishvedevas.',
    'Shravana':          'Ruled by Moon. Associated with learning, listening and connection. Deity: Vishnu.',
    'Dhanishtha':        'Ruled by Mars. Associated with wealth, music and abundance. Deity: Eight Vasus.',
    'Shatabhisha':       'Ruled by Rahu. Associated with healing and hidden truths. Deity: Varuna.',
    'Purva Bhadrapada':  'Ruled by Jupiter. Associated with spiritual fire and transformation. Deity: Aja Ekapad.',
    'Uttara Bhadrapada': 'Ruled by Saturn. Associated with depth, wisdom and rain. Deity: Ahir Budhanya.',
    'Revati':            'Ruled by Mercury. Associated with journeys, nourishment and endings. Deity: Pushan.',
  }
  return descriptions[name] || 'A sacred lunar mansion with deep Vedic significance.'
}

export default Panchang
