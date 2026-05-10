// Chandra — Festival database v2
//
// Two layers:
//   1. ANNUAL_FESTIVALS — major festivals defined by masa + paksha + tithi rules.
//      These are computed dynamically for any year using getMasaForDate() from
//      moonUtils.js, so they never need manual date updates.
//      type: 'major'
//
//   2. MONTHLY_FESTIVALS — recurring lunar observances (Ekadashi, Pradosh, etc.)
//      matched by paksha + tithi only (no masa restriction — every month).
//      type: 'observance'
//
// Visual contract (enforced in Calendar.jsx):
//   major     → full festival emoji shown in the grid cell
//   observance → small amber dot only; name appears in the festival list below
//
// Suppression rule: if any major festival (annual or solar) falls on a date,
// monthly observances for that date are hidden — avoids "Diwali + Amavasya"
// double-labelling.

import { getMasaForDate, getSolarFestivalsForDate } from './moonUtils'

// ── Major annual festivals — masa + paksha + tithi ─────────────────────────────
// masa: one of the 12 MASA_NAMES from moonUtils.js
// paksha: 'Shukla' | 'Krishna'
// tithi: 1–15 within the paksha
// Note on Holi: Holika Dahan = Phalguna Shukla 15 (Purnima night).
//   Holi (colours) = morning after, which is Phalguna Krishna 1 (Pratipada).
//   Both are defined separately so they land on consecutive calendar days.

