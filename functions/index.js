/**
 * index.js — Cloud Functions for Chandra.
 *
 * Two scheduled functions:
 *
 *  sendDailyPushNotifications  — 7:00 AM IST daily
 *    Reads all active devices (1 Firestore query), groups by city,
 *    calculates festivals/eclipses once per unique city, sends FCM multicast
 *    batches of 500. Cleans up invalid tokens.
 *
 *  sendDailyEmails             — 7:30 AM IST daily
 *    Reads all active subscribers (1 Firestore query), groups by city,
 *    calculates day info once per unique city, filters by emailFrequency,
 *    sends via Resend batch API (100 per call).
 *
 * Environment secrets (set via: firebase functions:secrets:set <NAME>):
 *   RESEND_API_KEY    — Resend API key
 *   RESEND_FROM_EMAIL — verified sender address (e.g. noreply@yourdomain.com)
 *                       Until your domain is verified in Resend, use onboarding@resend.dev
 *                       which only delivers to your own Resend-registered email.
 */

'use strict'

const { onSchedule }    = require('firebase-functions/v2/scheduler')
const { initializeApp } = require('firebase-admin/app')
const { getFirestore }  = require('firebase-admin/firestore')
const { getMessaging }  = require('firebase-admin/messaging')
const { Resend }        = require('resend')

const { getDayInfo, getUpcomingFestivals, getISTDateKey } = require('./astroUtils')
const { festivalEmail, monthlyDigestEmail } = require('./emailTemplates')

// ── Initialise Firebase Admin ─────────────────────────────────────────────────
initializeApp()
const db = getFirestore()

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Group an array of objects by a key-producing function.
 * Avoids redundant astronomy calculations for users in the same city.
 */
