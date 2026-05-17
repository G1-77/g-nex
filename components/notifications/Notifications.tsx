// /components/notifications/NotificationBell.tsx

'use client'


import { useQuery } from '@tanstack/react-query'
import { useNotificationRealtime } from '@/lib/hooks/useNotifications'

import type { Notification } from '@/types/Notifications'

export default function NotificationBell() {
  useNotificationRealtime()

  const { data } = useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await fetch('/api/notifications')

      if (!res.ok) {
        throw new Error('Failed to fetch notifications')
      }

      return res.json()
    }
  })

  const unreadCount =
    data?.filter((n: Notification) => !n.is_read).length ?? 0

  return (
    <div className="relative">
      <button>🔔</button>

      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-xs px-1 rounded">
          {unreadCount}
        </span>
      )}
    </div>
  )
}