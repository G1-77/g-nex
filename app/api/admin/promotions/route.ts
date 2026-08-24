// /api/admin/promotions — admin CRUD for the Home promotion carousel.
// GET    list every promotion (display_order asc)
// POST   create
// PATCH  update by { id, ...fields }
// DELETE ?id=
//
// Guarded by content.manage; every mutation is audited. The client component
// is only ever the rendering layer — copy, imagery, destinations and schedule
// live in this table (Admin Centre → Community → Promotions).

import { createServerClient } from "@/lib/supabase/server"
import { requirePermission } from "@/lib/admin/authorization"
import { createServiceClient } from "@/lib/admin/service"
import { recordAudit } from "@/lib/admin/audit"

type DestinationType = "route" | "url" | "product" | "none"

interface PromotionRow {
  id: string
  title: string
  description: string
  image_url: string | null
  icon_url: string | null
  cta_text: string
  destination_type: DestinationType
  destination_url: string | null
  product_id: string | null
  enabled: boolean
  display_order: number
  start_at: string | null
  end_at: string | null
  created_at: string
  updated_at: string
}

const DESTINATION_TYPES: DestinationType[] = ["route", "url", "product", "none"]
const MAX_IMAGE_BYTES_HINT = "image URLs must point to Supabase Storage or another https source"

function isValidDateString(v: unknown): v is string {
  return typeof v === "string" && Number.isFinite(Date.parse(v))
}

/** Internal routes must be app paths; external destinations must be https. */
function isValidDestination(type: DestinationType, url: unknown): boolean {
  if (type === "none") return url === null || url === undefined || url === ""
  if (url === null || url === undefined) return type === "product"
  if (typeof url !== "string") return false
  if (type === "route") return url.startsWith("/") && !url.startsWith("//")
  if (type === "url") return url.startsWith("https://")
  if (type === "product") return true // optional deep-link hint alongside product_id
  return false
}

interface NormalizedInput {
  title?: string
  description?: string
  image_url?: string | null
  icon_url?: string | null
  cta_text?: string
  destination_type?: DestinationType
  destination_url?: string | null
  product_id?: string | null
  enabled?: boolean
  display_order?: number
  start_at?: string | null
  end_at?: string | null
}

/**
 * Validate + normalize a partial promotion payload. Returns an error message
 * or the cleaned fields. Unknown keys are dropped, never trusted.
 */
function normalize(body: Record<string, unknown>): { error: string } | { fields: NormalizedInput } {
  const fields: NormalizedInput = {}

  if ("title" in body) {
    const title = body.title
    if (typeof title !== "string" || title.trim().length < 2 || title.trim().length > 80) {
      return { error: "Title must be 2–80 characters." }
    }
    fields.title = title.trim()
  }

  if ("description" in body) {
    const description = body.description
    if (typeof description !== "string" || description.length > 200) {
      return { error: "Description must be at most 200 characters." }
    }
    fields.description = description.trim()
  }

  for (const key of ["image_url", "icon_url"] as const) {
    if (key in body) {
      const value = body[key]
      if (value === null) {
        fields[key] = null
      } else if (typeof value === "string" && value.startsWith("https://")) {
        fields[key] = value
      } else if (typeof value === "string" && value.startsWith("/")) {
        // Local public asset (e.g. bundled icons)
        fields[key] = value
      } else {
        return { error: `${key}: ${MAX_IMAGE_BYTES_HINT}` }
      }
    }
  }

  if ("cta_text" in body) {
    const cta = body.cta_text
    if (typeof cta !== "string" || cta.trim().length < 2 || cta.trim().length > 40) {
      return { error: "CTA text must be 2–40 characters." }
    }
    fields.cta_text = cta.trim()
  }

  let destinationType: DestinationType | undefined
  if ("destination_type" in body) {
    const type = body.destination_type
    if (typeof type !== "string" || !DESTINATION_TYPES.includes(type as DestinationType)) {
      return { error: "destination_type must be route, url, product or none." }
    }
    destinationType = type as DestinationType
    fields.destination_type = destinationType
  }

  if ("destination_url" in body) {
    const url = body.destination_url
    if (url !== null && typeof url !== "string") {
      return { error: "destination_url must be a string or null." }
    }
    const effectiveType =
      destinationType ??
      (typeof body.destination_type === "string"
        ? (body.destination_type as DestinationType)
        : "route")
    if (!isValidDestination(effectiveType, url ?? null)) {
      return { error: "destination_url does not match the destination type (internal routes start with '/', external links must be https)." }
    }
    fields.destination_url = url === "" ? null : (url as string | null)
  }

  if ("product_id" in body) {
    const productId = body.product_id
    if (productId === null || productId === "") {
      fields.product_id = null
    } else if (typeof productId === "string" && /^[a-z0-9_-]{1,40}$/.test(productId)) {
      fields.product_id = productId
    } else {
      return { error: "product_id must be a short lowercase slug or null." }
    }
  }

  if ("enabled" in body) {
    if (typeof body.enabled !== "boolean") return { error: "enabled must be a boolean." }
    fields.enabled = body.enabled
  }

  if ("display_order" in body) {
    const order = body.display_order
    if (typeof order !== "number" || !Number.isInteger(order) || order < 0 || order > 999) {
      return { error: "display_order must be an integer between 0 and 999." }
    }
    fields.display_order = order
  }

  for (const key of ["start_at", "end_at"] as const) {
    if (key in body) {
      const value = body[key]
      if (value === null || value === "") {
        fields[key] = null
      } else if (isValidDateString(value)) {
        fields[key] = new Date(value).toISOString()
      } else {
        return { error: `${key} must be an ISO date string or null.` }
      }
    }
  }

  if (
    fields.start_at &&
    fields.end_at &&
    Date.parse(fields.start_at) > Date.parse(fields.end_at)
  ) {
    return { error: "start_at must be before end_at." }
  }

  return { fields }
}

