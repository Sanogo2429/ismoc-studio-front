import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { loginPathFor } from '../services/session'

function ProtectedRoute() {
  const token = localStorage.getItem('token')
  const location = useLocation()

  // Non connecté : connexion, puis retour sur la page demandée (lien partagé, secteur choisi sur l'accueil…).
  return token ? <Outlet /> : <Navigate replace to={loginPathFor(location.pathname + location.search)} />
}

export default ProtectedRoute