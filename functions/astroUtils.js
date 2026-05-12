/**
 * astroUtils.js — astronomy and festival helpers for Cloud Functions (Node.js).
 *
 * Mirrors the logic in src/moonUtils.js and src/festivals.js but runs server-side.
 *
 * KEY DESIGN RULES — do not revert:
 *
 *  1. All date anchoring uses getISTMidnight(), never setHours(0/6/12, 0,0,0).
 *     Cloud Functions run in UTC; setHours() uses the process timezone (UTC),
 *     so setHours(12,0,0,0) = 12:00 UTC = 17:30 IST — completely wrong for Indian
 *     festival windows. Every "start of day", "6 AM IST", "noon IST" etc. must be
 *     computed as getISTMidnight() + an explicit offset in milliseconds.
 *
 *  2. Festival detection uses the rule-based, window-aware engine (ANNUAL_FESTIVALS +
 *     getWindow / ruleMatchesWindow), mirroring src/festivals.js. Do NOT revert to
 *     hardcoded dated rows — the dated approach was 2026-only and silently broke every
 *     subsequent year.
 *
 *  3. getTithiAtSunrise returns pure sunrise tithi (no noon override). The noon override
 *     lived only in Home.jsx / Panchang.jsx for display; the festival engine uses
 *     per-rule ritual windows instead, which is more accurate.
 *
 *  4. Monthly observances (Ekadashi, Pradosh, Purnima, …) are matched by sunrise tithi,
 *     exactly as the frontend's getObservancesForDate does. They are suppressed on any
 *     day that already has a major annual festival.
 *
 *  5. Push notifications default to Amavasyant calendar system because device Firestore
 *     documents do not currently store calendarSystem. The Diwali cluster (Karwa Chauth,
 *     Dhanteras, Diwali) is the only section where Amavasyant vs Purnimant matters; for
 *     South-Indian users (default city Bengaluru) Amavasyant is correct.
 */

'use strict'

const Astronomy = require('astronomy-engine')

// ── Constants ─────────────────────────────────────────────────────────────────

const AYANAMSHA = 23.15
const DAY_MS    = 24 * 60 * 60 * 1000
const HOUR_MS   = 60 * 60 * 1000

const TITHI_NAMES = [
  'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami',
  'Shashthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami',
  'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi', 'Purnima',
  'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami',
  'Shashthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami',
  'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi', 'Amavasya',
]

const NAKSHATRAS = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira',
  'Ardra', 'Punarvasu', 'Pushya', 'Ashlesha', 'Magha',
  'Purva Phalguni', 'Uttara Phalguni', 'Hasta', 'Chitra', 'Swati',
  'Vishakha', 'Anuradha', 'Jyeshtha', 'Mula', 'Purva Ashadha',
  'Uttara Ashadha', 'Shravana', 'Dhanishtha', 'Shatabhisha',
  'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati',
]

const MASA_NAMES = [
  'Chaitra', 'Vaishakha', 'Jyeshtha', 'Ashadha',
  'Shravana', 'Bhadrapada', 'Ashwin', 'Kartika',
  'Margashirsha', 'Pausha', 'Magha', 'Phalguna',
]

// ── IST Timezone helpers ──────────────────────────────────────────────────────

/**
 * Returns today's date string in IST as 'YYYY-MM-DD'.
 * Cloud Functions run in UTC — this converts correctly for Indian festival matching.
 */
const getISTDateKey = (utcDate = new Date()) =>
  utcDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })

/**
 * Returns a Date object representing IST midnight (00:00 IST) for the given UTC date.
 * IST = UTC+5:30, so IST midnight = UTC 18:30 of the PREVIOUS day.
 *
 * This is the correct anchor for all window calculations on the server.
 * Never use new Date(date); d.setHours(0,0,0,0) — that gives UTC midnight (= 05:30 IST).
 */
const getISTMidnight = (utcDate = new Date()) => {
  const istString = utcDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
  const [yyyy, mm, dd] = istString.split('-').map(Number)
  return new Date(Date.UTC(yyyy, mm - 1, dd, 0, 0, 0) - (5.5 * HOUR_MS))
}

// ── Core astronomy helpers ────────────────────────────────────────────────────

const getTithiFromAngle = (phaseAngle) => {
  const tithiIndex = Math.floor(phaseAngle / 12)
  const paksha     = tithiIndex < 15 ? 'Shukla' : 'Krishna'
  const adjusted   = tithiIndex < 15 ? tithiIndex + 1 : tithiIndex - 14
  const name       = TITHI_NAMES[Math.min(tithiIndex, 29)]
  return { adjustedNumber: adjusted, paksha, name }
}

const tithiAt = (date) => getTithiFromAngle(Astronomy.MoonPhase(date))

/**
 * Sunrise for a given IST date and location.
 * Anchors the search to IST midnight (not UTC midnight) so it never misses
 * an early-morning sunrise in India.
 */
