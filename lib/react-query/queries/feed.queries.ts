'use client'

import { useQuery } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase/client'
import type { FeedPost } from '@/lib/supabase/types'

import { feedKeys } from '../keys'

async function getFeedPosts(): Promise<FeedPost[]> {
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

  return (data as unknown as FeedPost[]) ?? []
}

export function useGetFeedQuery() {
  return useQuery({
    queryKey: feedKeys.all,
    queryFn: getFeedPosts,
    staleTime: 1000 * 30,
    refetchOnWindowFocus: false,
  })
}