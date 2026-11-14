import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowUp, BookOpen, CalendarDays, ChevronDown, Clock, Moon, Sparkles, Star, Sun } from 'lucide-react'
import './Learn.css'

const LEARN_SECTIONS = [
  {
    id: 'basics',
    eyebrow: 'Start Here',
    title: 'The Sky Clock Behind Chandra',
    summary: 'How the Sun, Moon and stars shape the Hindu calendar.',
    icon: Moon,
    intro:
      'A Panchang is a way of reading time from the relationship between the Sun, Moon, stars, and your location. Chandra turns that sky clock into a daily view for your city.',
    points: [
      ['Scientific view', 'The app calculates positions of the Sun and Moon for a specific date, time, latitude, and longitude. Sunrise matters because Hindu civil-day observances usually follow the state of the sky at local sunrise.'],
      ['Cultural view', 'The day is not just a number on a calendar. It has a mood, a rhythm, and traditional uses: prayer, fasting, travel, festivals, and choosing good times.'],
      ['How Chandra uses it', 'Your selected city sets sunrise, sunset, moonrise, and timing windows. The same date can have slightly different timings from city to city.'],
    ],
  },
  {
    id: 'pancha-anga',
    eyebrow: 'Five Limbs',
    title: 'Pancha Anga: The Five Parts Of A Day',
    summary: 'Understand Tithi, Nakshatra, Yoga, Karana and Vara.',
    icon: Sparkles,
    intro:
      'Pancha Anga literally means five limbs. Together, Tithi, Nakshatra, Yoga, Karana, and Vara describe the character of a Hindu calendar day.',
    points: [
      ['Tithi', 'The lunar day. Scientifically, one Tithi is every 12 degrees of separation between the Moon and Sun. Culturally, it shapes fasting days, Purnima, Amavasya, and many festivals.'],
      ['Paksha', 'The half of the lunar month. Shukla Paksha is the waxing half from new moon to full moon; Krishna Paksha is the waning half from full moon to new moon.'],
      ['Nakshatra and Pada', 'A Nakshatra is one of 27 lunar mansions along the Moon’s sidereal path. Each Nakshatra has 4 Padas, so Pada tells you the quarter of that mansion.'],
      ['Yoga', 'A daily quality calculated from the combined sidereal longitudes of the Sun and Moon. Traditional Panchangs use it as one of the five daily limbs.'],
      ['Karana', 'Half of a Tithi. Since one Tithi spans 12 degrees, one Karana spans 6 degrees. Some Karanas are considered better for routine work than auspicious beginnings.'],
      ['Vara', 'The weekday, connected with a planetary ruler: Sunday with Surya, Monday with Chandra, Tuesday with Mangala, and so on.'],
    ],
    visual: 'tithi',
  },
  {
    id: 'daily-timings',
    summary: 'Read Rahu Kaal, Brahma Muhurta and other daily time windows.',
    eyebrow: 'Daily Rhythm',
    title: 'Daily Timings: Reading The Daylight',
    icon: Clock,
    intro:
      'Daily timing periods are built from the actual sunrise and sunset at your selected city. Chandra avoids fixed 6 AM and 6 PM assumptions because the real day changes through the year.',
    points: [
      ['Brahma Muhurta', 'A quiet pre-sunrise period traditionally used for meditation, prayer, and study. Chandra shows it as a 48-minute period ending 48 minutes before sunrise.'],
      ['Abhijit Muhurta', 'A midday auspicious window centered on local solar noon. Chandra approximates it as 48 minutes around the midpoint between sunrise and sunset.'],
      ['Rahu Kaal', 'A weekday-based inauspicious period. Daylight is divided into 8 parts, and the Rahu Kaal slot changes by weekday.'],
      ['Yamagandam', 'Another weekday-based period generally avoided for auspicious starts. It uses the same 8-part daylight division with a different slot order.'],
    ],
    visual: 'daylight',
  },
  {
    id: 'nakshatra',
    summary: 'Explore lunar mansions, Padas and their meaning.',
    eyebrow: 'Moon Among Stars',
    title: 'Nakshatra Details',
    icon: Star,
    intro:
      'If Tithi tells us the Moon’s relationship with the Sun, Nakshatra tells us where the Moon is against the sidereal star belt.',
    points: [
      ['Scientific view', 'The Moon’s sidereal longitude is divided into 27 equal sectors of 13 degrees 20 minutes. Each sector is a Nakshatra.'],
      ['Pada', 'Each Nakshatra is split into 4 Padas of 3 degrees 20 minutes. Pada gives a finer position inside the Nakshatra.'],
      ['Cultural view', 'Nakshatras carry stories, deities, symbols, and qualities. This is why many Panchangs include descriptions like healing, nourishment, devotion, or transformation.'],
      ['Timing', 'A Nakshatra can change during the day, so Chandra shows start and end times when more than one Nakshatra touches the selected date.'],
    ],
    visual: 'nakshatra',
  },
  {
    id: 'month-year',
    summary: 'Make sense of Masa, Ritu, Ayana and Samvatsara.',
    eyebrow: 'Lunar Month',
    title: 'Month And Year',
    icon: CalendarDays,
    intro:
      'The Hindu calendar is lunisolar: months follow the Moon, but seasons stay connected to the Sun. This is why Masa, Ritu, Ayana, and Samvatsara sit together.',
    points: [
      ['Masa', 'The lunar month. Chandra supports Amavasyant and Purnimant naming, so the same sky can be named differently by regional tradition.'],
      ['Amavasyant and Purnimant', 'Amavasyant months end at new moon and are common in South and West India. Purnimant months end at full moon and are common in North and Central India.'],
      ['Ritu', 'The season. It is calculated from the Sun’s sidereal position and changes every two solar signs.'],
      ['Ayana', 'The Sun’s half-year movement: Uttarayana is the northward half, Dakshinayana the southward half in the traditional sidereal framing.'],
      ['Samvatsara', 'A name from the 60-year Jovian cycle, used in many almanacs and festival references.'],
    ],
    visual: 'month',
  },
  {
    id: 'navagraha',
    summary: 'Learn about Navagraha, Rashis and Ayanamsha.',
    eyebrow: 'Wider Sky',
    title: 'Planetary Positions And Navagraha',
    icon: Sun,
    intro:
      'Navagraha means the nine grahas shown in the Panchang: Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Rahu, and Ketu.',
    points: [
      ['Scientific view', 'Chandra calculates geocentric ecliptic longitudes, then converts them to sidereal longitudes using Lahiri-style ayanamsha.'],
      ['Rashi', 'Each 30-degree section of the sidereal zodiac is a Rashi. A position like 12.4 degrees Mesha means the graha is that far into Mesha.'],
      ['Ayanamsha', 'The offset between tropical and sidereal longitude. Chandra uses a date-sensitive Lahiri helper rather than a fixed subtraction.'],
      ['Rahu and Ketu', 'These are lunar nodes, the crossing points of the Moon’s orbit and the Sun’s apparent path. Eclipses happen near these nodes.'],
    ],
    visual: 'navagraha',
  },
  {
    id: 'festivals-events',
    summary: 'Discover how festival dates and recurring observances are determined.',
    eyebrow: 'Calendar Events',
    title: 'Festivals, Observances, And Eclipses',
    icon: CalendarDays,
    intro:
      'A festival is often not “just the Tithi of the day.” Many traditions ask whether a Tithi is active during a meaningful ritual window.',
    points: [
      ['Festival windows', 'Some festivals are decided at sunrise, some at midday, some in the evening Pradosh period, some at moonrise, and some near midnight.'],
      ['Monthly observances', 'Ekadashi, Pradosh, Purnima, Amavasya, Sankashti Chaturthi, and similar observances repeat by Tithi and Paksha.'],
      ['Eclipses', 'Chandra Grahan and Surya Grahan are calculated astronomically, then displayed with Hindu names and timing context.'],
      ['Why city matters', 'Moonrise, sunrise, sunset, and ritual windows depend on location, so Chandra calculates them for your selected city.'],
    ],
  },
  {
    id: 'calendar-system',
    summary: 'Compare the Amavasyant and Purnimant calendar traditions.',
    eyebrow: 'Settings',
    title: 'Calendar System: Amavasyant And Purnimant',
    icon: CalendarDays,
    intro:
      'The calendar system setting mostly changes the name of the lunar month, especially during Krishna Paksha. It usually does not change the astronomical Tithi itself.',
    points: [
      ['Amavasyant', 'The month ends on Amavasya, the new moon. This is the default in Chandra and is common in South and West India.'],
      ['Purnimant', 'The month ends on Purnima, the full moon. This is common in North and Central India.'],
      ['What changes', 'During Krishna Paksha, Purnimant month names advance compared with Amavasyant names. This matters for festival descriptions and regional familiarity.'],
      ['What stays the same', 'The Moon, Sun, Tithi, Nakshatra, sunrise, and moonrise calculations are the same physical sky. Only the naming convention changes.'],
    ],
    visual: 'calendarSystem',
  },
]