const getSunrise = (date, lat, lon) => {
  try {
    const observer = new Astronomy.Observer(lat, lon, 0)
    const result   = Astronomy.SearchRiseSet('Sun', observer, +1, getISTMidnight(date), 1)
    if (result) return result.date
  } catch (_) {}
  // Fallback: 6:00 AM IST = IST midnight + 6 h
  return new Date(getISTMidnight(date).getTime() + 6 * HOUR_MS)
}

/**
 * Sunset for a given IST date and location.
 */
const getSunset = (date, lat, lon) => {
  try {
    const observer = new Astronomy.Observer(lat, lon, 0)
    const result   = Astronomy.SearchRiseSet('Sun', observer, -1, getISTMidnight(date), 1)
    if (result) return result.date
  } catch (_) {}
  // Fallback: 6:30 PM IST = IST midnight + 18.5 h
  return new Date(getISTMidnight(date).getTime() + 18.5 * HOUR_MS)
}

/**
 * Moonrise for a given IST date and location.
 * Searches up to 2 days ahead to handle days where the moon rises after midnight.
 */
const getMoonrise = (date, lat, lon) => {
  try {
    const observer = new Astronomy.Observer(lat, lon, 0)
    const result   = Astronomy.SearchRiseSet('Moon', observer, +1, getISTMidnight(date), 2)
    return result ? result.date : null
  } catch (_) {
    return null
  }
}

/**
 * Tithi at sunrise — pure sunrise sampling (Drik Panchang convention).
 * No noon override: the window-based engine uses per-festival ritual windows instead,
 * which is more accurate than a global noon fallback.
 */
const getTithiAtSunrise = (date, lat, lon) =>
  tithiAt(getSunrise(date, lat, lon))

const getNakshatra = (date) => {
  try {
    const moonPos      = Astronomy.GeoVector('Moon', date, true)
    const moonEcliptic = Astronomy.Ecliptic(moonPos)
    const longitude    = ((moonEcliptic.elon - AYANAMSHA + 360) % 360)
    return NAKSHATRAS[Math.floor(longitude / (360 / 27)) % 27]
  } catch (_) {
    return 'Unknown'
  }
}

// ── Masa (lunar month) helpers ────────────────────────────────────────────────

const getSunSiderealLon = (date) => {
  const sunPos = Astronomy.GeoVector('Sun', date, true)
  const sunEcl = Astronomy.Ecliptic(sunPos)
  return ((sunEcl.elon - AYANAMSHA + 360) % 360)
}

/**
 * Returns the Amavasyant masa name for a given date.
 * Masa = the solar rashi at the Amavasya that ENDS the current lunar month.
 * Mirrors getMasaForDate() in src/moonUtils.js.
 */
const getMasaForDate = (date) => {
  const phaseAngle  = Astronomy.MoonPhase(date)
  const SYNODIC     = 29.53058867
  const daysUntil   = ((360 - phaseAngle) / 360) * SYNODIC
  const endAmavasya = new Date(date.getTime() + daysUntil * 86400000)
  return MASA_NAMES[Math.floor(getSunSiderealLon(endAmavasya) / 30)]
}

const nextMasa = (masa) => {
  const index = MASA_NAMES.indexOf(masa)
  return index >= 0 ? MASA_NAMES[(index + 1) % MASA_NAMES.length] : masa
}

// ── Festival data ─────────────────────────────────────────────────────────────

/**
 * Annual festival rules — year-independent, any future year.
 * Mirrors ANNUAL_FESTIVALS in src/festivals.js exactly.
 *
 * Window types:
 *   sunrise       — tithi present at local sunrise
 *   madhyahna     — midday ±2 h around solar noon
 *   aparahna      — solar noon to sunset
 *   pradosh       — ~2.4 h after sunset
 *   pradoshOrSunrise — prefer pradosh window; fall back to sunrise (Dhanteras 2029 edge case)
 *   nishita       — ±1 h around civil midnight (IST)
 *   moonrise      — tithi present at moonrise
 *   day           — anywhere within the calendar day
 *
 * Special flags (same semantics as frontend):
 *   firstOccurrence           — suppress if same rule matched in the previous 2 days
 *   suppressDuplicateWithinDays:N — suppress if same rule matched within N days
 *   preferFirstAfter          — only fire on the first match after a given prior tithi
 *   adhikaName / adhikaDescription — alternate label for intercalary (adhika) masa
 */
