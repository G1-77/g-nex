import { createServerClient } from "@/lib/supabase/server"

export async function POST(req: Request) {
  const body = await req.json()

  const supabase = await createServerClient()

  const auth = await supabase.auth.getUser()
  const user = auth.data.user

  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { error } = await supabase.from('deposit_requests').insert({
    user_id: user.id,
    amount_kes: body.amount,
    mobile_money_number: body.phone,
    mobile_money_provider: body.provider,
    user_reference: body.reference
  })

  if (error) {
    return new Response(error.message, { status: 400 })
  }

  return Response.json({ success: true })
}