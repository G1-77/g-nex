// GNEX wallet funding engine: deposit account numbers, reserve split, withdrawal
// availability (70% cap) and the auto-approval gate.
//
// These helpers run server-side (API routes) with either the auth-scoped server
// client or the service-role client for wallet/ledger writes.

import type { SupabaseClient } from '@supabase/supabase-js'
import { getMarketPrices } from '@/lib/market/price-service'
import { fetchUsdKesRate } from '@/lib/market/fx'
import { WALLET_CONFIG } from '@/lib/constants/wallet'

export function roundKes(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.round(value * 100) / 100
}

// --- Deposit account number ----------------------------------------------

/** Normalize a phone number into an M-Pesa-compatible account reference. */
export function normalizeDepositAccountNumber(phone: string | null | undefined): string | null {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 0) return null
  if (digits.startsWith('254')) return '0' + digits.slice(3)
  return digits
}

/** Stable, memorable fallback account reference for users without a phone. */
export function generateFallbackAccountNumber(userId: string): string {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) % 100_000_000
  }
  return `GN${String(hash).padStart(8, '0')}`
}

/**
 * Ensure the user has a permanent, unique deposit account number (the M-Pesa
 * PayBill BillRefNumber). Defaults to their phone; falls back to a generated
 * reference. Uses a service-role client to write past RLS.
 */
export async function ensureDepositAccountNumber(
  client: SupabaseClient,
  userId: string
): Promise<string> {
  const { data: profile } = await client
    .from('profiles')
    .select('mobile_money_number, deposit_account_number')
    .eq('id', userId)
    .maybeSingle()

  const existing = profile?.deposit_account_number
  if (existing) return existing

  const base =
    normalizeDepositAccountNumber(profile?.mobile_money_number) ??
    generateFallbackAccountNumber(userId)

  let candidate = base
  for (let attempt = 0; attempt < 5; attempt++) {
    const { error } = await client
      .from('profiles')
      .update({ deposit_account_number: candidate })
      .eq('id', userId)
    if (!error) return candidate
    candidate = `${base}${attempt + 1}`.slice(0, 12)
  }

  return base
}

// --- Deposit credit (90/10 split) ----------------------------------------

/**
 * Credit a confirmed/provisional deposit: 90% to the spendable balance and 10%
 * to the silent reserve. Upserts the wallet row when missing.
 */
export async function creditDepositBalance(
  client: SupabaseClient,
  userId: string,
  amountKes: number
): Promise<{ balanceCredit: number; reserveCredit: number }> {
  const balanceCredit = roundKes(amountKes * (1 - WALLET_CONFIG.RESERVE_RATE))
  const reserveCredit = roundKes(amountKes * WALLET_CONFIG.RESERVE_RATE)

  const { data: wallet } = await client
    .from('user_wallets')
    .select('id, balance_kes, reserve_kes, locked_kes, escrow_kes')
    .eq('user_id', userId)
    .maybeSingle()

  if (wallet) {
    const { error } = await client
      .from('user_wallets')
      .update({
        balance_kes: Number(wallet.balance_kes) + balanceCredit,
        reserve_kes: Number(wallet.reserve_kes ?? 0) + reserveCredit,
      })
      .eq('user_id', userId)
    if (error) throw new Error(error.message)
  } else {
    const { error } = await client
      .from('user_wallets')
      .insert({
        user_id: userId,
        balance_kes: balanceCredit,
        reserve_kes: reserveCredit,
        locked_kes: 0,
        escrow_kes: 0,
      })
    if (error) throw new Error(error.message)
  }

  return { balanceCredit, reserveCredit }
}

// --- Withdrawal availability (70% cap) -----------------------------------

const ASSET_SOURCES: Record<string, { type: 'crypto' | 'gold'; coingecko_id: string | null }> = {
  BTC: { type: 'crypto', coingecko_id: 'bitcoin' },
  ETH: { type: 'crypto', coingecko_id: 'ethereum' },
  SOL: { type: 'crypto', coingecko_id: 'solana' },
  XRP: { type: 'crypto', coingecko_id: 'ripple' },
  USDT: { type: 'crypto', coingecko_id: 'tether' },
  XAU: { type: 'gold', coingecko_id: null },
}

export interface WithdrawalAvailability {
  balanceKes: number
  lockedKes: number
  holdingsValueKes: number
  accountTotalKes: number
  capLimit: number
  pendingOut: number
  unverifiedProvisional: number
  available: number
}

export interface AvailabilityOverrides {
  maxWithdrawPct?: number
  pendingStatuses?: string[]
}

