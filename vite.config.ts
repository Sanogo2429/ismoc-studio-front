import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  server: {
    // Autorise les URL publiques de localtunnel (*.loca.lt) à joindre le serveur de développement.
    allowedHosts: true,
  },
  // Version de production servie localement (npm run tunnel) : quelques fichiers seulement,
  // bien plus fiable à travers localtunnel que les centaines de modules du serveur de dev.
  preview: {
    // IPv4 explicite : localtunnel joint 127.0.0.1 (le serveur n'écoutait que sur ::1 → « Bad Gateway »).
    host: '127.0.0.1',
    port: 4173,
    strictPort: true,
    allowedHosts: true,
    // Un seul tunnel (site + API sur la même adresse) : les appels à l'API, le temps réel (WebSocket
    // SignalR) et le retour de Google sont relayés vers l'API locale. L'en-tête Host est conservé
    // (changeOrigin: false) : l'API voit l'adresse publique du tunnel (utile pour Google).
    proxy: {
      '/api': { target: 'https://localhost:7060', secure: false },
      '/hubs': { target: 'https://localhost:7060', secure: false, ws: true },
      '/signin-google': { target: 'https://localhost:7060', secure: false },
      '/health': { target: 'https://localhost:7060', secure: false },
    },
  },
  plugins: [
    react(),
    // Application web installable (Chrome / Edge sur ordinateur, « Ajouter à l'écran d'accueil » sur mobile).
    VitePWA({
      registerType: 'autoUpdate',
      // Enregistrement manuel dans src/main.tsx : désactivé dans l'application native Capacitor.
      injectRegister: false,
      // Le manifeste est fourni tel quel dans public/manifest.json (lié depuis index.html).
      manifest: false,
      includeAssets: ['favicon.svg', 'manifest.json', 'icons/*.png', 'icons/*.svg'],
      workbox: {
        // Coquille de l'application mise en cache : chargement instantané et hors ligne pour les pages déjà visitées.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallback: '/index.html',
        // Les appels à l'API et au hub temps réel ne passent jamais par le cache.
        // (ni le retour de Google, ni la sonde de santé). Aucune réponse de l'API n'est mise en cache :
        // les données personnelles ne sont jamais stockées hors ligne sur le téléphone.
        navigateFallbackDenylist: [/^\/api\//, /^\/hubs\//, /^\/signin-google/, /^\/health$/],
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
      devOptions: { enabled: false },
    }),
  ],
})
