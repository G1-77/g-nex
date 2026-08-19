import { useAuth } from "@/components/providers/AuthProvider"
import type { PermissionCode } from "@/lib/admin/permissions"

/** Permission gate helper for the client. Returns true when the user holds all listed permissions. */
export function usePermissions(): (permissions: PermissionCode[]) => boolean {
  const { permissions } = useAuth()
  return (required: PermissionCode[]) => required.every((p) => permissions.includes(p))
}