'use client'

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { marketKeys } from '@/lib/react-query/market/keys'

/**
 * Subscribes to the user's financial ledger tables (orders, transactions,
 * user_positions, user_holdings, user_wallets) and invalidates the matching
 * TanStack Query channels so balances/positions refresh the moment the
 * execution engine writes a row. Mount once per financial page.
 */
export function useRealtimeFinance(userId: string | null) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel(`realtime-finance-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', filter: `user_id=eq.${userId}` },
        (payload) => {
          const table = payload.table
          const targets = {
            orders: marketKeys.orders(userId),
            transactions: marketKeys.transactions(userId),
            user_positions: marketKeys.positions(userId),
            user_holdings: marketKeys.holdings(userId),
            user_wallets: marketKeys.wallet(userId),
          }[table]

          if (targets) {
            void queryClient.invalidateQueries({ queryKey: targets, exact: false, refetchType: 'active' })
          }
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [userId, queryClient])
}