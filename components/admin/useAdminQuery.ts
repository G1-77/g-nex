"use client"

import { useQuery, type UseQueryOptions } from "@tanstack/react-query"

export function useAdminQuery<T>(
  url: string,
  options?: Omit<UseQueryOptions<T>, "queryKey" | "queryFn">
) {
  return useQuery<T>({
    queryKey: [url],
    queryFn: async () => {
      const res = await fetch(url, { cache: "no-store" })
      if (!res.ok) {
        let message = `Request failed (${res.status})`
        try {
          message = (await res.text()) || message
        } catch {
          // ignore
        }
        throw new Error(message)
      }
      return res.json() as T
    },
    ...options,
  })
}

export async function adminAction<T = { success: boolean }>(
  url: string,
  method: "POST" | "PATCH" | "DELETE" = "POST",
  body?: unknown
): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!res.ok) {
    let message = `Request failed (${res.status})`
    try {
      message = (await res.text()) || message
    } catch {
      // ignore
    }
    throw new Error(message)
  }
  return res.json() as T
}

export interface ActionResult {
  success: boolean
  queued?: boolean
}

/**
 * Run a mutation and translate the two success shapes for the operator:
 * applied immediately, or filed into the approval queue (below super_admin).
 */
export async function runAction(
  url: string,
  method: "POST" | "PATCH" | "DELETE",
  body?: unknown
): Promise<ActionResult> {
  const result = await adminAction<ActionResult>(url, method, body)
  if (result.queued) {
    window.alert(
      "Sent for approval — a higher-ranked admin must review this action before it takes effect."
    )
  }
  return result
}