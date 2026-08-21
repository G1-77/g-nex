// The gate every admin edit/delete passes through.
//
// super_admin  → the action runs immediately.
// anyone below → the action is filed into `admin_action_requests` and must be
//                approved by a strictly higher rank before it takes effect.

import type { SupabaseClient } from "@supabase/supabase-js"
import type { AdminContext } from "@/lib/admin/authorization"
import { recordAudit } from "@/lib/admin/audit"
import type { ExecutorResult } from "@/lib/admin/executors"

export type AdminActionType = "edit" | "delete" | "wipe" | "withdrawal_process"

export interface PendingAction {
  actionType: AdminActionType
  targetTable: string
  targetId: string
  /** Human-readable summary shown in the approval queue. */
  label: string
  /** Data needed to execute later (edit changes, withdrawal note, …). */
  payload?: Record<string, unknown>
  /** Runs the mutation now (super_admin path) or at approval time. */
  execute: () => Promise<ExecutorResult>
}

/**
 * Execute or queue an admin action. Returns the HTTP response for the route.
 * Direct execution keeps the caller's identity in audit entries; queued
 * execution is attributed to the approving admin by the approvals route.
 */
export async function resolveAction(
  ctx: AdminContext,
  service: SupabaseClient,
  input: PendingAction
): Promise<Response> {
  if (ctx.role === "super_admin") {
    const result = await input.execute()
    if (!result.ok) return new Response(result.error, { status: result.status })
    return Response.json({ success: true, result: result.result ?? null })
  }

  const { data, error } = await service
    .from("admin_action_requests")
    .insert({
      requested_by: ctx.userId,
      requester_role: ctx.role,
      action_type: input.actionType,
      target_table: input.targetTable,
      target_id: input.targetId,
      label: input.label,
      payload: input.payload ?? null,
      status: "pending",
    })
    .select("id")
    .single()

  if (error) return new Response(error.message, { status: 500 })

  await recordAudit(service, {
    adminId: ctx.userId,
    action: `approvals.request_${input.actionType}`,
    targetTable: input.targetTable,
    targetId: input.targetId,
    newValue: { request_id: data.id, payload: input.payload ?? null },
    metadata: { role: ctx.role, label: input.label },
  })

  return Response.json({ success: true, queued: true, requestId: data.id })
}
