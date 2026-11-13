import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import PublicLearn from './pages/PublicLearn.jsx'
import './index.css'

const root = document.getElementById('root')
const app = <StrictMode><PublicLearn /></StrictMode>
if (root.querySelector('.learn-public-shell')) hydrateRoot(root, app)
else createRoot(root).render(app)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {}))
}