const TITHI_REFERENCE = [
  ['Pratipada (Prathama)', 'The first lunar day; a fresh start after Amavasya or Purnima.'],
  ['Dwitiya', 'The second lunar day; often associated with steadiness and continuation.'],
  ['Tritiya', 'The third lunar day; seen in festivals like Akshaya Tritiya.'],
  ['Chaturthi', 'The fourth lunar day; important for Ganesha worship and Sankashti Chaturthi.'],
  ['Panchami', 'The fifth lunar day; appears in observances such as Nag Panchami.'],
  ['Shashthi', 'The sixth lunar day; connected with Subrahmanya and Skanda traditions.'],
  ['Saptami', 'The seventh lunar day; often linked with Surya worship.'],
  ['Ashtami', 'The eighth lunar day; appears in Krishna Janmashtami and Durga Ashtami.'],
  ['Navami', 'The ninth lunar day; important in Rama Navami and Maha Navami.'],
  ['Dashami', 'The tenth lunar day; seen in Vijayadashami and other festival endings.'],
  ['Ekadashi', 'The eleventh lunar day; traditionally observed with fasting and Vishnu worship.'],
  ['Dwadashi', 'The twelfth lunar day; often used for completing Ekadashi observance.'],
  ['Trayodashi', 'The thirteenth lunar day; connected with Pradosh and Dhanteras.'],
  ['Chaturdashi', 'The fourteenth lunar day; seen near Amavasya or Purnima, including Shivaratri observances.'],
  ['Purnima / Amavasya', 'The fifteenth day is Purnima in Shukla Paksha and Amavasya in Krishna Paksha.'],
]

