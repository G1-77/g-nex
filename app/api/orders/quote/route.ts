import { createServiceClient } from '@/lib/admin/service'
import { buildTradeQuote, TRADABLE_SYMBOLS } from '@/lib/market/execution'
import type { TradeMode, TradeSide } from '@/lib/supabase/market.types'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const symbol = (url.searchParams.get('symbol') ?? '').toUpperCase()
  const side = (url.searchParams.get('side') ?? '').toLowerCase() as TradeSide
  const mode = (url.searchParams.get('mode') ?? '').toLowerCase() as TradeMode
  const amountUsd = Number(url.searchParams.get('amount'))
  const leverage = Number(url.searchParams.get('leverage'))

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

  try {
    const service = createServiceClient()
    const quote = await buildTradeQuote(service, {
      symbol,
      side,
      mode,
      amountUsd,
      leverage,
    })
    return Response.json(quote)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Quote unavailable'
    return new Response(message, { status: 503 })
  }
}