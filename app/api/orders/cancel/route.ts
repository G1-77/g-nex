import { createServerClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/admin/service'
import { mapTradeError } from '@/lib/market/execution'

interface CancelResult {
  ok: boolean
  order_id: string
  status: string
}

export async function POST(req: Request) {
  const supabase = await createServerClient()
  const auth = await supabase.auth.getUser()
  const user = auth.data.user

  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  let body: { orderId?: unknown }
  try {
    body = await req.json()
  } catch {
    return new Response('Invalid JSON body', { status: 400 })
  }

  const orderId = typeof body.orderId === 'string' ? body.orderId : ''
  if (!orderId) {
    return new Response('Missing order id', { status: 400 })
  }

  // Cancellation executes server-side: reservations are released inside the
  // RPC. The UI never mutates order state directly.
  const service = createServiceClient()
  const { data, error } = await service.rpc('cancel_order', {
    p_user: user.id,
    p_order_id: orderId,
  })

  if (error) {
    const mapped = mapTradeError(error.message)
    return new Response(mapped.message, { status: mapped.status })
  }

  return Response.json(data as unknown as CancelResult)
}
