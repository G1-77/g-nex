// /app/api/notifications/read/route.ts
import { createServerClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const { id } = await req.json()

  const supabase = await createServerClient()

  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id)

  return Response.json({ success: true })
}