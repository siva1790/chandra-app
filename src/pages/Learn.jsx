import { useEffect, useMemo, useState } from 'react'
import { ArrowUp, BookOpen, CalendarDays, Clock, Moon, Sparkles, Star, Sun } from 'lucide-react'

const LEARN_SECTIONS = [
  {
    id: 'basics',
    eyebrow: 'Start Here',
    title: 'The Sky Clock Behind Chandra',
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

const Learn = ({ targetSection }) => {
  const [showTop, setShowTop] = useState(false)
  const sectionIds = useMemo(() => new Set(LEARN_SECTIONS.map(section => section.id)), [])

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 500)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const section = targetSection && sectionIds.has(targetSection) ? targetSection : 'top'
    const timer = window.setTimeout(() => {
      const el = document.getElementById(section)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      else window.scrollTo({ top: 0, behavior: 'smooth' })
    }, 80)
    return () => window.clearTimeout(timer)
  }, [targetSection, sectionIds])

  return (
    <div id="top" className="min-h-screen px-4 py-8 pb-32 max-w-md mx-auto">
      <header className="mb-6">
        <div className="flex items-center gap-2 text-yellow-300 mb-3">
          <BookOpen size={20} aria-hidden="true" strokeWidth={1.75} />
          <p className="text-xs uppercase tracking-widest font-semibold">Learn Chandra</p>
        </div>
        <h1 className="text-2xl font-bold text-white leading-tight">A Gentle Guide To Panchang Terms</h1>
        <p className="text-gray-400 text-sm leading-relaxed mt-3">
          Learn the science and cultural meaning behind the words you see in Chandra. You can read from the top like a story,
          or jump here from a section in the app.
        </p>
      </header>

      <nav aria-label="Learning sections" className="bg-gray-900 border border-gray-800 rounded-2xl p-4 mb-5">
        <p className="text-yellow-500 text-xs uppercase tracking-widest mb-3">Sections</p>
        <div className="grid grid-cols-1 gap-2">
          {LEARN_SECTIONS.map(section => (
            <a
              key={section.id}
              href={`#learn/${section.id}`}
              className="flex items-center justify-between gap-3 rounded-xl bg-gray-800 border border-gray-700 px-3 py-3 min-h-[44px] active:bg-gray-700"
            >
              <span className="text-gray-200 text-sm font-medium">{section.title}</span>
              <section.icon size={15} aria-hidden="true" strokeWidth={1.75} className="text-yellow-400 shrink-0" />
            </a>
          ))}
        </div>
      </nav>

      <div className="flex flex-col gap-5">
        {LEARN_SECTIONS.map(section => (
          <LearnSection key={section.id} section={section} />
        ))}
      </div>

      {showTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed right-4 bottom-24 z-30 w-11 h-11 rounded-full bg-yellow-400 text-gray-950 shadow-lg shadow-black/30 flex items-center justify-center active:bg-yellow-500"
          aria-label="Scroll to top"
        >
          <ArrowUp size={18} aria-hidden="true" strokeWidth={2.2} />
        </button>
      )}
    </div>
  )
}

