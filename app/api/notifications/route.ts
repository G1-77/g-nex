// /app/api/notifications/route.ts

import { createServerClient } from '@/lib/supabase/server'
import type { Notification } from '@/types/Notifications'

export async function GET() {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) {
    return new Response(error.message, { status: 500 })
  }

  return Response.json(data satisfies Notification[])
}