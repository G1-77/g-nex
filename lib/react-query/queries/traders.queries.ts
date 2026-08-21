'use client'

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'

export interface TopTrader {
  id: string
  username: string
  avatar_url: string | null
  is_verified: boolean
  monthly_roi: number
  realized_kes: number | null
}

/**
 * Daily-ranked top traders straight off the materialized `profiles.monthly_roi`
 * (30d realized P&L / confirmed deposits, refreshed by the roi_engine RPC).
 * Only traders with a positive ROI qualify; ties break by realized KES.
 */
export function useTopTraders(limit = 5) {
  return useQuery({
    queryKey: ['top-traders', limit],
    queryFn: async (): Promise<TopTrader[]> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, is_verified, monthly_roi, roi_realized_kes')
        .gt('monthly_roi', 0)
        .order('monthly_roi', { ascending: false })
        .order('roi_realized_kes', { ascending: false, nullsFirst: false })
        .limit(limit)

      if (error) throw new Error(error.message)

      return (data ?? []).map((t) => ({
        id: t.id,
        username: t.username,
        avatar_url: t.avatar_url,
        is_verified: Boolean(t.is_verified),
        monthly_roi: Number(t.monthly_roi ?? 0),
        realized_kes: t.roi_realized_kes === null ? null : Number(t.roi_realized_kes),
      }))
    },
    staleTime: 60_000,
  })
}
