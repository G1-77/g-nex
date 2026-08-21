import { createServerClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/admin/service'
import { getSymbolPriceUsd, getPlatformTradingFee } from '@/lib/market/execution'
import { fetchUsdKesRate } from '@/lib/market/fx'
import { getTradingConfig } from '@/lib/market/trading-config'

interface EngineResult {
  ok: boolean
  filled: number
  triggered: number
  expired: number
  liquidated: number
}

/**
 * Conditional-order engine tick.
 *
 * The browser never supplies prices — this route resolves the authoritative
 * price for every symbol that currently has resting conditional orders or an
 * open margin position, then hands the snapshot to the atomic database engine.
 * Clients call it as a heartbeat while trading surfaces are open; the RPC is
 * idempotent and concurrency-safe, so extra ticks are harmless.
 */
export async function POST() {
  const supabase = await createServerClient()
  const auth = await supabase.auth.getUser()

  if (!auth.data.user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const service = createServiceClient()

  const config = await getTradingConfig(service)
  if (!config.tradingEnabled) {
    return Response.json({ ok: true, filled: 0, triggered: 0, expired: 0, liquidated: 0 })
  }

  // Symbols needing evaluation: resting conditionals + open margin positions.
  const [orderSymbols, positionSymbols] = await Promise.all([
    service
      .from('orders')
      .select('assets(symbol)')
      .in('status', ['open', 'triggered'])
      .in('order_type', ['limit', 'stop_market', 'stop_limit', 'take_profit'])
      .limit(500),
    service.from('user_positions').select('asset_symbol').eq('status', 'OPEN').limit(500),
  ])

  const symbols = new Set<string>()
  for (const row of orderSymbols.data ?? []) {
    const symbol = (row as { assets?: { symbol?: string } | null }).assets?.symbol
    if (symbol) symbols.add(symbol.toUpperCase())
  }
  for (const row of positionSymbols.data ?? []) {
    if (row.asset_symbol) symbols.add(String(row.asset_symbol).toUpperCase())
  }

  if (symbols.size === 0) {
    return Response.json({ ok: true, filled: 0, triggered: 0, expired: 0, liquidated: 0 })
  }

  const [prices, fxRate, feePercent] = await Promise.all([
    Promise.all(
      [...symbols].map(async (symbol) => {
        try {
          return [symbol, await getSymbolPriceUsd(symbol)] as const
        } catch {
          // A single provider failure skips that symbol; others still process.
          return null
        }
      })
    ),
    fetchUsdKesRate(),
    getPlatformTradingFee(service),
  ])

  const priceMap: Record<string, number> = {}
  for (const entry of prices) {
    if (entry && Number.isFinite(entry[1]) && entry[1] > 0) {
      priceMap[entry[0]] = entry[1]
    }
  }

  if (Object.keys(priceMap).length === 0) {
    return new Response('Market data unavailable. Try again shortly.', { status: 503 })
  }

  const { data, error } = await service.rpc('process_conditional_orders', {
    p_prices: priceMap,
    p_fx_rate: fxRate,
    p_fee_percent: feePercent,
  })

  if (error) {
    return new Response('Order engine could not run. Try again shortly.', { status: 503 })
  }

  return Response.json(data as unknown as EngineResult)
}