export async function GET() {
  const supabase = await createServerClient()
  const ctx = await requirePermission(supabase, "content.manage")
  if (ctx instanceof Response) return ctx
  const service = createServiceClient()

  const { data, error } = await service
    .from("promotions")
    .select("*")
    .order("display_order", { ascending: true })

  if (error) return new Response(error.message, { status: 500 })
  return Response.json({ promotions: data })
}

export async function POST(req: Request) {
  const supabase = await createServerClient()
  const ctx = await requirePermission(supabase, "content.manage")
  if (ctx instanceof Response) return ctx
  const service = createServiceClient()

  const body = (await req.json()) as Record<string, unknown>
  const result = normalize(body)
  if ("error" in result) return new Response(result.error, { status: 400 })

  if (!result.fields.title) return new Response("Title is required.", { status: 400 })
  const insert = {
    title: result.fields.title,
    description: result.fields.description ?? "",
    image_url: result.fields.image_url ?? null,
    icon_url: result.fields.icon_url ?? null,
    cta_text: result.fields.cta_text ?? "Learn more",
    destination_type: (result.fields.destination_type ?? "route") as DestinationType,
    destination_url: result.fields.destination_url ?? null,
    product_id: result.fields.product_id ?? null,
    enabled: result.fields.enabled ?? false,
    display_order: result.fields.display_order ?? 100,
    start_at: result.fields.start_at ?? null,
    end_at: result.fields.end_at ?? null,
  }

  const { data, error } = await service
    .from("promotions")
    .insert(insert)
    .select("id")
    .single()

  if (error) return new Response(error.message, { status: 500 })

  await recordAudit(service, {
    adminId: ctx.userId,
    action: "promotions.create",
    targetTable: "promotions",
    targetId: data.id,
    newValue: insert,
  })

  return Response.json({ success: true, id: data.id })
}

export async function PATCH(req: Request) {
  const supabase = await createServerClient()
  const ctx = await requirePermission(supabase, "content.manage")
  if (ctx instanceof Response) return ctx
  const service = createServiceClient()

  const body = (await req.json()) as Record<string, unknown>
  const id = typeof body.id === "string" ? body.id : null
  if (!id) return new Response("Missing promotion id.", { status: 400 })

  const result = normalize(body)
  if ("error" in result) return new Response(result.error, { status: 400 })
  if (Object.keys(result.fields).length === 0) {
    return new Response("No valid fields to update.", { status: 400 })
  }

  const { data: before } = await service
    .from("promotions")
    .select("*")
    .eq("id", id)
    .maybeSingle()
  if (!before) return new Response("Promotion not found.", { status: 404 })

  const { error } = await service
    .from("promotions")
    .update(result.fields)
    .eq("id", id)

  if (error) return new Response(error.message, { status: 500 })

  await recordAudit(service, {
    adminId: ctx.userId,
    action: "promotions.update",
    targetTable: "promotions",
    targetId: id,
    oldValue: before as PromotionRow,
    newValue: result.fields,
  })

  return Response.json({ success: true })
}

export async function DELETE(req: Request) {
  const supabase = await createServerClient()
  const ctx = await requirePermission(supabase, "content.manage")
  if (ctx instanceof Response) return ctx
  const service = createServiceClient()

  const id = new URL(req.url).searchParams.get("id")
  if (!id) return new Response("Missing promotion id.", { status: 400 })

  const { data: before } = await service
    .from("promotions")
    .select("*")
    .eq("id", id)
    .maybeSingle()
  if (!before) return new Response("Promotion not found.", { status: 404 })

  const { error } = await service.from("promotions").delete().eq("id", id)
  if (error) return new Response(error.message, { status: 500 })

  await recordAudit(service, {
    adminId: ctx.userId,
    action: "promotions.delete",
    targetTable: "promotions",
    targetId: id,
    oldValue: before as PromotionRow,
  })

  return Response.json({ success: true })
}
