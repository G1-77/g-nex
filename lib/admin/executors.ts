// Server-only executors for admin mutations.
//
// Every destructive/edit action lives here exactly once so that both execution
// paths — a super_admin acting directly, and an approved request being run by
// the reviewer — behave identically and write identical audit entries.

import type { SupabaseClient } from "@supabase/supabase-js"
import { recordAudit } from "@/lib/admin/audit"

export type ExecutorResult =
  | { ok: true; result?: unknown }
  | { ok: false; status: number; error: string }

/** Whitelisted editable columns per table (defense against mass assignment). */
const EDITABLE_COLUMNS: Record<string, Set<string>> = {
  orders: new Set(["status", "fee", "margin_kes"]),
  transactions: new Set(["status", "notes", "reference", "amount_kes"]),
  deposit_requests: new Set(["status", "admin_notes", "amount_kes"]),
  withdrawal_requests: new Set(["status", "admin_notes", "amount_kes"]),
  profiles: new Set(["full_name", "bio", "avatar_url", "is_verified", "is_active"]),
}

function filterChanges(
  table: string,
  changes: Record<string, unknown>
): Record<string, unknown> {
  const allowed = EDITABLE_COLUMNS[table] ?? new Set<string>()
  const safe: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(changes)) {
    if (allowed.has(key)) safe[key] = value
  }
  return safe
}

/** Edit whitelisted columns on any supported table. */
export async function editRecord(
  service: SupabaseClient,
  adminId: string,
  table: string,
  id: string,
  changes: Record<string, unknown>
): Promise<ExecutorResult> {
  const safe = filterChanges(table, changes)
  if (Object.keys(safe).length === 0) {
    return { ok: false, status: 400, error: "No editable columns provided" }
  }

  const selectColumns = Object.keys(safe).join(", ")
  const { data: before, error: findError } = await service
    .from(table)
    .select(selectColumns)
    .eq("id", id)
    .maybeSingle()
  if (findError || !before) {
    return { ok: false, status: 404, error: findError?.message ?? `${table} record not found` }
  }

  const { error } = await service.from(table).update(safe).eq("id", id)
  if (error) return { ok: false, status: 500, error: error.message }

  await recordAudit(service, {
    adminId,
    action: `data.update_${table}`,
    targetTable: table,
    targetId: id,
    oldValue: before,
    newValue: safe,
  })

  return { ok: true, result: safe }
}

export async function deleteOrder(
  service: SupabaseClient,
  adminId: string,
  orderId: string
): Promise<ExecutorResult> {
  const { data: order, error: findError } = await service
    .from("orders")
    .select("id, user_id, side, mode, quantity, status")
    .eq("id", orderId)
    .maybeSingle()
  if (findError || !order) {
    return { ok: false, status: 404, error: findError?.message ?? "Order not found" }
  }

  const { data: result, error: rpcError } = await service.rpc("admin_delete_order", {
    p_order_id: orderId,
    p_admin: adminId,
  })
  if (rpcError) return { ok: false, status: 500, error: rpcError.message }
  if (result?.ok === false) {
    return { ok: false, status: 400, error: String(result.error ?? "Delete failed") }
  }

  await recordAudit(service, {
    adminId,
    action: "data.delete_order",
    targetTable: "orders",
    targetId: orderId,
    oldValue: {
      user_id: order.user_id,
      side: order.side,
      mode: order.mode,
      quantity: Number(order.quantity),
      status: order.status,
    },
    metadata: { deleted_transactions: Number(result.deleted_transactions ?? 0) },
  })

  return { ok: true, result }
}

export async function deleteTransaction(
  service: SupabaseClient,
  adminId: string,
  txId: string
): Promise<ExecutorResult> {
  const { data: tx, error: findError } = await service
    .from("transactions")
    .select("id, user_id, type, amount_kes, status")
    .eq("id", txId)
    .maybeSingle()
  if (findError || !tx) {
    return { ok: false, status: 404, error: findError?.message ?? "Transaction not found" }
  }

  const { data: result, error: rpcError } = await service.rpc("admin_delete_transaction", {
    p_tx_id: txId,
    p_admin: adminId,
  })
  if (rpcError) return { ok: false, status: 500, error: rpcError.message }
  if (result?.ok === false) {
    return { ok: false, status: 400, error: String(result.error ?? "Delete failed") }
  }

  await recordAudit(service, {
    adminId,
    action: "data.delete_transaction",
    targetTable: "transactions",
    targetId: txId,
    oldValue: { user_id: tx.user_id, type: tx.type, amount_kes: Number(tx.amount_kes), status: tx.status },
  })

  return { ok: true, result }
}

