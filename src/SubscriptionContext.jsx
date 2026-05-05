import { createContext, useContext, useState } from 'react'
import { db } from './firebase'
import { doc, setDoc, updateDoc } from 'firebase/firestore'

const SubscriptionContext = createContext()

export const useSubscription = () => useContext(SubscriptionContext)

export const SubscriptionProvider = ({ children }) => {
  const [subscription, setSubscription] = useState(() => {
    try {
      const saved = localStorage.getItem('chandra-subscription')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })

  // Always keep localStorage in sync as the local source of truth
  const save = (data) => {
    localStorage.setItem('chandra-subscription', JSON.stringify(data))
    setSubscription(data)
  }

  // Create a new subscriber document in Firestore
  const subscribe = async (name, email, city, lat, lon, calendarSystem, emailFrequency = 'all') => {
    const id = crypto.randomUUID()
    const data = {
      id,
      name,
      email,
      city,
      lat,
      lon,
      calendarSystem,
      emailFrequency,
      active: true,
      subscribedAt: new Date().toISOString(),
    }
    save(data)
    await setDoc(doc(db, 'subscribers', id), data)
  }

  // Update subscriber details
  const update = async (name, email, city, emailFrequency) => {
    const data = { ...subscription, name, email, city, emailFrequency }
    save(data)
    try {
      await updateDoc(doc(db, 'subscribers', subscription.id), {
        name, email, city, emailFrequency
      })
    } catch (e) {
      console.error('Firestore update error:', e)
    }
  }

  // Update email frequency preference only (called from Settings frequency chips)
  const updateFrequency = async (emailFrequency) => {
    const data = { ...subscription, emailFrequency }
    save(data)
    try {
      await updateDoc(doc(db, 'subscribers', subscription.id), { emailFrequency })
    } catch (e) {
      console.error('Firestore updateFrequency error:', e)
    }
  }

  // Soft-delete — marks inactive in Firestore, clears local state
  // We keep the Firestore document so the backend can honour the unsubscribe
  const unsubscribe = async () => {
    if (subscription?.id) {
      try {
        await updateDoc(doc(db, 'subscribers', subscription.id), {
          active: false,
          unsubscribedAt: new Date().toISOString(),
        })
      } catch (e) {
        console.error('Firestore unsubscribe error:', e)
      }
    }
    localStorage.removeItem('chandra-subscription')
    setSubscription(null)
  }

  return (
    <SubscriptionContext.Provider
      value={{ subscription, subscribe, update, updateFrequency, unsubscribe }}
    >
      {children}
    </SubscriptionContext.Provider>
  )
}
