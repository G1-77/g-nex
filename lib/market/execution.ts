// lib/market/execution.ts
// Server-only trade execution helpers. NEVER import this from a client
// component — it reads authoritative prices / FX / fees and drives the
// SECURITY DEFINER execute_trade / close_position RPCs through the service
// role. The browser only ever sends intent (symbol, side, mode, USD amount,
// leverage, idempotency key); the server decides price, fee and validity.

import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchCryptoPrices } from '@/lib/market/coingecko'
import { fetchGoldPrice } from '@/lib/market/gold'
import { fetchUsdKesRate } from '@/lib/market/fx'
import type {
  TradeMode,
  TradeQuote,
  TradeSide,
} from '@/lib/supabase/market.types'

export const SYMBOL_COINGECKO_ID: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  XRP: 'ripple',
  USDT: 'tether',
}

export const TRADABLE_SYMBOLS = ['BTC', 'ETH', 'SOL', 'XRP', 'USDT', 'XAU'] as const

/** Authoritative USD price for a tradable symbol (server-side, CoinGecko + XAU feed). */
export async function getSymbolPriceUsd(symbol: string): Promise<number> {
  const s = symbol.toUpperCase()
  if (s === 'XAU') {
    const gold = await fetchGoldPrice()
    if (!gold.price_usd || gold.price_usd <= 0) throw new Error('ASSET_PRICE_UNAVAILABLE')
    return gold.price_usd
  }
  const id = SYMBOL_COINGECKO_ID[s]
  if (!id) throw new Error('UNSUPPORTED_ASSET')
  const prices = await fetchCryptoPrices([id])
  const price = prices[0]
  if (!price || !price.current_price || price.current_price <= 0) {
    throw new Error('ASSET_PRICE_UNAVAILABLE')
  }
  return price.current_price
}

// The admin settings UI writes `trading_fee_pct` (see lib/admin/settings.ts);
// reading any other key here would silently orphan the admin fee control.
// Fee convention (unified): platform_settings stores FRACTIONS — 0.02 = 2%.
const TRADING_FEE_KEY = 'trading_fee_pct'
export const DEFAULT_TRADING_FEE_RATE = 0.02

/**
 * Platform trading fee RATE (fraction of notional, e.g. 0.02 = 2%) from
 * platform_settings. Legacy whole-percent rows (e.g. 2 for 2%) written before
 * the fraction migration are normalized so a stale row can never 100x a fee.
 */
export async function getTradingFeeRate(client: SupabaseClient): Promise<number> {
  const { data } = await client
    .from('platform_settings')
    .select('value')
    .eq('key', TRADING_FEE_KEY)
    .maybeSingle()

  let rate: number | undefined
  if (data?.value && typeof data.value === 'number') rate = data.value
  else if (data?.value && typeof data.value === 'object') {
    const nested = (data.value as { rate?: unknown }).rate
    if (typeof nested === 'number') rate = nested
  }
  if (rate === undefined || !Number.isFinite(rate) || rate < 0) return DEFAULT_TRADING_FEE_RATE
  // Whole-number rows from the legacy percent convention (>1 means "2" = 2%).
  if (rate > 1) return rate / 100
  return rate
}

