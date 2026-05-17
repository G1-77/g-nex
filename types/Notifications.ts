// /types/notifications.ts

export type NotificationType =
  | 'order_filled'
  | 'order_cancelled'
  | 'deposit_confirmed'
  | 'withdrawal_sent'
  | 'price_alert'
  | 'new_follower'
  | 'post_comment'
  | 'post_like'
  | 'announcement'

export interface NotificationData {
  order_id?: string
  amount?: number
  symbol?: string
  price?: number
  post_id?: string
  follower_id?: string
}

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  message: string
  data: NotificationData
  is_read: boolean
  created_at: string
}