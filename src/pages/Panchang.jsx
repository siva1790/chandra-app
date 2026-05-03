import { useState, useEffect } from 'react'
import * as Astronomy from 'astronomy-engine'
import { getSunriseForDate } from '../moonUtils'
import { getEclipseForDate, eclipseTypeLabel, lunarTotalityLabel } from '../eclipseUtils'
import DatePickerSheet from '../components/DatePickerSheet'
import { EclipseIcon } from '../components/EclipseIcons'

const AYANAMSHA = 23.15

const nakshatras = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira',
  'Ardra', 'Punarvasu', 'Pushya', 'Ashlesha', 'Magha',
  'Purva Phalguni', 'Uttara Phalguni', 'Hasta', 'Chitra', 'Swati',
  'Vishakha', 'Anuradha', 'Jyeshtha', 'Mula', 'Purva Ashadha',
  'Uttara Ashadha', 'Shravana', 'Dhanishtha', 'Shatabhisha',
  'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati'
]

const getMoonSiderealLongitude = (d) => {
  const pos = Astronomy.GeoVector('Moon', d, true)
  const ecl = Astronomy.Ecliptic(pos)
  return ((ecl.elon - AYANAMSHA + 360) % 360)
}

const getNakshatraIndex = (d) => {
  return Math.floor(getMoonSiderealLongitude(d) / (360 / 27))
}

const findNakshatraTransition = (startTime, endTime, startIdx) => {
  let lo = startTime.getTime()
  let hi = endTime.getTime()
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2
    const midDate = new Date(mid)
    if (getNakshatraIndex(midDate) === startIdx) {
      lo = mid
    } else {
      hi = mid
    }
  }
  return new Date((lo + hi) / 2)
}

