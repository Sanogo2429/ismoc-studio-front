import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App'
import { primeCallAudio } from './services/callAudio'
import { initMobileViewport } from './services/mobileViewport'

// Hauteur visible réelle (--app-height) et état du clavier virtuel (<html data-keyboard>) pour le CSS mobile.
initMobileViewport()

// Sonneries d'appel : l'audio est déverrouillé dès le premier toucher / clic sur l'application, pour qu'un
// appel entrant (qui arrive sans geste de l'utilisateur) puisse sonner sur mobile (politiques iOS / Android).
primeCallAudio()

// Service worker PWA : uniquement en production web. L'application native Capacitor embarque déjà ses fichiers.
if (import.meta.env.PROD && !Capacitor.isNativePlatform()) {
  registerSW({ immediate: true })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