const KARANA_REFERENCE = [
  ['Bava', 'A movable Karana, generally treated as suitable for ordinary beginnings.'],
  ['Balava', 'A movable Karana associated with growth and supportive activity.'],
  ['Kaulava', 'A movable Karana often read as social, relational, and cooperative.'],
  ['Taitila', 'A movable Karana associated with practical effort and building.'],
  ['Garija', 'A movable Karana connected with steady, grounded work.'],
  ['Vanija', 'A movable Karana associated with trade, exchange, and agreements.'],
  ['Vishti (Bhadra)', 'Traditionally avoided for auspicious beginnings; Chandra highlights it separately.'],
  ['Shakuni', 'A fixed Karana occurring near the end of Krishna Paksha.'],
  ['Chatushpada', 'A fixed Karana associated with four-footed beings and specific ritual contexts.'],
  ['Naga', 'A fixed Karana linked with serpent symbolism and the end of the lunar cycle.'],
  ['Kimstughna', 'A fixed Karana that appears at the start of Shukla Paksha after Amavasya.'],
]

const RASHI_REFERENCE = [
  ['Mesha', 'Aries', 'The first Rashi; fire, initiative, and beginnings.'],
  ['Vrishabha', 'Taurus', 'Earthy steadiness, material life, and endurance.'],
  ['Mithuna', 'Gemini', 'Communication, exchange, learning, and movement.'],
  ['Karka', 'Cancer', 'Care, home, emotion, and nourishment.'],
  ['Simha', 'Leo', 'Leadership, visibility, courage, and radiance.'],
  ['Kanya', 'Virgo', 'Detail, service, analysis, and refinement.'],
  ['Tula', 'Libra', 'Balance, relationships, fairness, and harmony.'],
  ['Vrischika', 'Scorpio', 'Depth, secrecy, transformation, and intensity.'],
  ['Dhanu', 'Sagittarius', 'Wisdom, dharma, travel, and expansion.'],
  ['Makara', 'Capricorn', 'Discipline, structure, duty, and long effort.'],
  ['Kumbha', 'Aquarius', 'Systems, community, ideas, and reform.'],
  ['Meena', 'Pisces', 'Compassion, imagination, surrender, and completion.'],
]