const Panchang = ({ location }) => {
  const [panchang, setPanchang] = useState(null)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [pickerOpen, setPickerOpen] = useState(false)

  useEffect(() => {
    calculatePanchang(selectedDate)
  }, [selectedDate, location])

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
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

  const calculatePanchang = (date) => {
    try {
      // Sample tithi/karana/yoga/longitudes at LOCAL SUNRISE for the given date
      // (Drik Panchang convention). Nakshatra still uses full-day scan below to
      // show all transitions during the day.
      const sunriseTime = getSunriseForDate(date, location?.lat, location?.lon)
      const phaseAngle = Astronomy.MoonPhase(sunriseTime)

      // --- Tithi ---
      const tithiNames = [
        'Pratipada (Prathama)', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami',
        'Shashthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami',
        'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi', 'Purnima',
        'Pratipada (Prathama)', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami',
        'Shashthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami',
        'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi', 'Amavasya'
      ]
      const tithiIndex = Math.floor(phaseAngle / 12)
      const tithiName = tithiNames[Math.min(tithiIndex, 29)]
      const paksha = tithiIndex < 15 ? 'Shukla Paksha' : 'Krishna Paksha'

      // --- Moon longitude (sidereal at sunrise) — used for Yoga + display ---
      const moonLongitude = getMoonSiderealLongitude(sunriseTime)

      // --- Nakshatra with start/end times ---
      const dayStart = new Date(date)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(date)
      dayEnd.setHours(23, 59, 59, 999)

      const nakshatraList = []
      let cursor = new Date(dayStart)
      let currentIdx = getNakshatraIndex(cursor)

      while (cursor < dayEnd) {
        const searchEnd = new Date(Math.min(cursor.getTime() + 24 * 60 * 60 * 1000, dayEnd.getTime()))
        let transitionFound = false

        let scanner = new Date(cursor.getTime() + 30 * 60 * 1000)
        while (scanner <= searchEnd) {
          const scanIdx = getNakshatraIndex(scanner)
          if (scanIdx !== currentIdx) {
            const transitionTime = findNakshatraTransition(
              new Date(scanner.getTime() - 30 * 60 * 1000),
              scanner,
              currentIdx
            )
            const midPoint = new Date(cursor.getTime() + (transitionTime.getTime() - cursor.getTime()) / 2)
            const pada = Math.floor(
              (getMoonSiderealLongitude(midPoint) % (360 / 27)) / (360 / 108)
            ) + 1

            nakshatraList.push({
              name: nakshatras[currentIdx % 27],
              pada,
              start: cursor.getTime() <= dayStart.getTime() ? dayStart : cursor,
              end: transitionTime,
              endsToday: true
            })

            cursor = transitionTime
            currentIdx = scanIdx
            transitionFound = true
            break
          }
          scanner = new Date(scanner.getTime() + 30 * 60 * 1000)
        }

        if (!transitionFound) {
          const midPoint = new Date((cursor.getTime() + dayEnd.getTime()) / 2)
          const pada = Math.floor(
            (getMoonSiderealLongitude(midPoint) % (360 / 27)) / (360 / 108)
          ) + 1
          nakshatraList.push({
            name: nakshatras[currentIdx % 27],
            pada,
            start: cursor.getTime() <= dayStart.getTime() ? dayStart : cursor,
            end: dayEnd,
            endsToday: false
          })
          break
        }
      }

      const nakshatraName = nakshatraList[0]?.name || nakshatras[currentIdx % 27]
      const nakshatraPada = nakshatraList[0]?.pada || 1

      // --- Yoga (sun longitude at sunrise) ---
      const sunPos = Astronomy.GeoVector('Sun', sunriseTime, true)
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
      const rahuOrder = [7, 1, 6, 4, 5, 3, 2]
      const sunrise = 6 * 60
      const sunset = 18 * 60
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

      // --- Yamagandam ---
      // Slot order by day of week [Sun, Mon, Tue, Wed, Thu, Fri, Sat] (1-based slot index)
      const yamOrder = [5, 4, 3, 2, 1, 6, 7]
      const yamSlot = yamOrder[varaIndex]
      const yamStart = sunrise + (yamSlot - 1) * slotDuration
      const yamEnd = yamStart + slotDuration
      const yamagandam = `${formatMinutes(yamStart)} – ${formatMinutes(yamEnd)}`

      // --- Abhijit Muhurta ---
      const midday = (sunrise + sunset) / 2
      const abhijitStart = midday - 24
      const abhijitEnd = midday + 24
      const abhijitMuhurta = `${formatMinutes(abhijitStart)} – ${formatMinutes(abhijitEnd)}`

      // --- Brahma Muhurta ---
      const brahmaStart = sunrise - 96
      const brahmaEnd = sunrise - 48
      const brahmaMuhurta = `${formatMinutes(brahmaStart)} – ${formatMinutes(brahmaEnd)}`

      // --- Auspiciousness flags ---
      const isEkadashi = tithiName === 'Ekadashi'
      const isPurnima = tithiName === 'Purnima'
      const isAmavasya = tithiName === 'Amavasya'
      const isVishti = karanaName === 'Vishti'

      // --- Eclipse ---
      const eclipse = getEclipseForDate(date)

      setPanchang({
        tithi: tithiName,
        paksha,
        nakshatra: nakshatraName,
        nakshatraPada,
        nakshatraList,
        yoga: yogaName,
        karana: karanaName,
        vara: varaName,
        varaDeity,
        rahuKaal,
        yamagandam,
        abhijitMuhurta,
        brahmaMuhurta,
        moonLongitude: moonLongitude.toFixed(2),
        sunLongitude: sunLongitude.toFixed(2),
        isEkadashi,
        isPurnima,
        isAmavasya,
        isVishti,
        eclipse,
      })
    } catch (err) {
      console.error('Panchang calculation error:', err)
    }
  }

  return (
    <div className="min-h-screen px-4 py-8 pb-28 max-w-md mx-auto">

      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-yellow-300 mb-1">📿 Panchang</h1>
        <p className="text-gray-400 text-sm">Daily Hindu Almanac</p>
      </div>

      {/* Date Navigator */}
      <div className="flex items-center justify-between mb-6 bg-gray-900 rounded-2xl p-3 border border-gray-800">
        <button
          onClick={() => changeDate(-1)}
          className="text-yellow-300 text-xl px-3 py-1 rounded-lg hover:bg-gray-800"
        >‹</button>

        {/* Tappable date — opens calendar picker */}
        <button
          onClick={() => setPickerOpen(true)}
          className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl hover:bg-gray-800 transition-all"
        >
          <p className="text-white text-sm font-medium">{formatDate(selectedDate)}</p>
          {selectedDate.toDateString() === new Date().toDateString() ? (
            <p className="text-yellow-500 text-xs">Today</p>
          ) : (
            <p className="text-yellow-400 text-xs font-medium">📅 Change date</p>
          )}
        </button>

        <button
          onClick={() => changeDate(1)}
          className="text-yellow-300 text-xl px-3 py-1 rounded-lg hover:bg-gray-800"
        >›</button>
      </div>

      {/* Today pill — visible only when not on today */}
      {selectedDate.toDateString() !== new Date().toDateString() && (
        <button
          onClick={() => setSelectedDate(new Date())}
          className="w-full mb-4 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-gray-950 text-sm font-bold transition-all"
        >
          ↩ Back to Today
        </button>
      )}

      {/* Date Picker Sheet */}
      <DatePickerSheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        selectedDate={selectedDate}
        onSelect={(date) => setSelectedDate(date)}
      />

      {panchang ? (
        <div className="flex flex-col gap-4">

          {/* Eclipse Banner */}
          {panchang.eclipse && (
            <div className="bg-indigo-950 border border-indigo-600 rounded-2xl p-5">
              <div className="flex items-center gap-4">
                <EclipseIcon eclipse={panchang.eclipse} size={44} />
                <div className="flex-1">
                  <p className="text-indigo-200 font-bold text-base">
                    {panchang.eclipse.hinduName}
                  </p>
                  <p className="text-indigo-400 text-xs mt-0.5">
                    {eclipseTypeLabel(panchang.eclipse)}
                  </p>
                  <p className="text-indigo-300 text-sm mt-1.5 font-medium">
                    Peak: {panchang.eclipse.peakTime.toLocaleTimeString('en-IN', {
                      hour: '2-digit', minute: '2-digit', hour12: true
                    })} IST
                  </p>
                  {lunarTotalityLabel(panchang.eclipse) && (
                    <p className="text-indigo-400 text-xs mt-0.5">
                      {lunarTotalityLabel(panchang.eclipse)}
                    </p>
                  )}
                  {panchang.eclipse.type === 'lunar' && (
                    <p className="text-indigo-500 text-xs mt-1.5 leading-relaxed">
                      Avoid auspicious activities during the eclipse. Perform ritual bath after eclipse ends.
                    </p>
                  )}
                  {panchang.eclipse.type === 'solar' && (
                    <p className="text-indigo-500 text-xs mt-1.5 leading-relaxed">
                      Surya Grahan — avoid eating during the eclipse period. Chant mantras and pray.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

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

              <PanchangRow icon="🌙" label="Tithi" value={panchang.tithi} sub={panchang.paksha} />

              {/* Nakshatra with timing */}
              {panchang.nakshatraList && panchang.nakshatraList.length > 0 ? (
                <div className="py-2 border-b border-gray-800">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-base">⭐</span>
                    <span className="text-gray-400 text-sm">Nakshatra</span>
                  </div>
                  {panchang.nakshatraList.map((n, i) => (
                    <div key={i} className="ml-6 mb-2 bg-gray-800 rounded-xl px-3 py-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white text-sm font-semibold">{n.name}</p>
                          <p className="text-gray-400 text-xs">Pada {n.pada}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-yellow-300 text-xs font-medium">
                            {n.start.getHours() === 0 && n.start.getMinutes() === 0
                              ? 'From midnight'
                              : formatTime(n.start)}
                            {' → '}
                            {n.endsToday ? formatTime(n.end) : 'Next day'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <PanchangRow icon="⭐" label="Nakshatra" value={panchang.nakshatra} sub={`Pada ${panchang.nakshatraPada}`} />
              )}

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
              <PanchangRow icon="⏳" label="Yamagandam" value={panchang.yamagandam} sub="Avoid auspicious activities" highlight="red" />
            </div>
          </div>

          {/* Planetary Positions */}
          <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
            <p className="text-yellow-500 text-xs uppercase tracking-widest mb-4">
              Planetary Positions
            </p>
            <div className="flex flex-col gap-3">
              <PanchangRow icon="🌙" label="Moon Longitude" value={`${panchang.moonLongitude}°`} sub="Sidereal (Lahiri)" />
              <PanchangRow icon="☀️" label="Sun Longitude" value={`${panchang.sunLongitude}°`} sub="Sidereal (Lahiri)" />
            </div>
          </div>

          {/* Nakshatra Descriptions */}
          {panchang.nakshatraList && panchang.nakshatraList.map((n, i) => (
            <div key={i} className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
              <p className="text-yellow-500 text-xs uppercase tracking-widest mb-3">
                {n.name}
                {panchang.nakshatraList.length > 1
                  ? ` (${formatTime(n.start)} – ${n.endsToday ? formatTime(n.end) : 'Next day'})`
                  : " — Today's Nakshatra"}
              </p>
              <p className="text-gray-300 text-sm leading-relaxed">
                {getNakshatraDescription(n.name)}
              </p>
            </div>
          ))}

        </div>
      ) : (
        <div className="text-center text-gray-400 mt-20">
          <p className="text-4xl mb-4">📿</p>
          <p>Calculating Panchang...</p>
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
