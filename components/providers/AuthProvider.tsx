'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import { AdminRoleType, Profile } from '@/lib/supabase/types'

interface AuthContextType {
  user: User | null
  profile: Profile | null
  role: AdminRoleType | null
  isLoading: boolean
  isSuperAdmin: boolean
  isAdmin: boolean
  isSupport: boolean
  isEditor: boolean
  isStaff: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [role, setRole] = useState<AdminRoleType | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  async function syncIdentity(activeUser: User) {
    setUser(activeUser)
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', activeUser.id)
        .maybeSingle()

      const { data: roleData } = await supabase
        .from('admin_roles')
        .select('role')
        .eq('user_id', activeUser.id)
        .maybeSingle()

      if (profileData) setProfile(profileData as Profile)
      if (roleData) setRole(roleData.role as AdminRoleType)
    } catch (err) {
      console.error('Identity parsing failure:', err)
    } finally {
      setIsLoading(false)
    }
  }
  useEffect(() => {
    async function initializeSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          await syncIdentity(session.user)
        } else {
          setIsLoading(false)
        }
      } catch (err) {
        console.error('Session initialization error:', err)
        setIsLoading(false)
      }
    }

    initializeSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        await syncIdentity(session.user)
      } else {
        setUser(null)
        setProfile(null)
        setRole(null)
        setIsLoading(false)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])


  const value: AuthContextType = {
    user,
    profile,
    role,
    isLoading,
    isSuperAdmin: role === 'super_admin',
    isAdmin: role === 'admin',
    isSupport: role === 'support',
    isEditor: role === 'editor',
    isStaff: role !== null
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be executed within an explicit AuthProvider wrapper node context block')
  }
  return context
}
