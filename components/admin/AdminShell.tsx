"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X, ExternalLink, Bell } from "lucide-react"
import { useAuth } from "@/components/providers/AuthProvider"
import { useAdminQuery } from "@/components/admin/useAdminQuery"
import { GNEXLogo } from "@/components/brand/GNEXLogo"
import { NAV_SECTIONS } from "./status"
import { cn } from "@/lib/utils"
import type { ReactNode } from "react"
import type { PermissionCode } from "@/lib/admin/permissions"

export function AdminShell({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const pathname = usePathname()
  const { profile, role, permissions, isLoading } = useAuth()

  const can = (permission: string | null) =>
    permission === null || (permissions as PermissionCode[]).includes(permission as PermissionCode)

  // Pending approval count for the sidebar badge (approvals.review holders only).
  const canReviewApprovals = can("approvals.review")
  const { data: approvalsData } = useAdminQuery<{ pendingCount: number }>(
    "/api/admin/approvals?status=pending&limit=1",
    { enabled: canReviewApprovals, staleTime: 30_000, refetchInterval: 60_000 }
  )
  const pendingApprovals = canReviewApprovals ? approvalsData?.pendingCount ?? 0 : 0

  const pageTitle = useMemo(() => {
    const flat = NAV_SECTIONS.flatMap((s) => s.items)
    const match = flat.find((item) =>
      item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href)
    )
    return match?.label ?? "Overview"
  }, [pathname])

  // Close the mobile drawer after navigation completes (deferred to avoid a
  // synchronous setState-in-effect cascade).
  useEffect(() => {
    const id = requestAnimationFrame(() => setDrawerOpen(false))
    return () => cancelAnimationFrame(id)
  }, [pathname])

  useEffect(() => {
    document.documentElement.dataset.admin = "true"
    return () => {
      delete document.documentElement.dataset.admin
    }
  }, [])

  const nav = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => can(item.permission)),
  })).filter((section) => section.items.length > 0)

  const initials = profile?.username?.slice(0, 2).toUpperCase() ?? "AD"

  const sidebar = (
    <div className="flex h-full flex-col bg-[var(--admin-bg-elevated)]/80">
      {/* Brand header */}
      <div className="flex h-16 items-center gap-2.5 border-b border-[var(--admin-border)] px-5">
        <Link href="/" className="flex items-center gap-2 text-slate-100">
          <GNEXLogo height={22} />
        </Link>
        <span className="rounded-md border border-[var(--admin-border)] bg-[var(--admin-panel)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-[var(--admin-text-faint)]">
          Console
        </span>
      </div>

      {/* Navigation */}
      <nav className="premium-scrollbar flex-1 space-y-5 overflow-y-auto p-3">
        {nav.map((section) => (
          <div key={section.title}>
            <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--admin-text-faint)]">
              {section.title}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active =
                  item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setDrawerOpen(false)}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-semibold transition-all duration-150",
                      active
                        ? "bg-[rgba(141,255,69,0.10)] text-[var(--admin-green)]"
                        : "text-[var(--admin-text-dim)] hover:bg-[var(--admin-panel-hover)] hover:text-[var(--admin-text)]"
                    )}
                    style={
                      active
                        ? { boxShadow: "inset 0 0 0 1px rgba(141,255,69,0.18)" }
                        : undefined
                    }
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-[var(--admin-green)] shadow-[0_0_10px_var(--admin-green-glow)]" />
                    )}
                    <span
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-lg transition-colors",
                        active
                          ? "bg-[rgba(141,255,69,0.15)] text-[var(--admin-green)]"
                          : "bg-white/[0.04] text-[var(--admin-text-dim)] group-hover:text-[var(--admin-text)]"
                      )}
                    >
                      {item.icon}
                    </span>
                    {item.label}
                    {item.href === "/admin/approvals" && pendingApprovals > 0 && (
                      <span className="ml-auto rounded-full bg-[rgba(141,255,69,0.15)] px-1.5 py-0.5 font-mono text-[10px] font-black text-[var(--admin-green)]">
                        {pendingApprovals > 99 ? "99+" : pendingApprovals}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Current user */}
      <div className="border-t border-[var(--admin-border)] p-3">
        <div className="flex items-center gap-3 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-panel)] px-3 py-2.5">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[rgba(141,255,69,0.12)] text-[11px] font-black text-[var(--admin-green)]"
            style={{ boxShadow: "0 0 0 1px rgba(141,255,69,0.25)" }}
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-slate-100">
              @{profile?.username ?? "admin"}
            </p>
            <p className="text-[10px] uppercase tracking-wide text-[var(--admin-green)]">
              {role?.replace("_", " ") ?? "staff"}
            </p>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="relative min-h-screen bg-[var(--admin-bg)] text-[var(--admin-text)]">
      {/* Ambient brand glow */}
      <div className="admin-ambient" aria-hidden />

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-[var(--admin-border)] backdrop-blur-xl lg:block">
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Close menu"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 cursor-pointer bg-black/70 backdrop-blur-sm"
          />
          <div className="absolute inset-y-0 left-0 w-72 border-r border-[var(--admin-border)] shadow-2xl">
            <button
              aria-label="Close"
              onClick={() => setDrawerOpen(false)}
              className="absolute right-3 top-4 z-10 cursor-pointer rounded-lg p-1.5 text-[var(--admin-text-dim)] hover:bg-white/10"
            >
              <X className="h-5 w-5" />
            </button>
            {sidebar}
          </div>
        </div>
      )}

      {/* Main column */}
      <div className="relative z-10 lg:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-[var(--admin-border)] bg-[var(--admin-bg)]/80 px-4 backdrop-blur-xl">
          <button
            aria-label="Open menu"
            onClick={() => setDrawerOpen(true)}
            className="cursor-pointer rounded-lg p-2 text-[var(--admin-text-dim)] transition-colors hover:bg-white/5 hover:text-slate-100 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="min-w-0">
            <h1 className="truncate text-sm font-bold uppercase tracking-widest text-slate-100">
              {pageTitle}
            </h1>
            <p className="hidden text-[10px] text-[var(--admin-text-faint)] sm:block">
              GNEX Admin Console
            </p>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/notifications"
              aria-label="Notifications"
              className="relative rounded-lg p-2 text-[var(--admin-text-dim)] transition-colors hover:bg-white/5 hover:text-slate-100"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--admin-green)] shadow-[0_0_8px_var(--admin-green-glow)]" />
            </Link>
            <Link
              href="/"
              className="hidden items-center gap-1.5 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-panel)] px-3 py-1.5 text-[11px] font-semibold text-[var(--admin-text-dim)] transition-colors hover:border-[var(--admin-border-strong)] hover:text-slate-100 sm:flex"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              View site
            </Link>
            {isLoading ? (
              <div className="h-8 w-8 animate-pulse rounded-full bg-white/10" />
            ) : (
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[rgba(141,255,69,0.12)] text-[10px] font-black text-[var(--admin-green)]"
                style={{ boxShadow: "0 0 0 1px rgba(141,255,69,0.2)" }}
              >
                {initials}
              </div>
            )}
          </div>
        </header>

        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}