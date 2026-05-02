// Chandra — Festival database
// Two systems:
//   1. DATED_FESTIVALS_2026 — exact Gregorian dates for major annual festivals.
//      Hardcoded annually because computing real Hindu lunar months from
//      Gregorian dates requires full Panchang implementation (sun's nirayana
//      longitude, lunar month + adhik mas handling, regional variations).
//      Source: user-verified list against DrikPanchang for 2026.
//   2. MONTHLY_FESTIVALS — recurring observances tied to tithi + paksha.
//      Computed dynamically from Astronomy.MoonPhase() in moonUtils.js.
//
// To add a new year, append DATED_FESTIVALS_<YEAR> and update the helper to
// pick the right list based on date.getFullYear().

export const DATED_FESTIVALS_2026 = [
  { date: '2026-01-14', name: 'Makar Sankranti / Pongal', emoji: '🪁', description: "Sun's transition into Capricorn — harvest festival" },
  { date: '2026-01-23', name: 'Vasant Panchami', emoji: '📚', description: 'Worship of Goddess Saraswati — first day of spring' },
  { date: '2026-02-15', name: 'Maha Shivaratri', emoji: '🕉️', description: 'Great night of Lord Shiva' },
  { date: '2026-03-03', name: 'Holika Dahan', emoji: '🔥', description: 'Bonfire night before Holi — burning of evil' },
  { date: '2026-03-04', name: 'Holi', emoji: '🎨', description: 'Festival of colours celebrating spring' },
  { date: '2026-03-19', name: 'Ugadi / Gudi Padwa', emoji: '🎊', description: 'Hindu New Year — celebrated across South and West India' },
  { date: '2026-03-26', name: 'Ram Navami', emoji: '🏹', description: 'Birthday of Lord Rama' },
  { date: '2026-03-31', name: 'Mahavir Jayanti', emoji: '🙏', description: 'Birthday of Lord Mahavir, founder of Jainism' },
  { date: '2026-04-02', name: 'Hanuman Jayanti', emoji: '🙏', description: 'Birthday of Lord Hanuman' },
  { date: '2026-09-14', name: 'Ganesh Chaturthi', emoji: '🐘', description: '10-day festival celebrating Lord Ganesha' },
  { date: '2026-10-11', name: 'Sharad Navratri Begins', emoji: '🪔', description: 'Nine nights of Goddess Durga worship' },
  { date: '2026-10-20', name: 'Dussehra (Vijayadashami)', emoji: '🏹', description: 'Victory of Lord Rama over Ravana' },
  { date: '2026-10-29', name: 'Karwa Chauth', emoji: '🌙', description: "Fasting by married women for husband's long life" },
  { date: '2026-11-08', name: 'Diwali (Deepavali)', emoji: '🪔', description: 'Festival of lights — most celebrated Hindu festival' },
  { date: '2026-11-13', name: 'Chhath Puja', emoji: '🌅', description: 'Sun god worship — sacred bathing and offerings' },
]

// Recurring lunar observances. tithi is 1-15 within the paksha.
export const MONTHLY_FESTIVALS = [
  { name: 'Ekadashi', paksha: 'Shukla', tithi: 11, emoji: '🙏', description: 'Fasting day dedicated to Lord Vishnu' },
  { name: 'Ekadashi', paksha: 'Krishna', tithi: 11, emoji: '🙏', description: 'Fasting day dedicated to Lord Vishnu' },
  { name: 'Purnima', paksha: 'Shukla', tithi: 15, emoji: '🌕', description: 'Full moon — auspicious for prayers and rituals' },
  { name: 'Amavasya', paksha: 'Krishna', tithi: 15, emoji: '🌑', description: 'New moon — day for ancestral offerings' },
  { name: 'Pradosh Vrat', paksha: 'Shukla', tithi: 13, emoji: '🕉️', description: 'Fasting dedicated to Lord Shiva' },
  { name: 'Pradosh Vrat', paksha: 'Krishna', tithi: 13, emoji: '🕉️', description: 'Fasting dedicated to Lord Shiva' },
  // Vinayaka Chaturthi removed — annual Ganesh Chaturthi (Sep 14, 2026) is the
  // observance most users expect; monthly recurrence created confusing duplicates.
  { name: 'Sankashti Chaturthi', paksha: 'Krishna', tithi: 4, emoji: '🐘', description: 'Ganesha fast for removal of obstacles' },
  { name: 'Masik Shivaratri', paksha: 'Krishna', tithi: 14, emoji: '🕉️', description: 'Monthly night of Lord Shiva' },
  { name: 'Kalashtami', paksha: 'Krishna', tithi: 8, emoji: '⚔️', description: 'Dedicated to Lord Bhairava / Goddess Durga' },
]

// Format a Date as YYYY-MM-DD in local time (avoids UTC off-by-one).
const toLocalDateKey = (date) => {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

// Pick the correct dated-festival list for a given year.
// Add new years here as DATED_FESTIVALS_2027, etc.
const getDatedListForYear = (year) => {
  if (year === 2026) return DATED_FESTIVALS_2026
  return [] // unknown year — return nothing, monthly observances still work
}

// Get exact-date festivals for a given Date object.
export const getDatedFestivalsForDate = (date) => {
  const key = toLocalDateKey(date)
  const list = getDatedListForYear(date.getFullYear())
  return list.filter(f => f.date === key)
}

// Get monthly observances matching a tithi (1-15) and paksha ('Shukla'|'Krishna').
export const getMonthlyFestivalsForTithi = (tithiNumber, paksha) => {
  return MONTHLY_FESTIVALS.filter(f => f.tithi === tithiNumber && f.paksha === paksha)
}

// Combined helper. If any dated festival lands on this day, monthly observances
// are suppressed entirely — annual festivals take visual precedence so users
// don't see Diwali + Amavasya, Karwa Chauth + Sankashti Chaturthi, etc., on
// the same day.
export const getFestivalsForDate = (date, tithiNumber, paksha) => {
  const dated = getDatedFestivalsForDate(date)
  const monthly = dated.length > 0
    ? []
    : getMonthlyFestivalsForTithi(tithiNumber, paksha)
  return [...dated, ...monthly]
}

// Backward-compat: legacy code may still import `festivals` as a plain array.
// Point it at MONTHLY_FESTIVALS so old call sites don't crash on undefined.
export const festivals = MONTHLY_FESTIVALS