export const ANNUAL_FESTIVALS = [
  // ── Chaitra ──
  { name: 'Ugadi / Gudi Padwa',       emoji: '🎊', type: 'major', masa: 'Chaitra',      paksha: 'Shukla',  tithi: 1,  description: 'Hindu New Year — celebrated across South and West India' },
  { name: 'Chaitra Navratri Begins',  emoji: '🪔', type: 'major', masa: 'Chaitra',      paksha: 'Shukla',  tithi: 1,  description: 'Nine nights of Goddess Durga worship — Ghatasthapana, first day of spring Navratri' },
  { name: 'Ram Navami',                emoji: '🏹', type: 'major', masa: 'Chaitra',      paksha: 'Shukla',  tithi: 9,  description: 'Birthday of Lord Rama' },
  { name: 'Mahavir Jayanti',           emoji: '🙏', type: 'major', masa: 'Chaitra',      paksha: 'Shukla',  tithi: 13, description: 'Birthday of Lord Mahavir, founder of Jainism' },
  { name: 'Hanuman Jayanti',           emoji: '🐒', type: 'major', masa: 'Chaitra',      paksha: 'Shukla',  tithi: 15, description: 'Birthday of Lord Hanuman' },

  // ── Vaishakha ──
  { name: 'Akshaya Tritiya',           emoji: '✨', type: 'major', masa: 'Vaishakha',    paksha: 'Shukla',  tithi: 3,  description: 'Most auspicious day — gold, new beginnings, weddings' },
  { name: 'Buddha Purnima',            emoji: '☸️', type: 'major', masa: 'Vaishakha',    paksha: 'Shukla',  tithi: 15, description: 'Birthday of Gautama Buddha — Vaishakha Purnima' },

  // ── Jyeshtha ──
  { name: 'Vat Savitri Vrat',          emoji: '🌳', type: 'major', masa: 'Jyeshtha',     paksha: 'Shukla',  tithi: 15, description: 'Married women fast for husband\'s longevity — Jyeshtha Purnima' },

  // ── Ashadha ──
  { name: 'Guru Purnima',              emoji: '🙏', type: 'major', masa: 'Ashadha',      paksha: 'Shukla',  tithi: 15, description: 'Honouring spiritual teachers — Ashadha Purnima' },

  // ── Shravana ──
  { name: 'Nag Panchami',              emoji: '🐍', type: 'major', masa: 'Shravana',     paksha: 'Shukla',  tithi: 5,  description: 'Worship of serpent deities' },
  { name: 'Raksha Bandhan',            emoji: '🪢', type: 'major', masa: 'Shravana',     paksha: 'Shukla',  tithi: 15, description: 'Bond of protection between siblings — Shravana Purnima' },

  // ── Bhadrapada ──
  // Amavasyant convention: the Krishna Paksha after Shravana Purnima ends at the Shravana
  // Amavasya (sun still in Simha) — so this month is Shravana, NOT Bhadrapada.
  // Purnimant (North Indian) calls it Bhadrapada Krishna 8; Amavasyant calls it Shravana Krishna 8.
  { name: 'Janmashtami',               emoji: '🦚', type: 'major', masa: 'Shravana',     paksha: 'Krishna', tithi: 8,  description: 'Birthday of Lord Krishna' },
  { name: 'Ganesh Chaturthi',          emoji: '🐘', type: 'major', masa: 'Bhadrapada',   paksha: 'Shukla',  tithi: 4,  description: '10-day festival celebrating Lord Ganesha' },

  // ── Ashwin ──
  { name: 'Sharad Navratri Begins',    emoji: '🪔', type: 'major', masa: 'Ashwin',       paksha: 'Shukla',  tithi: 1,  description: 'Nine nights of Goddess Durga worship' },
  { name: 'Maha Navami',              emoji: '🪔', type: 'major', masa: 'Ashwin',       paksha: 'Shukla',  tithi: 9,  description: 'Ninth and final night of Sharad Navratri — Durga Puja culmination' },
  { name: 'Dussehra (Vijayadashami)', emoji: '🏹', type: 'major', masa: 'Ashwin',       paksha: 'Shukla',  tithi: 10, description: 'Victory of Lord Rama over Ravana' },
  { name: 'Sharad Purnima',            emoji: '🌕', type: 'major', masa: 'Ashwin',       paksha: 'Shukla',  tithi: 15, description: 'Full moon of autumn — Kojagari Purnima' },

  // ── Kartika ──
  { name: 'Karwa Chauth',              emoji: '🌙', type: 'major', masa: 'Kartika',      paksha: 'Krishna', tithi: 4,  description: 'Fasting by married women for husband\'s long life' },
  { name: 'Dhanteras',                 emoji: '💰', type: 'major', masa: 'Kartika',      paksha: 'Krishna', tithi: 13, description: 'Festival of wealth — buy gold and silver' },
  { name: 'Naraka Chaturdashi',        emoji: '🪔', type: 'major', masa: 'Kartika',      paksha: 'Krishna', tithi: 14, description: 'Choti Diwali — day before Diwali' },
  { name: 'Diwali (Deepavali)',         emoji: '🪔', type: 'major', masa: 'Kartika',      paksha: 'Krishna', tithi: 15, description: 'Festival of lights — most celebrated Hindu festival' },
  { name: 'Govardhan Puja',            emoji: '🐄', type: 'major', masa: 'Kartika',      paksha: 'Shukla',  tithi: 1,  description: 'Lord Krishna lifting Govardhan hill' },
  { name: 'Bhai Dooj',                 emoji: '👫', type: 'major', masa: 'Kartika',      paksha: 'Shukla',  tithi: 2,  description: 'Celebration of brother-sister bond' },
  { name: 'Chhath Puja',               emoji: '🌅', type: 'major', masa: 'Kartika',      paksha: 'Shukla',  tithi: 6,  description: 'Sun god worship — sacred bathing and offerings' },
  { name: 'Dev Diwali / Kartik Purnima', emoji: '🪔', type: 'major', masa: 'Kartika',   paksha: 'Shukla',  tithi: 15, description: 'Kartik full moon — lamps lit on riverbanks; Guru Nanak Jayanti' },

  // ── Magha ──
  { name: 'Vasant Panchami',           emoji: '📚', type: 'major', masa: 'Magha',        paksha: 'Shukla',  tithi: 5,  description: 'Worship of Goddess Saraswati — first day of spring' },

  // Maha Shivaratri = Magha Krishna 14 in Amavasyant: the February Amavasya has the
  // sun in Kumbha (Aquarius) sidereal → Magha masa. Purnimant calls it Phalguna Krishna 14.
  { name: 'Maha Shivaratri',           emoji: '🕉️', type: 'major', masa: 'Magha',        paksha: 'Krishna', tithi: 14, description: 'Great night of Lord Shiva' },

  // ── Phalguna ──
  { name: 'Holika Dahan',              emoji: '🔥', type: 'major', masa: 'Phalguna',     paksha: 'Shukla',  tithi: 15, description: 'Bonfire night — burning of evil (Phalguna Purnima)' },
  // Holi (colours) is played the morning after Holika Dahan — Phalguna Krishna Pratipada
  { name: 'Holi',                      emoji: '🎨', type: 'major', masa: 'Phalguna',     paksha: 'Krishna', tithi: 1,  description: 'Festival of colours — morning after Holika Dahan' },
]

