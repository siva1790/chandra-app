import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import CityPanchang from './pages/CityPanchang.jsx'
import { getPublicPanchangCityFromPath } from './publicPanchangCities.js'
import { getCityPanchang } from './cityPanchang.js'
import './index.css'

const city = getPublicPanchangCityFromPath(window.location.pathname)
if (!city) throw new Error('Unknown Panchang city')

const root = document.getElementById('root')
const snapshot = JSON.parse(document.getElementById('panchang-data').textContent)
const app = <StrictMode><CityPanchang city={city} initialData={snapshot || getCityPanchang(city.slug)} /></StrictMode>
if (snapshot) hydrateRoot(root, app)
else createRoot(root).render(app)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {})
  })
}
