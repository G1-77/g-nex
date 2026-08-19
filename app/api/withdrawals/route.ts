import { createServerClient } from "@/lib/supabase/server"
import { evaluateWithdrawalApproval } from "@/lib/market/funding"
import { withdrawalFee, WITHDRAWAL_FEE_RATE } from "@/lib/constants/wallet"

export async function POST(req: Request) {
  const body = await req.json()

  const supabase = await createServerClient()

  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Asset-linked cash-outs (trade engine) keep the existing lock_funds path.
  if (body.asset_id) {
    const { error: lockError } = await supabase.rpc('lock_funds', {
      p_user: user.id,
      p_asset: body.asset_id,
      p_amount: body.amount
    })

    if (lockError) {
      return new Response(lockError.message, { status: 400 })
    }

    const { error: insertError } = await supabase
      .from('withdrawal_requests')
      .insert({
        user_id: user.id,
        asset_id: body.asset_id,
        amount: body.amount,
        amount_kes: body.amount_kes ?? null,
        mobile_money_number: body.phone,
        mobile_money_provider: body.provider,
        status: 'pending'
      })

    if (insertError) {
      return new Response(insertError.message, { status: 400 })
    }

    return Response.json({ success: true })
  }

  // KES cash-out: enforce the 70% cap and run the auto-approval gate.
  const amountKes = Number(body.amount_kes ?? body.amount)
  const phone = String(body.phone ?? '').trim()
  const provider = String(body.provider ?? 'M-Pesa')

  if (!Number.isFinite(amountKes) || amountKes <= 0) {
    return new Response('Invalid withdrawal amount', { status: 400 })
  }

  // Platform settings override the constants when present (best-effort).
  const [feeRate, maxWithdrawPct, providersSetting] = await Promise.all([
    supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'withdrawal_fee_rate')
      .maybeSingle(),
    supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'max_withdraw_pct')
      .maybeSingle(),
    supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'payment_providers')
      .maybeSingle(),
  ])

  const effectiveFeeRate =
    typeof feeRate.data?.value === "number" ? feeRate.data.value : WITHDRAWAL_FEE_RATE
  const effectiveMaxPct =
    typeof maxWithdrawPct.data?.value === "number" ? maxWithdrawPct.data.value : undefined

  // 2% flat charge (or platform override), deducted from the amount at payout.
  const feeKes = withdrawalFee(amountKes, effectiveFeeRate)
  if (amountKes <= feeKes) {
    return new Response('Withdrawal amount must exceed the processing fee', { status: 400 })
  }

  // Reject providers that are no longer supported platform-wide.
  const allowedProviders = Array.isArray(providersSetting.data?.value)
    ? (providersSetting.data.value as string[])
    : ['mpesa', 'airtel']
  if (!allowedProviders.includes(provider.toLowerCase().replace('-', ''))) {
    return new Response('Payment provider is not currently supported', { status: 400 })
  }

  const { autoApproved, availability } = await evaluateWithdrawalApproval(
    supabase,
    user.id,
    amountKes,
    phone,
    { maxWithdrawPct: effectiveMaxPct }
  )

  if (amountKes > availability.capLimit || amountKes > availability.available) {
    return new Response('Amount exceeds your available withdrawal balance', { status: 400 })
  }

  const now = new Date().toISOString()
  const { error: insertError } = await supabase
    .from('withdrawal_requests')
    .insert({
      user_id: user.id,
      asset_id: null,
      amount: amountKes,
      amount_kes: amountKes,
      fee_kes: feeKes,
      mobile_money_number: phone,
      mobile_money_provider: provider,
      status: autoApproved ? 'approved' : 'pending',
      approved_by: autoApproved ? 'auto' : null,
      approved_at: autoApproved ? now : null,
    })

  if (insertError) {
    return new Response(insertError.message, { status: 400 })
  }

  return Response.json({ success: true, autoApproved })
}