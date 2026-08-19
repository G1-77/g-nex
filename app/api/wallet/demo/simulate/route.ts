import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/supabase/server'
import { DEMO_MODE, DEMO_VERIFY_DELAY_MS } from '@/lib/constants/wallet'

// Demo-mode only: advances the current user's pending money movement exactly
// like the (future) admin panel would — verifying deposits and paying out
// withdrawals — so investors can watch the full lifecycle play out live.
// Inert unless NEXT_PUBLIC_DEMO_MODE=true.
const serviceClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export async function GET() {
  if (!DEMO_MODE) {
    return new Response('Not available', { status: 403 })
  }

  const supabase = await createServerClient()
  const auth = await supabase.auth.getUser()
  const user = auth.data.user

  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const cutoff = new Date(Date.now() - DEMO_VERIFY_DELAY_MS).toISOString()

  // 1. Verify provisional deposits (admin "confirmed").
  const { data: deposits, error: depositError } = await serviceClient
    .from('deposit_requests')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'pending_verification')
    .lte('created_at', cutoff)

  let depositsConfirmed = 0
  if (!depositError && deposits && deposits.length > 0) {
    const { error } = await serviceClient
      .from('deposit_requests')
      .update({ status: 'confirmed' })
      .eq('user_id', user.id)
      .eq('status', 'pending_verification')
      .lte('created_at', cutoff)
    if (!error) depositsConfirmed = deposits.length
  }

  // 2. Pay out withdrawals (admin "paid").
  const { data: withdrawals, error: withdrawalError } = await serviceClient
    .from('withdrawal_requests')
    .select('id')
    .eq('user_id', user.id)
    .in('status', ['pending', 'approved'])
    .lte('created_at', cutoff)

  let withdrawalsPaid = 0
  if (!withdrawalError && withdrawals && withdrawals.length > 0) {
    const { error } = await serviceClient
      .from('withdrawal_requests')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .in('status', ['pending', 'approved'])
      .lte('created_at', cutoff)
    if (!error) withdrawalsPaid = withdrawals.length
  }

  return Response.json({ depositsConfirmed, withdrawalsPaid })
}