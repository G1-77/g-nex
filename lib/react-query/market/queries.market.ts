"use client"

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { marketKeys } from './keys'
import type { UserWalletState } from '@/lib/supabase/market.types'
import type { AssetSymbol } from '@/lib/supabase/types'

// Setup helper interfaces to cast raw database returns cleanly
interface WatchlistRow {
  id: string
  user_id: string
  asset_symbol: string
  created_at: string
}

interface WalletRow {
  id: string
  user_id: string
  balance_kes: number
  escrow_kes: number
  updated_at: string
}

// 1. KES WALLET BALANCE FETCH CHANNEL (Drives local wealth realization psychology)

async function fetchUserWalletBalance(userId: string | null): Promise<UserWalletState | null> {
  if (!userId) return null

  const { data, error } = await supabase
    .from('user_wallets')
    .select('id, user_id, balance_kes, escrow_kes, updated_at')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null

  const row = data as unknown as WalletRow

  return {
    id: row.id,
    userId: row.user_id,
    balanceKes: Number(row.balance_kes),
    escrowKes: Number(row.escrow_kes),
    updatedAt: row.updated_at,
  }
}

export function useGetUserWalletQuery(userId: string | null) {
  return useQuery({
    queryKey: marketKeys.wallet(userId),
    queryFn: () => fetchUserWalletBalance(userId),
    enabled: Boolean(userId),
    staleTime: 1000 * 60, // 10 seconds fresh boundary duration
  })
}


// 2. WATCHLIST RETRIEVAL LOGIC CORE

async function fetchUserWatchlistSymbols(userId: string | null): Promise<AssetSymbol[]> {
  if (!userId) return []

  const { data, error } = await supabase
    .from('user_watchlists')
    .select('id, user_id, asset_symbol, created_at')
    .eq('user_id', userId)

  if (error) throw new Error(error.message)
  if (!data) return []

  const rows = data as unknown as WatchlistRow[]
  return rows.map((row) => row.asset_symbol as AssetSymbol)
}

export function useGetUserWatchlistQuery(userId: string | null) {
  return useQuery({
    queryKey: marketKeys.watchlist(userId),
    queryFn: () => fetchUserWatchlistSymbols(userId),
    enabled: Boolean(userId),
    staleTime: 1000 * 60, // 30 seconds fresh boundary duration
  })
}

// 3. MUTATION ENGINE: ATOMIC WATCHLIST TOGGLER (Add/Remove Symbol)

interface ToggleWatchlistPayload {
  userId: string
  symbol: AssetSymbol
}

async function toggleWatchlistEntry({ userId, symbol }: ToggleWatchlistPayload): Promise<void> {
  const { data: existing } = await supabase
    .from('user_watchlists')
    .select('id')
    .eq('user_id', userId)
    .eq('asset_symbol', symbol)
    .maybeSingle()

  if (existing) {
    // If they already have it locked, delete the row (Unwatch)
    const { error } = await supabase
      .from('user_watchlists')
      .delete()
      .eq('id', existing.id)
    if (error) throw new Error(error.message)
  } else {
    // If they don't have it locked, create a fresh tracking row (Watch)
    const { error } = await supabase
      .from('user_watchlists')
      .insert({ user_id: userId, asset_symbol: symbol })
    if (error) throw new Error(error.message)
  }
}

export function useToggleWatchlistMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: toggleWatchlistEntry,
    onSuccess: (_data, variables) => {
      // Forceful targeted query invalidation to update state markers across UI immediately
      queryClient.invalidateQueries({
        queryKey: marketKeys.watchlist(variables.userId),
        exact: false,
        refetchType: 'all',
      })
    },
    onError: (error: Error) => {
      console.error('GNEX Watchlist Handshake Failure:', error.message)
      alert(`Watchlist adjustment failed: ${error.message}`)
    },
  })
}