const ANNUAL_FESTIVALS = [
  // ── Solar ingress (not tithi-based) ──────────────────────────────────────
  {
    kind: 'solarIngress', sunLon: 270,
    name: 'Makar Sankranti / Pongal', emoji: '🪁', type: 'major',
    description: "Sun's transition into Capricorn — harvest festival",
    genZMessage: "sun just switched zodiacs and we're flying kites about it 🪁 new energy unlocked",
  },

  // ── Chaitra ───────────────────────────────────────────────────────────────
  {
    masa: 'Chaitra', paksha: 'Shukla', tithi: 1, window: 'day', firstOccurrence: true,
    name: 'Ugadi / Gudi Padwa', emoji: '🎊', type: 'major',
    description: 'Hindu New Year — celebrated across South and West India',
    genZMessage: "Hindu new year just dropped and the neem+jaggery is the original sweet-and-bitter life lesson 🎊",
  },
  {
    masa: 'Chaitra', paksha: 'Shukla', tithi: 1, window: 'day', firstOccurrence: true,
    name: 'Chaitra Navratri Begins', emoji: '🪔', type: 'major',
    description: 'Ghatasthapana — first day of spring Navratri',
    genZMessage: "Navratri has entered the chat 🪔 nine days of Durga era begins now",
  },
  {
    masa: 'Chaitra', paksha: 'Shukla', tithi: 9, window: 'madhyahna',
    name: 'Ram Navami', emoji: '🏹', type: 'major',
    description: 'Birthday of Lord Rama',
    genZMessage: "Lord Rama said integrity is the only vibe check that matters 🏹 and he passed with flying colours",
  },
  {
    masa: 'Chaitra', paksha: 'Shukla', tithi: 13, window: 'sunrise',
    name: 'Mahavir Jayanti', emoji: '🙏', type: 'major',
    description: 'Birthday of Lord Mahavir, founder of Jainism',
    genZMessage: "Mahavir said live and let live before it was cool 🙏 non-violence was always the era",
  },
  {
    masa: 'Chaitra', paksha: 'Shukla', tithi: 15, window: 'sunrise',
    name: 'Hanuman Jayanti', emoji: '🙏', type: 'major',
    description: 'Birthday of Lord Hanuman',
    genZMessage: "Hanuman's whole thing is showing up for people unconditionally 🙏 the loyalty is unmatched fr",
  },

  // ── Vaishakha ─────────────────────────────────────────────────────────────
  {
    masa: 'Vaishakha', paksha: 'Shukla', tithi: 3, window: 'sunrise',
    name: 'Akshaya Tritiya', emoji: '✨', type: 'major',
    description: 'Most auspicious day — gold, new beginnings, weddings',
    genZMessage: "anything started today literally never stops growing ✨ Akshaya Tritiya is manifesting szn",
  },
  {
    masa: 'Vaishakha', paksha: 'Shukla', tithi: 15, window: 'sunrise',
    name: 'Buddha Purnima', emoji: '☸️', type: 'major',
    description: 'Birthday of Gautama Buddha — Vaishakha Purnima',
    genZMessage: "Buddha said desire is the root of suffering and he was not wrong ☸️ Vesak blessings to you",
  },

  // ── Jyeshtha ─────────────────────────────────────────────────────────────
  {
    amantaMasa: 'Vaishakha', purnimantaMasa: 'Jyeshtha',
    paksha: 'Krishna', tithi: 15, window: 'sunrise',
    suppressDuplicateWithinDays: 45,
    name: 'Vat Savitri Vrat', emoji: '🌳', type: 'major',
    description: "Married women fast for husband's longevity — Jyeshtha Amavasya",
    genZMessage: "Savitri literally argued with the god of death and WON 🌳 the most baddie energy in all of Hindu mythology",
  },
  {
    masa: 'Jyeshtha', paksha: 'Shukla', tithi: 15, window: 'sunrise',
    adhikaName: 'Adhik Vat Purnima Vrat',
    adhikaDescription: "Adhik Jyeshtha Purnima — married women fast for husband's longevity",
    name: 'Vat Purnima Vrat', emoji: '🌳', type: 'major',
    description: "Married women fast for husband's longevity — Jyeshtha Purnima",
    genZMessage: "Savitri said hold my vrat, I'm going to get my husband back from Yama 🌳 the original girlboss",
  },

  // ── Ashadha ───────────────────────────────────────────────────────────────
  {
    masa: 'Ashadha', paksha: 'Shukla', tithi: 15, window: 'sunrise',
    name: 'Guru Purnima', emoji: '🙏', type: 'major',
    description: 'Honouring spiritual teachers — Ashadha Purnima',
    genZMessage: "dedicated to every teacher who actually changed your life 🙏 Guru Purnima is that real one",
  },

  // ── Shravana ──────────────────────────────────────────────────────────────
  {
    masa: 'Shravana', paksha: 'Shukla', tithi: 5, window: 'sunrise',
    name: 'Nag Panchami', emoji: '🐍', type: 'major',
    description: 'Worship of serpent deities',
    genZMessage: "serpent deities getting their annual appreciation today 🐍 Nag Panchami is that ancient respect",
  },
  {
    masa: 'Shravana', paksha: 'Shukla', tithi: 15, window: 'sunrise',
    name: 'Raksha Bandhan', emoji: '🪢', type: 'major',
    description: 'Bond of protection between siblings — Shravana Purnima',
    genZMessage: "sibling bond day — even if you fought yesterday, today the thread says we're good 🪢 happy Raksha Bandhan",
  },
  {
    masa: 'Shravana', paksha: 'Krishna', tithi: 8, window: 'nishita',
    name: 'Janmashtami', emoji: '🦚', type: 'major',
    description: 'Birthday of Lord Krishna',
    genZMessage: "Krishna said flute, butter, and zero drama — the original main character 🦚 happy Janmashtami",
  },

  // ── Bhadrapada ────────────────────────────────────────────────────────────
  {
    masa: 'Bhadrapada', paksha: 'Shukla', tithi: 4, window: 'madhyahna',
    name: 'Ganesh Chaturthi', emoji: '🐘', type: 'major',
    description: '10-day festival celebrating Lord Ganesha',
    genZMessage: "Ganesh said your era of obstacles is OVER 🐘 we're manifesting and celebrating for 10 days straight",
  },

  // ── Ashwin ────────────────────────────────────────────────────────────────
  {
    masa: 'Ashwin', paksha: 'Shukla', tithi: 1, window: 'sunrise',
    name: 'Sharad Navratri Begins', emoji: '🪔', type: 'major',
    description: 'Nine nights of Goddess Durga worship',
    genZMessage: "nine nights of Durga energy incoming 🪔 she ate and left no crumbs, as always",
  },
  {
    masa: 'Ashwin', paksha: 'Shukla', tithi: 9, window: 'sunrise',
    name: 'Maha Navami', emoji: '🪔', type: 'major',
    description: 'Ninth night of Sharad Navratri — Durga Puja culmination',
    genZMessage: "Navratri's final boss fight — Durga Puja is giving full deity energy tonight 🪔",
  },
  {
    masa: 'Ashwin', paksha: 'Shukla', tithi: 10, window: 'aparahna', firstOccurrence: true,
    name: 'Dussehra (Vijayadashami)', emoji: '🏹', type: 'major',
    description: 'Victory of Lord Rama over Ravana',
    genZMessage: "evil got absolutely bodied and we've been celebrating it for thousands of years — iconic 🏹",
  },
  {
    masa: 'Ashwin', paksha: 'Shukla', tithi: 15, window: 'moonrise',
    name: 'Sharad Purnima', emoji: '🌕', type: 'major',
    description: 'Full moon of autumn — Kojagari Purnima',
    genZMessage: "the moon said I'm THAT girl tonight 🌕 Sharad Purnima full moon energy is unmatched",
  },

  // ── Ashwin/Kartika Krishna — Diwali cluster ───────────────────────────────
  {
    amantaMasa: 'Ashwin', purnimantaMasa: 'Kartika', paksha: 'Krishna', tithi: 4, window: 'moonrise',
    name: 'Karwa Chauth', emoji: '🌙', type: 'major',
    description: "Fasting by married women for husband's long life",
    genZMessage: "waiting for the moon to eat is kinda the most romantic thing ngl 🌙 the dedication is real",
  },
  {
    amantaMasa: 'Ashwin', purnimantaMasa: 'Kartika', paksha: 'Krishna', tithi: 13,
    window: 'pradoshOrSunrise', firstOccurrence: true,
    name: 'Dhanteras', emoji: '💰', type: 'major',
    description: 'Festival of wealth — buy gold and silver',
    genZMessage: "Lakshmi said wealth and prosperity incoming 💰 Dhanteras is literally manifesting szn",
  },
  {
    amantaMasa: 'Ashwin', purnimantaMasa: 'Kartika', paksha: 'Krishna', tithi: 14, window: 'sunrise',
    name: 'Naraka Chaturdashi', emoji: '🪔', type: 'major',
    description: 'Choti Diwali — day before Diwali',
    genZMessage: "Choti Diwali — cleaning house, lighting lamps, telling bad energy to leave 🪔 tomorrow is the big one",
  },
  {
    amantaMasa: 'Ashwin', purnimantaMasa: 'Kartika', paksha: 'Krishna', tithi: 15, window: 'pradosh',
    name: 'Diwali (Deepavali)', emoji: '🪔', type: 'major',
    description: 'Festival of lights — Lakshmi Puja during Pradosh Kaal',
    genZMessage: "the whole vibe tonight is sparkle, sweets, and Lakshmi at the door 🪔 happy Diwali bestie",
  },

  // ── Kartika Shukla ────────────────────────────────────────────────────────
  {
    masa: 'Kartika', paksha: 'Shukla', tithi: 1, window: 'sunrise',
    preferFirstAfter: { paksha: 'Krishna', tithi: 15 },
    name: 'Govardhan Puja', emoji: '🏔️', type: 'major',
    description: 'Lord Krishna lifting Govardhan hill',
    genZMessage: "Krishna lifted an entire mountain to protect his people and we're still not over it 🏔️ the commitment is everything",
  },
  {
    masa: 'Kartika', paksha: 'Shukla', tithi: 2, window: 'sunrise',
    name: 'Bhai Dooj', emoji: '👫', type: 'major',
    description: 'Celebration of brother-sister bond',
    genZMessage: "sibling appreciation part 2 — Yamuna and Yama had this tradition first 👫 the bond is sacred",
  },
  {
    masa: 'Kartika', paksha: 'Shukla', tithi: 6, window: 'sunrise',
    name: 'Chhath Puja', emoji: '🌅', type: 'major',
    description: 'Sun god worship — sacred bathing and offerings',
    genZMessage: "up before dawn to worship the sun and honestly the dedication is no cap unmatched 🌅",
  },
  {
    masa: 'Kartika', paksha: 'Shukla', tithi: 15, window: 'moonrise',
    name: 'Dev Diwali / Kartik Purnima', emoji: '🪔', type: 'major',
    description: 'Kartik full moon — lamps lit on riverbanks; Guru Nanak Jayanti',
    genZMessage: "the gods are having their own Diwali tonight 🪔 Kartik Purnima is that spiritual glow-up",
  },

  // ── Magha ─────────────────────────────────────────────────────────────────
  {
    masa: 'Magha', paksha: 'Shukla', tithi: 5, window: 'sunrise',
    name: 'Vasant Panchami', emoji: '📚', type: 'major',
    description: 'Worship of Goddess Saraswati — first day of spring',
    genZMessage: "Saraswati said knowledge is the main character energy 📚 spring mode activated",
  },
  {
    masa: 'Magha', paksha: 'Krishna', tithi: 14, window: 'nishita',
    name: 'Maha Shivaratri', emoji: '🕉️', type: 'major',
    description: 'Great night of Lord Shiva',
    genZMessage: "no sleep, just Shiva 🕉️ the most sacred all-nighter of the year hits different",
  },

  // ── Phalguna ──────────────────────────────────────────────────────────────
  {
    masa: 'Phalguna', paksha: 'Shukla', tithi: 15, window: 'pradosh',
    name: 'Holika Dahan', emoji: '🔥', type: 'major',
    description: 'Bonfire night — burning of evil',
    genZMessage: "burning the bad vibes tonight so tomorrow we can go full chaos mode 🔥 see you on the other side",
  },
  {
    masa: 'Phalguna', paksha: 'Krishna', tithi: 1, window: 'sunrise',
    name: 'Holi', emoji: '🎨', type: 'major',
    description: 'Festival of colours — morning after Holika Dahan',
    genZMessage: "it's giving: covered in colour, no thoughts, just vibes 🎨 happy Holi bestie",
  },
]

