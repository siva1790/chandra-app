import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Vite's SPA fallback otherwise serves the homepage for this extensionless URL.
// Keep development/preview aligned with the explicit Vercel rewrite.
const publicPageRoutes = () => {
  const configure = (server) => {
    server.middlewares.use((req, res, next) => {
      const [pathname, query] = (req.url || '').split('?')
      if (/^\/panchang\/bengaluru\/?$/.test(pathname)) {
        req.url = `/panchang/bengaluru/index.html${query ? `?${query}` : ''}`
      } else if (pathname.startsWith('/panchang/') && pathname !== '/panchang/bengaluru/index.html') {
        res.statusCode = 404
        res.end('Page not found')
        return
      }
      next()
    })
  }
  return { name: 'chandra-public-routes', configureServer: configure, configurePreviewServer: configure }
}

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        bengaluru: 'panchang/bengaluru/index.html',
      },
      output: {
        entryFileNames: 'assets/[name]-[hash]-r2.js',
        chunkFileNames: 'assets/[name]-[hash]-r2.js',
        assetFileNames: 'assets/[name]-[hash]-r2[extname]',
      },
    },
  },
  plugins: [
    publicPageRoutes(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: null,
      // injectManifest lets us write a custom sw.js that handles both
      // Workbox precaching AND FCM push events in one file.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      manifest: false,
      injectManifest: {
        // Only precache the app shell
        globPatterns: ['index.html', 'assets/**/*.{js,css}'],
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    })
  ]
})
