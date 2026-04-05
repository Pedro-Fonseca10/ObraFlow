/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { supabase } from '../lib/supabase'
import type { AuthCredentials, Usuario } from '../models/domain'
import { dataMode, dataService } from '../services/api'
import { getAuthenticatedSupabaseUser } from '../services/supabaseService'

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
    dataMode === 'local'
      ? parseStoredUser(localStorage.getItem(SESSION_KEY))
      : null,
  )
  const [loading, setLoading] = useState(dataMode === 'supabase')

  useEffect(() => {
    if (dataMode !== 'supabase' || !supabase) {
      return
    }

    const supabaseClient = supabase
    let isActive = true

    async function syncAuthenticatedUser() {
      try {
        const authenticatedUser = await getAuthenticatedSupabaseUser()

        if (isActive) {
          setUser(authenticatedUser)
        }
      } catch {
        await supabaseClient.auth.signOut()

        if (isActive) {
          setUser(null)
        }
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }

    void syncAuthenticatedUser()

    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      if (!isActive) {
        return
      }

      if (!session) {
        setUser(null)
        setLoading(false)
        return
      }

      setLoading(true)
      void syncAuthenticatedUser()
    })

    return () => {
      isActive = false
      subscription.unsubscribe()
    }
  }, [])

  const login = useCallback(async (credentials: AuthCredentials) => {
    setLoading(true)

    try {
      const authenticatedUser = await dataService.login(credentials)

      if (dataMode === 'local') {
        localStorage.setItem(SESSION_KEY, JSON.stringify(authenticatedUser))
      }

      setUser(authenticatedUser)
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY)

    if (dataMode === 'supabase' && supabase) {
      setLoading(true)
      void supabase.auth.signOut().finally(() => {
        setUser(null)
        setLoading(false)
      })
      return
    }

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
