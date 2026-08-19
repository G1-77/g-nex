import { createClient } from '@supabase/supabase-js'
import { createServerClient } from "@/lib/supabase/server"
import { ensureDepositAccountNumber, creditDepositBalance } from "@/lib/market/funding"
import { WALLET_CONFIG } from "@/lib/constants/wallet"

// Service-role client for wallet/ledger writes (RLS is user-scoped read-only).
const serviceClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export async function POST(req: Request) {
  const body = await req.json()

  const supabase = await createServerClient()

  const auth = await supabase.auth.getUser()
  const user = auth.data.user

  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const amount = Number(body.amount)
  const provider = String(body.provider ?? 'M-Pesa')
  const phone = String(body.phone ?? '').trim()
  const paymentChannel = body.paymentChannel === 'send_to_number' ? 'send_to_number' : 'paybill'
  const accountNumber = paymentChannel === 'paybill' ? String(body.accountNumber ?? '').trim() : null

  if (!Number.isFinite(amount) || amount <= 0) {
    return new Response('Invalid deposit amount', { status: 400 })
  }

  // Platform limits + supported providers from settings (best-effort).
  const [minSetting, maxSetting, providersSetting] = await Promise.all([
    supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'deposit_min_kes')
      .maybeSingle(),
    supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'deposit_max_kes')
      .maybeSingle(),
    supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'payment_providers')
      .maybeSingle(),
  ])

  const minKes = typeof minSetting.data?.value === "number" ? minSetting.data.value : 100
  const maxKes = typeof maxSetting.data?.value === "number" ? maxSetting.data.value : 500_000
  if (amount < minKes || amount > maxKes) {
    return new Response(`Deposit amount must be between ${minKes} and ${maxKes} KES`, { status: 400 })
  }

  const allowedProviders = Array.isArray(providersSetting.data?.value)
    ? (providersSetting.data.value as string[])
    : ['mpesa', 'airtel']
  if (!allowedProviders.includes(provider.toLowerCase().replace('-', ''))) {
    return new Response('Payment provider is not currently supported', { status: 400 })
  }

  // Duplicate-submit guard: reject a second provisional deposit from the same
  // user/provider/amount/account within the duplicate window.
  const { data: recent } = await supabase
    .from('deposit_requests')
    .select('id, created_at')
    .eq('user_id', user.id)
    .eq('status', 'pending_verification')
    .eq('amount_kes', amount)
    .eq('mobile_money_provider', provider)
    .gte('created_at', new Date(Date.now() - WALLET_CONFIG.DEPOSIT_DUPLICATE_WINDOW_MS).toISOString())
    .limit(1)

  if (recent && recent.length > 0) {
    return new Response('A matching deposit request is already pending verification', { status: 409 })
  }

  // Ensure the user has a permanent, unique M-Pesa account number.
  const resolvedAccountNumber = await ensureDepositAccountNumber(serviceClient, user.id)

  // 1. Record the request (provisional credit).
  const { data: request, error: insertError } = await supabase
    .from('deposit_requests')
    .insert({
      user_id: user.id,
      amount_kes: amount,
      expected_amount: amount,
      mobile_money_number: phone || null,
      mobile_money_provider: provider,
      user_reference: body.reference ?? 'wallet',
      status: 'pending_verification',
      payment_channel: paymentChannel,
      account_number: paymentChannel === 'paybill' ? (accountNumber || resolvedAccountNumber) : null,
    })
    .select('id')
    .single()

  if (insertError) {
    return new Response(insertError.message, { status: 400 })
  }

  // 2. Credit instantly (provisional): 90% spendable balance, 10% silent reserve.
  try {
    await creditDepositBalance(serviceClient, user.id, amount)
  } catch (creditError) {
    console.error('GNEX Provisional Credit Failure:', creditError)
    return new Response((creditError as Error).message, { status: 500 })
  }

  return Response.json({ success: true, requestId: request.id })
}