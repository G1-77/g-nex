import { createServerClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/admin/service"

/**
 * Creator edit/delete of own posts. RLS enforces ownership server-side, so the
 * authenticated (user-scoped) client is used — never the service role.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response("Unauthorized", { status: 401 })

  const { data: post } = await supabase
    .from("posts")
    .select("id, user_id")
    .eq("id", id)
    .maybeSingle()

  if (!post) return new Response("Post not found", { status: 404 })
  if (post.user_id !== user.id) return new Response("Forbidden", { status: 403 })

  const content = typeof body.content === "string" ? body.content.trim() : ""
  if (!content) return new Response("Content is required", { status: 400 })

  const assetSymbols: string[] = Array.isArray(body.assetSymbols)
    ? body.assetSymbols.filter((s: unknown) => typeof s === "string")
    : []
  const signalType = typeof body.signalType === "string" ? body.signalType : null

  const { error } = await supabase
    .from("posts")
    .update({
      content,
      assetSymbols,
      signalType,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)

  if (error) return new Response(error.message, { status: 500 })

  // Replace trade tags (setups) atomically.
  await supabase.from("trade_tags").delete().eq("post_id", id)
  if (assetSymbols.length > 0) {
    await supabase.from("trade_tags").insert({
      post_id: id,
      asset_symbol: assetSymbols[0],
      signal_type: signalType ?? "Bullish",
    })
  }

  return Response.json({ success: true })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response("Unauthorized", { status: 401 })

  const { data: post } = await supabase
    .from("posts")
    .select("id, user_id")
    .eq("id", id)
    .maybeSingle()

  if (!post) return new Response("Post not found", { status: 404 })
  if (post.user_id !== user.id) return new Response("Forbidden", { status: 403 })

  const { error } = await supabase.from("posts").delete().eq("id", id)
  if (error) return new Response(error.message, { status: 500 })

  return Response.json({ success: true })
}

// Share: increments the post's share counter and notifies the author.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response("Unauthorized", { status: 401 })

  const { data: post } = await supabase
    .from("posts")
    .select("id, user_id")
    .eq("id", id)
    .maybeSingle()

  if (!post) return new Response("Post not found", { status: 404 })

  const service = createServiceClient()
  const { data: shares } = await service
    .from("posts")
    .select("shares_count")
    .eq("id", id)
    .single()

  await service
    .from("posts")
    .update({ shares_count: Number(shares?.shares_count ?? 0) + 1 })
    .eq("id", id)

  if (post.user_id !== user.id) {
    await service.from("notifications").insert({
      recipient_id: post.user_id,
      notifier_id: user.id,
      notification_type: "share",
      metadata_json: { post_id: id },
    })
  }

  return Response.json({ success: true })
}