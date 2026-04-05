import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

interface NavigationItem {
  label: string
  to: string
}

const managerNavigation: NavigationItem[] = [
  { label: 'Dashboard', to: '/gestor/dashboard' },
  { label: 'Funcionários', to: '/gestor/funcionarios' },
  { label: 'Atividades', to: '/gestor/atividades' },
  { label: 'Atribuições', to: '/gestor/atribuicoes' },
  { label: 'Faltas', to: '/gestor/faltas' },
]

const workerNavigation: NavigationItem[] = [
  { label: 'Minhas Atividades', to: '/funcionario/atividades' },
]

export function AppShell() {
  const { user, logout, dataMode } = useAuth()

  if (!user) {
    return null
  }

  const navigation =
    user.perfil === 'gestor' ? managerNavigation : workerNavigation

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#dbeafe,_transparent_35%),radial-gradient(circle_at_bottom_right,_#dcfce7,_transparent_30%),#f8fafc]">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-8">
          <div>
            <p className="font-heading text-2xl font-black uppercase tracking-wide text-slate-900">
              ObraFlow
            </p>
            <p className="text-sm text-slate-600">
              Gestão operacional de mão de obra
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-full border border-slate-300 bg-slate-100 px-3 py-1 font-semibold text-slate-700">
              {user.nome}
            </span>
            <span className="rounded-full border border-blue-300 bg-blue-100 px-3 py-1 font-semibold text-blue-800">
              Perfil: {user.perfil}
            </span>
            <span className="rounded-full border border-violet-300 bg-violet-100 px-3 py-1 font-semibold text-violet-800">
              Dados: {dataMode === 'supabase' ? 'Supabase' : 'Local Demo'}
            </span>
            <button
              type="button"
              onClick={logout}
              className="rounded-full border border-slate-300 bg-white px-4 py-1.5 font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
            >
              Sair
            </button>
          </div>
        </div>

        <nav className="mx-auto flex w-full max-w-7xl flex-wrap gap-2 px-4 pb-4 md:px-8">
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  isActive
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-300 bg-white text-slate-700 hover:border-slate-500 hover:text-slate-900'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-8">
        <Outlet />
      </main>
    </div>
  )
}
