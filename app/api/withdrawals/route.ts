import { createServerClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/admin/service"
import { computeWithdrawalAvailability } from "@/lib/market/funding"
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
  // NOTE: lock_funds was revoked from authenticated in RPC lockdown; this path
  // currently fails for regular users. Kept for backward compatibility.
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

  // KES cash-out: enforce the 70% cap and validate availability.
  // All requests now enter 'pending' for admin approval — no auto-approval.
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

  // Validate available balance (pre-reservation rejection for clear UX).
  const availability = await computeWithdrawalAvailability(supabase, user.id, {
    maxWithdrawPct: effectiveMaxPct,
  })

  if (amountKes > availability.capLimit || amountKes > availability.available) {
    return new Response('Amount exceeds your available withdrawal balance', { status: 400 })
  }

  // Generate idempotency key for safe retries (client can also supply one).
  const idempotencyKey =
    body.idempotencyKey ?? `wd-${user.id}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

  // Execute request via service-role RPC (atomic reserve + insert + ledger + audit).
  const service = createServiceClient()
  const { data, error } = await service.rpc('request_withdrawal', {
    p_user: user.id,
    p_amount_kes: amountKes,
    p_phone: phone,
    p_provider: provider,
    p_idempotency_key: idempotencyKey,
  })

  if (error) {
    console.error('request_withdrawal RPC error:', error.message)
    return new Response(error.message, { status: 400 })
  }

  if (data && data.ok === false) {
    return new Response(data.error, { status: 400 })
  }

  return Response.json({
    success: true,
    withdrawalId: data?.withdrawal_id,
    status: 'pending',
    grossKes: data?.gross_kes,
    netKes: data?.net_kes,
    feeKes: data?.fee_kes,
  })
}