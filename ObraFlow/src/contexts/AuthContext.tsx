/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { AuthCredentials, Usuario } from '../models/domain'
import { dataMode, dataService } from '../services/api'

interface AuthContextValue {
  user: Usuario | null
  loading: boolean
  dataMode: 'supabase' | 'local'
  login: (credentials: AuthCredentials) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const SESSION_KEY = 'obraflow_session_v1'

function parseStoredUser(value: string | null): Usuario | null {
  if (!value) {
    return null
  }

  try {
    return JSON.parse(value) as Usuario
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Usuario | null>(() =>
    parseStoredUser(localStorage.getItem(SESSION_KEY)),
  )
  const loading = false

  const login = useCallback(async (credentials: AuthCredentials) => {
    const authenticatedUser = await dataService.login(credentials)
    localStorage.setItem(SESSION_KEY, JSON.stringify(authenticatedUser))
    setUser(authenticatedUser)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY)
    setUser(null)
  }, [])

  const contextValue = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      dataMode,
      login,
      logout,
    }),
    [user, loading, login, logout],
  )

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider.')
  }

  return context
}
