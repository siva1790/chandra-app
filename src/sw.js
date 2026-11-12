import { precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { getPublicPanchangCityFromPath } from './publicPanchangCities.js'

// ── Precache app shell (manifest injected by vite-plugin-pwa at build time) ──
precacheAndRoute(self.__WB_MANIFEST)

// Keep the public city page separate from the personalised app shell.
// The network refreshes the HTML snapshot; cached HTML is an offline fallback.
registerRoute(
  ({ request, url }) => request.mode === 'navigate' && Boolean(getPublicPanchangCityFromPath(url.pathname)),
  async ({ request }) => {
    try {
      const response = await fetch(request)
      // Storage may be unavailable or full; a successful network page still works.
      if (response.ok) {
        try {
          const cache = await caches.open('chandra-public-pages-v1')
          await cache.put(request, response.clone())
        } catch { /* Offline caching is best effort. */ }
      }
      return response
    } catch {
      return await caches.match(request, { cacheName: 'chandra-public-pages-v1' }) || Response.error()
    }
  },
)

// ── SPA fallback — only the root belongs to the existing app ──
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html'), {
  allowlist: [/^\/$/],
}))

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
