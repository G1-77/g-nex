'use client'

import { useEffect, useState } from 'react'

import { supabase } from '@/lib/supabase/client'

import type {
  AdminRoleType,
  Profile,
} from '@/lib/supabase/types'

interface UseUserIdentityReturn {
  profile: Profile | null

  role: AdminRoleType | null

  isLoading: boolean

  isSuperAdmin: boolean

  isAdmin: boolean

  isSupport: boolean

  isEditor: boolean

  isStaff: boolean
}

export function useUserIdentity(): UseUserIdentityReturn {
  const [profile, setProfile] =
    useState<Profile | null>(null)

  const [role, setRole] =
    useState<AdminRoleType | null>(null)

  const [isLoading, setIsLoading] =
    useState(true)

  useEffect(() => {
    const loadIdentity = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          setIsLoading(false)
          return
        }
        //Profile metrics from profiles
        const { data: profileData } =
          await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()
            
        //Cross reference user ID with admin_roles table
        const { data: roleData } =
          await supabase
            .from('admin_roles')
            .select('role')
            .eq('user_id', user.id)
            .maybeSingle()

        setProfile(profileData)

        setRole(
          roleData?.role ?? null
        )
      } catch (error) {
        console.error(error)
      } finally {
        setIsLoading(false)
      }
    }

    loadIdentity()
  }, [])

  return {
    profile,
    role,
    isLoading,

    isSuperAdmin:
      role === 'super_admin',

    isAdmin:
      role === 'admin',

    isSupport:
      role === 'support',

    isEditor:
      role === 'editor',

    isStaff:
      role !== null,
  }
}