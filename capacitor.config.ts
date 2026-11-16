import type { CapacitorConfig } from '@capacitor/cli'

/**
 * Application mobile native IsMoc Studio (Android / iOS) : embarque le build Vite (dossier dist).
 * Avant `npm run build:mobile`, définir VITE_API_BASE_URL (fichier .env.production) vers l'API accessible
 * depuis le téléphone : « https://localhost:7060 » désigne le téléphone lui-même, pas le poste de développement.
 */
const config: CapacitorConfig = {
  appId: 'com.ismoc.studio',
  appName: 'IsMoc Studio',
  webDir: 'dist',
  server: {
    // Origine de l'application Android : https://localhost (à autoriser dans le CORS de l'API).
    androidScheme: 'https',
  },
}

export default config