/**
 * Compute how much a user may withdraw right now.
 * capLimit = maxWithdrawPct × (cash + locked + holdings). available = min(cap,
 * cash − pending withdrawals − unverified provisional deposits). Silent reserve
 * is excluded from the math. Overrides let the platform settings layer adjust
 * the cap without touching the constants.
 */
export async function computeWithdrawalAvailability(
  supabase: SupabaseClient,
  userId: string,
  overrides: AvailabilityOverrides = {}
): Promise<WithdrawalAvailability> {
  const maxWithdrawPct =
    typeof overrides.maxWithdrawPct === "number"
      ? overrides.maxWithdrawPct
      : WALLET_CONFIG.MAX_WITHDRAW_PCT
  const pendingStatuses = overrides.pendingStatuses ?? ["pending", "approved", "processing"]

  const [walletRes, holdingsRes, depositsRes, withdrawalsRes] = await Promise.all([
    supabase
      .from('user_wallets')
      .select('balance_kes, locked_kes')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase.from('user_holdings').select('asset_symbol, units').eq('user_id', userId),
    supabase
      .from('deposit_requests')
      .select('amount_kes, status')
      .eq('user_id', userId)
      .eq('status', 'pending_verification'),
    supabase
      .from('withdrawal_requests')
      .select('amount_kes, amount, status')
      .eq('user_id', userId)
      .in('status', pendingStatuses),
  ])

  const balanceKes = Number(walletRes.data?.balance_kes ?? 0)
  const lockedKes = Number(walletRes.data?.locked_kes ?? 0)

  let holdingsValueKes = 0
  try {
    const rows = (holdingsRes.data ?? []) as Array<{ asset_symbol: string; units: number }>
    const assets = rows
      .map((r) => {
        const src = ASSET_SOURCES[r.asset_symbol]
        return src ? { ...src, symbol: r.asset_symbol } : null
      })
      .filter((a): a is { symbol: string; type: 'crypto' | 'gold'; coingecko_id: string | null } => Boolean(a))
    if (assets.length > 0) {
      const [prices, usdKes] = await Promise.all([getMarketPrices(assets), fetchUsdKesRate()])
      const priceMap = new Map(prices.map((p) => [p.symbol, p.price_usd]))
      for (const row of rows) {
        holdingsValueKes += Number(row.units) * (priceMap.get(row.asset_symbol) ?? 0) * usdKes
      }
    }
  } catch {
    // Price services are best-effort for availability math — default to cash only.
  }

  const accountTotalKes = balanceKes + lockedKes + holdingsValueKes
  const capLimit = roundKes(accountTotalKes * maxWithdrawPct)

  const pendingOut = (withdrawalsRes.data ?? []).reduce(
    (sum, r) => sum + Number(r.amount_kes ?? r.amount ?? 0),
    0
  )
  const unverifiedProvisional = (depositsRes.data ?? []).reduce(
    (sum, r) => sum + Number(r.amount_kes ?? 0),
    0
  )

  const available = Math.max(
    0,
    Math.min(capLimit, balanceKes - pendingOut - unverifiedProvisional)
  )

  return {
    balanceKes,
    lockedKes,
    holdingsValueKes,
    accountTotalKes,
    capLimit,
    pendingOut,
    unverifiedProvisional,
    available,
  }
}

export interface WithdrawalApprovalResult {
  autoApproved: boolean
  availability: WithdrawalAvailability
}

/**
 * Evaluate the auto-approval gate for a KES cash-out.
 * Auto-approve only when the request is within the 70% cap AND the phone
 * matches the profile's registered number. Anything else needs admin review.
 */
export async function evaluateWithdrawalApproval(
  supabase: SupabaseClient,
  userId: string,
  amountKes: number,
  phone: string,
  overrides: AvailabilityOverrides = {}
): Promise<WithdrawalApprovalResult> {
  const availability = await computeWithdrawalAvailability(supabase, userId, overrides)

  const { data: profile } = await supabase
    .from('profiles')
    .select('mobile_money_number')
    .eq('id', userId)
    .maybeSingle()

  const profilePhone = profile?.mobile_money_number
  const digits = (p: string) => p.replace(/\D/g, '')
  const phoneMatches =
    !profilePhone || (phone.trim().length > 0 && digits(phone) === digits(profilePhone))

  const autoApproved =
    amountKes > 0 && amountKes <= availability.capLimit && amountKes <= availability.available && phoneMatches

  return { autoApproved, availability }
}