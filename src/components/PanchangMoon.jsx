import { useMemo } from 'react'
import * as Astronomy from 'astronomy-engine'
import MoonVisual from './MoonVisual.jsx'
import { getMoonEventsForDate } from '../moonEvents.js'
import { formatEventTime, formatEventDate } from '../timeFormatting.js'

function Metric({ label, value, detail }) {
  return <div className="panchang-moon-metric"><dt>{label}</dt><dd>{value}{detail && <small>{detail}</small>}</dd></div>
}

export default function PanchangMoon({ date, sunrise, lat, lon }) {
  const result = useMemo(() => {
    try {
      const phase = Astronomy.MoonPhase(sunrise) / 360
      return { phase, ...getMoonEventsForDate(date, { lat, lon }) }
    } catch {
      return null
    }
  }, [date, sunrise, lat, lon])

  return <section className="panchang-moon-timings" aria-label="Moon image, moonrise and moonset">
    {result ? <div className="panchang-moon-grid">
      <div className="panchang-moon-image"><MoonVisual phase={result.phase} showLabel={false} compact /></div>
      <dl>
        <Metric label="Moonrise · IST" value={result.moonrise ? formatEventTime(result.moonrise) : 'No moonrise on this date'} detail={result.moonrise && formatEventDate(result.moonrise)} />
      </dl>
      <dl>
        <Metric label="Moonset · IST" value={result.moonset ? formatEventTime(result.moonset) : (result.moonrise ? 'No following moonset found' : 'No moonset on this date')} detail={result.moonset && formatEventDate(result.moonset)} />
      </dl>
    </div> : <p role="alert" className="text-support text-chandra-error">Could not calculate moon events for this date. Try another date or reload the page.</p>}
  </section>
}