const NAKSHATRA_REFERENCE = [
  ['Ashwini', 'Healing, speed, and new beginnings. Deity: Ashwini Kumaras.'],
  ['Bharani', 'Transformation, restraint, and responsibility. Deity: Yama.'],
  ['Krittika', 'Purification, sharpness, and focus. Deity: Agni.'],
  ['Rohini', 'Growth, beauty, fertility, and attraction. Deity: Brahma.'],
  ['Mrigashira', 'Searching, curiosity, gentleness, and movement. Deity: Soma.'],
  ['Ardra', 'Storms, effort, grief, and renewal. Deity: Rudra.'],
  ['Punarvasu', 'Return, restoration, and protection. Deity: Aditi.'],
  ['Pushya', 'Nourishment, support, and sacred learning. Deity: Brihaspati.'],
  ['Ashlesha', 'Serpent energy, binding, intuition, and hidden power. Deity: Nagas.'],
  ['Magha', 'Ancestors, lineage, authority, and dignity. Deity: Pitris.'],
  ['Purva Phalguni', 'Rest, pleasure, creativity, and enjoyment. Deity: Bhaga.'],
  ['Uttara Phalguni', 'Partnerships, generosity, contracts, and support. Deity: Aryaman.'],
  ['Hasta', 'Skill, hands, craft, healing, and cleverness. Deity: Savitar.'],
  ['Chitra', 'Beauty, design, architecture, and brilliance. Deity: Vishwakarma.'],
  ['Swati', 'Independence, wind, flexibility, and self-direction. Deity: Vayu.'],
  ['Vishakha', 'Purpose, ambition, triumph, and branching paths. Deity: Indra-Agni.'],
  ['Anuradha', 'Devotion, friendship, loyalty, and discipline. Deity: Mitra.'],
  ['Jyeshtha', 'Seniority, protection, responsibility, and power. Deity: Indra.'],
  ['Mula', 'Roots, investigation, endings, and deep transformation. Deity: Nirriti.'],
  ['Purva Ashadha', 'Purification, conviction, and invincibility. Deity: Apas.'],
  ['Uttara Ashadha', 'Final victory, ethics, and universal principles. Deity: Vishvedevas.'],
  ['Shravana', 'Listening, learning, memory, and connection. Deity: Vishnu.'],
  ['Dhanishtha', 'Rhythm, wealth, music, and collective strength. Deity: Vasus.'],
  ['Shatabhisha', 'Healing, secrecy, and hidden truth. Deity: Varuna.'],
  ['Purva Bhadrapada', 'Spiritual fire, intensity, and transformation. Deity: Aja Ekapad.'],
  ['Uttara Bhadrapada', 'Depth, patience, wisdom, and inner stability. Deity: Ahir Budhanya.'],
  ['Revati', 'Journeys, nourishment, protection, and completion. Deity: Pushan.'],
]

const MONTHLY_OBSERVANCE_REFERENCE = [
  ['Ekadashi', 'The 11th Tithi of each Paksha, traditionally observed with fasting and Vishnu worship.'],
  ['Pradosh Vrat', 'Observed around Trayodashi, especially during the evening Pradosh period, and associated with Shiva worship.'],
  ['Purnima', 'The full moon day; auspicious for prayer, charity, Satyanarayana Puja, and many regional festivals.'],
  ['Amavasya', 'The new moon day; traditionally important for ancestors, Tarpan, reflection, and quiet observance.'],
  ['Sankashti Chaturthi', 'Krishna Paksha Chaturthi, observed for Lord Ganesha, often with moonrise-based fasting.'],
  ['Masik Shivaratri', 'Monthly Shivaratri on Krishna Chaturdashi, dedicated to Lord Shiva.'],
  ['Kalashtami', 'Krishna Ashtami, associated with Kala Bhairava worship.'],
  ['Vinayaka Chaturthi', 'Shukla Chaturthi, a monthly Ganesha observance distinct from Sankashti.'],
  ['Skanda Shashthi', 'Shukla Shashthi, associated with Lord Subrahmanya or Murugan in many traditions.'],
]

