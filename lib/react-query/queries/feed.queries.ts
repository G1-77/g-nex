'use client'

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import type { FeedPost } from '@/lib/supabase/types'
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
      assetSymbols,
      signalType,
      profiles:user_id (
        id,
        username,
        full_name,
        avatar_url,
        is_verified,
        monthly_roi
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

  // Pre-cast the raw database data payload array to match our standard baseline models
  const rawPosts = data as unknown as FeedPost[]

  // A. If no user is logged in, map false to all isLikedByCurrentUser flags directly
  if (!currentUserId) {
    const defaultFeed: FeedPost[] = rawPosts.map((post: FeedPost) => ({
      ...post,
      isLikedByCurrentUser: false
    }))
    return defaultFeed
  }

  // B. HIGH PERFORMANCE INDEPENDENT TABLE LOOKUP: Fetch all post IDs liked by this user
  const { data: userLikes, error: likesError } = await supabase
    .from('likes')
    .select('post_id')
    .eq('user_id', currentUserId)

  if (likesError) {
    console.error('Failed to pre-fetch active user interaction states:', likesError.message)
  }

  // Build a high-speed lookup hash Set to map states in O(1) time complexity
  const likedPostIds = new Set(userLikes?.map((l) => l.post_id) ?? [])

  // C. PURE TYPE-SAFE HYDRATION: Statically stamp the true persistent like state onto our feed rows
  const fullyHydratedFeed: FeedPost[] = rawPosts.map((post: FeedPost) => ({
    ...post,
    isLikedByCurrentUser: likedPostIds.has(post.id)
  }))

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
