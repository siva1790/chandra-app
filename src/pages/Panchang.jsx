import { useState, useEffect } from 'react'
import * as Astronomy from 'astronomy-engine'

const Panchang = ({ location }) => {
  const [panchang, setPanchang] = useState(null)
  const [selectedDate, setSelectedDate] = useState(new Date())

  useEffect(() => {
    calculatePanchang(selectedDate)
  }, [selectedDate, location])

  const calculatePanchang = (date) => {
    const phaseAngle = Astronomy.MoonPhase(date)

    // --- Tithi ---
    const tithiNames = [
      'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami',
      'Shashthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami',
      'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi', 'Purnima',
      'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami',
      'Shashthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami',
      'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi', 'Amavasya'
    ]
    const tithiIndex = Math.floor(phaseAngle / 12)
    const tithiName = tithiNames[Math.min(tithiIndex, 29)]
    const paksha = tithiIndex < 15 ? 'Shukla Paksha' : 'Krishna Paksha'

    // --- Nakshatra ---
    // Moon travels through 27 Nakshatras in ~27.3 days
    // Each Nakshatra spans 13°20' (360/27 degrees)
    const nakshatras = [
      'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira',
      'Ardra', 'Punarvasu', 'Pushya', 'Ashlesha', 'Magha',
      'Purva Phalguni', 'Uttara Phalguni', 'Hasta', 'Chitra', 'Swati',
      'Vishakha', 'Anuradha', 'Jyeshtha', 'Mula', 'Purva Ashadha',
      'Uttara Ashadha', 'Shravana', 'Dhanishtha', 'Shatabhisha',
      'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati'
    ]
    const moonPos = Astronomy.GeoVector('Moon', date, true)
    const moonEcliptic = Astronomy.Ecliptic(moonPos)
    const AYANAMSHA = 23.15
    const moonLongitude = ((moonEcliptic.elon - AYANAMSHA + 360) % 360)
    const nakshatraIndex = Math.floor(moonLongitude / (360 / 27))
    const nakshatraName = nakshatras[nakshatraIndex % 27]
    const nakshatraPada = Math.floor((moonLongitude % (360 / 27)) / (360 / 108)) + 1

    // --- Yoga ---
    // Yoga = (Sun longitude + Moon longitude) / (360/27)
    const sunPos = Astronomy.GeoVector('Sun', date, true)
    const sunEcliptic = Astronomy.Ecliptic(sunPos)
    const sunLongitude = ((sunEcliptic.elon - AYANAMSHA + 360) % 360)
    const yogaNames = [
      'Vishkambha', 'Priti', 'Ayushman', 'Saubhagya', 'Shobhana',
      'Atiganda', 'Sukarma', 'Dhriti', 'Shula', 'Ganda',
      'Vriddhi', 'Dhruva', 'Vyaghata', 'Harshana', 'Vajra',
      'Siddhi', 'Vyatipata', 'Variyan', 'Parigha', 'Shiva',
      'Siddha', 'Sadhya', 'Shubha', 'Shukla', 'Brahma',
      'Indra', 'Vaidhriti'
    ]
    const yogaIndex = Math.floor(((sunLongitude + moonLongitude) % 360) / (360 / 27))
    const yogaName = yogaNames[yogaIndex % 27]

    // --- Karana ---
    // Karana = half of Tithi (each Tithi has 2 Karanas)
    const karanaNames = [
      'Bava', 'Balava', 'Kaulava', 'Taitila', 'Garija',
      'Vanija', 'Vishti', 'Shakuni', 'Chatushpada', 'Naga', 'Kimstughna'
    ]
    const karanaIndex = Math.floor((phaseAngle / 6) % 11)
    const karanaName = karanaNames[karanaIndex]

    // --- Vara (Day of week) ---
    const varaNames = ['Ravivar', 'Somvar', 'Mangalvar', 'Budhvar', 'Guruvar', 'Shukravar', 'Shanivar']
    const varaDeva = ['Sun ☀️', 'Moon 🌙', 'Mars ♂️', 'Mercury ☿', 'Jupiter ♃', 'Venus ♀️', 'Saturn ♄']
    const varaIndex = date.getDay()
    const varaName = varaNames[varaIndex]
    const varaDeity = varaDeva[varaIndex]

    // --- Rahu Kaal ---
    // Rahu Kaal is 1/8th of the day, varies by weekday
    // Order: Mon, Sat, Fri, Wed, Thu, Tue, Sun (index by day)
    const rahuOrder = [7, 1, 6, 4, 5, 3, 2] // slot number for each weekday
    const sunrise = 6 * 60 // 6:00 AM in minutes
    const sunset = 18 * 60 // 6:00 PM in minutes
    const dayDuration = sunset - sunrise
    const slotDuration = dayDuration / 8
    const rahuSlot = rahuOrder[varaIndex]
    const rahuStart = sunrise + (rahuSlot - 1) * slotDuration
    const rahuEnd = rahuStart + slotDuration
    const formatMinutes = (mins) => {
      const h = Math.floor(mins / 60)
      const m = Math.round(mins % 60)
      const ampm = h >= 12 ? 'PM' : 'AM'
      const hour = h > 12 ? h - 12 : h === 0 ? 12 : h
      return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`
    }
    const rahuKaal = `${formatMinutes(rahuStart)} – ${formatMinutes(rahuEnd)}`

    // --- Abhijit Muhurta (most auspicious time of day) ---
    // Middle of the day ± 24 minutes
    const midday = (sunrise + sunset) / 2
    const abhijitStart = midday - 24
    const abhijitEnd = midday + 24
    const abhijitMuhurta = `${formatMinutes(abhijitStart)} – ${formatMinutes(abhijitEnd)}`

    // --- Brahma Muhurta ---
    // 1.5 hours before sunrise
    const brahmaStart = sunrise - 96
    const brahmaEnd = sunrise - 48
    const brahmaMuhurta = `${formatMinutes(brahmaStart)} – ${formatMinutes(brahmaEnd)}`

    // --- Auspiciousness flags ---
    const isShubaYoga = ['Siddhi', 'Amrita', 'Sarvartha Siddhi'].includes(yogaName)
    const isEkadashi = tithiName === 'Ekadashi'
    const isPurnima = tithiName === 'Purnima'
    const isAmavasya = tithiName === 'Amavasya'
    const isVishti = karanaName === 'Vishti' // Bhadra — inauspicious

    setPanchang({
      tithi: tithiName,
      paksha,
      nakshatra: nakshatraName,
      nakshatraPada,
      yoga: yogaName,
      karana: karanaName,
      vara: varaName,
      varaDeity,
      rahuKaal,
      abhijitMuhurta,
      brahmaMuhurta,
      moonLongitude: moonLongitude.toFixed(2),
      sunLongitude: sunLongitude.toFixed(2),
      isEkadashi,
      isPurnima,
      isAmavasya,
      isVishti,
      isShubaYoga,
    })
  }

  const formatDate = (date) => date.toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })

  const changeDate = (days) => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() + days)
    setSelectedDate(newDate)
  }

  return (
    <div className="min-h-screen px-4 py-8 max-w-md mx-auto">

      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-yellow-300 mb-1">📿 Panchang</h1>
        <p className="text-gray-400 text-sm">Daily Hindu Almanac</p>
      </div>

      {/* Date Navigator */}
      <div className="flex items-center justify-between mb-6 bg-gray-900 rounded-2xl p-3 border border-gray-800">
        <button onClick={() => changeDate(-1)}
          className="text-yellow-300 text-xl px-3 py-1 rounded-lg hover:bg-gray-800">‹</button>
        <div className="text-center">
          <p className="text-white text-sm font-medium">{formatDate(selectedDate)}</p>
          {selectedDate.toDateString() === new Date().toDateString() && (
            <p className="text-yellow-500 text-xs">Today</p>
          )}
        </div>
        <button onClick={() => changeDate(1)}
          className="text-yellow-300 text-xl px-3 py-1 rounded-lg hover:bg-gray-800">›</button>
      </div>

      {panchang && (
        <div className="flex flex-col gap-4">

          {/* Special Day Banners */}
          {panchang.isPurnima && (
            <div className="bg-yellow-950 border border-yellow-600 rounded-2xl p-4 text-center">
              <p className="text-yellow-300 font-semibold">🌕 Purnima — Full Moon Day</p>
              <p className="text-yellow-500 text-xs mt-1">Auspicious for prayers, charity and fasting</p>
            </div>
          )}
          {panchang.isAmavasya && (
            <div className="bg-indigo-950 border border-indigo-600 rounded-2xl p-4 text-center">
              <p className="text-indigo-300 font-semibold">🌑 Amavasya — New Moon Day</p>
              <p className="text-indigo-400 text-xs mt-1">Sacred for ancestral offerings (Pitru Tarpan)</p>
            </div>
          )}
          {panchang.isEkadashi && (
            <div className="bg-orange-950 border border-orange-600 rounded-2xl p-4 text-center">
              <p className="text-orange-300 font-semibold">🙏 Ekadashi — Fasting Day</p>
              <p className="text-orange-400 text-xs mt-1">Dedicated to Lord Vishnu — avoid grains today</p>
            </div>
          )}
          {panchang.isVishti && (
            <div className="bg-red-950 border border-red-800 rounded-2xl p-4 text-center">
              <p className="text-red-400 font-semibold">⚠️ Bhadra (Vishti Karana)</p>
              <p className="text-red-500 text-xs mt-1">Avoid auspicious activities during this period</p>
            </div>
          )}

          {/* Pancha Angas — The 5 Limbs */}
          <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
            <p className="text-yellow-500 text-xs uppercase tracking-widest mb-4">
              Pancha Anga — Five Limbs
            </p>
            <div className="flex flex-col gap-3">
              <PanchangRow icon="🌙" label="Tithi" value={`${panchang.tithi}`} sub={panchang.paksha} />
              <PanchangRow icon="⭐" label="Nakshatra" value={panchang.nakshatra} sub={`Pada ${panchang.nakshatraPada}`} />
              <PanchangRow icon="☯️" label="Yoga" value={panchang.yoga} />
              <PanchangRow icon="½" label="Karana" value={panchang.karana} />
              <PanchangRow icon="📅" label="Vara" value={panchang.vara} sub={panchang.varaDeity} />
            </div>
          </div>

          {/* Timings */}
          <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
            <p className="text-yellow-500 text-xs uppercase tracking-widest mb-4">
              Daily Timings
            </p>
            <div className="flex flex-col gap-3">
              <PanchangRow icon="🌅" label="Brahma Muhurta" value={panchang.brahmaMuhurta} sub="Most auspicious for meditation" />
              <PanchangRow icon="✨" label="Abhijit Muhurta" value={panchang.abhijitMuhurta} sub="Auspicious for new beginnings" />
              <PanchangRow icon="🐍" label="Rahu Kaal" value={panchang.rahuKaal} sub="Avoid important work" highlight="red" />
            </div>
          </div>

          {/* Planetary Positions */}
          <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
            <p className="text-yellow-500 text-xs uppercase tracking-widest mb-4">
              Planetary Positions
            </p>
            <div className="flex flex-col gap-3">
              <PanchangRow icon="🌙" label="Moon Longitude" value={`${panchang.moonLongitude}°`} sub="Ecliptic position" />
              <PanchangRow icon="☀️" label="Sun Longitude" value={`${panchang.sunLongitude}°`} sub="Ecliptic position" />
            </div>
          </div>

          {/* Nakshatra Guide */}
          <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
            <p className="text-yellow-500 text-xs uppercase tracking-widest mb-3">
              Today's Nakshatra — {panchang.nakshatra}
            </p>
            <p className="text-gray-300 text-sm leading-relaxed">
              {getNakshatraDescription(panchang.nakshatra)}
            </p>
          </div>

        </div>
      )}
    </div>
  )
}

// Reusable row component
const PanchangRow = ({ icon, label, value, sub, highlight }) => (
  <div className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
    <div className="flex items-center gap-2">
      <span className="text-base">{icon}</span>
      <span className="text-gray-400 text-sm">{label}</span>
    </div>
    <div className="text-right">
      <p className={`text-sm font-semibold ${highlight === 'red' ? 'text-red-400' : 'text-white'}`}>
        {value}
      </p>
      {sub && <p className="text-gray-500 text-xs">{sub}</p>}
    </div>
  </div>
)

// Short Nakshatra descriptions
const getNakshatraDescription = (name) => {
  const descriptions = {
    'Ashwini': 'Ruled by Ketu. Associated with healing, speed and new beginnings. Deity: Ashwini Kumaras.',
    'Bharani': 'Ruled by Venus. Associated with transformation and restraint. Deity: Yama.',
    'Krittika': 'Ruled by Sun. Associated with sharp focus and purification. Deity: Agni.',
    'Rohini': 'Ruled by Moon. Most fertile Nakshatra — associated with growth and beauty. Deity: Brahma.',
    'Mrigashira': 'Ruled by Mars. Associated with searching, gentleness and curiosity. Deity: Soma.',
    'Ardra': 'Ruled by Rahu. Associated with storms, effort and transformation. Deity: Rudra.',
    'Punarvasu': 'Ruled by Jupiter. Associated with renewal and restoration. Deity: Aditi.',
    'Pushya': 'Ruled by Saturn. Most auspicious Nakshatra — nourishing and supportive. Deity: Brihaspati.',
    'Ashlesha': 'Ruled by Mercury. Associated with serpent energy and mysticism. Deity: Nagas.',
    'Magha': 'Ruled by Ketu. Associated with ancestors, authority and royalty. Deity: Pitrus.',
    'Purva Phalguni': 'Ruled by Venus. Associated with pleasure, creativity and rest. Deity: Bhaga.',
    'Uttara Phalguni': 'Ruled by Sun. Associated with partnerships and generosity. Deity: Aryaman.',
    'Hasta': 'Ruled by Moon. Associated with skill, craftsmanship and healing. Deity: Savitar.',
    'Chitra': 'Ruled by Mars. Associated with beauty, art and architecture. Deity: Vishwakarma.',
    'Swati': 'Ruled by Rahu. Associated with independence and the wind. Deity: Vayu.',
    'Vishakha': 'Ruled by Jupiter. Associated with purpose, ambition and triumph. Deity: Indra-Agni.',
    'Anuradha': 'Ruled by Saturn. Associated with devotion and friendship. Deity: Mitra.',
    'Jyeshtha': 'Ruled by Mercury. Associated with seniority and protection. Deity: Indra.',
    'Mula': 'Ruled by Ketu. Associated with roots, destruction and investigation. Deity: Nirriti.',
    'Purva Ashadha': 'Ruled by Venus. Associated with invincibility and purification. Deity: Apas.',
    'Uttara Ashadha': 'Ruled by Sun. Associated with final victory and universal principles. Deity: Vishvedevas.',
    'Shravana': 'Ruled by Moon. Associated with learning, listening and connection. Deity: Vishnu.',
    'Dhanishtha': 'Ruled by Mars. Associated with wealth, music and abundance. Deity: Eight Vasus.',
    'Shatabhisha': 'Ruled by Rahu. Associated with healing and hidden truths. Deity: Varuna.',
    'Purva Bhadrapada': 'Ruled by Jupiter. Associated with spiritual fire and transformation. Deity: Aja Ekapad.',
    'Uttara Bhadrapada': 'Ruled by Saturn. Associated with depth, wisdom and rain. Deity: Ahir Budhanya.',
    'Revati': 'Ruled by Mercury. Associated with journeys, nourishment and endings. Deity: Pushan.',
  }
  return descriptions[name] || 'A sacred lunar mansion with deep Vedic significance.'
}

export default Panchang