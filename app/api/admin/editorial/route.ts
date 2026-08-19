import { createServerClient } from "@/lib/supabase/server"
import { requirePermission } from "@/lib/admin/authorization"
import { createServiceClient } from "@/lib/admin/service"
import { recordAudit } from "@/lib/admin/audit"

export interface EditorialPickRow {
  id: string
  post_id: string
  post_content: string | null
  author_name: string | null
  reason: string | null
  sort_order: number
  active: boolean
  created_at: string
}

export async function GET() {
  const supabase = await createServerClient()
  await requirePermission(supabase, "content.manage")
  const service = createServiceClient()

  const { data, error } = await service
    .from("editorial_picks")
    .select("id, post_id, reason, sort_order, active, created_at, post:posts(content, user_id, profiles(username, full_name))")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false })

  if (error) return new Response(error.message, { status: 500 })

  const rows: EditorialPickRow[] = (data ?? []).map((p) => ({
    id: p.id,
    post_id: p.post_id,
    post_content: p.post?.[0]?.content ?? null,
    author_name: p.post?.[0]?.profiles?.[0]?.full_name ?? p.post?.[0]?.profiles?.[0]?.username ?? null,
    reason: p.reason,
    sort_order: p.sort_order,
    active: p.active,
    created_at: p.created_at,
  }))

  return Response.json({ picks: rows })
}

export async function POST(req: Request) {
  const supabase = await createServerClient()
  const ctx = await requirePermission(supabase, "content.manage")
  const service = createServiceClient()

  const body = await req.json()
  const postId = String(body.postId ?? "")
  const reason = String(body.reason ?? "").trim() || null

  if (!postId) return new Response("Missing postId", { status: 400 })

  const { data: post, error: postError } = await service
    .from("posts")
    .select("id, content")
    .eq("id", postId)
    .maybeSingle()

  if (postError || !post) {
    return new Response(postError?.message ?? "Post not found", { status: 404 })
  }

  const { count } = await service
    .from("editorial_picks")
    .select("id", { count: "exact", head: true })
    .eq("active", true)

  const { data, error } = await service
    .from("editorial_picks")
    .insert({
      post_id: postId,
      picked_by: ctx.userId,
      reason,
      sort_order: (count ?? 0) + 1,
      active: true,
    })
    .select("id")
    .single()

  if (error) return new Response(error.message, { status: 500 })

  await recordAudit(service, {
    adminId: ctx.userId,
    action: "editorial.pick",
    targetTable: "editorial_picks",
    targetId: data.id,
    newValue: { post_id: postId, reason },
    metadata: { post_content: post.content },
  })

  return Response.json({ success: true, id: data.id })
}

export async function DELETE(req: Request) {
  const supabase = await createServerClient()
  const ctx = await requirePermission(supabase, "content.manage")
  const service = createServiceClient()

  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id") ?? ""

  if (!id) return new Response("Missing id", { status: 400 })

  const { data: pick, error: findError } = await service
    .from("editorial_picks")
    .select("id, post_id")
    .eq("id", id)
    .maybeSingle()

  if (findError || !pick) {
    return new Response(findError?.message ?? "Pick not found", { status: 404 })
  }

  const { error } = await service.from("editorial_picks").delete().eq("id", id)
  if (error) return new Response(error.message, { status: 500 })

  await recordAudit(service, {
    adminId: ctx.userId,
    action: "editorial.unpick",
    targetTable: "editorial_picks",
    targetId: id,
    oldValue: { post_id: pick.post_id },
  })

  return Response.json({ success: true })
}