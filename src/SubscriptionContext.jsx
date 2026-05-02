import { createContext, useContext, useState } from 'react'

const SubscriptionContext = createContext()

export const useSubscription = () => useContext(SubscriptionContext)

const ENDPOINT =
  'https://script.google.com/macros/s/AKfycbyWMbLrSxuVUOaTzHK_HuZMe01xgwYWQsKZGBR9wIEHpV_g25RjO5ctYQ70Ac_ORnafWg/exec'

// Fire-and-forget POST to Apps Script.
// mode: 'no-cors' means we can't read the response, but the request
// reaches the server and the Sheet is updated correctly.
const post = (data) => {
  fetch(ENDPOINT, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).catch(() => {})
}

export const SubscriptionProvider = ({ children }) => {
  const [subscription, setSubscription] = useState(() => {
    try {
      const saved = localStorage.getItem('chandra-subscription')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })

  const save = (data) => {
    localStorage.setItem('chandra-subscription', JSON.stringify(data))
    setSubscription(data)
  }

  // Create new subscription row in the Sheet
  const subscribe = (name, mobile, email, city) => {
    const data = {
      id: crypto.randomUUID(),
      name,
      mobile,
      email,
      city,
      subscribedAt: new Date().toISOString(),
    }
    save(data)
    post({ action: 'subscribe', ...data })
  }

  // Update existing row by UUID
  const update = (name, mobile, email, city) => {
    const data = { ...subscription, name, mobile, email, city }
    save(data)
    post({ action: 'update', id: subscription.id, name, mobile, email, city })
  }

  // Mark row as unsubscribed in Sheet, clear local state
  const unsubscribe = () => {
    if (subscription?.id) {
      post({ action: 'unsubscribe', id: subscription.id })
    }
    localStorage.removeItem('chandra-subscription')
    setSubscription(null)
  }

  return (
    <SubscriptionContext.Provider value={{ subscription, subscribe, update, unsubscribe }}>
      {children}
    </SubscriptionContext.Provider>
  )
}
