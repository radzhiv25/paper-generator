import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { getSupabase, isSupabaseConfigured } from '../lib/supabase'

export interface AuthUser {
  id: string
  email: string
  name: string
}

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  isConfigured: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, name: string) => Promise<void>
  signOut: () => Promise<void>
  signInAsGuest: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

const GUEST_KEY = 'paper-generator-guest'

function loadGuest(): AuthUser | null {
  const raw = localStorage.getItem(GUEST_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AuthUser
  } catch {
    return null
  }
}

function saveGuest(user: AuthUser): void {
  localStorage.setItem(GUEST_KEY, JSON.stringify(user))
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() =>
    getSupabase() ? null : loadGuest(),
  )
  const [loading, setLoading] = useState(() => Boolean(getSupabase()))

  useEffect(() => {
    const supabase = getSupabase()
    if (!supabase) return

    supabase.auth.getSession().then(({ data }) => {
      const session = data.session
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email ?? '',
          name:
            (session.user.user_metadata?.name as string) ??
            session.user.email?.split('@')[0] ??
            'Teacher',
        })
      }
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email ?? '',
          name:
            (session.user.user_metadata?.name as string) ??
            session.user.email?.split('@')[0] ??
            'Teacher',
        })
      } else {
        setUser(null)
      }
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const supabase = getSupabase()
    if (!supabase) {
      const guest: AuthUser = { id: 'guest', email, name: email.split('@')[0] }
      saveGuest(guest)
      setUser(guest)
      return
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }, [])

  const signUp = useCallback(
    async (email: string, password: string, name: string) => {
      const supabase = getSupabase()
      if (!supabase) {
        const guest: AuthUser = { id: 'guest', email, name }
        saveGuest(guest)
        setUser(guest)
        return
      }
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      })
      if (error) throw error
    },
    [],
  )

  const signOut = useCallback(async () => {
    const supabase = getSupabase()
    if (supabase) await supabase.auth.signOut()
    localStorage.removeItem(GUEST_KEY)
    setUser(null)
  }, [])

  const signInAsGuest = useCallback(() => {
    const guest: AuthUser = {
      id: 'guest',
      email: 'guest@local.dev',
      name: 'Guest Teacher',
    }
    saveGuest(guest)
    setUser(guest)
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      isConfigured: isSupabaseConfigured,
      signIn,
      signUp,
      signOut,
      signInAsGuest,
    }),
    [user, loading, signIn, signUp, signOut, signInAsGuest],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