const LearnSection = ({ section }) => (
  <section id={section.id} className="scroll-mt-20 bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
    <div className="p-5">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-9 h-9 rounded-xl bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center shrink-0">
          <section.icon size={17} aria-hidden="true" strokeWidth={1.75} className="text-yellow-300" />
        </div>
        <div className="min-w-0">
          <p className="text-yellow-500 text-xs uppercase tracking-widest font-semibold">{section.eyebrow}</p>
          <h2 className="text-white text-lg font-bold leading-snug mt-1">{section.title}</h2>
        </div>
      </div>

      <p className="text-gray-300 text-sm leading-relaxed">{section.intro}</p>
      {section.visual && <Visual type={section.visual} />}

      <div className="mt-4 flex flex-col gap-3">
        {section.points.map(([label, body]) => (
          <div key={label} className="rounded-xl bg-gray-800/80 border border-gray-700 px-3 py-3">
            <p className="text-yellow-300 text-xs font-semibold mb-1">{label}</p>
            <p className="text-gray-300 text-sm leading-relaxed">{body}</p>
          </div>
        ))}
      </div>

      <ReferenceBlocks sectionId={section.id} />
    </div>
  </section>
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
    <div className="rounded-2xl bg-gray-950 border border-gray-800 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        aria-expanded={open}
        className="w-full min-h-[44px] px-4 py-3 flex items-center justify-between gap-3 text-left"
      >
        <div className="min-w-0">
          <p className="text-yellow-300 text-sm font-semibold">{title}</p>
          {note && <p className="text-gray-400 text-xs leading-relaxed mt-1">{note}</p>}
        </div>
        <span className="text-yellow-300 text-lg leading-none shrink-0" aria-hidden="true">{open ? '-' : '+'}</span>
      </button>
      {open && (
        <div className="border-t border-gray-800">
          {columns && (
            <div className="grid grid-cols-[0.9fr_0.9fr_1.4fr] gap-2 px-4 py-2 bg-gray-900 text-gray-400 text-[11px] uppercase tracking-wider">
              {columns.map(column => <span key={column}>{column}</span>)}
            </div>
          )}
          <div className="divide-y divide-gray-800">
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
      <div className="grid grid-cols-[0.9fr_0.9fr_1.4fr] gap-2 px-4 py-3">
        <p className="text-white text-xs font-semibold">{item[0]}</p>
        <p className="text-yellow-200 text-xs">{item[1]}</p>
        <p className="text-gray-300 text-xs leading-relaxed">{item[2]}</p>
      </div>
    )
  }

  return (
    <div className="px-4 py-3">
      <p className="text-white text-sm font-semibold">{item[0]}</p>
      <p className="text-gray-300 text-xs leading-relaxed mt-1">{item[1]}</p>
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
  <div className="mt-4 rounded-2xl bg-gray-950 border border-gray-800 p-4">
    <svg viewBox="0 0 280 130" role="img" aria-label="Tithi is based on Moon Sun angle" className="w-full h-auto">
      <circle cx="72" cy="66" r="18" fill="#FBBF24" />
      <circle cx="190" cy="66" r="22" fill="#DDBB6A" />
      <path d="M192 44 A22 22 0 0 1 192 88 A13 22 0 0 0 192 44" fill="#111827" opacity="0.76" />
      <path d="M72 66 C110 24 151 24 190 66" fill="none" stroke="#8EA8FF" strokeWidth="2" strokeDasharray="4 5" />
      <text x="72" y="105" fill="#B5BDD1" fontSize="12" textAnchor="middle">Sun</text>
      <text x="190" y="105" fill="#B5BDD1" fontSize="12" textAnchor="middle">Moon</text>
      <text x="132" y="38" fill="#DDBB6A" fontSize="12" textAnchor="middle">12 degrees = 1 Tithi</text>
    </svg>
  </div>
)

const DaylightVisual = () => (
  <div className="mt-4 rounded-2xl bg-gray-950 border border-gray-800 p-4">
    <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
      <span>Sunrise</span>
      <span>Sunset</span>
    </div>
    <div className="grid grid-cols-8 gap-1">
      {Array.from({ length: 8 }, (_, i) => (
        <div
          key={i}
          className={`h-10 rounded-lg border ${i === 4 ? 'bg-red-500/20 border-red-500/50' : 'bg-yellow-400/10 border-yellow-400/20'}`}
        />
      ))}
    </div>
    <p className="text-gray-400 text-xs mt-2">Daylight is divided into 8 weekday-based slots.</p>
  </div>
)

const NakshatraVisual = () => (
  <div className="mt-4 rounded-2xl bg-gray-950 border border-gray-800 p-4">
    <svg viewBox="0 0 280 98" role="img" aria-label="Moon moving through Nakshatra sectors" className="w-full h-auto">
      <path d="M20 52 C70 18 118 78 168 40 S235 36 260 52" fill="none" stroke="#4B5563" strokeWidth="2" />
      {Array.from({ length: 9 }, (_, i) => (
        <circle key={i} cx={28 + i * 28} cy={i % 2 ? 34 : 60} r="2.4" fill="#DDBB6A" />
      ))}
      <circle cx="139" cy="50" r="13" fill="#DDBB6A" />
      <path d="M141 37 A13 13 0 0 1 141 63 A8 13 0 0 0 141 37" fill="#111827" opacity="0.72" />
      <text x="140" y="90" fill="#B5BDD1" fontSize="12" textAnchor="middle">27 equal star sectors</text>
    </svg>
  </div>
)

const MonthVisual = () => (
  <div className="mt-4 rounded-2xl bg-gray-950 border border-gray-800 p-4">
    <div className="flex items-center justify-between gap-3">
      <div className="text-center flex-1">
        <div className="text-2xl" aria-hidden="true">🌑</div>
        <p className="text-yellow-300 text-xs font-semibold mt-1">Amavasya</p>
        <p className="text-gray-400 text-xs">month end in Amavasyant</p>
      </div>
      <div className="h-px bg-gray-700 flex-1" />
      <div className="text-center flex-1">
        <div className="text-2xl" aria-hidden="true">🌕</div>
        <p className="text-yellow-300 text-xs font-semibold mt-1">Purnima</p>
        <p className="text-gray-400 text-xs">month end in Purnimant</p>
      </div>
    </div>
  </div>
)

const NavagrahaVisual = () => (
  <div className="mt-4 rounded-2xl bg-gray-950 border border-gray-800 p-4">
    <svg viewBox="0 0 180 180" role="img" aria-label="Sidereal zodiac circle" className="w-full max-w-[210px] mx-auto h-auto">
      <circle cx="90" cy="90" r="72" fill="none" stroke="#374151" strokeWidth="2" />
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i * 30 - 90) * Math.PI / 180
        const x1 = 90 + Math.cos(a) * 56
        const y1 = 90 + Math.sin(a) * 56
        const x2 = 90 + Math.cos(a) * 72
        const y2 = 90 + Math.sin(a) * 72
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#4B5563" strokeWidth="1" />
      })}
      <circle cx="90" cy="90" r="19" fill="#DDBB6A" />
      <text x="90" y="96" textAnchor="middle" fill="#0B1020" fontSize="17" fontWeight="700">☉</text>
      <circle cx="132" cy="59" r="7" fill="#8EA8FF" />
      <text x="90" y="166" textAnchor="middle" fill="#B5BDD1" fontSize="11">12 Rashi of 30 degrees</text>
    </svg>
  </div>
)

const CalendarSystemVisual = () => (
  <div className="mt-4 rounded-2xl bg-gray-950 border border-gray-800 p-4">
    <div className="grid grid-cols-2 gap-3">
      <div className="rounded-xl bg-gray-800 border border-gray-700 p-3 text-center">
        <p className="text-yellow-300 text-sm font-semibold">Amavasyant</p>
        <p className="text-gray-400 text-xs mt-1">New moon closes the month</p>
      </div>
      <div className="rounded-xl bg-gray-800 border border-gray-700 p-3 text-center">
        <p className="text-yellow-300 text-sm font-semibold">Purnimant</p>
        <p className="text-gray-400 text-xs mt-1">Full moon closes the month</p>
      </div>
    </div>
  </div>
)

export default Learn
