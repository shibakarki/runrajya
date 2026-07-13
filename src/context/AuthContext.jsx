import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // Fetch user profile securely
  async function fetchProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      if (data && !error) {
        setProfile(data)
      }
    } catch (err) {
      console.warn('Could not fetch profile (might be offline):', err)
    }
  }

  useEffect(() => {
    // 1. Get initial session on boot
    async function getInitialSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          setUser(session.user)
          await fetchProfile(session.user.id)
        }
      } catch (err) {
        console.warn('Initial session fetch failed (offline context):', err)
        // If offline, check if we have cached credentials to bypass the loading screen
        try {
          const cachedUser = JSON.parse(localStorage.getItem('runrajya-cached-user'))
          const cachedProfile = JSON.parse(localStorage.getItem('runrajya-cached-profile'))
          if (cachedUser) {
            setUser(cachedUser)
            setProfile(cachedProfile)
          }
        } catch {}
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    // 2. Listen to authentication transitions
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // GUARD: If offline, completely IGNORE token-refresh failures or session invalidations!
      if (!navigator.onLine && !session) {
        console.warn('Ignoring auth state invalidation while offline.')
        return
      }

      if (session) {
        setUser(session.user)
        await fetchProfile(session.user.id)
        // Cache credentials locally for robust offline startup
        localStorage.setItem('runrajya-cached-user', JSON.stringify(session.user))
      } else {
        setUser(null)
        setProfile(null)
        localStorage.removeItem('runrajya-cached-user')
        localStorage.removeItem('runrajya-cached-profile')
      }
      setLoading(false)
    })

    return () => {
      if (subscription) subscription.unsubscribe()
    }
  }, [])

  // Sync profile data to cache whenever username/color updates
  useEffect(() => {
    if (profile) {
      localStorage.setItem('runrajya-cached-profile', JSON.stringify(profile))
    }
  }, [profile])

  async function signOut() {
    setLoading(true)
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    localStorage.removeItem('runrajya-cached-user')
    localStorage.removeItem('runrajya-cached-profile')
    setLoading(false)
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}