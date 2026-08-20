'use client'

import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import type { FeedPost, SupabaseFeedPostRow } from '@/lib/supabase/types'
import { normalizeTradeTags } from '@/lib/supabase/types'
import { feedKeys } from '../keys'

const PAGE_SIZE = 10

const POST_SELECT = `
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
    monthly_roi,
    trader_reputation (
      user_id,
      status,
      score
    )
  ),
  trade_tags (
    asset_symbol,
    signal_type,
    price,
    change,
    direction
  )
`

/**
 * Enrich raw post rows into the component-facing FeedPost shape:
 * follower counts, effective verification, per-session like flags and
 * reputation fields sourced from the nested trader_reputation row.
 */
export async function hydrateFeedRows(
  rawRows: SupabaseFeedPostRow[],
  currentUserId: string | null
): Promise<FeedPost[]> {
  // 1. High-speed lookup map configuration batch for followers counters
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

  // 2. Fetch liked posts matching the active user session token key
  const { data: userLikes } = currentUserId
    ? await supabase.from('likes').select('post_id').eq('user_id', currentUserId)
    : { data: null }

  const likedPostIds = new Set(userLikes?.map((l) => l.post_id) ?? [])

  // 2b. Fetch follow rows initiated by the current session to tag each author
  // with a persistent isFollowingByViewer boolean state check.
  const { data: userFollows } = currentUserId
    ? await supabase.from('follows').select('following_id').eq('follower_id', currentUserId)
    : { data: null }

  const followedAuthorIds = new Set(userFollows?.map((f) => f.following_id) ?? [])

  // 3. Map true database persistence flags natively into the page payload records
  return rawRows.map((row: SupabaseFeedPostRow): FeedPost => {
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
      trade_tags: normalizeTradeTags(row.trade_tags),
      isLikedByCurrentUser: likedPostIds.has(row.id),
      profiles: row.profiles
        ? {
            ...row.profiles,
            is_verified: shouldBeVerified,
            followers_count: calculatedFollowersCount,
            isFollowingByViewer: followedAuthorIds.has(authorId),
            reputation_status:
              normalizeTradeTags(row.profiles?.trader_reputation)?.status ?? null,
            reputation_score:
              normalizeTradeTags(row.profiles?.trader_reputation)?.score ?? null,
          }
        : null,
    } as unknown as FeedPost
  })
}

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
    .select(POST_SELECT)
    .order('created_at', { ascending: false })
    .range(startOffset, endOffset)

  if (error) {
    throw new Error(error.message)
  }

  if (!data || data.length === 0) {
    return { posts: [], nextPage: null }
  }

  const hydratedPosts = await hydrateFeedRows(
    data as unknown as SupabaseFeedPostRow[],
    currentUserId
  )

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

/** Fetch one author's posts for the profile page, newest first. */
async function getUserPosts(
  authorUserId: string,
  currentUserId: string | null
): Promise<FeedPost[]> {
  const { data, error } = await supabase
    .from('posts')
    .select(POST_SELECT)
    .eq('user_id', authorUserId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  if (!data || data.length === 0) {
    return []
  }

  return hydrateFeedRows(data as unknown as SupabaseFeedPostRow[], currentUserId)
}

export function useGetUserPostsQuery(
  authorUserId: string | null,
  currentUserId: string | null
) {
  return useQuery({
    queryKey: [...feedKeys.all, 'user', authorUserId, currentUserId],
    queryFn: () => getUserPosts(authorUserId!, currentUserId),
    enabled: !!authorUserId,
    staleTime: 1000 * 10,
    refetchOnWindowFocus: false,
  })
}