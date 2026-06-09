'use client'

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import type { FeedPost, SupabaseFeedPostRow } from '@/lib/supabase/types' // 🟢 Imported our fresh centralized types
import { feedKeys } from '../keys'

// Accepts currentUserId straight from the component layer parameter stream
async function getFeedPosts(currentUserId: string | null): Promise<FeedPost[]> {
  const { data, error } = await supabase
    .from('posts')
    .select(`
      id,
      content,
      created_at,
      media_url,
      likes_count,
      comments_count,
      shares_count,
      assetSymbols,
      signalType,
      profiles:user_id (
        id,
        username,
        full_name,
        avatar_url,
        is_verified,
        monthly_roi,
        follows!following_id (count) -- 🟢 Fetches the computed follower counts array block natively
      ),
      trade_tags (
        asset_symbol,
        signal_type,
        price,
        change,
        direction
      )
    `)
    .order('created_at', {
      ascending: false,
    })

  if (error) {
    throw new Error(error.message)
  }

  if (!data) return []

  // Pre-cast the raw database response array to match our strict structural contract row
  const rawRows = data as unknown as SupabaseFeedPostRow[]

  // A. HIGH PERFORMANCE INDEPENDENT TABLE LOOKUP: Fetch all post IDs liked by this user
  const { data: userLikes, error: likesError } = currentUserId
    ? await supabase.from('likes').select('post_id').eq('user_id', currentUserId)
    : { data: null, error: null }

  if (likesError) {
    console.error('Failed to pre-fetch active user interaction states:', likesError.message)
  }

  // Build a high-speed lookup hash Set to map states in O(1) time complexity
  const likedPostIds = new Set(userLikes?.map((l) => l.post_id) ?? [])

  // B. PURE TYPE-SAFE HYDRATION: Statically stamp persistent likes, follower counts, and badges
  const fullyHydratedFeed: FeedPost[] = rawRows.map((row: SupabaseFeedPostRow) => {
    const followsData = row.profiles?.follows
    
    // Extract the calculated counts out of the PostgREST array envelope cleanly
    const calculatedFollowersCount = followsData && followsData.length > 0
      ? Number(followsData[0]?.count ?? 0)
      : 0

    // 🟢 COMPREHENSIVE RULES CORE: Auto-verifies if they hit 100 followers OR have an elite ROI > 15%
    const shouldBeVerified = Boolean(
      row.profiles?.is_verified || 
      (row.profiles?.monthly_roi ?? 0) > 15 || 
      calculatedFollowersCount >= 100
    )

    return {
      id: row.id,
      content: row.content,
      created_at: row.created_at,
      media_url: row.media_url,
      likes_count: row.likes_count,
      comments_count: row.comments_count,
      shares_count: row.shares_count,
      assetSymbols: row.assetSymbols,
      signalType: row.signalType,
      trade_tags: row.trade_tags,
      isLikedByCurrentUser: likedPostIds.has(row.id),
      profiles: row.profiles
        ? {
            id: row.profiles.id,
            username: row.profiles.username,
            full_name: row.profiles.full_name,
            avatar_url: row.profiles.avatar_url,
            is_verified: shouldBeVerified, // Dynamic evaluation
            monthly_roi: row.profiles.monthly_roi,
            bio: row.profiles.bio,
            followers_count: calculatedFollowersCount, // Injected into our central interface footprint
          }
        : null,
    } as unknown as FeedPost
  })

  return fullyHydratedFeed
}

export function useGetFeedQuery(currentUserId: string | null) {
  return useQuery({
    // Append currentUserId to the queryKey tracking signature template.
    // This tells TanStack Query to automatically drop and refresh the caching window 
    // whenever a user switches accounts or explicitly triggers a login/logout cycle.
    queryKey: [...feedKeys.all, currentUserId],
    queryFn: () => getFeedPosts(currentUserId),
    staleTime: 1000 * 10, // 10 seconds cache boundary validity
    refetchOnWindowFocus: false,
  })
}