const Learn = ({ targetSection, active = true, onBack, returnLabel = 'Day View' }) => {
  const [showTop, setShowTop] = useState(false)
  const titleRef = useRef(null)
  const sectionIds = useMemo(() => new Set(LEARN_SECTIONS.map(section => section.id)), [])
  const [openTopics, setOpenTopics] = useState(() => new Set(sectionIds.has(targetSection) ? [targetSection] : []))
  const allOpen = openTopics.size === LEARN_SECTIONS.length

  const toggleTopic = useCallback((id, open) => setOpenTopics(previous => {
    if (previous.has(id) === open) return previous
    const next = new Set(previous)
    if (open) next.add(id)
    else next.delete(id)
    return next
  }), [])

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 500)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!active) return
    const section = targetSection && sectionIds.has(targetSection) ? targetSection : 'top'
    let frame
    const timer = window.setTimeout(() => {
      if (section !== 'top') toggleTopic(section, true)
      frame = window.requestAnimationFrame(() => {
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        const behavior = prefersReducedMotion ? 'auto' : 'smooth'
        const el = document.getElementById(section)
        if (el) {
          el.scrollIntoView({ behavior, block: 'start' })
          if (section === 'top') titleRef.current?.focus({ preventScroll: true })
          else el.querySelector('summary')?.focus({ preventScroll: true })
        } else {
          window.scrollTo({ top: 0, behavior })
          titleRef.current?.focus({ preventScroll: true })
        }
      })
    }, 80)
    return () => {
      window.clearTimeout(timer)
      window.cancelAnimationFrame(frame)
    }
  }, [active, targetSection, sectionIds, toggleTopic])

  return (
    <div id="top" className="learn-page min-h-screen px-4 pt-3 pb-32 mx-auto">
      <div className="learn-backbar sticky top-14 z-30 -mx-4 mb-5 border-b border-[color:var(--border-default)] bg-chandra-bg-primary px-4 py-2 backdrop-blur">
        <button
          type="button"
          onClick={onBack}
          className="flex min-h-[44px] items-center gap-2 rounded-control px-2 pr-3 text-left text-sm font-semibold text-chandra-text-primary active:bg-chandra-bg-elevated"
          aria-label={`Back to ${returnLabel}`}
        >
          <ArrowLeft size={18} aria-hidden="true" strokeWidth={1.9} className="text-chandra-gold shrink-0" />
          <span>Back to {returnLabel}</span>
        </button>
      </div>
      <header className="mb-6">
        <div className="flex items-center gap-2 text-chandra-gold mb-3">
          <BookOpen size={20} aria-hidden="true" strokeWidth={1.75} />
          <p className="text-xs uppercase tracking-widest font-semibold">Learn Chandra</p>
        </div>
        <h1 ref={titleRef} tabIndex={-1} className="text-chandra-text-primary focus:outline-none text-page-title">A Gentle Guide To Panchang Terms</h1>
        <p className="text-chandra-text-secondary text-prose mt-3">
          Learn the science and cultural meaning behind the words you see in Chandra.
          Open a topic below, or expand all to read the complete guide.
        </p>
      </header>

      <section aria-labelledby="learn-overview-heading" className="learn-overview mb-5 rounded-card border border-[color:var(--border-default)] bg-chandra-bg-surface p-5">
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-chandra-gold">8 topics · Learn at your own pace</p>
        <h2 id="learn-overview-heading" className="text-chandra-text-primary text-card-title">What you’ll learn</h2>
        <p className="mt-3 text-base leading-relaxed text-chandra-text-secondary">
          Understand Panchang basics, the five daily elements, daily timings, Nakshatras,
          months and years, planetary positions, festivals, and calendar traditions.
        </p>
      </section>

      <div className="learn-topic-tools mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-chandra-text-secondary">Choose a topic to explore</p>
        <button type="button" onClick={() => setOpenTopics(allOpen ? new Set() : new Set(LEARN_SECTIONS.map(section => section.id)))} className="min-h-[44px] shrink-0 rounded-control px-3 py-2 text-sm font-semibold text-chandra-gold hover:bg-chandra-bg-elevated active:bg-chandra-bg-primary">
          {allOpen ? 'Collapse all' : 'Expand all'}
        </button>
      </div>

      <div className="flex flex-col gap-5">
        {LEARN_SECTIONS.map((section, index) => (
          <LearnSection key={section.id} section={section} number={index + 1} open={openTopics.has(section.id)} onToggle={toggleTopic} />
        ))}
      </div>

      {showTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="learn-scroll-top fixed right-4 bottom-24 z-30 w-11 h-11 rounded-pill bg-chandra-gold text-chandra-text-inverse shadow-lg shadow-black/30 flex items-center justify-center active:bg-chandra-gold-active"
          aria-label="Scroll to top"
        >
          <ArrowUp size={18} aria-hidden="true" strokeWidth={2.2} />
        </button>
      )}
    </div>
  )
}