export async function deleteDeposit(
  service: SupabaseClient,
  adminId: string,
  depositId: string
): Promise<ExecutorResult> {
  const { data: deposit, error: findError } = await service
    .from("deposit_requests")
    .select("id, user_id, amount_kes, status")
    .eq("id", depositId)
    .maybeSingle()
  if (findError || !deposit) {
    return { ok: false, status: 404, error: findError?.message ?? "Deposit not found" }
  }

  const { data: result, error: rpcError } = await service.rpc("admin_delete_deposit", {
    p_deposit_id: depositId,
    p_admin: adminId,
  })
  if (rpcError) return { ok: false, status: 500, error: rpcError.message }
  if (result?.ok === false) {
    return { ok: false, status: 400, error: String(result.error ?? "Delete failed") }
  }

  await recordAudit(service, {
    adminId,
    action: "data.delete_deposit",
    targetTable: "deposit_requests",
    targetId: depositId,
    oldValue: { user_id: deposit.user_id, amount_kes: Number(deposit.amount_kes), status: deposit.status },
  })

  return { ok: true, result }
}

export async function deleteWithdrawal(
  service: SupabaseClient,
  adminId: string,
  withdrawalId: string
): Promise<ExecutorResult> {
  const { data: wd, error: findError } = await service
    .from("withdrawal_requests")
    .select("id, user_id, amount_kes, amount, status")
    .eq("id", withdrawalId)
    .maybeSingle()
  if (findError || !wd) {
    return { ok: false, status: 404, error: findError?.message ?? "Withdrawal not found" }
  }

  const { data: result, error: rpcError } = await service.rpc("admin_delete_withdrawal", {
    p_withdrawal_id: withdrawalId,
    p_admin: adminId,
  })
  if (rpcError) return { ok: false, status: 500, error: rpcError.message }
  if (result?.ok === false) {
    return { ok: false, status: 400, error: String(result.error ?? "Delete failed") }
  }

  await recordAudit(service, {
    adminId,
    action: "data.delete_withdrawal",
    targetTable: "withdrawal_requests",
    targetId: withdrawalId,
    oldValue: {
      user_id: wd.user_id,
      amount_kes: Number(wd.amount_kes ?? wd.amount ?? 0),
      status: wd.status,
    },
  })

  return { ok: true, result }
}

export async function deletePost(
  service: SupabaseClient,
  adminId: string,
  postId: string
): Promise<ExecutorResult> {
  const { data: post, error: findError } = await service
    .from("posts")
    .select("id, user_id")
    .eq("id", postId)
    .maybeSingle()
  if (findError || !post) {
    return { ok: false, status: 404, error: findError?.message ?? "Post not found" }
  }

  const { data: result, error: rpcError } = await service.rpc("admin_delete_post", {
    p_post_id: postId,
    p_admin: adminId,
  })
  if (rpcError) return { ok: false, status: 500, error: rpcError.message }
  if (result?.ok === false) {
    return { ok: false, status: 400, error: String(result.error ?? "Delete failed") }
  }

  await recordAudit(service, {
    adminId,
    action: "data.delete_post",
    targetTable: "posts",
    targetId: postId,
    oldValue: { user_id: post.user_id },
  })

  return { ok: true, result }
}

export async function deleteReport(
  service: SupabaseClient,
  adminId: string,
  reportId: string
): Promise<ExecutorResult> {
  const { data: report, error: findError } = await service
    .from("reports")
    .select("id, content_type, content_id, status")
    .eq("id", reportId)
    .maybeSingle()
  if (findError || !report) {
    return { ok: false, status: 404, error: findError?.message ?? "Report not found" }
  }

  const { error } = await service.from("reports").delete().eq("id", reportId)
  if (error) return { ok: false, status: 500, error: error.message }

  await recordAudit(service, {
    adminId,
    action: "data.delete_report",
    targetTable: "reports",
    targetId: reportId,
    oldValue: { content_type: report.content_type, content_id: report.content_id, status: report.status },
  })

  return { ok: true }
}

