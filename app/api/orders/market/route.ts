import { getCurrentPrice } from "@/lib/market/getCurrentPrice"
import { createServerClient } from "@/lib/supabase/server"

export async function POST(req: Request) {
  const body = await req.json()

  const price = await getCurrentPrice(body.asset_id)

  const supabase = await createServerClient()

  const auth = await supabase.auth.getUser()
  const user = auth.data.user

  if (!user) {
    return new Response("Unauthorized", { status: 401 })
  }

  const { data, error } = await supabase.rpc('execute_market_order', {
    p_user: user.id,
    p_asset: body.asset_id,
    p_side: body.side,
    p_quantity: body.quantity,
    p_price: price,
    p_fee_percent: 0.5
  })

  if (error) {
    return new Response(error.message, { status: 400 })
  }

  return Response.json(data)
}