const LearnSection = ({ section, number, open, onToggle }) => (
  <details id={section.id} open={open} onToggle={event => onToggle(section.id, event.currentTarget.open)} className="learn-section scroll-mt-32 bg-chandra-bg-surface border border-[color:var(--border-default)] rounded-card overflow-hidden">
      <summary className="learn-topic-heading flex min-h-[64px] cursor-pointer items-center gap-3 p-5 hover:bg-chandra-bg-elevated focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-chandra-focus">
        <div className="w-9 h-9 rounded-icon bg-chandra-gold/10 border border-chandra-gold/30 flex items-center justify-center shrink-0">
          <section.icon size={17} aria-hidden="true" strokeWidth={1.75} className="text-chandra-gold" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-chandra-gold text-xs uppercase tracking-widest font-semibold">{String(number).padStart(2, '0')} · {section.eyebrow}</p>
          <h2 className="text-chandra-text-primary mt-1 text-card-title">{section.title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-chandra-text-secondary">{section.summary}</p>
        </div>
        <ChevronDown size={18} className="learn-topic-caret shrink-0 text-chandra-gold" aria-hidden="true" />
      </summary>

    <div className="learn-topic-content px-5 pb-5">
      <p className="text-chandra-text-primary text-prose">{section.intro}</p>
      {section.visual && <Visual type={section.visual} />}

      <div className="mt-4 flex flex-col gap-3">
        {section.points.map(([label, body]) => (
          <div key={label} className="rounded-control bg-chandra-bg-elevated border border-[color:var(--border-default)] px-3 py-3">
            <p className="text-chandra-gold text-xs font-semibold mb-1">{label}</p>
            <p className="text-chandra-text-primary text-prose">{body}</p>
          </div>
        ))}
      </div>

      <ReferenceBlocks sectionId={section.id} />
    </div>
  </details>
)

const ReferenceBlocks = ({ sectionId }) => {
  if (sectionId === 'pancha-anga') {
    return (
      <div className="mt-4 flex flex-col gap-3">
        <ReferenceAccordion
          title="15 Tithi names"
          note="The same 15 names repeat in Shukla and Krishna Paksha, forming 30 lunar days."
          items={TITHI_REFERENCE}
        />
        <ReferenceAccordion
          title="11 Karanas"
          note="Karanas are half-Tithis: 7 movable Karanas repeat, and 4 fixed Karanas appear at specific points."
          items={KARANA_REFERENCE}
        />
      </div>
    )
  }

  if (sectionId === 'nakshatra') {
    return (
      <div className="mt-4">
        <ReferenceAccordion
          title="27 Nakshatras"
          note="Each Nakshatra spans 13 degrees 20 minutes of the sidereal sky."
          items={NAKSHATRA_REFERENCE}
        />
      </div>
    )
  }

  if (sectionId === 'navagraha') {
    return (
      <div className="mt-4">
        <ReferenceAccordion
          title="12 Rashis"
          note="Each Rashi spans 30 degrees. English zodiac equivalents are approximate naming equivalents."
          items={RASHI_REFERENCE}
          columns={['Rashi', 'English', 'Meaning']}
        />
      </div>
    )
  }

  if (sectionId === 'festivals-events') {
    return (
      <div className="mt-4">
        <ReferenceAccordion
          title="Monthly observances"
          note="These repeat by Tithi and Paksha, though exact observance rules can depend on sunrise, moonrise, or evening windows."
          items={MONTHLY_OBSERVANCE_REFERENCE}
        />
      </div>
    )
  }

  return null
}

const ReferenceAccordion = ({ title, note, items, columns }) => {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-inset bg-chandra-bg-primary border border-[color:var(--border-default)] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        aria-expanded={open}
        className="w-full min-h-[44px] px-4 py-3 flex items-center justify-between gap-3 text-left"
      >
        <div className="min-w-0">
          <p className="text-chandra-gold text-sm font-semibold">{title}</p>
          {note && <p className="text-chandra-text-secondary text-xs leading-relaxed mt-1">{note}</p>}
        </div>
        <span className="text-chandra-gold text-lg leading-none shrink-0" aria-hidden="true">{open ? '-' : '+'}</span>
      </button>
      {open && (
        <div className="border-t border-[color:var(--border-default)]">
          {columns && (
            <div className="learn-reference-columns grid grid-cols-[0.9fr_0.9fr_1.4fr] gap-2 px-4 py-2 bg-chandra-bg-surface text-chandra-text-secondary text-meta uppercase tracking-wider">
              {columns.map(column => <span key={column}>{column}</span>)}
            </div>
          )}
          <div className="divide-y divide-[color:var(--border-default)]">
            {items.map(item => (
              <ReferenceItem key={item[0]} item={item} columns={columns} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const ReferenceItem = ({ item, columns }) => {
  if (columns) {
    return (
      <div className="learn-reference-columns grid grid-cols-[0.9fr_0.9fr_1.4fr] gap-2 px-4 py-3">
        <p className="text-chandra-text-primary text-support font-semibold">{item[0]}</p>
        <p className="text-chandra-gold text-support">{item[1]}</p>
        <p className="text-chandra-text-primary text-prose">{item[2]}</p>
      </div>
    )
  }

  return (
    <div className="px-4 py-3">
      <p className="text-chandra-text-primary text-sm font-semibold">{item[0]}</p>
      <p className="text-chandra-text-primary text-prose mt-1">{item[1]}</p>
    </div>
  )
}

const Visual = ({ type }) => {
  if (type === 'tithi') return <TithiVisual />
  if (type === 'daylight') return <DaylightVisual />
  if (type === 'nakshatra') return <NakshatraVisual />
  if (type === 'month') return <MonthVisual />
  if (type === 'navagraha') return <NavagrahaVisual />
  if (type === 'calendarSystem') return <CalendarSystemVisual />
  return null
}

const TithiVisual = () => (
  <div className="mt-4 rounded-inset bg-chandra-bg-primary border border-[color:var(--border-default)] p-4">
    <p className="learn-diagram-caption mb-3 text-chandra-gold">12 degrees = 1 Tithi</p>
    <svg viewBox="0 0 280 100" role="img" aria-label="Tithi is based on Moon Sun angle" className="learn-diagram w-full h-auto">
      <circle cx="72" cy="66" r="18" fill="var(--gold)" />
      <circle cx="190" cy="66" r="22" fill="var(--gold)" />
      <path d="M192 44 A22 22 0 0 1 192 88 A13 22 0 0 0 192 44" fill="var(--bg-primary)" opacity="0.76" />
      <path d="M72 66 C110 24 151 24 190 66" fill="none" stroke="var(--focus-ring)" strokeWidth="2" strokeDasharray="4 5" />
    </svg>
    <div className="learn-diagram grid grid-cols-2 text-center text-support text-chandra-text-secondary"><span>Sun</span><span>Moon</span></div>
  </div>
)

const DaylightVisual = () => (
  <div className="mt-4 rounded-inset bg-chandra-bg-primary border border-[color:var(--border-default)] p-4">
    <div className="flex items-center justify-between text-xs text-chandra-text-secondary mb-2">
      <span>Sunrise</span>
      <span>Sunset</span>
    </div>
    <div className="grid grid-cols-8 gap-1">
      {Array.from({ length: 8 }, (_, i) => (
        <div
          key={i}
          className={`h-10 rounded-control border ${i === 4 ? 'bg-chandra-error/20 border-chandra-error/50' : 'bg-chandra-gold/10 border-chandra-gold/20'}`}
        />
      ))}
    </div>
    <p className="text-chandra-text-secondary text-xs mt-2">Daylight is divided into 8 weekday-based slots.</p>
  </div>
)

const NakshatraVisual = () => (
  <div className="mt-4 rounded-inset bg-chandra-bg-primary border border-[color:var(--border-default)] p-4">
    <svg viewBox="0 0 280 80" role="img" aria-label="Moon moving through Nakshatra sectors" className="learn-diagram w-full h-auto">
      <path d="M20 52 C70 18 118 78 168 40 S235 36 260 52" fill="none" stroke="var(--text-secondary)" strokeWidth="2" />
      {Array.from({ length: 9 }, (_, i) => (
        <circle key={i} cx={28 + i * 28} cy={i % 2 ? 34 : 60} r="2.4" fill="var(--gold)" />
      ))}
      <circle cx="139" cy="50" r="13" fill="var(--gold)" />
      <path d="M141 37 A13 13 0 0 1 141 63 A8 13 0 0 0 141 37" fill="var(--bg-primary)" opacity="0.72" />
    </svg>
    <p className="learn-diagram-caption text-chandra-text-secondary">27 equal star sectors</p>
  </div>
)

const MonthVisual = () => (
  <div className="mt-4 rounded-inset bg-chandra-bg-primary border border-[color:var(--border-default)] p-4">
    <div className="flex items-center justify-between gap-3">
      <div className="text-center flex-1">
        <div className="text-2xl" aria-hidden="true">🌑</div>
        <p className="text-chandra-gold text-xs font-semibold mt-1">Amavasya</p>
        <p className="text-chandra-text-secondary text-xs">month end in Amavasyant</p>
      </div>
      <div className="h-px bg-[var(--border-default)] flex-1" />
      <div className="text-center flex-1">
        <div className="text-2xl" aria-hidden="true">🌕</div>
        <p className="text-chandra-gold text-xs font-semibold mt-1">Purnima</p>
        <p className="text-chandra-text-secondary text-xs">month end in Purnimant</p>
      </div>
    </div>
  </div>
)

const NavagrahaVisual = () => (
  <div className="mt-4 rounded-inset bg-chandra-bg-primary border border-[color:var(--border-default)] p-4">
    <svg viewBox="0 0 180 180" role="img" aria-label="Sidereal zodiac circle" className="w-full max-w-[210px] mx-auto h-auto">
      <circle cx="90" cy="90" r="72" fill="none" stroke="var(--border-default)" strokeWidth="2" />
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i * 30 - 90) * Math.PI / 180
        const x1 = 90 + Math.cos(a) * 56
        const y1 = 90 + Math.sin(a) * 56
        const x2 = 90 + Math.cos(a) * 72
        const y2 = 90 + Math.sin(a) * 72
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--text-secondary)" strokeWidth="1" />
      })}
      <circle cx="90" cy="90" r="19" fill="var(--gold)" />
      <text x="90" y="96" textAnchor="middle" fill="var(--text-inverse)" fontSize="17" fontWeight="700">☉</text>
      <circle cx="132" cy="59" r="7" fill="var(--focus-ring)" />
    </svg>
    <p className="learn-diagram-caption text-chandra-text-secondary">12 Rashi of 30 degrees</p>
  </div>
)

const CalendarSystemVisual = () => (
  <div className="mt-4 rounded-inset bg-chandra-bg-primary border border-[color:var(--border-default)] p-4">
    <div className="grid grid-cols-2 gap-3">
      <div className="rounded-control bg-chandra-bg-elevated border border-[color:var(--border-default)] p-3 text-center">
        <p className="text-chandra-gold text-sm font-semibold">Amavasyant</p>
        <p className="text-chandra-text-secondary text-xs mt-1">New moon closes the month</p>
      </div>
      <div className="rounded-control bg-chandra-bg-elevated border border-[color:var(--border-default)] p-3 text-center">
        <p className="text-chandra-gold text-sm font-semibold">Purnimant</p>
        <p className="text-chandra-text-secondary text-xs mt-1">Full moon closes the month</p>
      </div>
    </div>
  </div>
)

export default Learn
