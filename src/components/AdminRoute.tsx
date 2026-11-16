import { Navigate, Outlet } from 'react-router-dom'
import { hasValidSession, isAdmin } from '../services/session'

/** Garde du back-office : non connecté → /connexion ; connecté sans rôle Admin → /dashboard. */
function AdminRoute() {
  if (!hasValidSession()) return <Navigate replace to="/connexion" />
  if (!isAdmin()) return <Navigate replace to="/dashboard" />
  return <Outlet />
}

export default AdminRoute
