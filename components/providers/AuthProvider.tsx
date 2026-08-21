'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import { AdminRoleType, Profile, TraderReputation } from '@/lib/supabase/types'
import type { PermissionCode } from '@/lib/admin/permissions'

interface AuthContextType {
  user: User | null
  profile: Profile | null
  role: AdminRoleType | null
  permissions: PermissionCode[]
  reputation: TraderReputation | null
  isLoading: boolean
  isSuperAdmin: boolean
  isAdmin: boolean
  isSupport: boolean
  isEditor: boolean
  isStaff: boolean
  can: (permission: PermissionCode) => boolean
  canAccessAdmin: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const KNOWN_PERMISSIONS: string[] = [
  "users.read","users.manage","deposits.read","deposits.approve","withdrawals.read",
  "withdrawals.process","transactions.read","orders.read","community.moderate",
  "community.report_review","content.manage","content.publish","market.manage",
  "admins.manage","permissions.manage","settings.manage","audit.read","data.delete",
]

function normalizePermissions(raw: unknown): PermissionCode[] {
  if (!Array.isArray(raw)) return []
  return raw.filter(
    (p): p is PermissionCode => typeof p === 'string' && KNOWN_PERMISSIONS.includes(p)
  )
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [role, setRole] = useState<AdminRoleType | null>(null)
  const [permissions, setPermissions] = useState<PermissionCode[]>([])
  const [reputation, setReputation] = useState<TraderReputation | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  async function syncIdentity(activeUser: User) {
    setUser(activeUser)
    setProfile(null)
    setRole(null)
    setPermissions([])
    setReputation(null)

    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', activeUser.id)
        .maybeSingle()

      const { data: roleData } = await supabase
        .from('admin_roles')
        .select('role, permissions')
        .eq('user_id', activeUser.id)
        .maybeSingle()

      const { data: reputationData } = await supabase
        .from('trader_reputation')
        .select('*')
        .eq('user_id', activeUser.id)
        .maybeSingle()

      if (profileData) setProfile(profileData as Profile)
      if (roleData) {
        setRole(roleData.role as AdminRoleType)
        setPermissions(normalizePermissions(roleData.permissions))
      }
      if (reputationData) setReputation(reputationData as TraderReputation)
    } catch (err) {
      console.error('Identity parsing failure:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let isMounted = true

    // 🟢 CLEAN SINGLE-RESPONSIBILITY COMPONENT HYDRATOR
    // We completely stripped out 'syncSessionAction' calls from here.
    // Our Server Middleware handles cookies; this listener handles ONLY front-end component state!
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return

      if (session?.user) {
        // Safely fetch database profile and roles records out of memory caches cleanly
        await syncIdentity(session.user)
      } else {
        // Handle guest dropbacks when no token is present
        setUser(null)
        setProfile(null)
        setRole(null)
        setIsLoading(false)
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, []) // Empty dependencies array ensures this listener mounts exactly once on page boot




  const value: AuthContextType = {
    user,
    profile,
    role,
    permissions,
    reputation,
    isLoading,
    isSuperAdmin: role === 'super_admin',
    isAdmin: role === 'admin',
    isSupport: role === 'support',
    isEditor: role === 'editor',
    isStaff: role !== null,
    can: (permission) => permissions.includes(permission),
    canAccessAdmin: role !== null && permissions.length > 0,
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
