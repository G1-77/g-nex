import { createServerClient } from "@/lib/supabase/server"
import { requirePermission } from "@/lib/admin/authorization"
import { createServiceClient } from "@/lib/admin/service"
import { recordAudit } from "@/lib/admin/audit"
import { resolveAction } from "@/lib/admin/actions"
import { deletePost, deleteReport } from "@/lib/admin/executors"

export interface AdminReportRow {
  id: string
  reporter_id: string
  reporter_name: string | null
  content_type: string
  content_id: string
  reason: string
  details: string | null
  status: string
  resolution: string | null
  resolved_by: string | null
  resolved_at: string | null
  created_at: string
}

export async function GET(req: Request) {
  const supabase = await createServerClient()
  const ctx = await requirePermission(supabase, "community.report_review")
  if (ctx instanceof Response) return ctx
  const service = createServiceClient()

  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status") ?? "all" // all | pending | under_review | actioned | dismissed
  const limit = Math.min(Number(searchParams.get("limit") ?? 100) || 100, 200)

  let query = service
    .from("reports")
    .select("*, reporter:profiles!reports_reporter_id_fkey(username, full_name)")
    .order("created_at", { ascending: false })
    .limit(limit)

  if (status !== "all") query = query.eq("status", status)

  const { data, error } = await query
  if (error) return new Response(error.message, { status: 500 })

  const rows: AdminReportRow[] = (data ?? []).map((r) => ({
    id: r.id,
    reporter_id: r.reporter_id,
    reporter_name: r.reporter?.full_name ?? r.reporter?.username ?? null,
    content_type: r.content_type,
    content_id: r.content_id,
    reason: r.reason,
    details: r.details,
    status: r.status,
    resolution: r.resolution,
    resolved_by: r.resolved_by,
    resolved_at: r.resolved_at,
    created_at: r.created_at,
  }))

  return Response.json({ reports: rows })
}

export async function PATCH(req: Request) {
  const supabase = await createServerClient()
  const ctx = await requirePermission(supabase, "community.report_review")
  if (ctx instanceof Response) return ctx
  const service = createServiceClient()

  const body = await req.json()
  const reportId = String(body.reportId ?? "")
  const action = String(body.action ?? "") // resolve | dismiss | delete_content
  const resolution = String(body.resolution ?? "").trim()

  if (!reportId) return new Response("Missing reportId", { status: 400 })
  if (!["resolve", "dismiss", "delete_content"].includes(action)) {
    return new Response("Invalid action", { status: 400 })
  }

  const { data: report, error: reportError } = await service
    .from("reports")
    .select("id, content_type, content_id, status")
    .eq("id", reportId)
    .maybeSingle()

  if (reportError || !report) {
    return new Response(reportError?.message ?? "Report not found", { status: 404 })
  }

  // Deleting the reported content permanently is guarded by data.delete and
  // (below super_admin) a higher-rank approval. Non-post content has no hard
  // delete today — closing the report is enough.
  if (action === "delete_content") {
    const dataCtx = await requirePermission(supabase, "data.delete")
    if (dataCtx instanceof Response) return dataCtx

    if (report.content_type !== "post") {
      await service
        .from("reports")
        .update({
          status: "actioned",
          resolution: resolution || "Content deleted by admin",
          resolved_by: ctx.userId,
          resolved_at: new Date().toISOString(),
        })
        .eq("id", reportId)

      await recordAudit(service, {
        adminId: ctx.userId,
        action: "data.delete_content",
        targetTable: "reports",
        targetId: reportId,
        oldValue: { report_status: report.status },
        newValue: { deleted: true, report_id: reportId },
        metadata: { content_type: report.content_type },
      })

      return Response.json({ success: true })
    }

    return resolveAction(dataCtx, service, {
      actionType: "delete",
      targetTable: "posts",
      targetId: report.content_id,
      label: `Delete reported post ${report.content_id.slice(0, 8)}… (report ${reportId.slice(0, 8)}…)`,
      payload: { report_id: reportId },
      execute: async () => {
        const deleted = await deletePost(service, ctx.userId, report.content_id)
        if (!deleted.ok) return deleted

        await service
          .from("reports")
          .update({
            status: "actioned",
            resolution: resolution || "Content deleted by admin",
            resolved_by: ctx.userId,
            resolved_at: new Date().toISOString(),
          })
          .eq("id", reportId)

        return { ok: true }
      },
    })
  }

  if (report.status !== "pending" && report.status !== "under_review") {
    return new Response("Report is already resolved", { status: 400 })
  }

  const nextStatus = action === "resolve" ? "actioned" : "dismissed"

  const { error } = await service
    .from("reports")
    .update({
      status: nextStatus,
      resolution: resolution || null,
      resolved_by: ctx.userId,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", reportId)

  if (error) return new Response(error.message, { status: 500 })

  // Moderation outcome: if a post report is actioned, remove the content.
  if (action === "resolve" && report.content_type === "post") {
    await service
      .from("posts")
      .update({ visibility: "removed", updated_at: new Date().toISOString() })
      .eq("id", report.content_id)
  }

  await recordAudit(service, {
    adminId: ctx.userId,
    action: `reports.${nextStatus}`,
    targetTable: "reports",
    targetId: reportId,
    oldValue: { status: report.status },
    newValue: { status: nextStatus, resolution },
    metadata: { content_type: report.content_type, content_id: report.content_id },
  })

  return Response.json({ success: true })
}

/** Permanently delete a report row (data.delete; approval-gated below super_admin). */
export async function DELETE(req: Request) {
  const supabase = await createServerClient()
  const ctx = await requirePermission(supabase, "data.delete")
  if (ctx instanceof Response) return ctx
  const service = createServiceClient()

  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id") ?? ""

  if (!id) return new Response("Missing id", { status: 400 })

  return resolveAction(ctx, service, {
    actionType: "delete",
    targetTable: "reports",
    targetId: id,
    label: `Delete report ${id.slice(0, 8)}…`,
    execute: () => deleteReport(service, ctx.userId, id),
  })
}