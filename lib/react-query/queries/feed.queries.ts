'use client'

import { useInfiniteQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import type { FeedPost, SupabaseFeedPostRow } from '@/lib/supabase/types'
import { feedKeys } from '../keys'

const PAGE_SIZE = 10

// 🟢 FIXED: Converted to a paginated offset cursor function targeting explicit range arrays
async function getFeedPage(
  currentUserId: string | null,
  pageParam: number
): Promise<{ posts: FeedPost[]; nextPage: number | null }> {
  const startOffset = pageParam * PAGE_SIZE
  const endOffset = startOffset + PAGE_SIZE - 1

  // 1. Fetch exact row segments matching our paginated cursor parameters
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
    .range(startOffset, endOffset)

  if (error) {
    throw new Error(error.message)
  }

  if (!data || data.length === 0) {
    return { posts: [], nextPage: null }
  }

  const rawRows = data as unknown as SupabaseFeedPostRow[]

  // 2. High-speed lookup map configuration batch for followers counters
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

  // 3. Fetch liked posts matching the active user session token key
  const { data: userLikes } = currentUserId
    ? await supabase.from('likes').select('post_id').eq('user_id', currentUserId)
    : { data: null }

  const likedPostIds = new Set(userLikes?.map((l) => l.post_id) ?? [])

  // 4. Map true database persistence flags natively into the page payload records
  const hydratedPosts: FeedPost[] = rawRows.map((row: SupabaseFeedPostRow) => {
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
    } as unknown as FeedPost
  })

  // Determine if more records exist further down the table matrix array to trigger next page param offsets
  const hasNextPage = data.length === PAGE_SIZE
  const nextPageParam = hasNextPage ? pageParam + 1 : null

  return {
    posts: hydratedPosts,
    nextPage: nextPageParam,
  }
}

export function useGetInfiniteFeedQuery(currentUserId: string | null) {
  return useInfiniteQuery({
    // Include user session identifiers within key list to handle accounts toggling safely
    queryKey: [...feedKeys.all, 'infinite', currentUserId],
    queryFn: ({ pageParam = 0 }) => getFeedPage(currentUserId, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    staleTime: 1000 * 10,
    refetchOnWindowFocus: false,
  })
}