export async function wipeUserFinancials(
  service: SupabaseClient,
  adminId: string,
  userId: string
): Promise<ExecutorResult> {
  const { data: target, error: findError } = await service
    .from("profiles")
    .select("id, username, is_active")
    .eq("id", userId)
    .maybeSingle()
  if (findError || !target) {
    return { ok: false, status: 404, error: findError?.message ?? "User not found" }
  }

  const { data: result, error: rpcError } = await service.rpc("admin_wipe_user_financials", {
    p_user: userId,
    p_admin: adminId,
  })
  if (rpcError) return { ok: false, status: 500, error: rpcError.message }
  if (result?.ok === false) {
    return { ok: false, status: 400, error: String(result.error ?? "Wipe failed") }
  }

  await recordAudit(service, {
    adminId,
    action: "data.wipe_financials",
    targetTable: "profiles",
    targetId: userId,
    oldValue: { is_active: target.is_active },
    newValue: result,
    metadata: { username: target.username },
  })

  return { ok: true, result }
}

export async function deleteUserAccount(
  service: SupabaseClient,
  adminId: string,
  userId: string
): Promise<ExecutorResult> {
  if (userId === adminId) {
    return { ok: false, status: 400, error: "Cannot delete your own account" }
  }

  const { data: target, error: findError } = await service
    .from("profiles")
    .select("id, username, is_active, is_verified")
    .eq("id", userId)
    .maybeSingle()
  if (findError || !target) {
    return { ok: false, status: 404, error: findError?.message ?? "User not found" }
  }

  const { data: roleRow } = await service
    .from("admin_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle()
  if (roleRow?.role === "super_admin") {
    return { ok: false, status: 400, error: "Cannot delete a super admin" }
  }

  const { data: result, error: rpcError } = await service.rpc("admin_delete_user", {
    p_user: userId,
    p_admin: adminId,
  })
  if (rpcError) return { ok: false, status: 500, error: rpcError.message }
  if (result?.ok === false) {
    return { ok: false, status: 400, error: String(result.error ?? "Delete failed") }
  }

  // Remove the auth identity last (profiles.id has no FK to auth.users).
  const { error: authError } = await service.auth.admin.deleteUser(userId)
  if (authError) {
    await recordAudit(service, {
      adminId,
      action: "data.delete_user_partial",
      targetTable: "auth.users",
      targetId: userId,
      oldValue: { username: target.username },
      metadata: { warning: `public data removed but auth identity failed: ${authError.message}` },
    })
    return {
      ok: false,
      status: 500,
      error: `Public data removed, but auth identity could not be deleted: ${authError.message}`,
    }
  }

  await recordAudit(service, {
    adminId,
    action: "data.delete_user",
    targetTable: "profiles",
    targetId: userId,
    oldValue: {
      username: target.username,
      is_active: target.is_active,
      is_verified: target.is_verified,
    },
    newValue: { deleted: true },
  })

  return { ok: true, result }
}

/** Process or reject a payout request through the DB RPCs. */
export async function processWithdrawal(
  service: SupabaseClient,
  adminId: string,
  withdrawalId: string,
  action: "process" | "reject" | "approve" | "fail",
  note: string | null
): Promise<ExecutorResult> {
  const { data: wd, error: findError } = await service
    .from("withdrawal_requests")
    .select("id, status, amount_kes, amount")
    .eq("id", withdrawalId)
    .maybeSingle()
  if (findError || !wd) {
    return { ok: false, status: 404, error: findError?.message ?? "Withdrawal not found" }
  }

  const rpcMap: Record<
    typeof action,
    { rpc: string; expectedStatus: string; newStatus: string; withNote: boolean }
  > = {
    approve: { rpc: "admin_approve_withdrawal", expectedStatus: "pending", newStatus: "approved", withNote: false },
    process: { rpc: "admin_process_withdrawal", expectedStatus: "approved", newStatus: "sent", withNote: true },
    reject: { rpc: "admin_reject_withdrawal", expectedStatus: "pending|approved", newStatus: "rejected", withNote: true },
    fail: { rpc: "admin_fail_withdrawal", expectedStatus: "sent|approved|processing", newStatus: "failed", withNote: true },
  }

  const { rpc, expectedStatus, newStatus, withNote } = rpcMap[action]

  // Validate current status
  const expected = expectedStatus.split("|")
  if (!expected.includes(wd.status)) {
    return { ok: false, status: 400, error: `Withdrawal must be ${expected.join(" or ")} to ${action}` }
  }

  // PostgREST matches RPCs strictly by parameter set: admin_approve_withdrawal
  // takes no p_note, so sending it there yields PGRST202.
  const { data: rpcData, error: rpcError } = await service.rpc(rpc, {
    p_withdrawal_id: withdrawalId,
    p_admin: adminId,
    ...(withNote ? { p_note: note } : {}),
  })
  if (rpcError) return { ok: false, status: 500, error: rpcError.message }
  if (rpcData && rpcData.ok === false) {
    return { ok: false, status: 400, error: String(rpcData.error ?? "Operation failed") }
  }

  await recordAudit(service, {
    adminId,
    action: `withdrawals.${action}`,
    targetTable: "withdrawal_requests",
    targetId: withdrawalId,
    oldValue: { status: wd.status },
    newValue: { status: newStatus, ...rpcData },
    metadata: { amount_kes: Number(wd.amount_kes ?? wd.amount ?? 0), note },
  })

  return { ok: true, result: rpcData }
}

// New executor: approve withdrawal (pending -> approved)
export async function approveWithdrawal(
  service: SupabaseClient,
  adminId: string,
  withdrawalId: string,
  note: string | null
): Promise<ExecutorResult> {
  return processWithdrawal(service, adminId, withdrawalId, "approve", note)
}

// New executor: fail withdrawal (post-debit failure or pre-debit cancellation)
export async function failWithdrawal(
  service: SupabaseClient,
  adminId: string,
  withdrawalId: string,
  note: string | null
): Promise<ExecutorResult> {
  return processWithdrawal(service, adminId, withdrawalId, "fail", note)
}

// ----------------------------------------------------------------------------
// Approval-time dispatch.
// ----------------------------------------------------------------------------

export interface ActionRequestRow {
  id: string
  requested_by: string
  requester_role: string
  action_type: AdminActionTypeCompat
  target_table: string
  target_id: string
  label: string | null
  payload: Record<string, unknown> | null
}

type AdminActionTypeCompat = "edit" | "delete" | "wipe" | "withdrawal_process"

const DELETE_TARGETS: Record<
  string,
  (service: SupabaseClient, adminId: string, id: string) => Promise<ExecutorResult>
> = {
  orders: deleteOrder,
  transactions: deleteTransaction,
  deposit_requests: deleteDeposit,
  withdrawal_requests: deleteWithdrawal,
  posts: deletePost,
  profiles: deleteUserAccount,
  reports: deleteReport,
}

/**
 * Run a stored action request's mutation. Called by the approvals route after
 * an approver claims the pending row. The acting identity is the APPROVER.
 */
export async function dispatchRequest(
  service: SupabaseClient,
  approverId: string,
  request: ActionRequestRow
): Promise<ExecutorResult> {
  const payload = request.payload ?? {}

  if (request.action_type === "edit") {
    const changes = (payload.changes ?? {}) as Record<string, unknown>
    return editRecord(service, approverId, request.target_table, request.target_id, changes)
  }

  if (request.action_type === "delete") {
    // A post deletion filed from the reports queue also closes the report.
    if (request.target_table === "posts" && typeof request.payload?.report_id === "string") {
      const deleted = await deletePost(service, approverId, request.target_id)
      if (!deleted.ok) return deleted

      await service
        .from("reports")
        .update({
          status: "actioned",
          resolution: "Content deleted by admin",
          resolved_by: approverId,
          resolved_at: new Date().toISOString(),
        })
        .eq("id", request.payload.report_id)

      return deleted
    }

    const fn = DELETE_TARGETS[request.target_table]
    if (!fn) {
      return { ok: false, status: 400, error: `Unsupported delete target: ${request.target_table}` }
    }
    return fn(service, approverId, request.target_id)
  }

  if (request.action_type === "wipe") {
    return wipeUserFinancials(service, approverId, request.target_id)
  }

  if (request.action_type === "withdrawal_process") {
    const action = payload.action === "reject" ? "reject" : "process"
    const note = typeof payload.note === "string" && payload.note.trim() ? payload.note.trim() : null
    return processWithdrawal(service, approverId, request.target_id, action, note)
  }

  return { ok: false, status: 400, error: `Unknown action type: ${request.action_type}` }
}