/**
 * Monthly observances — matched by sunrise tithi, same as frontend getObservancesForDate.
 * Suppressed on any day that already has a major annual festival.
 */
const MONTHLY_FESTIVALS = [
  {
    name: 'Ekadashi', paksha: 'Shukla', tithi: 11, emoji: '🙏', type: 'observance',
    description: 'Fasting day dedicated to Lord Vishnu',
    genZMessage: "Ekadashi just hit — fast, reset, and let Vishnu cook 🙏 the clarity after is lowkey unreal",
  },
  {
    name: 'Ekadashi', paksha: 'Krishna', tithi: 11, emoji: '🙏', type: 'observance',
    description: 'Fasting day dedicated to Lord Vishnu',
    genZMessage: "Ekadashi era activated — giving the body a break and the spirit a glow-up 🙏 Vishnu said fast and win",
  },
  {
    name: 'Purnima', paksha: 'Shukla', tithi: 15, emoji: '🌕', type: 'observance',
    description: 'Full moon — auspicious for prayers and rituals',
    genZMessage: "the moon said I'm THAT girl tonight 🌕 full moon energy is at max, prayers are hitting different",
  },
  {
    name: 'Amavasya', paksha: 'Krishna', tithi: 15, emoji: '🌑', type: 'observance',
    description: 'New moon — day for ancestral offerings',
    genZMessage: "new moon, new chapter — ancestors are being honoured and intentions are being set 🌑 reset mode on",
  },
  {
    name: 'Pradosh Vrat', paksha: 'Shukla', tithi: 13, emoji: '🕉️', type: 'observance',
    description: 'Fasting dedicated to Lord Shiva',
    genZMessage: "Pradosh Vrat — Shiva said twilight hours are sacred and the energy is real 🕉️ fast and feel it",
  },
  {
    name: 'Pradosh Vrat', paksha: 'Krishna', tithi: 13, emoji: '🕉️', type: 'observance',
    description: 'Fasting dedicated to Lord Shiva',
    genZMessage: "Pradosh Vrat — catching the golden hour with full Shiva intentions tonight 🕉️ the vibe is immaculate",
  },
  {
    name: 'Sankashti Chaturthi', paksha: 'Krishna', tithi: 4, emoji: '🐘', type: 'observance',
    description: 'Ganesha fast for removal of obstacles',
    genZMessage: "Sankashti Chaturthi — Ganesha said obstacles? not on his watch 🐘 fast, pray, and let him clear the path",
  },
  {
    name: 'Masik Shivaratri', paksha: 'Krishna', tithi: 14, emoji: '🕉️', type: 'observance',
    description: 'Monthly night of Lord Shiva',
    genZMessage: "monthly Shiva check-in just dropped 🕉️ the consistency of this devotion is giving main character energy",
  },
  {
    name: 'Kalashtami', paksha: 'Krishna', tithi: 8, emoji: '⚔️', type: 'observance',
    description: 'Dedicated to Lord Bhairava / Goddess Durga',
    genZMessage: "Kalashtami — Bhairava is on protection duty today ⚔️ the energy is locked in and the vibes are fortified",
  },
]

