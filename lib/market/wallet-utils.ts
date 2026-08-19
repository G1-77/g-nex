import type { AssetSymbol } from '@/lib/supabase/types'

export function formatKes(value: number): string {
  if (!Number.isFinite(value)) return '0'
  return value.toLocaleString('en-KE', { maximumFractionDigits: 2 })
}

export function formatUsd(value: number): string {
  if (!Number.isFinite(value)) return '$0'
  return '$' + value.toLocaleString('en-US', { maximumFractionDigits: 2 })
}

export function formatUnits(symbol: AssetSymbol, units: number): string {
  if (!Number.isFinite(units)) return '0'
  const maxFrac = symbol === 'USDT' ? 2 : 4
  return units.toLocaleString('en-US', { maximumFractionDigits: maxFrac })
}

export function statusLabel(status: string): string {
  const normalized = status.toLowerCase()
  const map: Record<string, string> = {
    pending: 'Pending',
    pending_verification: 'Pending verification',
    processing: 'Processing',
    approved: 'Approved',
    confirmed: 'Confirmed',
    sent: 'Sent',
    paid: 'Paid',
    credited: 'Credited',
    rejected: 'Rejected',
    reversed: 'Reversed',
  }
  return map[normalized] ?? status
}

export type StatusTone = 'amber' | 'green' | 'red' | 'slate'

export function statusTone(status: string): StatusTone {
  switch (status.toLowerCase()) {
    case 'pending':
    case 'pending_verification':
    case 'processing':
      return 'amber'
    case 'approved':
    case 'confirmed':
    case 'sent':
    case 'paid':
    case 'credited':
      return 'green'
    case 'rejected':
    case 'reversed':
      return 'red'
    default:
      return 'slate'
  }
}

export const ALLOCATION_COLORS: Record<string, string> = {
  BTC: '#F7931A',
  ETH: '#627EEA',
  SOL: '#9945FF',
  XRP: '#00AAE4',
  USDT: '#26A17B',
  XAU: '#C9A84C',
}

export function allocationColor(symbol: AssetSymbol): string {
  return ALLOCATION_COLORS[symbol] ?? '#64748b'
}