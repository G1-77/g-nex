'use client'

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { marketKeys } from '@/lib/react-query/market/keys'
import type { PositionRow } from '@/lib/supabase/market.types'
import type { AssetSymbol } from '@/lib/supabase/types'

interface PositionRowRaw {
  id: string
  user_id: string
  asset_symbol: AssetSymbol
  direction: 'Long' | 'Short'
  entry_price_usd: number
  units: number
  margin_kes: number
  leverage: number
  liquidation_price_usd: number | null
  status: 'OPEN' | 'CLOSED'
  realized_pnl_kes: number | null
  fee_kes: number
  close_price_usd: number | null
  closed_at: string | null
  created_at: string
  updated_at: string
}

function mapPositionRow(row: PositionRowRaw): PositionRow {
  return {
    id: row.id,
    userId: row.user_id,
    assetSymbol: row.asset_symbol,
    direction: row.direction,
    entryPriceUsd: Number(row.entry_price_usd),
    units: Number(row.units),
    marginKes: Number(row.margin_kes),
    leverage: Number(row.leverage ?? 1),
    liquidationPriceUsd: row.liquidation_price_usd === null ? null : Number(row.liquidation_price_usd),
    status: row.status,
    realizedPnlKes: row.realized_pnl_kes === null ? null : Number(row.realized_pnl_kes),
    feeKes: Number(row.fee_kes ?? 0),
    closePriceUsd: row.close_price_usd === null ? null : Number(row.close_price_usd),
    closedAt: row.closed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

async function fetchUserPositions(userId: string | null): Promise<PositionRow[]> {
  if (!userId) return []

  const { data, error } = await supabase
    .from('user_positions')
    .select(
      'id, user_id, asset_symbol, direction, entry_price_usd, units, margin_kes, leverage, liquidation_price_usd, status, realized_pnl_kes, fee_kes, close_price_usd, closed_at, created_at, updated_at'
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return ((data ?? []) as unknown as PositionRowRaw[]).map(mapPositionRow)
}

export function useGetUserPositionsQuery(userId: string | null) {
  return useQuery({
    queryKey: marketKeys.positions(userId),
    queryFn: () => fetchUserPositions(userId),
    enabled: Boolean(userId),
    staleTime: 1000 * 30,
    refetchOnWindowFocus: false,
  })
}