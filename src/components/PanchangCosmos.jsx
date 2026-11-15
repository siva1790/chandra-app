import { useMemo } from 'react'
import * as Astronomy from 'astronomy-engine'
import { Moon } from 'lucide-react'
import MoonVisual from './MoonVisual.jsx'
import { getMoonEventsForDate } from '../moonEvents.js'
import { formatEventTime, formatEventDate } from '../timeFormatting.js'

function phaseLabel(phase) {
  if (phase < 0.03 || phase > 0.97) return 'New Moon'
  if (phase < 0.22) return 'Waxing Crescent'
  if (phase < 0.28) return 'First Quarter'
  if (phase < 0.47) return 'Waxing Gibbous'
  if (phase < 0.53) return 'Full Moon'
  if (phase < 0.72) return 'Waning Gibbous'
  if (phase < 0.78) return 'Last Quarter'
  return 'Waning Crescent'
}

function Metric({ label, value, detail }) {
  return <div className="panchang-cosmos-metric"><dt>{label}</dt><dd>{value}{detail && <small>{detail}</small>}</dd></div>
}

export default function PanchangCosmos({ date, sunrise, lat, lon, isToday }) {
  const result = useMemo(() => {
    try {
      const phase = Astronomy.MoonPhase(sunrise) / 360
      return { phase, illumination: (Astronomy.Illumination('Moon', sunrise).phase_fraction * 100).toFixed(1), ...getMoonEventsForDate(date, { lat, lon }) }
    } catch {
      return null
    }
  }, [date, sunrise, lat, lon])

  return <section className="panchang-cosmos" aria-labelledby="panchang-cosmos-heading">
    <div className="panchang-cosmos-heading"><h2 id="panchang-cosmos-heading"><Moon size={16} aria-hidden="true" />{isToday ? "Today's Cosmos" : 'Cosmos'}</h2><span>At local sunrise</span></div>
    {result ? <div className="panchang-cosmos-grid">
      <div className="panchang-cosmos-moon"><MoonVisual phase={result.phase} showLabel={false} compact /></div>
      <dl className="panchang-cosmos-column">
        <Metric label="Moon phase" value={phaseLabel(result.phase)} />
        <Metric label="Moonrise · IST" value={result.moonrise ? formatEventTime(result.moonrise) : 'No moonrise on this date'} detail={result.moonrise && formatEventDate(result.moonrise)} />
      </dl>
      <dl className="panchang-cosmos-column">
        <Metric label="Illumination" value={`${result.illumination}%`} />
        <Metric label="Moonset · IST" value={result.moonset ? formatEventTime(result.moonset) : (result.moonrise ? 'No following moonset found' : 'No moonset on this date')} detail={result.moonset && formatEventDate(result.moonset)} />
      </dl>
    </div> : <p role="alert" className="mt-4 text-support text-chandra-error">Could not calculate moon events for this date. Try another date or reload the page.</p>}
  </section>
}
