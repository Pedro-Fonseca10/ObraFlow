import { Navigate, Outlet } from 'react-router-dom'
import type { PerfilUsuario } from '../models/domain'
import { useAuth } from '../contexts/AuthContext'

interface ProtectedRouteProps {
  allowedRole?: PerfilUsuario
}

function routeByRole(role: PerfilUsuario): string {
  return role === 'gestor' ? '/gestor/dashboard' : '/funcionario/atividades'
}

export function ProtectedRoute({ allowedRole }: ProtectedRouteProps) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-700">
        Carregando...
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (allowedRole && user.perfil !== allowedRole) {
    return <Navigate to={routeByRole(user.perfil)} replace />
  }

  return <Outlet />
}
