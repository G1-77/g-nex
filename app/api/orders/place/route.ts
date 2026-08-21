import { createServerClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/admin/service'
import {
  getSymbolPriceUsd,
  getTradingFeeRate,
  mapTradeError,
  roundTo,
} from '@/lib/market/execution'
import { fetchUsdKesRate } from '@/lib/market/fx'
import {
  getTradingConfig,
  isSymbolTradable,
  productAllowed,
} from '@/lib/market/trading-config'
import type { ProductType } from '@/lib/supabase/market.types'

const CONDITIONAL_TYPES = ['limit', 'stop_market', 'stop_limit', 'take_profit'] as const
type ConditionalType = (typeof CONDITIONAL_TYPES)[number]

interface PlacedOrderResult {
  ok: boolean
  duplicate?: boolean
  order_id: string
  order_type?: string
  side?: string
  symbol?: string
  quantity?: number
  limit_price?: number | null
  trigger_price?: number | null
  reserved_kes?: number
  expires_at?: string | null
  wallet: { balance_kes: number; locked_kes: number }
}

function isConditionalType(value: string): value is ConditionalType {
  return (CONDITIONAL_TYPES as readonly string[]).includes(value)
}

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
    orderType?: unknown
    amountUsd?: unknown
    limitPrice?: unknown
    triggerPrice?: unknown
    expiresAt?: unknown
    idempotencyKey?: unknown
    product?: unknown
  }
  try {
    body = await req.json()
  } catch {
    return new Response('Invalid JSON body', { status: 400 })
  }

  const symbol = typeof body.symbol === 'string' ? body.symbol.toUpperCase() : ''
  const side = typeof body.side === 'string' ? body.side.toLowerCase() : ''
  const orderType = typeof body.orderType === 'string' ? body.orderType.toLowerCase() : ''
  const amountUsd = roundTo(Number(body.amountUsd), 2)
  const limitPriceRaw = Number(body.limitPrice)
  const triggerPriceRaw = Number(body.triggerPrice)
  const idempotencyKey =
    typeof body.idempotencyKey === 'string' && body.idempotencyKey.length > 0
      ? body.idempotencyKey
      : null
  const product =
    body.product === 'quick_trade' || body.product === 'ftt' || body.product === 'spot'
      ? (body.product as ProductType)
      : 'spot'

  if (!isConditionalType(orderType)) {
    return new Response(mapTradeError('INVALID_ORDER_TYPE').message, { status: 400 })
  }
  if (side !== 'buy' && side !== 'sell') {
    return new Response('Invalid side', { status: 400 })
  }
  if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
    return new Response('Enter a valid USD amount', { status: 400 })
  }

  const limitPrice =
    Number.isFinite(limitPriceRaw) && limitPriceRaw > 0 ? roundTo(limitPriceRaw, 8) : null
  const triggerPrice =
    Number.isFinite(triggerPriceRaw) && triggerPriceRaw > 0 ? roundTo(triggerPriceRaw, 8) : null

  // Expiry is optional; when present it must be in the future and bounded.
  let expiresAt: string | null = null
  if (typeof body.expiresAt === 'string' && body.expiresAt.length > 0) {
    const parsed = new Date(body.expiresAt)
    if (Number.isNaN(parsed.getTime()) || parsed.getTime() <= Date.now()) {
      return new Response('Expiry must be a future time', { status: 400 })
    }
    expiresAt = parsed.toISOString()
  }

  const service = createServiceClient()

  const config = await getTradingConfig(service)
  if (!productAllowed(config, product)) {
    return new Response(
      config.tradingEnabled ? mapTradeError('PRODUCT_DISABLED').message : mapTradeError('TRADING_DISABLED').message,
      { status: 503 }
    )
  }
  if (!(await isSymbolTradable(service, symbol))) {
    return new Response('This asset is not available for trading', { status: 400 })
  }
  if (amountUsd < config.minTradeUsd) {
    return new Response(mapTradeError('TRADE_AMOUNT_TOO_SMALL').message, { status: 400 })
  }
  if (amountUsd > config.maxTradeUsd) {
    return new Response(mapTradeError('TRADE_AMOUNT_TOO_LARGE').message, { status: 400 })
  }

  // ---- Authoritative inputs resolved server-side. The reference price drives
  // trigger-side validation so obviously wrong triggers are rejected up front.
  const [referencePrice, fxRate, feeRate] = await Promise.all([
    getSymbolPriceUsd(symbol),
    fetchUsdKesRate(),
    getTradingFeeRate(service),
  ])

  if (!Number.isFinite(referencePrice) || referencePrice <= 0) {
    return new Response('We could not fetch a live price for this asset. Try again shortly.', { status: 503 })
  }
  if (!Number.isFinite(fxRate) || fxRate <= 0) {
    return new Response('FX rate unavailable. Try again shortly.', { status: 503 })
  }

  const { data, error } = await service.rpc('place_order', {
    p_user: user.id,
    p_asset_symbol: symbol,
    p_side: side,
    p_order_type: orderType,
    p_amount_usd: amountUsd,
    p_limit_price: limitPrice,
    p_trigger_price: triggerPrice,
    p_reference_price: referencePrice,
    p_fx_rate: fxRate,
    p_fee_rate: feeRate,
    p_product: product,
    p_expires_at: expiresAt,
    p_idempotency_key: idempotencyKey,
  })

  if (error) {
    const mapped = mapTradeError(error.message)
    return new Response(mapped.message, { status: mapped.status })
  }

  return Response.json(data as unknown as PlacedOrderResult)
}
