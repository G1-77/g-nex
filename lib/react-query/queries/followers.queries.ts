'use client'

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import type { Profile } from '@/lib/supabase/types'

export const followerKeys = {
  all: ['followers'] as const,
  byUser: (userId: string) => [...followerKeys.all, userId] as const,
  following: (userId: string) => [...followerKeys.all, 'following', userId] as const,
}

// Two-step fetch: resolve follower ids from the follows table, then pull
// their profile rows. Avoids depending on the exact foreign-key constraint
// name used for a single nested select join.
async function fetchFollowers(userId: string): Promise<Profile[]> {
  if (!userId) return []

  const { data: followRows, error: followError } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('following_id', userId)

  if (followError) {
    throw new Error(followError.message)
  }

  const followerIds = followRows?.map((r) => r.follower_id).filter(Boolean) ?? []

  if (followerIds.length === 0) return []

  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, username, full_name, avatar_url, is_verified, monthly_roi')
    .in('id', followerIds)

  if (profileError) {
    throw new Error(profileError.message)
  }

  return (profiles as Profile[]) ?? []
}

export function useGetFollowersQuery(userId: string) {
  return useQuery({
    queryKey: followerKeys.byUser(userId),
    queryFn: () => fetchFollowers(userId),
    enabled: Boolean(userId),
    staleTime: 1000 * 30,
    refetchOnWindowFocus: false,
  })
}

// The set of profiles the given user follows. Source of truth for follow
// buttons so an already-followed trader never renders as "Follow" again.
async function fetchFollowingIds(userId: string): Promise<string[]> {
  if (!userId) return []

  const { data, error } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', userId)

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map((row) => row.following_id).filter(Boolean)
}

export function useFollowingIdsQuery(userId: string | null) {
  return useQuery({
    queryKey: followerKeys.following(userId ?? ''),
    queryFn: () => fetchFollowingIds(userId ?? ''),
    enabled: Boolean(userId),
    staleTime: 1000 * 30,
    refetchOnWindowFocus: false,
  })
}