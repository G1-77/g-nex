import { createServerClient } from "@/lib/supabase/server"

export async function POST(req: Request) {
  const body = await req.json()

  const supabase = await createServerClient()

  const authResponse = await supabase.auth.getUser()
  const user = authResponse.data.user

  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  // ✅ TypeScript now knows user is NOT null
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
      mobile_money_number: body.phone,
      mobile_money_provider: body.provider
    })

  if (insertError) {
    return new Response(insertError.message, { status: 400 })
  }

  return Response.json({ success: true })
}