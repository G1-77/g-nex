"use client"

import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { marketKeys } from './keys'
import { useMarketPrices } from './queries.prices'
import { fetchUsdKesRate } from '@/lib/market/fx'
import type { UserWalletState, UserHolding, FundingRequest, FundLock } from '@/lib/supabase/market.types'
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
  locked_kes: number
  reserve_kes: number
  updated_at: string
}

interface HoldingRow {
  id: string
  user_id: string
  asset_symbol: string
  units: number
  avg_cost_kes: number
  updated_at: string
}

interface DepositRequestRow {
  id: string
  amount_kes: number
  mobile_money_number: string
  mobile_money_provider: string
  user_reference: string
  status: string
  created_at: string
  payment_channel: string | null
  account_number: string | null
}

interface WithdrawalRequestRow {
  id: string
  amount_kes: number | null
  amount: number
  mobile_money_number: string
  mobile_money_provider: string
  status: string
  created_at: string
}

// 1. KES WALLET BALANCE FETCH CHANNEL (Drives local wealth realization psychology)

async function fetchUserWalletBalance(userId: string | null): Promise<UserWalletState | null> {
  if (!userId) return null

  const { data, error } = await supabase
    .from('user_wallets')
    .select('id, user_id, balance_kes, escrow_kes, locked_kes, reserve_kes, updated_at')
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
    lockedKes: Number(row.locked_kes ?? 0),
    reserveKes: Number(row.reserve_kes ?? 0),
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

// =============================================================
// WALLET DATA CHANNELS
// =============================================================

// 4. SAVINGS-STYLE PORTFOLIO HOLDINGS FETCH

async function fetchUserHoldings(userId: string | null): Promise<UserHolding[]> {
  if (!userId) return []

  const { data, error } = await supabase
    .from('user_holdings')
    .select('id, user_id, asset_symbol, units, avg_cost_kes, updated_at')
    .eq('user_id', userId)
    .order('units', { ascending: false })

  if (error) throw new Error(error.message)
  if (!data) return []

  const rows = data as unknown as HoldingRow[]
  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    assetSymbol: row.asset_symbol as AssetSymbol,
    units: Number(row.units),
    avgCostKes: Number(row.avg_cost_kes),
    updatedAt: row.updated_at,
  }))
}

export function useGetUserHoldingsQuery(userId: string | null) {
  return useQuery({
    queryKey: marketKeys.holdings(userId),
    queryFn: () => fetchUserHoldings(userId),
    enabled: Boolean(userId),
    staleTime: 1000 * 30,
  })
}

// 5. FUNDING REQUEST LEDGER (deposits + withdrawals combined)

async function fetchUserRequests(userId: string | null): Promise<FundingRequest[]> {
  if (!userId) return []

  const [depositsRes, withdrawalsRes] = await Promise.all([
    supabase
      .from('deposit_requests')
      .select('id, amount_kes, mobile_money_number, mobile_money_provider, user_reference, status, created_at, payment_channel, account_number')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('withdrawal_requests')
      .select('id, amount_kes, amount, mobile_money_number, mobile_money_provider, status, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  if (depositsRes.error) throw new Error(depositsRes.error.message)
  if (withdrawalsRes.error) throw new Error(withdrawalsRes.error.message)

  const requests: FundingRequest[] = [
    ...((depositsRes.data ?? []) as unknown as DepositRequestRow[]).map((row) => ({
      id: row.id,
      kind: 'deposit' as const,
      amountKes: Number(row.amount_kes),
      provider: row.mobile_money_provider,
      mobileNumber: row.mobile_money_number,
      reference: row.user_reference,
      status: row.status ?? 'pending',
      createdAt: row.created_at,
      paymentChannel: row.payment_channel,
      accountNumber: row.account_number,
    })),
    ...((withdrawalsRes.data ?? []) as unknown as WithdrawalRequestRow[]).map((row) => ({
      id: row.id,
      kind: 'withdrawal' as const,
      amountKes: Number(row.amount_kes ?? row.amount),
      provider: row.mobile_money_provider,
      mobileNumber: row.mobile_money_number,
      reference: null,
      status: row.status ?? 'pending',
      createdAt: row.created_at,
    })),
  ]

  return requests.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function useGetUserRequestsQuery(userId: string | null) {
  return useQuery({
    queryKey: marketKeys.requests(userId),
    queryFn: () => fetchUserRequests(userId),
    enabled: Boolean(userId),
    staleTime: 1000 * 30,
  })
}

// 6. FUNDING MUTATION ENGINE

interface DepositPayload {
  userId: string
  amount: number
  phone: string
  provider: string
  reference: string
  paymentChannel: 'paybill' | 'send_to_number'
  accountNumber?: string
}

interface WithdrawalPayload {
  userId: string
  amount: number
  phone: string
  provider: string
}

async function createDeposit({ amount, phone, provider, reference, paymentChannel, accountNumber }: DepositPayload): Promise<void> {
  const res = await fetch('/api/deposits', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount, phone, provider, reference, paymentChannel, accountNumber }),
  })

  if (!res.ok) {
    const message = await res.text()
    throw new Error(message || 'Deposit request failed')
  }
}

export function useCreateDepositMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createDeposit,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: marketKeys.requests(variables.userId),
        exact: false,
        refetchType: 'all',
      })
    },
    onError: (error: Error) => {
      console.error('GNEX Deposit Handshake Failure:', error.message)
      alert(`Deposit request failed: ${error.message}`)
    },
  })
}