// ── Window-based festival engine (mirrors src/festivals.js) ──────────────────

/**
 * Build the ritual window boundaries for a given date, window type, and location.
 * All returned Date objects are in UTC but represent IST wall-clock times.
 *
 * CRITICAL: Every "start of day" anchor uses getISTMidnight(), not setHours().
 */
const getWindow = (date, windowType, lat, lon) => {
  const dayStart  = getISTMidnight(date)
  const dayEnd    = new Date(dayStart.getTime() + DAY_MS)
  const sunrise   = getSunrise(date, lat, lon)
  const sunset    = getSunset(date, lat, lon)
  const moonrise  = getMoonrise(date, lat, lon)
  // Solar noon = midpoint between sunrise and sunset
  const noon      = new Date((sunrise.getTime() + sunset.getTime()) / 2)

  switch (windowType) {
    case 'sunrise':
      return { sample: sunrise }

    case 'madhyahna':
      return { start: new Date(noon.getTime() - 2 * HOUR_MS), end: new Date(noon.getTime() + 2 * HOUR_MS) }

    case 'aparahna':
      return { start: new Date(noon.getTime() + HOUR_MS), end: sunset }

    case 'pradosh':
      return { start: sunset, end: new Date(sunset.getTime() + 2.4 * HOUR_MS) }

    case 'pradoshOrSunrise':
      // Prefer pradosh window; fall back to sunrise if the tithi isn't present during pradosh.
      // Used by Dhanteras to handle the 2029 edge case where Trayodashi ends before pradosh.
      return { fallbackSample: sunrise, start: sunset, end: new Date(sunset.getTime() + 2.4 * HOUR_MS) }

    case 'nishita': {
      // Civil midnight (IST) = IST midnight of the NEXT day = dayStart + 24 h
      const midnight = new Date(dayStart.getTime() + DAY_MS)
      return { start: new Date(midnight.getTime() - HOUR_MS), end: new Date(midnight.getTime() + HOUR_MS) }
    }

    case 'moonrise':
      // Fall back to 20:00 IST if no moonrise found (edge case near new moon)
      return { sample: moonrise || new Date(dayStart.getTime() + 20 * HOUR_MS) }

    case 'day':
    default:
      return { start: dayStart, end: dayEnd }
  }
}

