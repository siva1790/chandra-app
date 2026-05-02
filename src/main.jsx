import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { SettingsProvider } from './SettingsContext'
import { SubscriptionProvider } from './SubscriptionContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <SettingsProvider>
      <SubscriptionProvider>
        <App />
      </SubscriptionProvider>
    </SettingsProvider>
  </StrictMode>,
)