async function createWithdrawal({ amount, phone, provider }: WithdrawalPayload): Promise<void> {
  // KES cash-out: no asset_id, so the route skips the asset lock_funds call
  const res = await fetch('/api/withdrawals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount, amount_kes: amount, phone, provider }),
  })

  if (!res.ok) {
    const message = await res.text()
    throw new Error(message || 'Withdrawal request failed')
  }
}

export function useCreateWithdrawalMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createWithdrawal,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: marketKeys.requests(variables.userId),
        exact: false,
        refetchType: 'all',
      })
    },
    onError: (error: Error) => {
      console.error('GNEX Withdrawal Handshake Failure:', error.message)
      alert(`Withdrawal request failed: ${error.message}`)
    },
  })
}

interface DemoFundPayload {
  userId: string
  amount?: number
}

async function demoFundWallet({ amount }: DemoFundPayload): Promise<void> {
  const res = await fetch('/api/wallet/demo-fund', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount }),
  })

  if (!res.ok) {
    const message = await res.text()
    throw new Error(message || 'Demo fund failed')
  }
}

export function useDemoFundMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: demoFundWallet,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: marketKeys.wallet(variables.userId),
        exact: false,
        refetchType: 'all',
      })
      queryClient.invalidateQueries({
        queryKey: marketKeys.holdings(variables.userId),
        exact: false,
        refetchType: 'all',
      })
      queryClient.invalidateQueries({
        queryKey: marketKeys.requests(variables.userId),
        exact: false,
        refetchType: 'all',
      })
    },
    onError: (error: Error) => {
      console.error('GNEX Demo Fund Failure:', error.message)
      alert(`Demo fund failed: ${error.message}`)
    },
  })
}

// 7. USD/KES FX RATE CHANNEL (drives the wallet's currency toggle)

export function useUsdKesRate() {
  return useQuery({
    queryKey: [...marketKeys.all, 'fx', 'usd-kes'] as const,
    queryFn: () => fetchUsdKesRate(),
    staleTime: 1000 * 60 * 30,
    retry: 1,
    placeholderData: 130,
  })
}

// 7b. USER PROFILE MINI (mobile money details for deposit/withdraw forms)

export interface UserProfileMini {
  id: string
  username: string | null
  mobileMoneyNumber: string | null
  mobileMoneyProvider: string | null
  depositAccountNumber: string | null
}

interface ProfileRow {
  id: string
  username: string | null
  mobile_money_number: string | null
  mobile_money_provider: string | null
  deposit_account_number: string | null
}

async function fetchUserProfile(userId: string | null): Promise<UserProfileMini | null> {
  if (!userId) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, mobile_money_number, mobile_money_provider, deposit_account_number')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null

  const row = data as unknown as ProfileRow

  return {
    id: row.id,
    username: row.username ?? null,
    mobileMoneyNumber: row.mobile_money_number ?? null,
    mobileMoneyProvider: row.mobile_money_provider ?? null,
    depositAccountNumber: row.deposit_account_number ?? null,
  }
}

export function useGetUserProfileQuery(userId: string | null) {
  return useQuery({
    queryKey: [...marketKeys.all, 'profile', userId] as const,
    queryFn: () => fetchUserProfile(userId),
    enabled: Boolean(userId),
    staleTime: 1000 * 60 * 5,
  })
}

// 8. AGGREGATED PORTFOLIO SNAPSHOT (wallet balance + holdings value + growth)

export interface PortfolioSummary {
  balanceKes: number
  lockedKes: number
  reserveKes: number
  holdingsValueKes: number
  totalKes: number
  totalUsd: number
  growthPct: number | null
  usdKes: number
}

