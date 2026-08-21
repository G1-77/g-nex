import { createServerClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/admin/service'
import {
  buildTradeQuote,
  getSymbolPriceUsd,
  getPlatformTradingFee,
  mapTradeError,
  roundTo,
} from '@/lib/market/execution'
import { fetchUsdKesRate } from '@/lib/market/fx'
import { TRADABLE_SYMBOLS } from '@/lib/market/execution'
import type { TradeExecutionResult, TradeMode, TradeSide } from '@/lib/supabase/market.types'

export async function POST(req: Request) {
  const supabase = await createServerClient()
  const auth = await supabase.auth.getUser()
  const user = auth.data.user

  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  let body: {
    symbol?: unknown
    side?: unknown
    mode?: unknown
    amountUsd?: unknown
    leverage?: unknown
    idempotencyKey?: unknown
  }
  try {
    body = await req.json()
  } catch {
    return new Response('Invalid JSON body', { status: 400 })
  }

  const symbol = typeof body.symbol === 'string' ? body.symbol.toUpperCase() : ''
  const side = (typeof body.side === 'string' ? body.side.toLowerCase() : '') as TradeSide
  const mode = (typeof body.mode === 'string' ? body.mode.toLowerCase() : '') as TradeMode
  const amountUsd = roundTo(Number(body.amountUsd), 2)
  const leverageRaw = Number(body.leverage)
  const idempotencyKey =
    typeof body.idempotencyKey === 'string' && body.idempotencyKey.length > 0
      ? body.idempotencyKey
      : null

  if (!TRADABLE_SYMBOLS.includes(symbol as (typeof TRADABLE_SYMBOLS)[number])) {
    return new Response('This asset is not available for trading', { status: 400 })
  }
  if (side !== 'buy' && side !== 'sell') {
    return new Response('Invalid side', { status: 400 })
  }
  if (mode !== 'spot' && mode !== 'margin') {
    return new Response('Invalid mode', { status: 400 })
  }
  if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
    return new Response('Enter a valid USD amount', { status: 400 })
  }

  let leverage: number | null = null
  if (mode === 'margin') {
    leverage = Math.round(leverageRaw)
    if (!Number.isFinite(leverage) || leverage < 1 || leverage > 100) {
      return new Response('Leverage must be between 1x and 100x', { status: 400 })
    }
  }

  // ---- Authoritative execution inputs: the browser never sends price/fx/fee.
  const service = createServiceClient()
  const [priceUsd, fxRate, feePercent] = await Promise.all([
    getSymbolPriceUsd(symbol),
    fetchUsdKesRate(),
    getPlatformTradingFee(service),
  ])

  if (!Number.isFinite(priceUsd) || priceUsd <= 0) {
    return new Response('We could not fetch a live price for this asset. Try again shortly.', { status: 503 })
  }
  if (!Number.isFinite(fxRate) || fxRate <= 0) {
    return new Response('FX rate unavailable. Try again shortly.', { status: 503 })
  }

  const { data, error } = await service.rpc('execute_trade', {
    p_user: user.id,
    p_asset_symbol: symbol,
    p_side: side,
    p_mode: mode,
    p_amount_usd: amountUsd,
    p_price_usd: priceUsd,
    p_fx_rate: fxRate,
    p_fee_percent: feePercent,
    p_leverage: leverage ?? 1,
    p_idempotency_key: idempotencyKey,
  })

  if (error) {
    const mapped = mapTradeError(error.message)
    return new Response(mapped.message, { status: mapped.status })
  }

  const result = data as unknown as TradeExecutionResult

  return Response.json({
    ...result,
    quote: await buildTradeQuote(service, {
      symbol,
      side,
      mode,
      amountUsd,
      leverage: leverage ?? undefined,
    }),
  })
}