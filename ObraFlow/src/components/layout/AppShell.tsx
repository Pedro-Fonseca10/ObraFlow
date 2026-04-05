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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.12),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.1),_transparent_28%),linear-gradient(180deg,_#f8fafc_0%,_#f1f5f9_100%)]">
      <header className="mx-auto w-full max-w-7xl px-4 pt-4 md:px-8 md:pt-6">
        <div className="rounded-[30px] border border-slate-200/80 bg-white/80 px-4 py-4 shadow-xl shadow-slate-900/5 backdrop-blur-xl md:px-6">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-start gap-4">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-slate-950 text-sm font-black uppercase tracking-[0.24em] text-white shadow-lg shadow-slate-950/20">
                OF
              </div>

              <div>
                <p className="font-heading text-2xl font-black uppercase tracking-[0.16em] text-slate-950">
                  ObraFlow
                </p>
                <p className="mt-1 max-w-md text-sm leading-6 text-slate-600">
                  Gestão operacional de mão de obra com leitura diária por perfil.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 xl:justify-end">
              <span className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">
                {user.nome}
              </span>
              <span className="rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700">
                Perfil: {user.perfil}
              </span>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
                Dados: {dataMode === 'supabase' ? 'Supabase' : 'Local Demo'}
              </span>
              <button
                type="button"
                onClick={logout}
                className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900"
              >
                Sair
              </button>
            </div>
          </div>

          <nav className="mt-6 flex flex-wrap gap-2 border-t border-slate-200 pt-4">
            {navigation.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                    isActive
                      ? 'bg-slate-950 text-white shadow-lg shadow-slate-950/10'
                      : 'bg-slate-100/80 text-slate-600 hover:bg-white hover:text-slate-900'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-8">
        <Outlet />
      </main>
    </div>
  )
}
