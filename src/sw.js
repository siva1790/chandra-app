import { precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'

// ── Precache app shell (manifest injected by vite-plugin-pwa at build time) ──
precacheAndRoute(self.__WB_MANIFEST)

// ── SPA fallback — all navigation requests serve index.html from cache ──
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')))

// ── Take control of existing clients immediately on update ──
self.skipWaiting()
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()))

// ── FCM Push Notification Handler ────────────────────────────────────────────
// Firebase Cloud Messaging sends a push event to this SW.
// The payload contains { title, body, icon, data }.
self.addEventListener('push', (event) => {
  if (!event.data) return
  let payload
  try { payload = event.data.json() } catch { return }

  const notification = payload.notification || {}
  const data = payload.data || notification.data || {}
  const title = payload.title || notification.title
  const body = payload.body || notification.body
  const icon = payload.icon || notification.icon
  event.waitUntil(
    self.registration.showNotification(title || 'Chandra', {
      body:               body || '',
      icon:               icon || '/icons/icon-192.png',
      badge:              '/icons/icon-72.png',
      data:               data || {},
      vibrate:            [200, 100, 200],
      requireInteraction: false,
    })
  )
})

// ── Notification Click Handler ────────────────────────────────────────────────
// Focus an existing Chandra tab, or open a new one.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = event.notification.data?.url || '/'
  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(windowClients => {
        const existing = windowClients.find(c =>
          c.url.startsWith(self.location.origin)
        )
        if (existing) {
          existing.focus()
          return existing.navigate(targetUrl)
        }
        return clients.openWindow(targetUrl)
      })
  )
})
