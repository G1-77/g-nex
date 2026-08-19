import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/supabase/server'
import { computeWithdrawalAvailability, roundKes } from '@/lib/market/funding'
import { WALLET_CONFIG } from '@/lib/constants/wallet'

// Service-role client for wallet/lock writes (user RLS is read-only).
const serviceClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

type Action = 'lock' | 'unlock' | 'release'

export async function POST(req: Request) {
  const body = await req.json()
  const action = body.action as Action

  const supabase = await createServerClient()
  const auth = await supabase.auth.getUser()
  const user = auth.data.user

  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  // 1. LOCK: move balance → locked, create a fund_locks row.
  if (action === 'lock') {
    const amount = roundKes(Number(body.amount))
    if (!Number.isFinite(amount) || amount <= 0) {
      return new Response('Invalid lock amount', { status: 400 })
    }

    // Only spendable, verified cash can be locked (exclude provisional + pending out).
    const availability = await computeWithdrawalAvailability(supabase, user.id)
    const lockable = Math.max(0, availability.balanceKes - availability.pendingOut - availability.unverifiedProvisional)

    if (amount > lockable) {
      return new Response('Amount exceeds what you can lock right now', { status: 400 })
    }

    const { data: wallet } = await serviceClient
      .from('user_wallets')
      .select('balance_kes, locked_kes')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!wallet || Number(wallet.balance_kes) < amount) {
      return new Response('Insufficient balance', { status: 400 })
    }

    const { error: walletError } = await serviceClient
      .from('user_wallets')
      .update({
        balance_kes: roundKes(Number(wallet.balance_kes) - amount),
        locked_kes: roundKes(Number(wallet.locked_kes ?? 0) + amount),
      })
      .eq('user_id', user.id)
    if (walletError) return new Response(walletError.message, { status: 500 })

    const { error: lockError } = await serviceClient.from('fund_locks').insert({
      user_id: user.id,
      amount_kes: amount,
      status: 'locked',
    })
    if (lockError) return new Response(lockError.message, { status: 500 })

    return Response.json({ success: true, amount })
  }

  // 2. UNLOCK: mark locked rows as unlock_pending (24h cooling-off).
  if (action === 'unlock') {
    const { data: locks } = await serviceClient
      .from('fund_locks')
      .select('id, amount_kes')
      .eq('user_id', user.id)
      .eq('status', 'locked')
      .order('created_at', { ascending: true })

    const lockedRows = locks ?? []
    if (lockedRows.length === 0) {
      return new Response('No locked funds to unlock', { status: 400 })
    }

    const target = roundKes(Number(body.amount) || lockedRows.reduce((s, l) => s + Number(l.amount_kes), 0))
    let remaining = target
    const ids: string[] = []

    for (const lock of lockedRows) {
      if (remaining <= 0) break
      ids.push(lock.id)
      remaining = roundKes(remaining - Number(lock.amount_kes))
    }

    const unlockAvailableAt = new Date(Date.now() + WALLET_CONFIG.LOCK_UNLOCK_HOURS * 60 * 60 * 1000).toISOString()

    const { error } = await serviceClient
      .from('fund_locks')
      .update({ status: 'unlock_pending', unlock_available_at: unlockAvailableAt })
      .eq('user_id', user.id)
      .in('id', ids)

    if (error) return new Response(error.message, { status: 500 })

    return Response.json({ success: true, unlockAvailableAt })
  }

  // 3. RELEASE: unlock_pending rows past their cooling-off return to balance.
  if (action === 'release') {
    const { data: locks } = await serviceClient
      .from('fund_locks')
      .select('id, amount_kes')
      .eq('user_id', user.id)
      .eq('status', 'unlock_pending')
      .lte('unlock_available_at', new Date().toISOString())

    const due = locks ?? []
    if (due.length === 0) {
      return Response.json({ success: true, released: 0 })
    }

    const total = roundKes(due.reduce((s, l) => s + Number(l.amount_kes), 0))
    const ids = due.map((l) => l.id)

    const { data: wallet } = await serviceClient
      .from('user_wallets')
      .select('balance_kes, locked_kes')
      .eq('user_id', user.id)
      .maybeSingle()

    if (wallet) {
      const { error } = await serviceClient
        .from('user_wallets')
        .update({
          balance_kes: roundKes(Number(wallet.balance_kes) + total),
          locked_kes: roundKes(Math.max(0, Number(wallet.locked_kes ?? 0) - total)),
        })
        .eq('user_id', user.id)
      if (error) return new Response(error.message, { status: 500 })
    }

    const { error: lockError } = await serviceClient
      .from('fund_locks')
      .update({ status: 'released', released_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .in('id', ids)

    if (lockError) return new Response(lockError.message, { status: 500 })

    return Response.json({ success: true, released: total })
  }

  return new Response('Unknown action', { status: 400 })
}