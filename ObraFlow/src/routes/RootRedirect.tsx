import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function RootRedirect() {
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

  if (user.perfil === 'gestor') {
    return <Navigate to="/gestor/dashboard" replace />
  }

  return <Navigate to="/funcionario/atividades" replace />
}
