/**
 * notifications.js — FCM device registration and preference management.
 *
 * Each browser that grants notification permission is registered as a document
 * in the Firestore `devices` collection. A stable UUID (chandra-device-id) in
 * localStorage identifies the document across sessions.
 *
 * Firestore writes:
 *   initDevice  → setDoc (upsert)  — on permission grant or city change
 *   updateDevice → updateDoc       — on notification pref toggle
 *   deactivateDevice → updateDoc   — on master toggle off
 */

import { db, getMessagingInstance } from './firebase'
import { doc, setDoc, updateDoc } from 'firebase/firestore'
import { getToken } from 'firebase/messaging'

const VAPID_KEY   = 'BCIHvBMHmt9PJ10BuyhR8czBpkSXogbKxh1kdtwA88knXyjPHkeD51iKWmHgInktiJp4eM2o0ctIs3F-MqR4VNA'
const DEVICE_KEY  = 'chandra-device-id'

/**
 * Register or refresh this device in Firestore.
 * Safe to call multiple times — always upserts with the latest token + city.
 * Called: on permission grant, on city change (if notifications already on).
 */
export const initDevice = async (city, lat, lon, notifPrefs, calendarSystem = 'Amavasyant') => {
  try {
    const messaging = await getMessagingInstance()
    if (!messaging) return null

    const registration = await navigator.serviceWorker.ready
    const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration })
    if (!token) return null

    // Stable device ID stored in localStorage
    let deviceId = localStorage.getItem(DEVICE_KEY)
    if (!deviceId) {
      deviceId = crypto.randomUUID()
      localStorage.setItem(DEVICE_KEY, deviceId)
    }

    await setDoc(doc(db, 'devices', deviceId), {
      token,
      city,
      lat,
      lon,
      notifPrefs: {
        festivals: notifPrefs.festivals ?? true,
        eclipses:  notifPrefs.eclipses  ?? true,
        moonrise:  notifPrefs.moonrise  ?? true,
        ekadashi:  notifPrefs.ekadashi  ?? true,
      },
      calendarSystem,
      notifPrefsVersion: 2,
      active:    true,
      updatedAt: new Date().toISOString(),
    }, { merge: true })

    return deviceId
  } catch (e) {
    console.error('[FCM] initDevice error:', e)
    return null
  }
}

/**
 * Partial update to the device document.
 * Used when notification prefs change — does not re-fetch the FCM token.
 */
export const updateDevice = async (updates) => {
  const deviceId = localStorage.getItem(DEVICE_KEY)
  if (!deviceId) return
  try {
    await updateDoc(doc(db, 'devices', deviceId), {
      ...updates,
      updatedAt: new Date().toISOString(),
    })
  } catch (e) {
    console.error('[FCM] updateDevice error:', e)
  }
}

/**
 * Mark this device inactive so the backend stops sending push notifications.
 * The document is kept in Firestore (not deleted) to preserve the token for cleanup.
 */
export const deactivateDevice = async () => {
  const deviceId = localStorage.getItem(DEVICE_KEY)
  if (!deviceId) return
  try {
    await updateDoc(doc(db, 'devices', deviceId), {
      active:    false,
      updatedAt: new Date().toISOString(),
    })
  } catch (e) {
    console.error('[FCM] deactivateDevice error:', e)
  }
  // Clear the stored ID so re-enabling notifications creates a fresh document
  // (Firestore rules block active: false → true updates on existing documents)
  localStorage.removeItem(DEVICE_KEY)
}
