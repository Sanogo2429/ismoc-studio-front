import { Navigate, Outlet } from 'react-router-dom'

function ProtectedRoute() {
  const token = localStorage.getItem('token')

  return token ? <Outlet /> : <Navigate replace to="/connexion" />
}

export default ProtectedRoute