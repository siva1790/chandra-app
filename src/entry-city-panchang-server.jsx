import { renderToString } from 'react-dom/server'
import CityPanchang from './pages/CityPanchang.jsx'
import { getCityPanchang } from './cityPanchang.js'
import { getPublicPanchangCity } from './publicPanchangCities.js'

export function render(slug, dateKey) {
  const data = getCityPanchang(slug, dateKey)
  return {
    html: renderToString(<CityPanchang city={getPublicPanchangCity(slug)} initialData={data} />),
    data: JSON.stringify(data).replace(/</g, '\\u003c'),
  }
}
