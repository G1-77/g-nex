import { redirect } from "next/navigation"
import type { ReactNode } from "react"
import { createServerClient } from "@/lib/supabase/server"
import { AdminShell } from "@/components/admin/AdminShell"

export const dynamic = "force-dynamic"

/** Coarse server-side gate for the whole admin area. Fine-grained permission
 *  checks still happen on every API route and page action. */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: role } = await supabase
    .from("admin_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle()

  if (!role) redirect("/")

  return <AdminShell>{children}</AdminShell>
}