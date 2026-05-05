import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: null,
      devOptions: {
        enabled: true
      },
      manifest: false,
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        // Only precache the app shell — broad globs caused SW install failures
        // when any matched file returned a non-200 response during precaching
        globPatterns: ['index.html', 'assets/**/*.{js,css}'],
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365
              }
            }
          }
        ]
      }
    })
  ]
})