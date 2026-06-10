'use client'

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import type { FeedPost, SupabaseFeedPostRow } from '@/lib/supabase/types'
import { feedKeys } from '../keys'

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
      profiles:profiles!user_id (
        id,
        username,
        full_name,
        avatar_url,
        bio,
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
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  if (!data) return []

  // Cast directly using your centrally declared Supabase response type contract
  const rawRows = data as unknown as SupabaseFeedPostRow[]

  // High-speed lookup map configuration batch for followers counters
  const { data: globalFollows } = await supabase
    .from('follows')
    .select('following_id')

  const followerCountMap = new Map<string, number>()
  globalFollows?.forEach((follow) => {
    if (follow.following_id) {
      const currentCount = followerCountMap.get(follow.following_id) || 0
      followerCountMap.set(follow.following_id, currentCount + 1)
    }
  })

  // Fetch liked posts matching the active user session token key
  const { data: userLikes } = currentUserId
    ? await supabase.from('likes').select('post_id').eq('user_id', currentUserId)
    : { data: null }

  const likedPostIds = new Set(userLikes?.map((l) => l.post_id) ?? [])

  // Map true database persistence flags natively into the return array parameters
  const fullyHydratedFeed: FeedPost[] = rawRows.map((row: SupabaseFeedPostRow) => {
    const authorId = row.profiles?.id || ''
    const calculatedFollowersCount = followerCountMap.get(authorId) || 0

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
            ...row.profiles,
            is_verified: shouldBeVerified,
            followers_count: calculatedFollowersCount,
          }
        : null,
    } as unknown as FeedPost // Type-safe cast satisfying our core list expectations
  })

  return fullyHydratedFeed
}

export function useGetFeedQuery(currentUserId: string | null) {
  return useQuery({
    queryKey: [...feedKeys.all, currentUserId],
    queryFn: () => getFeedPosts(currentUserId),
    staleTime: 1000 * 10,
    refetchOnWindowFocus: false,
  })
}
