'use client'

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { feedKeys } from '@/lib/react-query/keys'

/**
 * Real-time subscription for market-relevant updates
 * Listens to:
 * - New posts with trade tags (alpha feed)
 * - New positions (verified positioning)
 * - Watchlist changes
 */
export function useMarketRealtime(userId: string | null) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!userId) return

    // Subscribe to new posts for alpha feed updates
    const postsChannel = supabase
      .channel('market-posts-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'posts'
        },
        () => {
          // Invalidate alpha feed when new posts arrive
          queryClient.invalidateQueries({ queryKey: ['alpha-feed'] })
        }
      )
      .subscribe()

    // Subscribe to new positions for verified positioning updates
    const positionsChannel = supabase
      .channel('market-positions-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_positions'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['verified-positioning'] })
        }
      )
      .subscribe()

    // Subscribe to likes for engagement updates
    const likesChannel = supabase
      .channel('market-likes-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'likes'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['alpha-feed'] })
          queryClient.invalidateQueries({ queryKey: feedKeys.all })
        }
      )
      .subscribe()

    // Cleanup subscriptions
    return () => {
      supabase.removeChannel(postsChannel)
      supabase.removeChannel(positionsChannel)
      supabase.removeChannel(likesChannel)
    }
  }, [userId, queryClient])
}

/**
 * Real-time price updates would typically come from:
 * 1. WebSocket connection to exchange APIs (Binance, CoinGecko)
 * 2. Or polling with React Query refetchInterval
 * 
 * For Phase 1, we use polling via React Query (already implemented in queries.prices.ts)
 * For Phase 2+, consider:
 * - Binance WebSocket for crypto prices
 * - Supabase real-time for sentiment calculations
 */