export function usePortfolioSummary(userId: string | null) {
  const { data: wallet } = useGetUserWalletQuery(userId)
  const { data: holdings = [] } = useGetUserHoldingsQuery(userId)
  const { data: tickers = [] } = useMarketPrices()
  const { data: usdKesRate = 130 } = useUsdKesRate()

  return useMemo<PortfolioSummary>(() => {
    const priceMap = new Map(tickers.map((t) => [t.symbol, t.priceUsd]))

    let holdingsValueKes = 0
    let costKes = 0

    for (const holding of holdings) {
      const priceUsd = priceMap.get(holding.assetSymbol) ?? 0
      holdingsValueKes += holding.units * priceUsd * usdKesRate
      costKes += holding.units * holding.avgCostKes
    }

    const balanceKes = wallet?.balanceKes ?? 0
    const lockedKes = wallet?.lockedKes ?? 0
    const reserveKes = wallet?.reserveKes ?? 0
    const totalKes = balanceKes + lockedKes + holdingsValueKes

    return {
      balanceKes,
      lockedKes,
      reserveKes,
      holdingsValueKes,
      totalKes,
      totalUsd: totalKes / usdKesRate,
      growthPct: costKes > 0 ? ((holdingsValueKes - costKes) / costKes) * 100 : null,
      usdKes: usdKesRate,
    }
  }, [wallet, holdings, tickers, usdKesRate])
}

// 9. PERMANENT DEPOSIT ACCOUNT NUMBER (M-Pesa PayBill BillRefNumber)

async function fetchDepositAccountNumber(userId: string | null): Promise<string | null> {
  if (!userId) return null
  const res = await fetch('/api/wallet/deposit-account', { method: 'GET' })
  if (!res.ok) {
    const message = await res.text()
    throw new Error(message || 'Failed to load deposit account number')
  }
  const data = (await res.json()) as { accountNumber: string }
  return data.accountNumber
}

export function useDepositAccountNumberQuery(userId: string | null) {
  return useQuery({
    queryKey: marketKeys.depositAccount(userId),
    queryFn: () => fetchDepositAccountNumber(userId),
    enabled: Boolean(userId),
    staleTime: 1000 * 60 * 60,
  })
}

// 10. VOLUNTARY FUND LOCKS (lock / unlock / release)

interface FundLockRow {
  id: string
  user_id: string
  amount_kes: number
  status: 'locked' | 'unlock_pending' | 'released' | 'cancelled'
  created_at: string
  unlock_available_at: string | null
  released_at: string | null
  cancelled_at: string | null
}

async function fetchFundLocks(userId: string | null): Promise<FundLock[]> {
  if (!userId) return []

  const { data, error } = await supabase
    .from('fund_locks')
    .select('id, user_id, amount_kes, status, created_at, unlock_available_at, released_at, cancelled_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  return ((data ?? []) as unknown as FundLockRow[]).map((row) => ({
    id: row.id,
    userId: row.user_id,
    amountKes: Number(row.amount_kes),
    status: row.status,
    createdAt: row.created_at,
    unlockAvailableAt: row.unlock_available_at,
    releasedAt: row.released_at,
    cancelledAt: row.cancelled_at,
  }))
}

export function useGetFundLocksQuery(userId: string | null) {
  return useQuery({
    queryKey: marketKeys.locks(userId),
    queryFn: () => fetchFundLocks(userId),
    enabled: Boolean(userId),
    staleTime: 1000 * 30,
  })
}

interface LockActionPayload {
  userId: string
  amount?: number
}

async function lockFunds({ amount }: LockActionPayload): Promise<void> {
  const res = await fetch('/api/wallet/locks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'lock', amount }),
  })
  if (!res.ok) throw new Error((await res.text()) || 'Lock failed')
}

export function useLockFundsMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: lockFunds,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: marketKeys.wallet(variables.userId), exact: false })
      queryClient.invalidateQueries({ queryKey: marketKeys.locks(variables.userId), exact: false })
    },
    onError: (error: Error) => {
      console.error('GNEX Lock Failure:', error.message)
      alert(`Lock failed: ${error.message}`)
    },
  })
}

async function unlockFunds({ amount }: LockActionPayload): Promise<void> {
  const res = await fetch('/api/wallet/locks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'unlock', amount }),
  })
  if (!res.ok) throw new Error((await res.text()) || 'Unlock request failed')
}

export function useUnlockFundsMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: unlockFunds,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: marketKeys.locks(variables.userId), exact: false })
    },
    onError: (error: Error) => {
      console.error('GNEX Unlock Failure:', error.message)
      alert(`Unlock request failed: ${error.message}`)
    },
  })
}

async function releaseUnlocks({ userId }: LockActionPayload): Promise<void> {
  void userId
  const res = await fetch('/api/wallet/locks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'release' }),
  })
  if (!res.ok) throw new Error((await res.text()) || 'Release failed')
}

export function useReleaseUnlocksMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: releaseUnlocks,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: marketKeys.wallet(variables.userId), exact: false })
      queryClient.invalidateQueries({ queryKey: marketKeys.locks(variables.userId), exact: false })
    },
    onError: (error: Error) => {
      console.error('GNEX Release Failure:', error.message)
    },
  })
}
