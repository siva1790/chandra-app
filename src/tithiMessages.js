/**
 * tithiMessages.js
 * 30 daily messages — one per tithi, keyed by continuous tithi number (1–30).
 * Shukla Paksha = 1–15, Krishna Paksha = 16–29, Amavasya = 30.
 */

export const TITHI_MESSAGES = {
  // ── Shukla Paksha (Waxing) ────────────────────────────────────────────────
  1:  "First light of the cycle. The best moment to begin something you've been avoiding.",
  2:  "The moon grows with intention. Build steadily today — small steps compound.",
  3:  "A day of action and beauty. Auspicious for new clothes, journeys, and fresh starts.",
  4:  "Ganesh energy — remove what blocks you before moving forward.",
  5:  "Knowledge and skill are favoured. Learn something you've been putting off.",
  6:  "Devoted energy. Good for community, family, and honouring the people who shaped you.",
  7:  "Solar energy peaks. Lead, create, and let your work be seen today.",
  8:  "Durga's day. Stand firm in what you believe — soft power over conflict.",
  9:  "The Divine Feminine watches. Act with care and you will be carried.",
  10: "Victory is within reach. Do not hesitate at the threshold.",
  11: "Fast for clarity. Vishnu's day rewards restraint with insight.",
  12: "A day to give. Generosity offered today returns threefold.",
  13: "The moon quickens. Finish what you started before fullness arrives.",
  14: "Shiva's eve. Let go of what no longer serves before the full moon clears it for you.",
  15: "Peak energy. Gratitude, release, and celebration — the sky is full, and so are you.",

  // ── Krishna Paksha (Waning) ───────────────────────────────────────────────
  16: "The tide turns inward. Reflect on what the bright fortnight revealed.",
  17: "Steady the mind. The moon's withdrawal asks you to do the same.",
  18: "Simplify. What truly matters becomes clear as the light recedes.",
  19: "Turn inward. The outer world can wait — tend the quiet work today.",
  20: "A good day to write, study, and organise your inner world.",
  21: "Rest is sacred. You are allowed to slow down.",
  22: "Old patterns surface. Notice them without judgment.",
  23: "Half-dark, half-light. Hold the contradiction — it's where wisdom lives.",
  24: "Ancestor energy. Quiet gratitude for those who came before you.",
  25: "Gently wrap up. The cycle is completing — don't force new beginnings yet.",
  26: "Fast and listen. What the quiet tells you now carries through the next cycle.",
  27: "Offer without expectation. Give something today — time, attention, or kindness.",
  28: "Shiva's energy. Prepare for release — purge the unnecessary.",
  29: "The last breath before the dark. Complete what must be completed.",

  // ── Amavasya ──────────────────────────────────────────────────────────────
  30: "A day of stillness. Honour what has passed before reaching for what's next.",
}

/** Vara (weekday) names in Sanskrit */
export const VARA_NAMES = [
  'Ravivara',     // Sunday    0
  'Somavara',     // Monday    1
  'Mangalavara',  // Tuesday   2
  'Budhavara',    // Wednesday 3
  'Guruvara',     // Thursday  4
  'Shukravara',   // Friday    5
  'Shanivara',    // Saturday  6
]

/**
 * Given a JS Date, return the vara name (Sanskrit weekday).
 * e.g. getVara(new Date()) → 'Guruvara'
 */
export const getVara = (date) => VARA_NAMES[date.getDay()]