const tithiMatches = (tithi, rule) =>
  tithi.paksha === rule.paksha && tithi.adjustedNumber === rule.tithi

/**
 * Returns the timestamp at which the rule's target tithi is present during its ritual
 * window, or null if it is not. Uses 20-minute interval sampling (same as frontend).
 */
const ruleMatchesWindow = (date, rule, lat, lon) => {
  const win = getWindow(date, rule.window || 'sunrise', lat, lon)

  // Point-sample windows (sunrise, moonrise)
  if (win.sample) {
    return tithiMatches(tithiAt(win.sample), rule) ? win.sample : null
  }

  // Interval-scan windows (all others)
  let cursor = new Date(win.start)
  while (cursor <= win.end) {
    if (tithiMatches(tithiAt(cursor), rule)) return cursor
    cursor = new Date(cursor.getTime() + 20 * 60 * 1000)
  }

  // pradoshOrSunrise: try sunrise fallback if pradosh scan found nothing
  if (win.fallbackSample && tithiMatches(tithiAt(win.fallbackSample), rule)) {
    return win.fallbackSample
  }

  return null
}

// ── Masa matching helpers ─────────────────────────────────────────────────────

/**
 * Returns the effective masa for display, accounting for Purnimant users during
 * Krishna Paksha (where getMasaForDate always returns Amavasyant masa and must be
 * advanced by one). Mirrors getCalendarMasaForRule() in src/festivals.js.
 *
 * CRITICAL: Never compare getMasaForDate() directly against Purnimant masa names
 * for Krishna Paksha — this causes Diwali to drift to December.
 */
const getCalendarMasaForRule = (sampleTime, calendarSystem) => {
  const amantaMasa = getMasaForDate(sampleTime)
  const tithi      = tithiAt(sampleTime)
  if ((calendarSystem || 'Amavasyant').toLowerCase() === 'purnimant' && tithi.paksha === 'Krishna') {
    return nextMasa(amantaMasa)
  }
  return amantaMasa
}

