'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { feedKeys } from '../keys'

export interface ToggleFollowPayload {
  followerId: string
  followingId: string
}

// =========================================================================
// 🟢 FIXED: REMOVED REDUNDANT FRONTEND NOTIFICATION INSERT
// The database trigger handles the notification row creation natively.
// =========================================================================
async function toggleFollowRelationship({ followerId, followingId }: ToggleFollowPayload) {
  // A. Check if an active social follow connection link already exists inside the database rows
  const { data: existingFollow, error: fetchError } = await supabase
    .from('follows')
    .select('id')
    .eq('follower_id', followerId)
    .eq('following_id', followingId)
    .maybeSingle()

  if (fetchError) {
    throw new Error(fetchError.message)
  }

  if (existingFollow) {
    // UNFOLLOW ROUTE: Cleanly delete the relational constraint mapping row
    const { error: deleteError } = await supabase
      .from('follows')
      .delete()
      .eq('id', existingFollow.id)

    if (deleteError) {
      throw new Error(deleteError.message)
    }
    return { followed: false }
  } else {
    // FOLLOW ROUTE: Insert a fresh relationship identifier tracking row
    const { error: insertError } = await supabase
      .from('follows')
      .insert({
        follower_id: followerId,
        following_id: followingId
      })

    if (insertError) {
      throw new Error(insertError.message)
    }

    return { followed: true }
  }
}

export function useToggleFollowMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: toggleFollowRelationship,
    onSuccess: () => {
      // Forceful background cache invalidation sweeps to keep follow metrics perfectly in sync
      queryClient.invalidateQueries({
        queryKey: feedKeys.all,
        exact: false,
        refetchType: 'all'
      })
    },
    onError: (error: Error) => {
      console.error('GNEX Social Connection Handshake Exception:', error.message)
      alert(`Relationship sync failed: ${error.message}`)
    }
  })
}