// ── Monthly observances — paksha + tithi only (no masa restriction) ────────────
// These fire every lunar month. Suppressed on days that already have a major festival.
export const MONTHLY_FESTIVALS = [
  { name: 'Ekadashi',          paksha: 'Shukla',  tithi: 11, emoji: '🙏', type: 'observance', description: 'Fasting day dedicated to Lord Vishnu' },
  { name: 'Ekadashi',          paksha: 'Krishna', tithi: 11, emoji: '🙏', type: 'observance', description: 'Fasting day dedicated to Lord Vishnu' },
  { name: 'Purnima',           paksha: 'Shukla',  tithi: 15, emoji: '🌕', type: 'observance', description: 'Full moon — auspicious for prayers and rituals' },
  { name: 'Amavasya',          paksha: 'Krishna', tithi: 15, emoji: '🌑', type: 'observance', description: 'New moon — day for ancestral offerings (Pitru Tarpan)' },
  { name: 'Pradosh Vrat',      paksha: 'Shukla',  tithi: 13, emoji: '🕉️', type: 'observance', description: 'Fasting dedicated to Lord Shiva' },
  { name: 'Pradosh Vrat',      paksha: 'Krishna', tithi: 13, emoji: '🕉️', type: 'observance', description: 'Fasting dedicated to Lord Shiva' },
  { name: 'Sankashti Chaturthi', paksha: 'Krishna', tithi: 4, emoji: '🐘', type: 'observance', description: 'Ganesha fast for removal of obstacles' },
  { name: 'Masik Shivaratri',  paksha: 'Krishna', tithi: 14, emoji: '🕉️', type: 'observance', description: 'Monthly night of Lord Shiva' },
  { name: 'Kalashtami',        paksha: 'Krishna', tithi: 8,  emoji: '⚔️', type: 'observance', description: 'Dedicated to Lord Bhairava / Goddess Durga' },
]

// ── Combined lookup ─────────────────────────────────────────────────────────────
// Returns festivals for a given date + pre-computed tithi info.
// Pass the tithi number (1–15 within paksha) and paksha string.
// Solar festivals (e.g. Makar Sankranti) are included automatically.
// Major festivals suppress monthly observances on the same day.
export const getFestivalsForDate = (date, tithiNumber, paksha) => {
  // Solar festivals — checked first (sun longitude crossing)
  const solar = getSolarFestivalsForDate(date)

  // Lunar annual festivals — masa + paksha + tithi match
  const masa = getMasaForDate(date)
  const annual = ANNUAL_FESTIVALS.filter(
    f => f.masa === masa && f.paksha === paksha && f.tithi === tithiNumber
  )

  const major = [...solar, ...annual]

  // Monthly observances — only shown when no major festival that day
  const observances = major.length > 0
    ? []
    : MONTHLY_FESTIVALS.filter(f => f.tithi === tithiNumber && f.paksha === paksha)

  return [...major, ...observances]
}

// Legacy compat — kept so any old import of getDatedFestivalsForDate doesn't crash.
// Returns empty; all festival logic is now in getFestivalsForDate above.
export const getDatedFestivalsForDate = (_date) => []
export const getMonthlyFestivalsForTithi = (_tithi, _paksha) => []

// festivals plain array — backward-compat alias
export const festivals = MONTHLY_FESTIVALS