const selectedMasaForRule = (rule, calendarSystem) => {
  if (rule.masa) return rule.masa
  const system = (calendarSystem || 'Amavasyant').toLowerCase()
  if (system === 'purnimant' && rule.purnimantaMasa) return rule.purnimantaMasa
  return rule.amantaMasa || rule.purnimantaMasa
}

const displayMasaForRule = (date, sampleTime, rule, calendarSystem) => {
  if (rule.masa) return getMasaForDate(sampleTime || date) === rule.masa
  if (rule.amantaMasa || rule.purnimantaMasa) {
    return getCalendarMasaForRule(sampleTime || date, calendarSystem) ===
           selectedMasaForRule(rule, calendarSystem)
  }
  return true
}

// ── Deduplication helpers ─────────────────────────────────────────────────────

const hasEarlierMatchingDate = (date, rule, lat, lon, calendarSystem, daysBack) => {
  for (let i = 1; i <= daysBack; i++) {
    const prev   = new Date(getISTMidnight(date).getTime() - i * DAY_MS)
    const sample = ruleMatchesWindow(prev, rule, lat, lon)
    if (sample && displayMasaForRule(prev, sample, rule, calendarSystem)) return true
  }
  return false
}

const hadPreviousTithi = (date, rule, lat, lon) => {
  if (!rule.preferFirstAfter) return true
  for (let i = 1; i <= 16; i++) {
    const prev   = new Date(getISTMidnight(date).getTime() - i * DAY_MS)
    const sample = ruleMatchesWindow(prev, {
      ...rule,
      paksha: rule.preferFirstAfter.paksha,
      tithi:  rule.preferFirstAfter.tithi,
      window: 'day',
    }, lat, lon)
    if (sample) return true
  }
  return false
}

// ── Adhika masa (intercalary month) handling ──────────────────────────────────

const searchMoonPhaseDate = (phase, start, days) => {
  try { return Astronomy.SearchMoonPhase(phase, start, days)?.date || null } catch (_) { return null }
}

const isAdhikaMasaDate = (sampleTime, masa) => {
  const currentMasa = getMasaForDate(sampleTime)
  if (currentMasa !== masa) return false
  const nextPurnima = searchMoonPhaseDate(180, new Date(sampleTime.getTime() + 2 * DAY_MS), 35)
  return nextPurnima ? getMasaForDate(nextPurnima) === currentMasa : false
}

const withComputedFestivalMetadata = (rule, sampleTime) => {
  if (rule.adhikaName && rule.masa && isAdhikaMasaDate(sampleTime, rule.masa)) {
    return { ...rule, name: rule.adhikaName, description: rule.adhikaDescription || rule.description, isAdhikaMasa: true }
  }
  return rule
}

// ── Solar ingress (Makar Sankranti) ──────────────────────────────────────────

const crossedLongitude = (prevLon, nextLon, targetLon) => {
  const prev = (prevLon - targetLon + 360) % 360
  const next = (nextLon - targetLon + 360) % 360
  return prev > next
}

const getSolarFestivalsForDate = (utcDate) => {
  const today = getISTMidnight(utcDate)
  const prev  = new Date(today.getTime() - DAY_MS)
  const startLon = getSunSiderealLon(prev)
  const endLon   = getSunSiderealLon(today)
  return ANNUAL_FESTIVALS.filter(
    f => f.kind === 'solarIngress' && crossedLongitude(startLon, endLon, f.sunLon)
  )
}

// ── Annual festival resolver ──────────────────────────────────────────────────

const resolveAnnualFestivalForDate = (date, rule, lat, lon, calendarSystem) => {
  if (rule.kind === 'solarIngress') return false
  const sample = ruleMatchesWindow(date, rule, lat, lon)
  if (!sample) return false
  if (!displayMasaForRule(date, sample, rule, calendarSystem)) return false
  if (rule.firstOccurrence && hasEarlierMatchingDate(date, rule, lat, lon, calendarSystem, 2)) return false
  if (rule.suppressDuplicateWithinDays &&
      hasEarlierMatchingDate(date, rule, lat, lon, calendarSystem, rule.suppressDuplicateWithinDays)) {
    return false
  }
  return hadPreviousTithi(date, rule, lat, lon)
    ? withComputedFestivalMetadata(rule, sample)
    : false
}

// ── Monthly observances ───────────────────────────────────────────────────────

/**
 * Returns monthly observances matching today's sunrise tithi.
 * Mirrors getObservancesForDate() in src/festivals.js.
 * Suppressed when major annual festivals are present (handled by caller).
 */
const getObservancesForDate = (date, lat, lon) => {
  const sunriseTithi = tithiAt(getSunrise(date, lat, lon))
  return MONTHLY_FESTIVALS.filter(
    f => f.tithi === sunriseTithi.adjustedNumber && f.paksha === sunriseTithi.paksha
  )
}

