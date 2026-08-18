// hooks/useFeedRealtime.ts
'use client'

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase/client'
import { feedKeys } from '@/lib/react-query/keys'

import type { FeedPost } from '@/lib/supabase/types'
import { normalizeTradeTags } from '@/lib/supabase/types'

export function useFeedRealtime() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const channel = supabase
      .channel('feed-realtime')

      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'posts'
        },
        async (payload) => {
          const postId = payload.new.id as string

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
            .eq('id', postId)
            .single()

          if (error || !data) {
            return
          }

          const profile = Array.isArray(data.profiles)
            ? data.profiles[0]
            : data.profiles

          const tradeTag = normalizeTradeTags(data.trade_tags)

          const realtimePost: FeedPost = {
            id: data.id,
            content: data.content,
            created_at: data.created_at,
            media_url: null,
            assetSymbols: tradeTag ? [tradeTag.asset_symbol] : [],
            signalType: tradeTag?.signal_type ?? null,
            profiles: profile ? {
              id: profile.id,
              username: profile.username ?? 'unknown',
              full_name: profile.full_name ?? null,
              avatar_url: profile.avatar_url ?? null,
              bio: null,
              is_verified: profile.is_verified ?? false,
              monthly_roi: 0
            } : null,
            trade_tags: tradeTag ? {
              asset_symbol: tradeTag.asset_symbol,
              signal_type: tradeTag.signal_type,
              price: null,
              change: null,
              direction: null
            } : null,
            likes_count: 0,
            comments_count: 0,
            shares_count: 0
          }

          queryClient.setQueryData<FeedPost[]>(
            feedKeys.all,
            (old = []) => {
              const filtered = old.filter(
                (item) =>
                  item.id !== realtimePost.id &&
                  !item.optimistic
              )

              return [realtimePost, ...filtered]
            }
          )
        }
      )

      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient])
}