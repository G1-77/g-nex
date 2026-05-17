// /app/notifications/page.tsx
import { createServerClient } from '@/lib/supabase/server'

export default async function NotificationsPage() {
  const supabase = await createServerClient()

  const { data } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div>
      <h1>Notifications</h1>

      {data?.map((n) => (
        <div key={n.id} className="border p-2">
          <p>{n.message}</p>
        </div>
      ))}
    </div>
  )
}