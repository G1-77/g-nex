// Append-only audit logging. All admin mutations (approvals, rejections,
// processing, role changes, settings overrides, moderation) call recordAudit.
// The audit_logs table has RLS with SELECT-only for audit.read — no insert /
// update / delete policies — so writes here go through the service role and the
// log can never be edited from the UI.

import type { SupabaseClient } from "@supabase/supabase-js"

export interface AuditEntryInput {
  adminId: string
  action: string
  targetTable?: string
  targetId?: string
  oldValue?: unknown
  newValue?: unknown
  metadata?: Record<string, unknown>
}

export async function recordAudit(
  service: SupabaseClient,
  input: AuditEntryInput
): Promise<void> {
  const { error } = await service.from("audit_logs").insert({
    admin_id: input.adminId,
    action: input.action,
    target_table: input.targetTable ?? null,
    target_id: input.targetId ?? null,
    old_value: input.oldValue === undefined ? null : JSON.parse(JSON.stringify(input.oldValue)),
    new_value: input.newValue === undefined ? null : JSON.parse(JSON.stringify(input.newValue)),
    metadata: input.metadata ?? null,
    ip_address: null,
  })

  if (error) {
    // Audit must never break the primary mutation — log loudly instead.
    console.error("GNEX Audit failure:", input.action, error.message)
  }
}