const groupBy = (arr, keyFn) =>
  arr.reduce((acc, item) => {
    const key = keyFn(item)
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {})

const deviceCalendarSystem = (device) =>
  device.calendarSystem === 'Purnimant' ? 'Purnimant' : 'Amavasyant'

const observanceAlertsEnabled = (device, prefs) =>
  prefs.ekadashi !== false || device.notifPrefsVersion !== 2

const pushUrl = '/'

const sendMulticastNotification = async (messaging, tokens, notif, invalidTokens) => {
  let successCount = 0
  for (let i = 0; i < tokens.length; i += 500) {
    const batch = tokens.slice(i, i + 500)
    try {
      const response = await messaging.sendEachForMulticast({
        tokens: batch,
        notification: { title: notif.title, body: notif.body },
        data: {
          title: notif.title,
          body: notif.body,
          url: notif.url || pushUrl,
          kind: notif.kind || 'chandra',
        },
        webpush: {
          fcmOptions: { link: notif.url || pushUrl },
          notification: {
            icon:    '/icons/icon-192.png',
            badge:   '/icons/icon-72.png',
            vibrate: [200, 100, 200],
          },
        },
      })

      response.responses.forEach((resp, idx) => {
        if (
          !resp.success &&
          (resp.error?.code === 'messaging/registration-token-not-registered' ||
           resp.error?.code === 'messaging/invalid-registration-token')
        ) {
          invalidTokens.push(batch[idx])
        }
      })
      successCount += response.successCount

      console.log(
        `[Push] Sent to ${batch.length} tokens. ` +
        `Success: ${response.successCount}, Failed: ${response.failureCount}`
      )
    } catch (err) {
      console.error('[Push] Multicast error:', err)
    }
  }
  return successCount
}

// ── Function 1: Push Notifications ───────────────────────────────────────────

exports.sendDailyPushNotifications = onSchedule(
  {
    schedule:  '0 7 * * *',       // 7:00 AM IST
    timeZone:  'Asia/Kolkata',
    region:    'asia-south1',
    secrets:   [],
    memory:    '512MiB',
    timeoutSeconds: 120,
  },
  async () => {
    const now = new Date()

    // ── 1. Single Firestore read: all active devices ────────────────────────
    const snapshot = await db.collection('devices').where('active', '==', true).get()
    if (snapshot.empty) {
      console.log('[Push] No active devices. Exiting.')
      return
    }

    const devices = []
    snapshot.forEach(d => devices.push({ docId: d.id, ...d.data() }))
    console.log(`[Push] Processing ${devices.length} active devices.`)

    // ── 2. Group by city (lat,lon) to calculate astronomy once per city ─────
    const cityGroups = groupBy(devices, d => `${d.lat},${d.lon},${deviceCalendarSystem(d)}`)

    const messaging      = getMessaging()
    const invalidTokens  = []  // collect expired/invalid tokens for cleanup

    // ── 3. Per-city: calculate day info, then send matching devices ─────────
    for (const [cityKey, cityDevices] of Object.entries(cityGroups)) {
      const [latStr, lonStr, calendarSystem] = cityKey.split(',')
      const lat = Number(latStr)
      const lon = Number(lonStr)
      let dayInfo
      try {
        dayInfo = getDayInfo(now, lat, lon, calendarSystem)
      } catch (err) {
        console.error(`[Push] Astronomy error for ${cityKey}:`, err)
        continue
      }

      // Build per-device notification (respects each device's notifPrefs)
      const tokenMap = {}  // token → notification payload

      for (const device of cityDevices) {
        const prefs = device.notifPrefs || { festivals: true, eclipses: true, moonrise: true, ekadashi: true }
        let notif   = null

        if (prefs.eclipses && dayInfo.eclipse) {
          const e = dayInfo.eclipse
          notif = {
            title: `${e.type === 'lunar' ? '🌑' : '☀️'} ${e.hinduName}`,
            body:  `${e.kind.charAt(0).toUpperCase() + e.kind.slice(1)} ${e.type} eclipse today. Tap for details.`,
          }
        } else if (prefs.festivals && dayInfo.datedFestivals.length > 0) {
          // Only dated/major festivals (Holi, Diwali, etc.) — not monthly observances
          const f = dayInfo.datedFestivals[0]
          notif = {
            title: `${f.emoji} ${f.name}`,
            body:  f.genZMessage || f.description,
          }
        } else if (observanceAlertsEnabled(device, prefs) && dayInfo.festivals.length > 0) {
          // Monthly observances (Ekadashi, Purnima, Pradosh, Amavasya, etc.)
          // Only fires when the user has opted into "Ekadashi & Pradosh" alerts
          const f = dayInfo.festivals[0]
          notif = {
            title: `${f.emoji} ${f.name}`,
            body:  f.genZMessage || f.description,
          }
        }

        if (notif && device.token) tokenMap[device.token] = notif
      }

      if (Object.keys(tokenMap).length === 0) continue

      // Group tokens that share the same notification content → multicast batches
      const notifGroups = groupBy(Object.entries(tokenMap), ([, n]) => JSON.stringify(n))

      for (const entries of Object.values(notifGroups)) {
        const tokens = entries.map(([t]) => t)
        const notif  = entries[0][1]

        await sendMulticastNotification(messaging, tokens, notif, invalidTokens)
      }
    }

    // ── 4. Clean up invalid tokens (mark inactive) ──────────────────────────
    if (invalidTokens.length > 0) {
      console.log(`[Push] Cleaning up ${invalidTokens.length} invalid tokens.`)
      const writeBatch = db.batch()
      for (const token of invalidTokens) {
        const q = await db.collection('devices').where('token', '==', token).limit(1).get()
        q.forEach(d => writeBatch.update(d.ref, { active: false }))
      }
      await writeBatch.commit()
    }

    console.log('[Push] Done.')
  }
)

// Moonrise Push Notifications

exports.sendMoonrisePushNotifications = onSchedule(
  {
    schedule:  'every 15 minutes',
    timeZone:  'Asia/Kolkata',
    region:    'asia-south1',
    secrets:   [],
    memory:    '512MiB',
    timeoutSeconds: 120,
  },
  async () => {
    const now = new Date()
    const windowStart = new Date(now.getTime() - 15 * 60 * 1000)

    const snapshot = await db.collection('devices').where('active', '==', true).get()
    if (snapshot.empty) {
      console.log('[Moonrise Push] No active devices. Exiting.')
      return
    }

    const devices = []
    snapshot.forEach(d => devices.push({ docId: d.id, ref: d.ref, ...d.data() }))
    const moonriseDevices = devices.filter(d => (d.notifPrefs || {}).moonrise !== false && d.token)
    if (moonriseDevices.length === 0) {
      console.log('[Moonrise Push] No devices opted into moonrise reminders.')
      return
    }

    const cityGroups = groupBy(moonriseDevices, d => `${d.lat},${d.lon},${deviceCalendarSystem(d)}`)
    const messaging = getMessaging()
    const invalidTokens = []

    for (const [cityKey, cityDevices] of Object.entries(cityGroups)) {
      const [latStr, lonStr, calendarSystem] = cityKey.split(',')
      const lat = Number(latStr)
      const lon = Number(lonStr)

      let dayInfo
      try {
        dayInfo = getDayInfo(now, lat, lon, calendarSystem)
      } catch (err) {
        console.error(`[Moonrise Push] Astronomy error for ${cityKey}:`, err)
        continue
      }

      if (!dayInfo.moonrise) continue

      const reminderTime = new Date(dayInfo.moonrise.getTime() - 30 * 60 * 1000)
      if (reminderTime <= windowStart || reminderTime > now) continue

      const dateKey = getISTDateKey(dayInfo.moonrise)
      const notificationKey = `moonrise:${dateKey}`
      const tokens = []
      const notifiedRefs = []

      for (const device of cityDevices) {
        if (device.lastMoonriseNotificationKey === notificationKey) continue
        tokens.push(device.token)
        notifiedRefs.push(device.ref)
      }

      if (tokens.length === 0) continue

      const sentCount = await sendMulticastNotification(messaging, tokens, {
        title: 'Moonrise in 30 minutes',
        body: `Moonrise for ${cityDevices[0].city || 'your city'} is around ${dayInfo.moonrise.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })}.`,
        kind: 'moonrise',
      }, invalidTokens)

      if (sentCount > 0) {
        const writeBatch = db.batch()
        notifiedRefs.forEach(ref => writeBatch.update(ref, {
          lastMoonriseNotificationKey: notificationKey,
          lastMoonriseNotificationAt: now.toISOString(),
        }))
        await writeBatch.commit()
      }
    }

    if (invalidTokens.length > 0) {
      console.log(`[Moonrise Push] Cleaning up ${invalidTokens.length} invalid tokens.`)
      const writeBatch = db.batch()
      for (const token of invalidTokens) {
        const q = await db.collection('devices').where('token', '==', token).limit(1).get()
        q.forEach(d => writeBatch.update(d.ref, { active: false }))
      }
      await writeBatch.commit()
    }

    console.log('[Moonrise Push] Done.')
  }
)

exports.sendDailyEmails = onSchedule(
  {
    schedule:  '30 7 * * *',      // 7:30 AM IST
    timeZone:  'Asia/Kolkata',
    region:    'asia-south1',
    secrets:   [],
    memory:    '512MiB',
    timeoutSeconds: 300,
  },
  async () => {
    const now          = new Date()
    const isFirstOfMonth = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }).endsWith('-01')
    const resend       = new Resend(process.env.RESEND_API_KEY)
    const fromAddress  = process.env.RESEND_FROM_EMAIL || 'Chandra <onboarding@resend.dev>'

    // ── 1. Single Firestore read: all active subscribers ───────────────────
    const snapshot = await db.collection('subscribers').where('active', '==', true).get()
    if (snapshot.empty) {
      console.log('[Email] No active subscribers. Exiting.')
      return
    }

    const subscribers = []
    snapshot.forEach(d => subscribers.push(d.data()))
    console.log(`[Email] Processing ${subscribers.length} active subscribers.`)

    // ── 2. Group by city to calculate astronomy once per city ───────────────
    const cityGroups = groupBy(subscribers, s => `${s.lat},${s.lon}`)

    const emailBatch = []

    // ── 3. Per-city: calculate day info, build emails ───────────────────────
    for (const [cityKey, citySubs] of Object.entries(cityGroups)) {
      const [lat, lon] = cityKey.split(',').map(Number)
      let dayInfo
      try {
        dayInfo = getDayInfo(now, lat, lon)
      } catch (err) {
        console.error(`[Email] Astronomy error for ${cityKey}:`, err)
        continue
      }

      for (const sub of citySubs) {
        const freq = sub.emailFrequency || 'all'
        let emailContent = null

        if (freq === 'monthly') {
          // Monthly digest — only on the 1st of each month
          if (isFirstOfMonth) {
            const upcoming = getUpcomingFestivals(now, 31)
            emailContent = monthlyDigestEmail({ subscriber: sub, upcomingFestivals: upcoming, date: now })
          }
        } else if (dayInfo.eclipse) {
          // Eclipse: send to 'all' and 'major'
          emailContent = festivalEmail({
            subscriber: sub,
            festival:   null,
            eclipse:    dayInfo.eclipse,
            tithi:      dayInfo.tithi,
            nakshatra:  dayInfo.nakshatra,
            moonrise:   dayInfo.moonrise,
            date:       now,
          })
        } else if (dayInfo.datedFestivals.length > 0) {
          // Major dated festival: send to everyone ('all' and 'major')
          emailContent = festivalEmail({
            subscriber: sub,
            festival:   dayInfo.datedFestivals[0],
            eclipse:    null,
            tithi:      dayInfo.tithi,
            nakshatra:  dayInfo.nakshatra,
            moonrise:   dayInfo.moonrise,
            date:       now,
          })
        } else if (freq === 'all' && dayInfo.festivals.length > 0) {
          // Monthly observances (Ekadashi, Purnima, etc.): only for 'all' subscribers
          emailContent = festivalEmail({
            subscriber: sub,
            festival:   dayInfo.festivals[0],
            eclipse:    null,
            tithi:      dayInfo.tithi,
            nakshatra:  dayInfo.nakshatra,
            moonrise:   dayInfo.moonrise,
            date:       now,
          })
        }

        if (emailContent && sub.email) {
          emailBatch.push({
            from:    fromAddress,
            to:      sub.email,
            subject: emailContent.subject,
            html:    emailContent.html,
          })
        }
      }
    }

    if (emailBatch.length === 0) {
      console.log('[Email] Nothing to send today.')
      return
    }

    // ── 4. Send in batches of 100 (Resend batch API limit) ─────────────────
    let sent = 0
    for (let i = 0; i < emailBatch.length; i += 100) {
      const batch = emailBatch.slice(i, i + 100)
      try {
        await resend.batch.send(batch)
        sent += batch.length
        console.log(`[Email] Sent batch of ${batch.length}. Total so far: ${sent}`)
      } catch (err) {
        console.error(`[Email] Resend batch error (offset ${i}):`, err)
      }
    }

    console.log(`[Email] Done. Sent ${sent} emails.`)
  }
)
