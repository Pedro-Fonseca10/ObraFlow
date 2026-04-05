import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { LoginPage } from '../pages/LoginPage'
import { ActivitiesPage } from '../pages/manager/ActivitiesPage'
import { AssignmentsPage } from '../pages/manager/AssignmentsPage'
import { DashboardPage } from '../pages/manager/DashboardPage'
import { EmployeesPage } from '../pages/manager/EmployeesPage'
import { AbsencesPage } from '../pages/manager/AbsencesPage'
import { MyActivitiesPage } from '../pages/worker/MyActivitiesPage'
import { ProtectedRoute } from './ProtectedRoute'
import { RootRedirect } from './RootRedirect'

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute allowedRole="gestor" />}>
        <Route element={<AppShell />}>
          <Route path="/gestor/dashboard" element={<DashboardPage />} />
          <Route path="/gestor/funcionarios" element={<EmployeesPage />} />
          <Route path="/gestor/atividades" element={<ActivitiesPage />} />
          <Route path="/gestor/atribuicoes" element={<AssignmentsPage />} />
          <Route path="/gestor/faltas" element={<AbsencesPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRole="funcionario" />}>
        <Route element={<AppShell />}>
          <Route
            path="/funcionario/atividades"
            element={<MyActivitiesPage />}
          />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
