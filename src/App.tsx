import HomePage from './pages/HomePage'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AuthPage from './pages/AuthPage'
import LegalPage from './pages/LegalPage'
import DashboardPage from './pages/DashboardPage'
import ProjectConfigurator from './pages/ProjectConfigurator'
import MvpPreviewPage from './pages/MvpPreviewPage'
import CheckoutPage from './pages/CheckoutPage'
import ClientProjectDashboard from './pages/ClientProjectDashboard'
import AdminPage from './pages/AdminPage'
import AdminRoute from './components/AdminRoute'
import ProtectedRoute from './components/ProtectedRoute'
import ScrollToTop from './components/ScrollToTop'
import OfflineBanner from './components/OfflineBanner'

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      {/* Réseau perdu : bandeau discret « Vous êtes hors ligne » sur toutes les pages. */}
      <OfflineBanner />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="/connexion" element={<AuthPage />} />
        <Route path="/inscription" element={<AuthPage />} />
        {/* Pages légales publiques (contenu à compléter dans src/config/legal.ts). */}
        <Route path="/mentions-legales" element={<LegalPage doc="mentions" />} />
        <Route path="/cgv" element={<LegalPage doc="cgv" />} />
        <Route path="/confidentialite" element={<LegalPage doc="confidentialite" />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          {/* Alias lisible de l'espace client (« Mon espace ») */}
          <Route path="/client-space" element={<Navigate replace to="/dashboard" />} />
          <Route path="/configurator" element={<ProjectConfigurator />} />
          <Route path="/configurator/preview" element={<MvpPreviewPage />} />
          <Route path="/configurator/checkout" element={<CheckoutPage />} />
          <Route path="/client/project/:projectId" element={<ClientProjectDashboard />} />
        </Route>
        {/* Back-office agence : réservé au rôle Admin */}
        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<AdminPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App