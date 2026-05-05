import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { SettingsProvider } from './SettingsContext'
import { SubscriptionProvider } from './SubscriptionContext'

// Register the Workbox-generated service worker manually.
// vite-plugin-pwa's auto-inject (registerSW.js) 404s on Vite 8 / Rolldown,
// so we bypass it and register sw.js directly.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {})
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <SettingsProvider>
      <SubscriptionProvider>
        <App />
      </SubscriptionProvider>
    </SettingsProvider>
  </StrictMode>,
)