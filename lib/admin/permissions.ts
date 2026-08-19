// Central permission catalog. This is the single source of truth for what a
// permission code means and which permissions each role gets by default.
//
// The DB holds the same catalog in `admin_permissions` (used for validation and
// the matrix UI). At grant time a role's defaults here are stored on the
// `admin_roles.permissions` row, which a super_admin can then customize.

import type { AdminRoleType } from "@/lib/supabase/types"

export const PERMISSIONS = [
  { code: "users.read", name: "Users — View", description: "View the user directory and member profiles." },
  { code: "users.manage", name: "Users — Manage", description: "Suspend/unsuspend accounts and manage verification state." },
  { code: "deposits.read", name: "Deposits — View", description: "View deposit requests and payment references." },
  { code: "deposits.approve", name: "Deposits — Approve", description: "Approve or reject pending deposits." },
  { code: "withdrawals.read", name: "Withdrawals — View", description: "View withdrawal requests and payout details." },
  { code: "withdrawals.process", name: "Withdrawals — Process", description: "Process or reject payout requests." },
  { code: "transactions.read", name: "Transactions — View", description: "Search the financial transactions ledger." },
  { code: "orders.read", name: "Orders — View", description: "View market orders across the platform." },
  { code: "community.moderate", name: "Community — Moderate", description: "Moderate community content and interactions." },
  { code: "community.report_review", name: "Community — Reports", description: "Review and resolve user-submitted reports." },
  { code: "content.manage", name: "Content — Manage", description: "Manage editorial picks and moderate posts." },
  { code: "content.publish", name: "Content — Publish", description: "Publish editorial and pinned content." },
  { code: "market.manage", name: "Market — Manage", description: "Manage supported assets and market settings." },
  { code: "admins.manage", name: "Administration — Admins", description: "Grant and revoke admin access, assign roles." },
  { code: "permissions.manage", name: "Administration — Permissions", description: "Modify the role/permission matrix." },
  { code: "settings.manage", name: "System — Settings", description: "Manage platform settings and maintenance mode." },
  { code: "audit.read", name: "System — Audit", description: "Read the append-only audit log." },
] as const

export type Permission = (typeof PERMISSIONS)[number]
export type PermissionCode = Permission["code"]

export const ALL_PERMISSIONS: PermissionCode[] = PERMISSIONS.map((p) => p.code)

const asSet = (...codes: PermissionCode[]): PermissionCode[] => codes

/** Default permission set applied when a role is granted. */
export const ROLE_DEFAULT_PERMISSIONS: Record<AdminRoleType, PermissionCode[]> = {
  super_admin: ALL_PERMISSIONS,
  admin: asSet(
    "users.read",
    "users.manage",
    "deposits.read",
    "deposits.approve",
    "withdrawals.read",
    "withdrawals.process",
    "transactions.read",
    "orders.read",
    "community.moderate",
    "community.report_review",
    "content.manage",
    "content.publish",
    "market.manage",
    "audit.read"
  ),
  support: asSet(
    "users.read",
    "deposits.read",
    "withdrawals.read",
    "transactions.read",
    "orders.read",
    "community.report_review",
    "community.moderate",
    "audit.read"
  ),
  editor: asSet(
    "content.manage",
    "content.publish",
    "community.moderate",
    "community.report_review",
    "audit.read"
  ),
}

/** Roles ranked by hierarchy level (higher = more privileged). */
export const ROLE_HIERARCHY: Record<AdminRoleType, number> = {
  editor: 1,
  support: 2,
  admin: 3,
  super_admin: 4,
}

export function isPermissionCode(value: string): value is PermissionCode {
  return (ALL_PERMISSIONS as readonly string[]).includes(value)
}