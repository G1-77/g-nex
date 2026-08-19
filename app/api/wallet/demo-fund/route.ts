import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/supabase/server'
import { getMarketPrices } from '@/lib/market/price-service'
import { fetchUsdKesRate } from '@/lib/market/fx'

// Demo-only instant funding: credits the KES wallet and seeds a small
// savings-style portfolio so the wallet UI has real data to render.
// Uses the service role to bypass RLS for the wallet/ledger writes.
const serviceClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

const DEMO_HOLDINGS: Array<{ symbol: string; units: number }> = [
  { symbol: 'BTC', units: 0.0042 },
  { symbol: 'ETH', units: 0.09 },
  { symbol: 'SOL', units: 2.5 },
  { symbol: 'XAU', units: 0.15 },
  { symbol: 'USDT', units: 250 },
]

const DEMO_ASSETS: Array<{ symbol: string; type: 'crypto' | 'gold'; coingecko_id: string | null }> = [
  { symbol: 'BTC', type: 'crypto', coingecko_id: 'bitcoin' },
  { symbol: 'ETH', type: 'crypto', coingecko_id: 'ethereum' },
  { symbol: 'SOL', type: 'crypto', coingecko_id: 'solana' },
  { symbol: 'XAU', type: 'gold', coingecko_id: null },
  { symbol: 'USDT', type: 'crypto', coingecko_id: 'tether' },
]

export async function POST(req: Request) {
  const body = await req.json()
  const amount = Math.max(1, Math.min(1_000_000, Number(body?.amount) || 100_000))

  const supabase = await createServerClient()
  const auth = await supabase.auth.getUser()
  const user = auth.data.user

  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  // 1. Credit the KES wallet (upsert) — 90% spendable, 10% silent reserve,
  //    matching the real deposit split for consistent behavior.
  const balanceCredit = Math.round(amount * 0.9)
  const reserveCredit = Math.round(amount * 0.1)

  const { data: wallet } = await serviceClient
    .from('user_wallets')
    .select('id, balance_kes, reserve_kes, locked_kes, escrow_kes')
    .eq('user_id', user.id)
    .maybeSingle()

  if (wallet) {
    const { error } = await serviceClient
      .from('user_wallets')
      .update({
        balance_kes: Number(wallet.balance_kes) + balanceCredit,
        reserve_kes: Number(wallet.reserve_kes ?? 0) + reserveCredit,
      })
      .eq('user_id', user.id)
    if (error) return new Response(error.message, { status: 500 })
  } else {
    const { error } = await serviceClient
      .from('user_wallets')
      .insert({ user_id: user.id, balance_kes: balanceCredit, reserve_kes: reserveCredit, locked_kes: 0, escrow_kes: 0 })
    if (error) return new Response(error.message, { status: 500 })
  }

  // 2. Seed demo holdings with a cost basis slightly below current price so
  // the growth-vs-inflation badge has a believable positive story.
  try {
    const [prices, usdKes] = await Promise.all([getMarketPrices(DEMO_ASSETS), fetchUsdKesRate()])
    const priceMap = new Map(prices.map((p) => [p.symbol, p.price_usd]))

    for (const holding of DEMO_HOLDINGS) {
      const usd = priceMap.get(holding.symbol) ?? 0
      const costPerUnitKes = usd > 0 ? Math.round(usd * usdKes * 0.92) : 0

      const { data: existing } = await serviceClient
        .from('user_holdings')
        .select('id, units')
        .eq('user_id', user.id)
        .eq('asset_symbol', holding.symbol)
        .maybeSingle()

      if (existing) {
        await serviceClient
          .from('user_holdings')
          .update({ units: Number(existing.units) + holding.units, updated_at: new Date().toISOString() })
          .eq('user_id', user.id)
          .eq('asset_symbol', holding.symbol)
      } else {
        await serviceClient
          .from('user_holdings')
          .insert({
            user_id: user.id,
            asset_symbol: holding.symbol,
            units: holding.units,
            avg_cost_kes: costPerUnitKes,
          })
      }
    }
  } catch (err) {
    console.warn('GNEX Demo Fund price seed failed:', err)
  }

  // 3. Record the credit in the request ledger so it shows in history
  const { data: profile } = await serviceClient
    .from('profiles')
    .select('username, mobile_money_number')
    .eq('id', user.id)
    .maybeSingle()

  await serviceClient.from('deposit_requests').insert({
    user_id: user.id,
    amount_kes: amount,
    mobile_money_number: profile?.mobile_money_number ?? 'DEMO',
    mobile_money_provider: 'DEMO',
    user_reference: profile?.username ?? 'demo',
    status: 'Credited',
  })

  return Response.json({ success: true, amount })
}
