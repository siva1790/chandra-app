import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import BengaluruPanchang from './pages/BengaluruPanchang.jsx'
import { getBengaluruPanchang } from './bengaluruPanchang.js'
import './index.css'

const root = document.getElementById('root')
const snapshot = JSON.parse(document.getElementById('panchang-data').textContent)
const app = <StrictMode><BengaluruPanchang initialData={snapshot || getBengaluruPanchang()} /></StrictMode>
if (snapshot) hydrateRoot(root, app)
else createRoot(root).render(app)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {})
  })
}
