// Admin formatting helpers (KES, numbers, timestamps, status labels).

const KES_FORMATTER = new Intl.NumberFormat("en-KE", {
  style: "currency",
  currency: "KES",
  maximumFractionDigits: 2,
})

const COMPACT_KES_FORMATTER = new Intl.NumberFormat("en-KE", {
  style: "currency",
  currency: "KES",
  notation: "compact",
  maximumFractionDigits: 1,
})

export function formatKes(value: number | null | undefined): string {
  if (!Number.isFinite(Number(value))) return "—"
  return KES_FORMATTER.format(Number(value))
}

export function formatKesCompact(value: number | null | undefined): string {
  if (!Number.isFinite(Number(value))) return "—"
  return COMPACT_KES_FORMATTER.format(Number(value))
}

export function formatNumber(value: number | null | undefined): string {
  if (!Number.isFinite(Number(value))) return "—"
  return new Intl.NumberFormat("en-KE", { maximumFractionDigits: 4 }).format(Number(value))
}

export function formatTimestamp(value: string | null | undefined): string {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleString("en-KE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export type StatusTone = "green" | "amber" | "red" | "gray" | "blue" | "violet"

const STATUS_TONES: Record<string, StatusTone> = {
  confirmed: "green",
  paid: "green",
  sent: "green",
  filled: "green",
  closed: "green",
  active: "green",
  resolved: "green",
  actioned: "green",
  pending: "amber",
  pending_verification: "amber",
  approved: "blue",
  processing: "blue",
  open: "blue",
  under_review: "amber",
  partial: "blue",
  rejected: "red",
  failed: "red",
  executed: "green",
  cancelled: "gray",
  dismissed: "gray",
  reversed: "red",
  suspended: "red",
}

export function statusTone(status: string | null | undefined): StatusTone {
  return STATUS_TONES[status ?? ""] ?? "gray"
}

export function statusLabel(status: string | null | undefined): string {
  if (!status) return "—"
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}