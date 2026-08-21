import { createServerClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/admin/service'
import {
  getSymbolPriceUsd,
  getPlatformTradingFee,
  mapTradeError,
} from '@/lib/market/execution'
import { fetchUsdKesRate } from '@/lib/market/fx'
import { getTradingConfig } from '@/lib/market/trading-config'
import type { ClosePositionResult } from '@/lib/supabase/market.types'

export async function POST(req: Request) {
  const supabase = await createServerClient()
  const auth = await supabase.auth.getUser()
  const user = auth.data.user

  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  let body: { positionId?: unknown }
  try {
    body = await req.json()
  } catch {
    return new Response('Invalid JSON body', { status: 400 })
  }

  const positionId = typeof body.positionId === 'string' ? body.positionId : ''
  if (!positionId) {
    return new Response('Missing position id', { status: 400 })
  }

  const service = createServiceClient()

  // Closing a position is a financial mutation — the trading kill-switch gates it.
  const config = await getTradingConfig(service)
  if (!config.tradingEnabled) {
    return new Response(mapTradeError('TRADING_DISABLED').message, { status: 503 })
  }

  // Resolve the position's asset for the authoritative exit price.
  const { data: position, error: posError } = await service
    .from('user_positions')
    .select('asset_symbol, status')
    .eq('id', positionId)
    .maybeSingle()

  if (posError) {
    return new Response('Position could not be loaded', { status: 500 })
  }
  if (!position || position.status !== 'OPEN') {
    return new Response('Position not found, or it is already closed', { status: 404 })
  }

  const [closePriceUsd, fxRate, feePercent] = await Promise.all([
    getSymbolPriceUsd(position.asset_symbol),
    fetchUsdKesRate(),
    getPlatformTradingFee(service),
  ])

  if (!Number.isFinite(closePriceUsd) || closePriceUsd <= 0) {
    return new Response('We could not fetch a live price for this asset. Try again shortly.', { status: 503 })
  }

  const { data, error } = await service.rpc('close_position', {
    p_user: user.id,
    p_position_id: positionId,
    p_close_price_usd: closePriceUsd,
    p_fx_rate: fxRate,
    p_fee_percent: feePercent,
  })

  if (error) {
    const mapped = mapTradeError(error.message)
    return new Response(mapped.message, { status: mapped.status })
  }

  return Response.json(data as unknown as ClosePositionResult)
}