'use client'

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import type { AssetSymbol } from '@/lib/supabase/types'

export interface UserPosition {
  id: string
  user_id: string
  asset_symbol: AssetSymbol
  direction: 'Long' | 'Short'
  units: number
  margin_kes: number
  entry_price: number | null
  status: string
  created_at: string
  updated_at: string
}

export const positionKeys = {
  all: ['positions'] as const,
  byUser: (userId: string) => [...positionKeys.all, userId] as const,
}

async function fetchUserPositions(userId: string): Promise<UserPosition[]> {
  if (!userId) return []

  const { data, error } = await supabase
    .from('user_positions')
    .select(
      'id, user_id, asset_symbol, direction, units, margin_kes, entry_price, status, created_at, updated_at'
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (data as UserPosition[]) ?? []
}

export function useGetUserPositionsQuery(userId: string) {
  return useQuery({
    queryKey: positionKeys.byUser(userId),
    queryFn: () => fetchUserPositions(userId),
    enabled: Boolean(userId),
    staleTime: 1000 * 30,
    refetchOnWindowFocus: false,
  })
}