export function roundTo(value: number, digits: number): number {
  if (!Number.isFinite(value)) return 0
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

export function computeQuantity(amountUsd: number, priceUsd: number): number {
  return roundTo(amountUsd / priceUsd, 8)
}

/**
 * Server-authoritative trade preview. Used by GET /api/orders/quote for the
 * UI preview and re-derived inside the execution route (never trusts the client).
 */
export async function buildTradeQuote(
  client: SupabaseClient,
  input: {
    symbol: string
    side: TradeSide
    mode: TradeMode
    amountUsd: number
    leverage?: number
  }
): Promise<TradeQuote> {
  const symbol = input.symbol.toUpperCase() as TradeQuote['symbol']
  const side = input.side === 'sell' ? 'sell' : 'buy'
  const mode = input.mode === 'margin' ? 'margin' : 'spot'
  const leverage = mode === 'margin' ? Math.max(1, Math.round(input.leverage ?? 1)) : null

  const [priceUsd, fxRate, feeRate] = await Promise.all([
    getSymbolPriceUsd(symbol),
    fetchUsdKesRate(),
    getTradingFeeRate(client),
  ])

  const amountUsd = roundTo(input.amountUsd, 2)
  const quantity = computeQuantity(amountUsd, priceUsd)
  const feeUsd = roundTo(amountUsd * feeRate, 8)
  const feeKes = roundTo(feeUsd * fxRate, 2)

  if (mode === 'margin' && leverage !== null) {
    const marginUsd = amountUsd / leverage
    const marginKes = roundTo(marginUsd * fxRate, 2)
    const liquidationPriceUsd =
      side === 'buy'
        ? roundTo(priceUsd * (1 - 1 / leverage), 4)
        : roundTo(priceUsd * (1 + 1 / leverage), 4)
    return {
      symbol,
      side,
      mode,
      amountUsd,
      priceUsd: roundTo(priceUsd, 4),
      fxRate,
      feeRate,
      quantity,
      feeUsd,
      feeKes,
      amountKes: marginKes,
      leverage,
      marginKes,
      liquidationPriceUsd,
    }
  }

  const amountKes = side === 'buy'
    ? roundTo(amountUsd * fxRate + feeKes, 2)
    : roundTo(amountUsd * fxRate - feeKes, 2)

  return {
    symbol,
    side,
    mode: 'spot',
    amountUsd,
    priceUsd: roundTo(priceUsd, 4),
    fxRate,
    feeRate,
    quantity,
    feeUsd,
    feeKes,
    amountKes,
    leverage: null,
    marginKes: null,
    liquidationPriceUsd: null,
  }
}

const TRADE_ERROR_MESSAGES: Record<string, string> = {
  INSUFFICIENT_FUNDS: 'Your available KES balance is too low for this trade.',
  INSUFFICIENT_HOLDINGS: "You don't hold enough of this asset to sell.",
  INVALID_LEVERAGE: 'Leverage must be between 1x and 100x.',
  INVALID_PARAMS: 'The trade parameters are invalid.',
  UNSUPPORTED_ASSET: 'This asset is not available for trading.',
  ASSET_NOT_FOUND: 'This asset is not available for trading.',
  ASSET_PRICE_UNAVAILABLE: 'We could not fetch a live price for this asset. Try again shortly.',
  WALLET_NOT_FOUND: 'No wallet is linked to your account yet.',
  POSITION_NOT_FOUND: 'Position not found, or it is already closed.',
  TRADING_DISABLED: 'Trading is currently disabled. Please try again later.',
  PRODUCT_DISABLED: 'This trading product is currently unavailable.',
  TRADE_AMOUNT_TOO_SMALL: 'The trade amount is below the platform minimum.',
  TRADE_AMOUNT_TOO_LARGE: 'The trade amount exceeds the platform maximum.',
  LEVERAGE_LIMIT_EXCEEDED: 'The selected leverage exceeds the platform limit.',
  INVALID_ORDER_TYPE: 'Unsupported order type.',
  INVALID_LIMIT_PRICE: 'Enter a valid limit price.',
  INVALID_TRIGGER_PRICE: 'Enter a valid trigger price.',
  TRIGGER_PRICE_INVALID: 'That trigger price is on the wrong side of the current market.',
  ORDER_NOT_FOUND: 'Order not found.',
  ORDER_NOT_CANCELLABLE: 'This order can no longer be cancelled.',
  PRODUCT_UNAVAILABLE: 'This product is not available yet.',
}

export function mapTradeError(rawMessage: string): { status: number; message: string } {
  const code = rawMessage.trim()
  const known = TRADE_ERROR_MESSAGES[code]
  if (known) return { status: 400, message: known }
  return { status: 400, message: rawMessage || 'The trade could not be executed.' }
}