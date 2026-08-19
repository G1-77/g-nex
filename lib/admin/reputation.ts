// Community reputation statuses (display-only). This is NOT an authorization
// mechanism — platform roles live in lib/admin/permissions.ts and the two are
// deliberately decoupled: a user can be ROLE user + STATUS verified_trader,
// while staff can be ROLE support + STATUS active_trader.

export const REPUTATION_STATUSES = [
  "new_trader",
  "active_trader",
  "community_analyst",
  "verified_trader",
  "top_trader",
] as const

export type ReputationStatus = (typeof REPUTATION_STATUSES)[number]

export interface ReputationBadgeMeta {
  label: string
  /** Tailwind classes for the badge chip. */
  chip: string
}

export const REPUTATION_META: Record<ReputationStatus, ReputationBadgeMeta> = {
  new_trader: {
    label: "New Trader",
    chip: "border-slate-500/30 bg-slate-500/10 text-slate-300",
  },
  active_trader: {
    label: "Active Trader",
    chip: "border-sky-500/30 bg-sky-500/10 text-sky-300",
  },
  community_analyst: {
    label: "Community Analyst",
    chip: "border-violet-500/30 bg-violet-500/10 text-violet-300",
  },
  verified_trader: {
    label: "Verified Trader",
    chip: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  },
  top_trader: {
    label: "Top Trader",
    chip: "border-[#8DFF45]/30 bg-[#8DFF45]/10 text-[#8DFF45]",
  },
}

export function isReputationStatus(value: string | null | undefined): value is ReputationStatus {
  return (REPUTATION_STATUSES as readonly string[]).includes(value ?? "")
}

export function reputationMeta(
  value: string | null | undefined
): ReputationBadgeMeta {
  if (isReputationStatus(value)) return REPUTATION_META[value]
  return REPUTATION_META.new_trader
}