// ── Main festival resolver ────────────────────────────────────────────────────

/**
 * Compute all festivals for a given date and location.
 *
 * Returns:
 *   major       — annual + solar festivals (the notification-worthy ones)
 *   observances — monthly observances (only when no major festival exists)
 *   all         — [...major, ...observances]
 *
 * calendarSystem defaults to 'Amavasyant' because device Firestore documents
 * do not store calendarSystem. The Diwali cluster is the only section affected.
 */
const getFestivalsForDate = (utcDate, lat, lon, calendarSystem = 'Amavasyant') => {
  const solar  = getSolarFestivalsForDate(utcDate)
  const annual = ANNUAL_FESTIVALS
    .map(rule => resolveAnnualFestivalForDate(utcDate, rule, lat, lon, calendarSystem))
    .filter(Boolean)
  const major       = [...solar, ...annual]
  const observances = major.length > 0 ? [] : getObservancesForDate(utcDate, lat, lon)
  return { major, observances, all: [...major, ...observances] }
}

// ── Eclipse helpers ───────────────────────────────────────────────────────────

const _eclipseCache = {}

const getEclipsesForYear = (year) => {
  if (_eclipseCache[year]) return _eclipseCache[year]
  const results   = []
  const yearStart = new Date(year, 0, 1)
  const yearEnd   = new Date(year + 1, 0, 1)

  try {
    let e = Astronomy.SearchLunarEclipse(yearStart)
    while (e && e.peak.date < yearEnd) {
      results.push({
        type: 'lunar', kind: e.kind, peakTime: e.peak.date,
        hinduName: { total: 'Purna Chandra Grahan', partial: 'Khand Chandra Grahan', penumbral: 'Chhaya Grahan' }[e.kind] ?? 'Chandra Grahan',
      })
      e = Astronomy.SearchLunarEclipse(new Date(e.peak.date.getTime() + 29 * 864e5))
    }
  } catch (_) {}

  try {
    let e = Astronomy.SearchGlobalSolarEclipse(yearStart)
    while (e && e.peak.date < yearEnd) {
      results.push({
        type: 'solar', kind: e.kind, peakTime: e.peak.date,
        hinduName: { total: 'Purna Surya Grahan', annular: 'Kankana Surya Grahan', partial: 'Khand Surya Grahan', hybrid: 'Surya Grahan' }[e.kind] ?? 'Surya Grahan',
      })
      e = Astronomy.SearchGlobalSolarEclipse(new Date(e.peak.date.getTime() + 29 * 864e5))
    }
  } catch (_) {}

  results.sort((a, b) => a.peakTime - b.peakTime)
  _eclipseCache[year] = results
  return results
}

const getEclipseForDate = (utcDate) => {
  const istKey = getISTDateKey(utcDate)
  const year   = parseInt(istKey.split('-')[0], 10)
  return getEclipsesForYear(year).find(e => getISTDateKey(e.peakTime) === istKey) || null
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * getDayInfo — compute everything the backend needs for a given city and date.
 *
 * Returns:
 *   tithi          — { adjustedNumber, paksha, name } at sunrise
 *   nakshatra      — string
 *   moonrise       — Date | null
 *   festivals      — all festivals for the day (major + observances)
 *   datedFestivals — major annual festivals only (used for emailFrequency='major')
 *   eclipse        — eclipse object | null
 */
const getDayInfo = (utcDate, lat, lon) => {
  const tithi     = getTithiAtSunrise(utcDate, lat, lon)
  const nakshatra = getNakshatra(utcDate)
  const moonrise  = getMoonrise(utcDate, lat, lon)
  const eclipse   = getEclipseForDate(utcDate)

  const { major: datedFests, all: allFests } = getFestivalsForDate(utcDate, lat, lon)

  return {
    tithi,
    nakshatra,
    moonrise,
    festivals:      allFests,
    datedFestivals: datedFests,
    eclipse,
  }
}

/**
 * getUpcomingFestivals — returns major festivals in the next `daysAhead` days.
 * Works for any year (rule-based, not hardcoded dates).
 * Uses Bengaluru as a reference city — festival dates are not strongly lat/lon-dependent.
 */
const getUpcomingFestivals = (utcDate, daysAhead = 30) => {
  const REF_LAT = 12.9716, REF_LON = 77.5946  // Bengaluru
  const upcoming = []
  for (let i = 0; i < daysAhead; i++) {
    const d = new Date(utcDate.getTime() + i * DAY_MS)
    const { major } = getFestivalsForDate(d, REF_LAT, REF_LON)
    if (major.length > 0) upcoming.push({ date: d, dateKey: getISTDateKey(d), festivals: major })
  }
  return upcoming
}

module.exports = { getDayInfo, getUpcomingFestivals, getISTDateKey }
