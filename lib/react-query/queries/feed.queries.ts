// lib/react-query/queries/feed.queries.ts
'use client'

import { useQuery } from '@tanstack/react-query'
import { feedKeys } from '../keys'
import type { FeedPost } from '@/lib/supabase/types'
import { supabase } from '@/lib/supabase/client'

async function getFeedPosts(): Promise<FeedPost[]> {
  const { data, error } = await supabase
    .from('posts')
    .select(`
      id,
      content,
      created_at,
      profiles (
        id,
        username,
        full_name,
        avatar_url,
        is_verified
      ),
      trade_tags (
        asset_symbol,
        signal_type
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (
    data?.map((post) => {
      const profile = Array.isArray(post.profiles)
        ? post.profiles[0]
        : post.profiles

      const tradeTag = Array.isArray(post.trade_tags)
        ? post.trade_tags[0]
        : post.trade_tags

      return {
        id: post.id,
        content: post.content,
        created_at: post.created_at,
        author: {
          id: profile?.id ?? '',
          username: profile?.username ?? 'unknown',
          full_name: profile?.full_name ?? null,
          avatar_url: profile?.avatar_url ?? null,
          is_verified: profile?.is_verified ?? false
        },
        trade_tag: tradeTag
          ? {
              asset_symbol: tradeTag.asset_symbol,
              signal_type: tradeTag.signal_type
            }
          : null
      }
    }) ?? []
  )
}

export function useGetFeedQuery() {
  return useQuery({
    queryKey: feedKeys.all,
    queryFn: getFeedPosts,
    staleTime: 1000 * 30,
    refetchOnWindowFocus: false
  })
}